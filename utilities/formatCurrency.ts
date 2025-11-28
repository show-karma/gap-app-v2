import millify from "millify";

export default function formatCurrency(value: number) {
  let result = "";
  if (value === 0) {
    result = "0";
  } else if (value < 1) {
    result = Number(value)?.toFixed(2);
  } else {
    try {
      result = millify(value, {
        precision: 1,
        units: ["", "K", "M", "B", "T", "P", "E"],
        lowercase: false,
      });
    } catch (_error) {
      // Fallback if millify fails (e.g., locale issues in test environments)
      if (value >= 1000000000000) {
        result = `${(value / 1000000000000).toFixed(1)}T`;
      } else if (value >= 1000000000) {
        result = `${(value / 1000000000).toFixed(1)}B`;
      } else if (value >= 1000000) {
        result = `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        result = `${(value / 1000).toFixed(1)}K`;
      } else {
        result = value.toString();
      }
    }
  }
  return result;
}
