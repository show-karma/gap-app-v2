import type { Metadata } from "next";
import { Suspense } from "react";
import { FaucetAdminDashboard } from "@/components/FaucetAdmin/Dashboard";
import { Spinner } from "@/components/Utilities/Spinner";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Faucet Admin Dashboard",
  description: "Manage faucet settings, monitor balances, and control fund distribution.",
});

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
