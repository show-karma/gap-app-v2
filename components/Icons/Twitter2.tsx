import React from "react";

interface Props {
	className?: string;
}

export const Twitter2Icon = ({ className }: Props) => (
	<svg
		width="48"
		height="48"
		viewBox="0 0 48 48"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className={className}
	>
		<path
			d="M27.7237 20.9375L42.2943 4H38.8412L26.1899 18.7063L16.0849 4H4.42993L19.7106 26.2388L4.42993 44H7.88306L21.2437 28.4697L31.9149 44H43.5699L27.7227 20.9375H27.7237ZM22.9943 26.4344L21.4459 24.22L9.12712 6.59938H14.4309L24.3718 20.82L25.9199 23.0344L38.8427 41.5187H33.5396L22.9943 26.4353V26.4344Z"
			fill="currentColor"
		/>
	</svg>
);
