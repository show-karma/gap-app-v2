import { BanknotesIcon } from "@heroicons/react/24/outline";

interface CreateDisbursementFabProps {
  count: number;
  onClick: () => void;
}

/** Floating action button shown while grants are selected in the table. */
export function CreateDisbursementFab({ count, onClick }: CreateDisbursementFabProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom-4 fade-in [animation-duration:300ms]">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-3 px-6 py-4 bg-brand-blue hover:bg-brand-blue/80 text-white rounded-full shadow-lg hover:shadow-xl transition-[background-color,box-shadow] duration-200 text-base font-semibold"
      >
        <BanknotesIcon className="h-6 w-6" />
        Create Disbursement ({count})
      </button>
    </div>
  );
}
