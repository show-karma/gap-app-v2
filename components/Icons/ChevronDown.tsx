import React from "react";

interface Props {
  className?: string;
}

export const ChevronDown = ({ className }: Props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M16.8134 8.08651L10.4502 14.4497C10.3911 14.5089 10.3209 14.5558 10.2437 14.5878C10.1664 14.6198 10.0836 14.6363 10 14.6363C9.91638 14.6363 9.83358 14.6198 9.75633 14.5878C9.67908 14.5558 9.6089 14.5089 9.5498 14.4497L3.18662 8.08651C3.09753 7.99752 3.03685 7.8841 3.01225 7.7606C2.98766 7.6371 3.00026 7.50908 3.04847 7.39274C3.09667 7.27641 3.1783 7.17699 3.28304 7.10708C3.38777 7.03717 3.51089 6.9999 3.63682 7H16.3632C16.4891 6.9999 16.6122 7.03717 16.717 7.10708C16.8217 7.17699 16.9033 7.27641 16.9515 7.39274C16.9997 7.50908 17.0123 7.6371 16.9877 7.7606C16.9632 7.8841 16.9025 7.99752 16.8134 8.08651Z"
      fill="currentColor"
    />
  </svg>
);
