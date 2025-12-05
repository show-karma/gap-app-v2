type TimeZoneFormat = "UTC" | "ISO" | "local";
type DateFormatOption = "MMM D, YYYY" | "h:mm a" | "DDD, MMM DD";

/**
 * Normalizes a Unix timestamp to milliseconds.
 * Handles both seconds (10 digits) and milliseconds (13 digits) formats.
 *
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Timestamp in milliseconds suitable for JavaScript Date constructor
 */
export const normalizeTimestamp = (timestamp: number): number => {
  // Check digit count to determine if seconds or milliseconds
  // Seconds timestamps (10 digits): 1000000000 to 9999999999 (year 2001-2286)
  // Milliseconds timestamps (13 digits): 1000000000000+ (year 2001+)
  const digitCount = Math.floor(Math.log10(Math.abs(timestamp))) + 1;
  const isUnixSeconds = digitCount <= 10;

  return isUnixSeconds ? timestamp * 1000 : timestamp;
};

export const formatDate = (
  date: number | Date | string | undefined | null,
  timeZoneFormat: TimeZoneFormat = "local",
  formatOption: DateFormatOption = "MMM D, YYYY"
): string => {
  // Handle undefined/null input
  if (date === undefined || date === null) {
    return "";
  }

  // Auto-detect and normalize Unix timestamps (seconds vs milliseconds)
  const normalizedDate =
    typeof date === "number" && date > 0 ? normalizeTimestamp(date) : date;

  const d = new Date(normalizedDate);

  // Handle invalid dates
  if (isNaN(d.getTime())) {
    return "";
  }

  const pad = (num: number): string => num.toString().padStart(2, "0");

  // For ISO format, return immediately
  if (timeZoneFormat === "ISO") {
    return d.toISOString();
  }

  const isUTC = timeZoneFormat === "UTC";
  const year = isUTC ? d.getUTCFullYear() : d.getFullYear();
  const month = isUTC ? d.getUTCMonth() : d.getMonth();
  const day = isUTC ? d.getUTCDate() : d.getDate();
  const hours = isUTC ? d.getUTCHours() : d.getHours();
  const minutes = isUTC ? d.getUTCMinutes() : d.getMinutes();
  const dayOfWeek = isUTC ? d.getUTCDay() : d.getDay();

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  if (formatOption === "MMM D, YYYY") {
    return `${monthNames[month]} ${day}, ${year}`;
  }

  if (formatOption === "DDD, MMM DD") {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = days[dayOfWeek];
    const currentYear = new Date().getFullYear();
    const yearString = year !== currentYear ? ` ${year}` : "";
    return `${dayName}, ${monthNames[month]} ${day}${yearString}`;
  }

  if (formatOption === "h:mm a") {
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = pad(minutes);
    const timeString = `${formattedHours}:${formattedMinutes} ${ampm}`;

    const today = new Date();
    const isToday =
      today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

    if (isToday) {
      return timeString;
    }

    return `${monthNames[month]} ${day}, ${year}. ${timeString}`;
  }

  return d.toISOString();
};
