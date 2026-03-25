import { fillDateRangeWithValues } from "../fillDateRangeWithValues";

// Fix "now" to 2024-03-15 00:00:00 UTC so tests are deterministic
const NOW_UTC = Date.UTC(2024, 2, 15); // March 15, 2024

beforeEach(() => {
  vi.useFakeTimers();
  jest.setSystemTime(new Date(NOW_UTC));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("fillDateRangeWithValues", () => {
  it("returns single zero-value entry for empty input (today)", () => {
    // With no data, the range is just today→today
    const result = fillDateRangeWithValues([]);
    expect(result).toEqual([{ date: "2024-03-15T00:00:00.000Z", value: 0 }]);
  });

  it("fills gaps between data points with zeroes", () => {
    const data = [
      { value: 10, date: "2024-03-10", timestamp: Date.UTC(2024, 2, 10, 5) },
      { value: 20, date: "2024-03-12", timestamp: Date.UTC(2024, 2, 12, 12) },
    ];

    const result = fillDateRangeWithValues(data);

    // Should fill from March 10 to March 15 (today)
    expect(result).toEqual([
      { date: "2024-03-10T00:00:00.000Z", value: 10 },
      { date: "2024-03-11T00:00:00.000Z", value: 0 },
      { date: "2024-03-12T00:00:00.000Z", value: 20 },
      { date: "2024-03-13T00:00:00.000Z", value: 0 },
      { date: "2024-03-14T00:00:00.000Z", value: 0 },
      { date: "2024-03-15T00:00:00.000Z", value: 0 },
    ]);
  });

  it("handles single data point and fills to today", () => {
    const data = [{ value: 42, date: "2024-03-13", timestamp: Date.UTC(2024, 2, 13, 8) }];

    const result = fillDateRangeWithValues(data);

    expect(result).toEqual([
      { date: "2024-03-13T00:00:00.000Z", value: 42 },
      { date: "2024-03-14T00:00:00.000Z", value: 0 },
      { date: "2024-03-15T00:00:00.000Z", value: 0 },
    ]);
  });

  it("handles data point on today", () => {
    const data = [{ value: 99, date: "2024-03-15", timestamp: Date.UTC(2024, 2, 15, 10) }];

    const result = fillDateRangeWithValues(data);

    expect(result).toEqual([{ date: "2024-03-15T00:00:00.000Z", value: 99 }]);
  });

  it("normalizes timestamps to UTC midnight regardless of time-of-day", () => {
    const data = [
      {
        value: 5,
        date: "2024-03-14",
        timestamp: Date.UTC(2024, 2, 14, 23, 59, 59),
      },
    ];

    const result = fillDateRangeWithValues(data);

    expect(result[0]).toEqual({
      date: "2024-03-14T00:00:00.000Z",
      value: 5,
    });
  });

  it("handles string values", () => {
    const data = [{ value: "hello", date: "2024-03-15", timestamp: Date.UTC(2024, 2, 15) }];

    const result = fillDateRangeWithValues(data);

    expect(result).toEqual([{ date: "2024-03-15T00:00:00.000Z", value: "hello" }]);
  });

  it("produces dates all at UTC midnight", () => {
    const data = [{ value: 1, date: "2024-03-13", timestamp: Date.UTC(2024, 2, 13, 15) }];

    const result = fillDateRangeWithValues(data);

    for (const entry of result) {
      expect(entry.date).toMatch(/T00:00:00\.000Z$/);
    }
  });
});
