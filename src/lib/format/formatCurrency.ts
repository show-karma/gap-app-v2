import millify from "millify";

export default function formatCurrency(value: number) {
  let result = "";
  if (value == 0) {
    result = "0";
  } else if (value < 1) {
    result = Number(value)?.toFixed(2);
  } else {
    result = millify(value, {
      precision: 1,
      units: ["", "K", "M", "B", "T", "P", "E"],
    });
  }
  return result;
}
