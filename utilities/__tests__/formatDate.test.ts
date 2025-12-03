import { formatDate } from "../formatDate";

describe("formatDate", () => {
  const testDate = new Date("2024-01-15T14:30:00Z");
  const testTimestamp = testDate.getTime();

  describe("MMM D, YYYY format", () => {
    it("should format date with local timezone", () => {
      const result = formatDate(testDate, "local", "MMM D, YYYY");
      expect(result).toMatch(/Jan \d+, 2024/);
    });

    it("should format date with UTC timezone", () => {
      const result = formatDate(testDate, "UTC", "MMM D, YYYY");
      expect(result).toBe("Jan 15, 2024");
    });

    it("should format timestamp", () => {
      const result = formatDate(testTimestamp, "UTC", "MMM D, YYYY");
      expect(result).toBe("Jan 15, 2024");
    });

    it("should format date string", () => {
      const result = formatDate("2024-01-15", "UTC", "MMM D, YYYY");
      expect(result).toBe("Jan 15, 2024");
    });

    it("should use default format when not specified", () => {
      const result = formatDate(testDate, "UTC");
      expect(result).toBe("Jan 15, 2024");
    });

    it("should use default timezone when not specified", () => {
      const result = formatDate(testDate);
      expect(result).toMatch(/Jan \d+, 2024/);
    });

    it("should format all months correctly", () => {
      const months = [
        { date: "2024-01-01", month: "Jan" },
        { date: "2024-02-01", month: "Feb" },
        { date: "2024-03-01", month: "Mar" },
        { date: "2024-04-01", month: "Apr" },
        { date: "2024-05-01", month: "May" },
        { date: "2024-06-01", month: "Jun" },
        { date: "2024-07-01", month: "Jul" },
        { date: "2024-08-01", month: "Aug" },
        { date: "2024-09-01", month: "Sep" },
        { date: "2024-10-01", month: "Oct" },
        { date: "2024-11-01", month: "Nov" },
        { date: "2024-12-01", month: "Dec" },
      ];

      months.forEach(({ date, month }) => {
        const result = formatDate(date, "UTC", "MMM D, YYYY");
        expect(result).toContain(month);
      });
    });
  });

  describe("DDD, MMM DD format", () => {
    it("should format date with day name", () => {
      const result = formatDate("2024-01-15T00:00:00Z", "UTC", "DDD, MMM DD");
      // Year is included if not current year
      expect(result).toBe("Monday, Jan 15 2024");
    });

    it("should include year if not current year", () => {
      const pastDate = new Date("2020-03-10T00:00:00Z");
      const result = formatDate(pastDate, "UTC", "DDD, MMM DD");
      expect(result).toBe("Tuesday, Mar 10 2020");
    });

    it("should not include year for current year", () => {
      const currentYear = new Date().getFullYear();
      const thisYearDate = new Date(`${currentYear}-03-10T00:00:00Z`);
      const result = formatDate(thisYearDate, "UTC", "DDD, MMM DD");
      expect(result).not.toContain(currentYear.toString());
      expect(result).toMatch(/\w+, Mar 10$/);
    });

    it("should format all days of week correctly", () => {
      const daysMap = [
        { date: "2024-01-14", day: "Sunday" }, // Jan 14, 2024 is Sunday
        { date: "2024-01-15", day: "Monday" },
        { date: "2024-01-16", day: "Tuesday" },
        { date: "2024-01-17", day: "Wednesday" },
        { date: "2024-01-18", day: "Thursday" },
        { date: "2024-01-19", day: "Friday" },
        { date: "2024-01-20", day: "Saturday" },
      ];

      daysMap.forEach(({ date, day }) => {
        const result = formatDate(date, "UTC", "DDD, MMM DD");
        expect(result).toContain(day);
      });
    });
  });

  describe("h:mm a format", () => {
    it("should format time in AM", () => {
      const morningDate = new Date("2024-01-15T09:30:00Z");
      const result = formatDate(morningDate, "UTC", "h:mm a");
      expect(result).toContain("9:30 AM");
    });

    it("should format time in PM", () => {
      const afternoonDate = new Date("2024-01-15T14:30:00Z");
      const result = formatDate(afternoonDate, "UTC", "h:mm a");
      expect(result).toContain("2:30 PM");
    });

    it("should format midnight correctly", () => {
      const midnightDate = new Date("2024-01-15T00:00:00Z");
      const result = formatDate(midnightDate, "UTC", "h:mm a");
      expect(result).toContain("12:00 AM");
    });

    it("should format noon correctly", () => {
      const noonDate = new Date("2024-01-15T12:00:00Z");
      const result = formatDate(noonDate, "UTC", "h:mm a");
      expect(result).toContain("12:00 PM");
    });

    it("should include date if not today", () => {
      const pastDate = new Date("2020-01-15T14:30:00Z");
      const result = formatDate(pastDate, "UTC", "h:mm a");
      expect(result).toContain("Jan 15, 2020");
      expect(result).toContain("2:30 PM");
    });

    it("should pad minutes with zero", () => {
      const date = new Date("2024-01-15T14:05:00Z");
      const result = formatDate(date, "UTC", "h:mm a");
      expect(result).toContain("05");
    });
  });

  describe("ISO format", () => {
    it("should return ISO string", () => {
      const result = formatDate(testDate, "ISO");
      expect(result).toBe(testDate.toISOString());
    });

    it("should ignore format option for ISO", () => {
      const result = formatDate(testDate, "ISO", "MMM D, YYYY");
      expect(result).toBe(testDate.toISOString());
    });
  });

  describe("Edge cases", () => {
    it("should handle leap year", () => {
      const leapDate = new Date("2024-02-29T00:00:00Z");
      const result = formatDate(leapDate, "UTC", "MMM D, YYYY");
      expect(result).toBe("Feb 29, 2024");
    });

    it("should handle year transitions", () => {
      const newYear = new Date("2024-01-01T00:00:00Z");
      const result = formatDate(newYear, "UTC", "MMM D, YYYY");
      expect(result).toBe("Jan 1, 2024");
    });

    it("should handle end of month", () => {
      const endOfMonth = new Date("2024-01-31T23:59:59Z");
      const result = formatDate(endOfMonth, "UTC", "MMM D, YYYY");
      expect(result).toBe("Jan 31, 2024");
    });

    it("should handle very old dates", () => {
      const oldDate = new Date("1900-01-01T00:00:00Z");
      const result = formatDate(oldDate, "UTC", "MMM D, YYYY");
      expect(result).toBe("Jan 1, 1900");
    });

    it("should handle future dates", () => {
      const futureDate = new Date("2100-12-31T23:59:59Z");
      const result = formatDate(futureDate, "UTC", "MMM D, YYYY");
      expect(result).toBe("Dec 31, 2100");
    });
  });

  describe("Timezone handling", () => {
    it("should use UTC methods when timezone is UTC", () => {
      const date = new Date("2024-01-15T23:30:00Z");
      const result = formatDate(date, "UTC", "MMM D, YYYY");
      expect(result).toBe("Jan 15, 2024");
    });

    it("should use local methods when timezone is local", () => {
      const date = new Date("2024-01-15T00:00:00Z");
      const result = formatDate(date, "local", "MMM D, YYYY");
      // Result will vary based on local timezone, just check it doesn't crash
      expect(result).toMatch(/Jan \d+, 2024/);
    });
  });
});
