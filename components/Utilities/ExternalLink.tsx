import type { AnchorHTMLAttributes, ReactNode } from "react";

interface ExternalLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  className?: string;
}

export const ExternalLink = ({ children, ...props }: ExternalLinkProps) => (
  <a target="_blank" rel="noreferrer" {...props}>
    {children}
  </a>
);
