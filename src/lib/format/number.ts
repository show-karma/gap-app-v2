export const formatNumberPercentage = (numberToFormat: number | string) => {
  if (typeof numberToFormat === "string") {
    return +numberToFormat > 0.01
      ? `${(+numberToFormat).toFixed(2)}%`
      : "< 0.01%";
  }

  return numberToFormat > 0.01 ? `${+numberToFormat.toFixed(2)}%` : "< 0.01%";
};

export const formatPercentage = (numberToFormat: number | string) => {
  const formattedNumber = Math.round(Math.floor(+numberToFormat * 100) / 100);
  return formattedNumber;
};

export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};