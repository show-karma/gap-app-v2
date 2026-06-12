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
      d="M16.81 8.09L10.45 14.45C10.39 14.51 10.32 14.56 10.24 14.59C10.17 14.62 10.08 14.64 10 14.64C9.92 14.64 9.83 14.62 9.76 14.59C9.68 14.56 9.61 14.51 9.55 14.45L3.19 8.09C3.1 8 3.04 7.88 3.01 7.76C2.99 7.64 3 7.51 3.05 7.39C3.1 7.28 3.18 7.18 3.28 7.11C3.39 7.04 3.51 7 3.64 7H16.36C16.49 7 16.61 7.04 16.72 7.11C16.82 7.18 16.9 7.28 16.95 7.39C17 7.51 17.01 7.64 16.99 7.76C16.96 7.88 16.9 8 16.81 8.09Z"
      fill="currentColor"
    />
  </svg>
);
