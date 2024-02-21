export const formatTimestamp = (
  timestamp: {
    $timestamp: { t: number; i: number };
  },
  isUTC: boolean = false,
  formatOption: string = "MMM D, YYYY"
): string => {
  let date = new Date(timestamp.$timestamp.t * 1000);
  const d = new Date(date);

  const pad = (num: number): string => num.toString().padStart(2, "0");

  let year = isUTC ? d.getUTCFullYear() : d.getFullYear();
  let month = isUTC ? d.getUTCMonth() : d.getMonth();
  let day = isUTC ? d.getUTCDate() : d.getDate();

  // Customize the format based on the formatOption
  // Implementing only 'MMM D, YYYY' for simplicity, but you can expand this
  if (formatOption === "MMM D, YYYY") {
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
    return `${monthNames[month]} ${day}, ${year}`;
  }

  // Default to ISO string if format is not recognized
  return d.toISOString();
};
