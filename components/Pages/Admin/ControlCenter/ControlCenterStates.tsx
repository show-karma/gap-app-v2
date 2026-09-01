import { Button } from "@/components/ui/button";
import { MESSAGES } from "@/utilities/messages";

export function ControlCenterHeader() {
  return (
    <div className="flex flex-col gap-1 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
        Control Center
      </h1>
      <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
        Overview of project KYB, agreements, milestones, invoices, and payments
      </p>
    </div>
  );
}

export function ControlCenterCommunityError() {
  return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <p className="text-lg text-red-600 dark:text-red-400">Failed to load community data</p>
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
}

export function ControlCenterPayoutsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="my-4 flex flex-col gap-6 w-full">
      <ControlCenterHeader />
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load payouts data. Please try again.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}

export function ControlCenterNotAuthorized({ communityName }: { communityName?: string }) {
  return (
    <div className="flex w-full items-center justify-center h-96">
      <p className="text-lg">{MESSAGES.ADMIN.NOT_AUTHORIZED(communityName || "Control Center")}</p>
    </div>
  );
}
