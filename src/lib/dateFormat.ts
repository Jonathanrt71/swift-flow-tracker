import { format, parseISO, differenceInCalendarDays } from "date-fns";

export interface PersonNameLike {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

const ordinalSuffix = (d: number): string => {
  if (d > 3 && d < 21) return "th";
  switch (d % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
};

export const formatCardDate = (
  dateStr: string | null
): { text: string; urgent: boolean } | null => {
  if (!dateStr) return null;
  try {
    const dt = parseISO(dateStr.split("T")[0]);
    const days = differenceInCalendarDays(dt, new Date());
    const day = dt.getDate();
    const dayText = `${format(dt, "EEE")} ${day}${ordinalSuffix(day)}`;

    if (days < 0) return { text: dayText, urgent: true };
    return { text: dayText, urgent: false };
  } catch {
    return null;
  }
};

export const formatLastFirst = (name: string | null | undefined): string => {
  if (!name) return "?";
  const trimmed = name.trim();
  if (!trimmed) return "?";
  if (trimmed.includes(",")) return trimmed;

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts[parts.length - 1];
  const firstInitial = parts[0][0];
  return `${last}, ${firstInitial}`;
};

export const formatPersonName = (person: PersonNameLike | null | undefined): string => {
  if (!person) return "?";

  const first = person.first_name?.trim() || "";
  const last = person.last_name?.trim() || "";

  if (last && first) return `${last}, ${first[0]}`;
  if (last) return last;
  if (first) return first;

  return formatLastFirst(person.display_name);
};

/** Build initials from first_name / last_name */
export const getInitialsFromParts = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string => {
  const f = firstName?.trim();
  const l = lastName?.trim();
  if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
  if (f) return f[0].toUpperCase();
  if (l) return l[0].toUpperCase();
  return "?";
};
