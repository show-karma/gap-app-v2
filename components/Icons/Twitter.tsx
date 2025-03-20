import React from "react";

interface Props {
  className?: string;
}

export const TwitterIcon = ({ className }: Props) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M0.0390244 0L6.21707 8.82606L0 16H1.4L6.84146 9.71726L11.239 16H16L9.47561 6.67883L15.261 0H13.8634L8.85122 5.78502L4.80244 0H0.0390244ZM2.09756 1.09967H4.28537L13.9439 14.8977H11.7561L2.09756 1.09967Z"
      fill="currentColor"
    />
  </svg>
);
