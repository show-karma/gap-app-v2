import { addDays, isSameDay, min } from "date-fns";

interface DataType {
  value: string | number;
  date: string;
  timestamp: number;
}

interface ReturnType {
  value: string | number;
  date: string;
}

/** Truncate a timestamp to UTC midnight */
function toUTCMidnight(ts: number): Date {
  const d = new Date(ts);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function todayUTCMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export const fillDateRangeWithValues = (dataArray: DataType[]) => {
  const filledArray: ReturnType[] = [];
  const localDataArray = dataArray.map((data) => ({
    ...data,
    timestamp: toUTCMidnight(data.timestamp).getTime(),
  }));

  const firstDayOfRange =
    localDataArray.length > 0
      ? min(localDataArray.map((data) => new Date(data.timestamp)))
      : todayUTCMidnight();

  let currentDate = toUTCMidnight(firstDayOfRange.getTime());
  const lastDayOfRange = todayUTCMidnight();

  while (currentDate <= lastDayOfRange) {
    const matchingData = localDataArray.find((data) => {
      return isSameDay(new Date(data.timestamp), currentDate);
    });
    if (matchingData) {
      filledArray.push({
        date: toUTCMidnight(matchingData.timestamp).toISOString(),
        value: matchingData.value,
      });
    } else {
      filledArray.push({
        date: currentDate.toISOString(),
        value: 0,
      });
    }
    currentDate = addDays(currentDate, 1);
  }

  return filledArray;
};
