import Link from "next/link";
import { type FC, type ReactNode } from "react";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
}

export const ExternalLink: FC<ExternalLinkProps> = ({
  href,
  children,
  className,
  target = "_blank",
  rel = "noopener noreferrer",
}) => {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={className}
    >
      {children}
    </Link>
  );
};