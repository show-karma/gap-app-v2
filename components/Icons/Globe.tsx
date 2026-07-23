interface Props {
  className?: string;
}

export const Globe = ({ className }: Props) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 25 25"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 22.57C17.52 22.57 22 18.09 22 12.57C22 7.05 17.52 2.57 12 2.57C6.48 2.57 2 7.05 2 12.57C2 18.09 6.48 22.57 12 22.57Z"
      stroke="#000"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.36 3.56C16.36 3.56 17.76 7.56 11.95 10.36C6.14 13.16 17.31 10.76 16.89 14.45C16.59 17.01 13.11 16.45 12.58 19.03C12.69 14.85 12.06 12.32 9.83 11.75C7.6 11.18 4.27 10.52 7.34 7.06C9.34 4.76 5.48 4.98 5.48 4.98"
      stroke="#000"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
