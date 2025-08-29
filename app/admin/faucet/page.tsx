import { defaultMetadata } from "@/utilities/meta";
import { FaucetAdminDashboard } from "@/components/FaucetAdmin/Dashboard";
import { Suspense } from "react";
import { Spinner } from "@/components/Utilities/Spinner";

export const metadata = {
  ...defaultMetadata,
  title: "Faucet Admin Dashboard | Karma GAP",
  description: "Manage faucet settings, monitor balances, and control fund distribution",
};

export default function FaucetAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <FaucetAdminDashboard />
    </Suspense>
  );
}