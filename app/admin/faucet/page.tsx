import { Suspense } from "react";
import { FaucetAdminDashboard } from "@/components/FaucetAdmin/Dashboard";
import { Spinner } from "@/components/Utilities/Spinner";
import { PROJECT_NAME } from "@/constants/brand";
import { defaultMetadata } from "@/utilities/meta";

export const metadata = {
  ...defaultMetadata,
  title: `Faucet Admin Dashboard | ${PROJECT_NAME}`,
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
