"use client";

interface ProgramDetailsCardProps {
  programBudget?: string | number;
  fundingMin?: string | number;
  fundingMax?: string | number;
  grantTypes?: string[];
  startsAt?: string;
  endsAt?: string;
}

function formatCurrencyValue(amount?: string | number): string {
  if (amount === undefined || amount === null || amount === "") return "TBD";
  const num =
    typeof amount === "number" ? amount : Number.parseFloat(String(amount).replace(/,/g, ""));
  if (Number.isNaN(num) || num === 0) return "TBD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function hasValidBudget(budget?: string | number): boolean {
  if (budget == null) return false;
  if (budget === "" || budget === 0 || budget === "0") return false;
  const numericValue = typeof budget === "number" ? budget : Number.parseFloat(budget);
  return !Number.isNaN(numericValue) && numericValue > 0;
}

function hasFundingRange(min?: string | number, max?: string | number): boolean {
  const hasMin = min != null && min !== "" && min !== 0 && min !== "0";
  const hasMax = max != null && max !== "" && max !== 0 && max !== "0";
  return hasMin || hasMax;
}

function formatFundingRange(min?: string | number, max?: string | number): string {
  const minFormatted = min ? formatCurrencyValue(min) : null;
  const maxFormatted = max ? formatCurrencyValue(max) : null;
  if (minFormatted && minFormatted !== "TBD" && maxFormatted && maxFormatted !== "TBD") {
    return `${minFormatted} - ${maxFormatted}`;
  }
  if (minFormatted && minFormatted !== "TBD") return `From ${minFormatted}`;
  if (maxFormatted && maxFormatted !== "TBD") return `Up to ${maxFormatted}`;
  return "TBD";
}

function formatDateWithTimeUTC(dateString?: string): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

export function ProgramDetailsCard({
  programBudget,
  fundingMin,
  fundingMax,
  grantTypes,
  startsAt,
  endsAt,
}: ProgramDetailsCardProps) {
  const showBudget = hasValidBudget(programBudget);
  const showFundingRange = hasFundingRange(fundingMin, fundingMax);
  const showGrantTypes = grantTypes && grantTypes.length > 0;
  const showDates = !!startsAt || !!endsAt;

  if (!showBudget && !showFundingRange && !showGrantTypes && !showDates) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="mb-4 text-xl font-semibold">Program Details</h3>
      <div className="space-y-4">
        {showDates ? (
          <div className="space-y-2">
            {startsAt ? (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Starts</p>
                <p className="text-base font-medium">{formatDateWithTimeUTC(startsAt)}</p>
              </div>
            ) : null}
            {endsAt ? (
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Ends</p>
                <p className="text-base font-medium">{formatDateWithTimeUTC(endsAt)}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {showBudget ? (
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Program Budget</p>
            <p className="text-lg font-bold text-primary">{formatCurrencyValue(programBudget)}</p>
          </div>
        ) : null}

        {showFundingRange ? (
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Funding Range</p>
            <p className="text-lg font-bold text-primary">
              {formatFundingRange(fundingMin, fundingMax)}
            </p>
          </div>
        ) : null}

        {showGrantTypes ? (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Grant Types</p>
            <div className="flex flex-wrap gap-1">
              {grantTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-md bg-muted px-2 py-0.5 text-xs text-foreground"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
