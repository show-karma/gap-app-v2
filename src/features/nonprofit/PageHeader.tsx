import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function NonprofitPageHeader({ eyebrow, title, description, actions }: Props) {
  return (
    <header className="flex flex-col gap-3 border-b border-gray-200 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight text-gray-900">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-gray-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  );
}
