import React from "react";

interface Props {
	className?: string;
}

export const ArrowInIcon = ({ className }: Props) => (
	<svg
		width="20"
		height="20"
		viewBox="0 0 20 20"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		className={className}
	>
		<g clip-path="url(#clip0_5872_24712)">
			<path
				d="M9.375 15.625L9.37422 10.6258L4.375 10.625"
				stroke="currentColor"
				strokeWidth="1.25"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M3.125 16.875L9.375 10.625"
				stroke="currentColor"
				strokeWidth="1.25"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M12.5 14.375H16.25C16.4158 14.375 16.5747 14.3092 16.6919 14.1919C16.8092 14.0747 16.875 13.9158 16.875 13.75V3.75C16.875 3.58424 16.8092 3.42527 16.6919 3.30806C16.5747 3.19085 16.4158 3.125 16.25 3.125H6.25C6.08424 3.125 5.92527 3.19085 5.80806 3.30806C5.69085 3.42527 5.625 3.58424 5.625 3.75V7.5"
				stroke="currentColor"
				strokeWidth="1.25"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</g>
		<defs>
			<clipPath id="clip0_5872_24712">
				<rect width="20" height="20" fill="white" />
			</clipPath>
		</defs>
	</svg>
);
