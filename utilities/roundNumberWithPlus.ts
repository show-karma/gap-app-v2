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

  // Handle edge cases: zero or numbers less than 10
  if (value === 0 || value < 10) {
    return value;
  }

  // Round down to nearest hundred and add "+"
  const roundedDown = Math.floor(value / 100) * 100;
  return `${roundedDown.toLocaleString()}+`;
};

export default roundNumberWithPlus;
