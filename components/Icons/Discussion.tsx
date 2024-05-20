import React from "react";

interface Props {
  className?: string;
}

export const DiscussionIcon = ({ className }: Props) => (
  <svg
    fill="currentColor"
    width="800px"
    height="800px"
    viewBox="-0.5 0 19 19"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M5.57 7.532v3.356l-2.248 1.403c-.222.138-.403.038-.403-.223V10.68H1.852a.476.476 0 0 1-.475-.475V3.643a.476.476 0 0 1 .475-.475h9.39a.476.476 0 0 1 .475.475v2.305H7.154A1.585 1.585 0 0 0 5.57 7.532zm11.449 0v6.563a.476.476 0 0 1-.475.475h-1.049v1.436c0 .261-.18.362-.403.224l-2.605-1.626a.54.54 0 0 1-.048-.034H7.154a.476.476 0 0 1-.475-.475V7.532a.477.477 0 0 1 .475-.475h9.39a.476.476 0 0 1 .475.475z" />
  </svg>
);
