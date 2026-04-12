/**
 * parsePressGaneyPdf.ts
 * 
 * Browser-side parser for Press Ganey patient satisfaction PDF reports.
 * Extracts the "Comments Detail" table rows without any external API calls.
 * 
 * Uses pdfjs-dist to extract text, then parses the structured table format.
 * 
 * Install: npm install pdfjs-dist@4.9.155
 */

import * as pdfjsLib from "pdfjs-dist";

// Configure worker — use unpkg CDN with version matched to installed package
// This avoids Vite worker bundling issues while keeping versions in sync
const PDFJS_VERSION = pdfjsLib.version;
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.mjs`;

export interface ParsedComment {
  survey_barcode: string;
  received_date: string;
  site: string;
  survey_section: string;
  comment_question: string;
  provider_name: string;
  rating: string;
  comment: string;
}

/**
 * Extract all text from a PDF file, page by page.
 */
async function extractTextFromPdf(file: File): Promise<string[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Join text items with position-aware spacing
    let lastY: number | null = null;
    let lineText = "";
    const lines: string[] = [];

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = Math.round((item as any).transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        lines.push(lineText.trim());
        lineText = "";
      }
      lineText += item.str + " ";
      lastY = y;
    }
    if (lineText.trim()) lines.push(lineText.trim());
    pages.push(lines.join("\n"));
  }

  return pages;
}

/**
 * Known survey sections in Press Ganey reports.
 */
const KNOWN_SECTIONS = [
  "Access",
  "Moving Through Your Visit",
  "Nurse/Assistant",
  "Nurse/ Assistant",
  "Care Provider",
  "Personal Issues",
  "Overall Assessment",
];

/**
 * Known rating types.
 */
const KNOWN_RATINGS = ["Positive", "Negative", "Mixed", "Neutral", "Open"];

/**
 * Parse the extracted text into structured comment rows.
 * 
 * The Press Ganey "Comments Detail" table has this structure per row:
 * - Survey Barcode (10-11 digit number)
 * - Received Date (MM/DD/YYYY)
 * - Site (e.g. "Murray FM Res")
 * - Survey Section
 * - Comment Question
 * - Specialty (optional)
 * - Provider (Last, First M)
 * - Rating Type
 * - Comment text
 */
export function parseCommentsFromText(pages: string[]): ParsedComment[] {
  const allText = pages.join("\n");
  const comments: ParsedComment[] = [];

  // Find the "Comments Detail" section
  const detailIdx = allText.indexOf("Comments Detail");
  if (detailIdx === -1) return comments;

  const detailText = allText.slice(detailIdx);
  const lines = detailText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Strategy: scan for lines starting with a survey barcode (10-11 digit number)
  // then collect the following lines as part of that record until the next barcode
  const barcodePattern = /^(\d{10,11})\s/;
  const datePattern = /(\d{2}\/\d{2}\/\d{4})/;

  let currentRecord: string[] = [];
  const rawRecords: string[][] = [];

  for (const line of lines) {
    if (barcodePattern.test(line) && currentRecord.length > 0) {
      rawRecords.push([...currentRecord]);
      currentRecord = [line];
    } else if (barcodePattern.test(line)) {
      currentRecord = [line];
    } else if (currentRecord.length > 0) {
      currentRecord.push(line);
    }
  }
  if (currentRecord.length > 0) rawRecords.push(currentRecord);

  // Parse each raw record
  for (const record of rawRecords) {
    const joined = record.join(" ");

    // Extract barcode
    const barcodeMatch = joined.match(/^(\d{10,11})/);
    if (!barcodeMatch) continue;
    const barcode = barcodeMatch[1];

    // Extract date
    const dateMatch = joined.match(datePattern);
    if (!dateMatch) continue;
    const date = dateMatch[1];

    // Extract rating (look for known ratings)
    let rating = "";
    for (const r of KNOWN_RATINGS) {
      // Look for the rating as a standalone word
      const ratingRegex = new RegExp(`\\b${r}\\b`, "i");
      if (ratingRegex.test(joined)) {
        rating = r.toLowerCase();
        break;
      }
    }

    // Extract section
    let section = "";
    for (const s of KNOWN_SECTIONS) {
      if (joined.includes(s)) {
        section = s.replace("Nurse/ Assistant", "Nurse/Assistant");
        break;
      }
    }

    // Extract provider name - typically "Last, First M" or "Last, First"
    // It appears after the section/question and before the rating
    // This is the trickiest part - we'll use a heuristic approach
    let providerName = "";

    // Look for "Last, First" pattern - capital letter followed by lowercase, comma, space, capital
    const providerPatterns = joined.match(
      /(?:Murray FM\s*Res\s+(?:[\w\/\s]+?)\s+(?:[\w\/\s]+?)\s+(?:Family\s*Medicine\s*,?\s*)?)([\w\s]+?,\s*[\w\s]+?)(?:\s*(?:Positive|Negative|Mixed|Neutral|Open))/i
    );

    if (!providerPatterns) {
      // Fallback: try to find provider name between known landmarks
      // The provider appears after the section repetition and before the rating
      const afterSection = section ? joined.split(section).pop() || "" : joined;
      const nameMatch = afterSection.match(
        /(?:Family\s*Medicine\s*,?\s*(?:Comments[^,]*,?\s*)?)?([A-Z][\w\s'-]+?,\s*[A-Z][\w\s'-]*?)(?:\s*(?:Positive|Negative|Mixed|Neutral|Open))/
      );
      if (nameMatch) providerName = nameMatch[1].trim();
    } else {
      providerName = providerPatterns[1].trim();
    }

    // Clean provider name — strip known section names that PDF extraction may prepend
    for (const s of KNOWN_SECTIONS) {
      const cleanSection = s.replace("Nurse/ Assistant", "Nurse/Assistant");
      if (providerName.startsWith(cleanSection + " ")) {
        providerName = providerName.slice(cleanSection.length).trim();
      }
      if (providerName.startsWith(cleanSection)) {
        providerName = providerName.slice(cleanSection.length).trim();
      }
    }
    // Also strip "Access to Care", "Access toCare" variants
    providerName = providerName.replace(/^Access\s*to\s*Care\s*/i, "").trim();
    // Strip "Family Medicine" prefix if present
    providerName = providerName.replace(/^Family\s*Medicine\s*,?\s*(Comments[^,]*,?\s*)?/i, "").trim();

    // Extract comment text - everything after the rating to end of record
    let comment = "";
    if (rating) {
      // Find the rating in the joined text and take everything after it
      const ratingIdx = joined.toLowerCase().lastIndexOf(rating);
      if (ratingIdx >= 0) {
        comment = joined.slice(ratingIdx + rating.length).trim();
      }
    }

    // Clean up the comment - remove any trailing metadata
    comment = comment
      .replace(/Dashboard Name:.*$/s, "")
      .replace(/This chart uses data.*$/s, "")
      .trim();

    // Fix hyphenation artifacts from PDF (e.g., "satis fied" → "satisfied")
    comment = comment.replace(/(\w+)\s*\n\s*(\w+)/g, (_, a, b) => {
      // If the break looks like a word split, join them
      if (a.length <= 4 && /^[a-z]/.test(b)) return a + b;
      return a + " " + b;
    });

    if (barcode && date) {
      comments.push({
        survey_barcode: barcode,
        received_date: date,
        site: "Murray FM Res",
        survey_section: section,
        comment_question: section, // Same as section in Press Ganey
        provider_name: providerName,
        rating,
        comment,
      });
    }
  }

  return comments;
}

/**
 * Main entry point: parse a Press Ganey PDF file into structured comments.
 */
export async function parsePressGaneyPdf(file: File): Promise<ParsedComment[]> {
  const pages = await extractTextFromPdf(file);
  return parseCommentsFromText(pages);
}
