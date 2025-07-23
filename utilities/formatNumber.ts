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
