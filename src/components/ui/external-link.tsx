import Link from "next/link";
import { type FC, type ReactNode } from "react";

interface ExternalLinkProps {
  href?: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  style?: React.CSSProperties;
}

export const ExternalLink: FC<ExternalLinkProps> = ({
  href = "",
  children,
  className,
  target = "_blank",
  rel = "noopener noreferrer",
  style,
}) => {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
};
