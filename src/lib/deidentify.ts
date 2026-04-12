/**
 * deidentify.ts
 * 
 * Browser-side name detection and de-identification for imported documents.
 * Scans text against known profiles, flags potential names with confidence levels,
 * and replaces/redacts names based on user decisions.
 * 
 * No data leaves the browser — all processing is local.
 */

export interface ProfileEntry {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  ni_names: string | null;
  role?: string; // "admin" | "faculty" | "resident"
}

export interface NameDetection {
  /** Unique key for this detection */
  key: string;
  /** The text as found in the source */
  text: string;
  /** The matched profile, if any */
  matched_profile: ProfileEntry | null;
  /** Match confidence */
  confidence: "high" | "medium" | "low" | "unknown";
  /** Where in the comment this name appears (start index) */
  start: number;
  /** Where in the comment this name ends */
  end: number;
  /** User's decision: pending, replace, redact, keep */
  action: "pending" | "replace" | "redact" | "keep";
}

export interface DeidentifiedComment {
  survey_barcode: string;
  received_date: string;
  site: string;
  survey_section: string;
  comment_question: string;
  provider_code: string;
  provider_profile_id: string | null;
  rating: string;
  comment_clean: string;
  month_label: string;
}

/**
 * Calculate edit distance (Levenshtein) between two strings.
 * Used for fuzzy name matching.
 */
function editDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[la][lb];
}

/**
 * Build a set of name variants to search for from a profiles list.
 * Returns a map from lowercase search term → profile entry.
 */
function buildNameDictionary(profiles: ProfileEntry[]): Map<string, { profile: ProfileEntry; type: string }> {
  const dict = new Map<string, { profile: ProfileEntry; type: string }>();

  for (const p of profiles) {
    const fn = (p.first_name || "").trim();
    const ln = (p.last_name || "").trim();

    if (ln) {
      // Full name variants
      dict.set(`${ln}, ${fn}`.toLowerCase(), { profile: p, type: "full" });
      dict.set(`${fn} ${ln}`.toLowerCase(), { profile: p, type: "full" });
      dict.set(`dr. ${ln}`.toLowerCase(), { profile: p, type: "title_last" });
      dict.set(`dr ${ln}`.toLowerCase(), { profile: p, type: "title_last" });
      // Last name alone (will need context check)
      dict.set(ln.toLowerCase(), { profile: p, type: "last_only" });

      // Handle multi-part last names (e.g., "Medina Mieles")
      const lnParts = ln.split(/\s+/);
      if (lnParts.length > 1) {
        // First part of last name with Dr.
        dict.set(`dr. ${lnParts[0]}`.toLowerCase(), { profile: p, type: "title_partial_last" });
        dict.set(`dr ${lnParts[0]}`.toLowerCase(), { profile: p, type: "title_partial_last" });
      }
    }

    if (fn && fn.length > 2) {
      // First name alone — only flag as low confidence
      dict.set(fn.toLowerCase(), { profile: p, type: "first_only" });
    }

    // NI name variants
    if (p.ni_names) {
      const variants = p.ni_names.split(";").map((s) => s.trim().toLowerCase()).filter(Boolean);
      for (const v of variants) {
        dict.set(v, { profile: p, type: "ni_variant" });
      }
    }
  }

  return dict;
}

/**
 * Scan a comment for potential names.
 * Returns detected names with confidence levels.
 */
