import { format, parseISO, differenceInCalendarDays } from "date-fns";

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
    if (days <= 7) return { text: dayText, urgent: true };
    return { text: dayText, urgent: false };
  } catch {
    return null;
  }
};
