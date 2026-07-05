const roundNumberWithPlus = (
  value: string | number,
  shouldRound: boolean = false
): string | number => {
  // If it's already a string, return as-is
  if (typeof value === "string") {
    return value;
  }

  // If rounding is disabled, return the original number
  if (!shouldRound) {
    return value;
  }

  // Values under 100 round down to 0, which would render a misleading "0+" —
  // return them as-is instead
  if (value < 100) {
    return value;
  }

  // Round down to nearest hundred and add "+"
  const roundedDown = Math.floor(value / 100) * 100;
  return `${roundedDown.toLocaleString()}+`;
};

export default roundNumberWithPlus;
