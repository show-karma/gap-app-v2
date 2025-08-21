import React from "react";

interface Props {
  className?: string;
}

export const Globe = ({ className }: Props) => (
  <svg width="18" height="18" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M12 22.57C17.5228 22.57 22 18.0929 22 12.57C22 7.04716 17.5228 2.57001 12 2.57001C6.47715 2.57001 2 7.04716 2 12.57C2 18.0929 6.47715 22.57 12 22.57Z" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M16.3605 3.56C16.3605 3.56 17.7606 7.55999 11.9506 10.36C6.14056 13.16 17.3105 10.76 16.8905 14.45C16.5905 17.01 13.1106 16.45 12.5806 19.03C12.6906 14.85 12.0606 12.32 9.83057 11.75C7.60057 11.18 4.27058 10.52 7.34058 7.06C9.34058 4.76 5.48047 4.97998 5.48047 4.97998" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);
