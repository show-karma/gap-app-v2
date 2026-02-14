interface DataType {
  value: string | number;
  date: string;
  timestamp: number;
}

interface ReturnType {
  value: string | number;
  date: string;
}

/**
 * Normalize a timestamp to the start of the UTC day (midnight UTC).
 */
function startOfUTCDay(ts: number): Date {
  const d = new Date(ts);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const fillDateRangeWithValues = (dataArray: DataType[]) => {
  const filledArray: ReturnType[] = [];
  const localDataArray = dataArray.map((data) => ({
    ...data,
    timestamp: startOfUTCDay(data.timestamp).getTime(),
  }));

  const minTimestamp = Math.min(...localDataArray.map((d) => d.timestamp));
  let currentDate = startOfUTCDay(minTimestamp);
  const lastDayOfRange = startOfUTCDay(Date.now());

  while (currentDate <= lastDayOfRange) {
    const matchingData = localDataArray.find((data) => {
      return startOfUTCDay(data.timestamp).getTime() === currentDate.getTime();
    });
    if (matchingData) {
      filledArray.push({
        date: startOfUTCDay(matchingData.timestamp).toISOString(),
        value: matchingData.value,
      });
    } else {
      filledArray.push({
        date: currentDate.toISOString(),
        value: 0,
      });
    }
    currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
  }

  return filledArray;
};