export function detectNamesInText(
  text: string,
  profiles: ProfileEntry[],
  commentKey: string
): NameDetection[] {
  const dict = buildNameDictionary(profiles);
  const detections: NameDetection[] = [];
  const textLower = text.toLowerCase();
  const alreadyCovered = new Set<string>(); // Track covered ranges to avoid duplicates

  // Pass 1: Look for exact multi-word matches (highest confidence)
  const sortedTerms = Array.from(dict.entries())
    .sort((a, b) => b[0].length - a[0].length); // Longest first to prefer "Dr. Medina Mieles" over "Medina"

  for (const [term, { profile, type }] of sortedTerms) {
    if (term.length < 3) continue; // Skip very short terms

    let searchFrom = 0;
    while (true) {
      const idx = textLower.indexOf(term, searchFrom);
      if (idx === -1) break;

      // Check word boundaries
      const charBefore = idx > 0 ? textLower[idx - 1] : " ";
      const charAfter = idx + term.length < textLower.length ? textLower[idx + term.length] : " ";
      const isWordBoundary = /[\s,.!?;:()"']/.test(charBefore) && /[\s,.!?;:()"']/.test(charAfter);

      // Check if this range is already covered by a longer match
      const rangeKey = `${idx}-${idx + term.length}`;
      const isOverlapping = Array.from(alreadyCovered).some((r) => {
        const [s, e] = r.split("-").map(Number);
        return idx >= s && idx + term.length <= e;
      });

      if (isWordBoundary && !isOverlapping) {
        let confidence: NameDetection["confidence"];
        if (type === "full" || type === "ni_variant") {
          confidence = "high";
        } else if (type === "title_last" || type === "title_partial_last") {
          confidence = "high";
        } else if (type === "last_only") {
          confidence = "medium";
        } else {
          confidence = "low"; // first_only
        }

        detections.push({
          key: `${commentKey}-${idx}`,
          text: text.slice(idx, idx + term.length),
          matched_profile: profile,
          confidence,
          start: idx,
          end: idx + term.length,
          action: confidence === "high" ? "replace" : "pending",
        });
        alreadyCovered.add(rangeKey);
      }

      searchFrom = idx + 1;
    }
  }

  // Pass 2: Fuzzy matching for misspellings
  // Look for words near "Dr." or "Dr" that might be misspelled names
  const drPattern = /\bdr\.?\s+(\w+(?:\s+\w+)?)/gi;
  const notNameAfterDr = new Set([
    "unless", "about", "after", "again", "because", "before", "could",
    "didn", "does", "doesn", "ever", "for", "from", "have", "here",
    "just", "never", "not", "only", "said", "says", "should", "since",
    "still", "that", "the", "their", "them", "then", "there", "they",
    "this", "told", "until", "was", "were", "what", "when", "where",
    "which", "who", "will", "with", "would", "your",
  ]);
  let drMatch;
  while ((drMatch = drPattern.exec(text)) !== null) {
    const candidate = drMatch[1];
    const candidateLower = candidate.toLowerCase();
    const startIdx = drMatch.index;
    const endIdx = startIdx + drMatch[0].length;

    // Check if already detected
    const rangeKey = `${startIdx}-${endIdx}`;
    const isAlreadyCovered = Array.from(alreadyCovered).some((r) => {
      const [s, e] = r.split("-").map(Number);
      return (startIdx >= s && startIdx < e) || (endIdx > s && endIdx <= e);
    });

    if (!isAlreadyCovered) {
      // Skip if the word after Dr. is a common non-name word
      const firstWord = candidateLower.split(/\s+/)[0];
      if (notNameAfterDr.has(firstWord)) continue;

      // Check fuzzy match against last names
      let bestMatch: ProfileEntry | null = null;
      let bestDist = Infinity;

      for (const p of profiles) {
        const ln = (p.last_name || "").toLowerCase();
        if (!ln) continue;

        // Check each part of the candidate against each part of the last name
        const candidateParts = candidateLower.split(/\s+/);
        const lnParts = ln.split(/\s+/);

        for (const cp of candidateParts) {
          for (const lp of lnParts) {
            if (cp.length >= 3 && lp.length >= 3) {
              const dist = editDistance(cp, lp);
              const maxLen = Math.max(cp.length, lp.length);
              // Allow up to 2 character difference for names 5+ chars, 1 for shorter
              const threshold = maxLen >= 5 ? 2 : 1;
              if (dist <= threshold && dist > 0 && dist < bestDist) {
                bestDist = dist;
                bestMatch = p;
              }
            }
          }
        }
      }

      if (bestMatch) {
        detections.push({
          key: `${commentKey}-fuzzy-${startIdx}`,
          text: drMatch[0],
          matched_profile: bestMatch,
          confidence: "low",
          start: startIdx,
          end: endIdx,
          action: "pending",
        });
        alreadyCovered.add(rangeKey);
      } else {
        // No fuzzy match found — flag as unknown name after "Dr."
        // This catches cases like "Dr. Hatcher's" where the name isn't in profiles at all
        detections.push({
          key: `${commentKey}-dr-unknown-${startIdx}`,
          text: drMatch[0],
          matched_profile: null,
          confidence: "unknown",
          start: startIdx,
          end: endIdx,
          action: "pending",
        });
        alreadyCovered.add(rangeKey);
      }
    }
  }

  // Pass 3: Look for capitalized words that might be names but aren't in the dictionary
  // Only flag if they look name-like (capitalized, not common words)
  const commonWords = new Set([
    "the", "and", "was", "were", "have", "has", "had", "been", "being", "very",
    "good", "great", "amazing", "wonderful", "excellent", "professional", "kind",
    "friendly", "helpful", "positive", "negative", "neutral", "mixed", "open",
    "doctor", "nurse", "assistant", "appointment", "visit", "office", "clinic",
    "hospital", "medication", "medicine", "treatment", "patient", "health",
    "care", "provider", "staff", "team", "time", "day", "week", "month",
    "murray", "hamilton", "advent", "chatsworth", "family", "overall",
    "access", "personal", "issues", "assessment", "moving", "through",
    "your", "about", "they", "them", "their", "she", "her", "his",
    "not", "but", "all", "went", "well", "with", "this", "that", "from",
    "would", "could", "should", "will", "just", "like", "feel", "felt",
    "really", "also", "even", "made", "make", "gave", "give", "took",
    "take", "left", "need", "needed", "first", "last", "next", "other",
    "some", "any", "each", "every", "much", "more", "most", "than",
    "then", "when", "where", "what", "which", "who", "how", "why",
    "didn", "doesn", "wasn", "aren", "haven", "hadn", "wouldn", "couldn",
    "shouldn", "can", "cannot", "don", "did", "does", "will", "shall",
    "may", "might", "must", "shall", "getting", "going", "coming",
    "being", "having", "doing", "making", "taking", "seeing", "saying",
    "asking", "telling", "knowing", "thinking", "feeling", "looking",
    "checked", "checks", "engages", "follows", "provided", "recommend",
    "rating", "complaint", "complaints", "satisfied", "informative",
    "lieable", "likable", "compassionate", "cautious", "additional",
    "comments", "convenient", "scheduled", "hiccups", "ensuring",
    "coordinated", "coordinates", "consulted", "situation", "attack",
    "performance", "professional", "knowledgeable", "medication",
    "allergy", "sinus", "infection", "depression", "anxiety",
    "insurance", "charged", "shots", "meds", "spray", "missing",
    "work", "waste", "refused", "understanding", "appreciate",
    "berated", "attacked", "awful", "please", "return", "worse",
    "probably", "company", "money", "started", "decided",
  ]);

  const capsWordPattern = /\b([A-Z][a-z]{2,})\b/g;
  let capsMatch;
  while ((capsMatch = capsWordPattern.exec(text)) !== null) {
    const word = capsMatch[1];
    const wordLower = word.toLowerCase();
    const idx = capsMatch.index;

    if (commonWords.has(wordLower)) continue;
    if (dict.has(wordLower)) continue; // Already handled

    // Check if already covered
    const isAlreadyCovered = Array.from(alreadyCovered).some((r) => {
      const [s, e] = r.split("-").map(Number);
      return idx >= s && idx + word.length <= e;
    });
    if (isAlreadyCovered) continue;

    // Check if this could plausibly be a name (not a common English word)
    // Simple heuristic: if the word isn't in our common words list and is capitalized,
    // flag it but at unknown confidence
    // Skip if it's at the start of a sentence (after ". " or start of text)
    const charsBefore = text.slice(Math.max(0, idx - 3), idx);
    const isStartOfSentence = idx === 0 || /[.!?]\s*$/.test(charsBefore);
    if (isStartOfSentence) continue;

    detections.push({
      key: `${commentKey}-unknown-${idx}`,
      text: word,
      matched_profile: null,
      confidence: "unknown",
      start: idx,
      end: idx + word.length,
      action: "pending",
    });
  }

  // Also check for ALL CAPS names (like "SUHAIL, SAJEEL")
  const allCapsPattern = /\b([A-Z]{3,}(?:[,\s]+[A-Z]{3,})*)\b/g;
  let allCapsMatch;
  while ((allCapsMatch = allCapsPattern.exec(text)) !== null) {
    const phrase = allCapsMatch[1];
    const idx = allCapsMatch.index;

    // Check if it matches any profile
    const phraseLower = phrase.toLowerCase().replace(/\s+/g, " ").trim();
    const isAlreadyCovered = Array.from(alreadyCovered).some((r) => {
      const [s, e] = r.split("-").map(Number);
      return idx >= s && idx + phrase.length <= e;
    });
    if (isAlreadyCovered) continue;

    // Try to match against profiles
    let matched: ProfileEntry | null = null;
    for (const p of profiles) {
      const fn = (p.first_name || "").toLowerCase();
      const ln = (p.last_name || "").toLowerCase();
      const parts = phraseLower.split(/[,\s]+/);
      if (parts.some((part) => part === fn || part === ln)) {
        matched = p;
        break;
      }
    }

    if (matched) {
      detections.push({
        key: `${commentKey}-caps-${idx}`,
        text: phrase,
        matched_profile: matched,
        confidence: "medium",
        start: idx,
        end: idx + phrase.length,
        action: "pending",
      });
    }
  }

  // Sort by position in text
  detections.sort((a, b) => a.start - b.start);

  return detections;
}

/**
 * Apply de-identification to a comment based on user decisions.
 * Replaces matched names with profile codes, redacts others.
 */
export function applyDeidentification(
  text: string,
  detections: NameDetection[]
): string {
  // Sort detections by position, reversed so we can replace from end to start
  const sorted = [...detections]
    .filter((d) => d.action === "replace" || d.action === "redact")
    .sort((a, b) => b.start - a.start);

  let result = text;
  for (const d of sorted) {
    if (d.action === "replace" && d.matched_profile) {
      result = result.slice(0, d.start) + "[PROVIDER]" + result.slice(d.end);
    } else if (d.action === "redact") {
      result = result.slice(0, d.start) + "[REDACTED]" + result.slice(d.end);
    }
  }

  return result;
}

/**
 * Match a provider name string to a profile (for the structured provider column).
 * Returns the profile ID or null.
 */
export function matchProviderToProfile(
  providerName: string,
  profiles: ProfileEntry[]
): string | null {
  const pn = providerName.toLowerCase().trim();
  if (!pn) return null;

  for (const p of profiles) {
    const fn = (p.first_name || "").toLowerCase().trim();
    const ln = (p.last_name || "").toLowerCase().trim();
    if (!ln) continue;

    // "Last, First..." pattern
    if (pn.startsWith(ln + ", " + fn) || pn.startsWith(ln + "," + fn)) return p.id;
    // "First Last" pattern
    if (fn && pn === `${fn} ${ln}`) return p.id;
    // Partial match
    if (fn && ln && pn.includes(ln) && pn.includes(fn)) return p.id;

    // Check ni_names variants
    if (p.ni_names) {
      const variants = p.ni_names.split(";").map((s) => s.toLowerCase().trim()).filter(Boolean);
      for (const v of variants) {
        if (v === pn || pn.startsWith(v) || v.startsWith(pn)) return p.id;
      }
    }
  }

  // Fuzzy match on last name
  for (const p of profiles) {
    const ln = (p.last_name || "").toLowerCase().trim();
    if (!ln || ln.length < 3) continue;
    const pnParts = pn.split(/[,\s]+/);
    for (const part of pnParts) {
      if (part.length >= 3) {
        const dist = editDistance(part, ln);
        if (dist <= 1) return p.id;
        // Multi-part last name check
        const lnParts = ln.split(/\s+/);
        for (const lp of lnParts) {
          if (lp.length >= 3 && editDistance(part, lp) <= 1) return p.id;
        }
      }
    }
  }

  return null;
}
