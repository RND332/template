import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import BigNumber from "bignumber.js";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function shorten(
	BNAmount: BigNumber,
	isExact = false,
	dollars = false,
	insertSpaces = true,
) {
	const absAmount = BNAmount.absoluteValue();
	const isNegative = BNAmount.isLessThan(0);

	function getShortenMode(absAmount: BigNumber) {
		if (absAmount.isEqualTo(new BigNumber(0))) return "zero";
		if (absAmount.isGreaterThanOrEqualTo(new BigNumber(1_000_000_000)))
			return "b";
		if (absAmount.isGreaterThanOrEqualTo(new BigNumber(1_000_000))) return "m";
		if (absAmount.isGreaterThanOrEqualTo(new BigNumber(1_000))) return "k";
		if (absAmount.isLessThan(new BigNumber(0.000001))) return "d";
		return "cut";
	}

	const mode = getShortenMode(absAmount);

	if (mode === "zero") return dollars ? "0.00" : "0";

	const formatResult = (value: string, suffix = "") => {
		let res = value;
		if (!dollars) res = new BigNumber(res).toString();
		if (insertSpaces) res = formatNumberWithSpaces(res);
		return `${isNegative ? "-" : ""}${res}${suffix}`;
	};

	switch (mode) {
		case "b": {
			const res = absAmount
				.dividedBy(new BigNumber(1_000_000_000))
				.toFixed(2, 1);
			return formatResult(res, "B");
		}
		case "m": {
			const res = absAmount.dividedBy(new BigNumber(1_000_000)).toFixed(2, 1);
			return formatResult(res, "M");
		}
		case "k": {
			const res = absAmount.dividedBy(new BigNumber(1_000)).toFixed(2, 1);
			return formatResult(res, "K");
		}
		case "d": {
			if (isExact) {
				const rounded = absAmount.toPrecision(3);
				return `${isNegative ? "-" : ""}${new BigNumber(rounded).toExponential()}`;
			}
			return `${isNegative ? "-" : ""}< 0.000001`;
		}
		default: {
			const res = absAmount.toFixed(dollars ? 2 : 4, 1);
			return formatResult(res);
		}
	}
}

export function formatNumberWithSpaces(purifiedNumberString: string) {
	const hasDot = purifiedNumberString.includes(".");

	const [beforeDot, afterDot] = purifiedNumberString.split(".");

	const { length } = beforeDot;

	if (length <= 3) return purifiedNumberString;

	let intWithSpaces = "";

	for (let i = length; i > 0; i -= 3) {
		const newDigits = beforeDot.slice(Math.max(i - 3, 0), i);

		if (i - 3 > 0) intWithSpaces = ` ${newDigits}${intWithSpaces}`;
		else intWithSpaces = newDigits + intWithSpaces;
	}
	if (hasDot) return `${intWithSpaces}.${afterDot}`;

	return intWithSpaces;
}
