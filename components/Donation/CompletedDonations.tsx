"use client";
import { DonationSession } from "@/store/donationCart";
import { useMemo } from "react";
import Link from "next/link";
import { getExplorerUrl } from "@/utilities/network";
import { useParams } from "next/navigation";

interface CompletedDonationsProps {
  session: DonationSession;
  onStartNewDonation: () => void;
}

export function CompletedDonations({ session, onStartNewDonation }: CompletedDonationsProps) {
  const params = useParams();
  const communityId = params.communityId as string;


  const successfulDonations = useMemo(
    () => session.donations.filter((d) => d.status === "success"),
    [session.donations]
  );

  const failedDonations = useMemo(
    () => session.donations.filter((d) => d.status === "failed"),
    [session.donations]
  );

  const totalAmount = useMemo(() => {
    const byToken: Record<string, { amount: number; symbol: string }> = {};

    successfulDonations.forEach((donation) => {
      const key = `${donation.token.symbol}-${donation.chainId}`;
      if (!byToken[key]) {
        byToken[key] = {
          amount: 0,
          symbol: donation.token.symbol,
        };
      }
      // donation.amount is a decimal string like "0.5" or "100"
      byToken[key].amount += parseFloat(donation.amount || "0");
    });

    return Object.values(byToken).map((token) => ({
      amount: token.amount.toString(),
      symbol: token.symbol,
    }));
  }, [successfulDonations]);

  // Safety check
  if (!session || !session.donations || session.donations.length === 0) {
    return (
      <div className="min-h-screen my-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">No donation data available</p>
          <button
            onClick={onStartNewDonation}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse Projects
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen my-8">
      <div className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-green-100 p-4 dark:bg-green-900/30">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-green-600 dark:text-green-400"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Donation{successfulDonations.length > 1 ? "s" : ""} Complete!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Thank you for supporting {session.totalProjects} project{session.totalProjects > 1 ? "s" : ""}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-950/70">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Projects</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {successfulDonations.length}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-950/70">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Donated</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {totalAmount.map((t, i) => (
                <div key={i}>
                  {t.amount} {t.symbol}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-zinc-950/70">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400" />
                Success
              </span>
              {failedDonations.length > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  ({failedDonations.length} failed)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Successful Donations List */}
        {successfulDonations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Donation Transactions
            </h2>
            <div className="space-y-3">
              {successfulDonations.map((donation, index) => (
                <div
                  key={`${donation.projectId}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-zinc-950/70"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {donation.projectImageURL && (
                      <img
                        src={donation.projectImageURL}
                        alt={donation.projectTitle}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {donation.projectTitle}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {donation.amount} {donation.token.symbol}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400" />
                      Confirmed
                    </span>
                    <a
                      href={getExplorerUrl(donation.chainId, donation.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      View TX
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <path d="M15 3h6v6" />
                        <path d="M10 14L21 3" />
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Donations (if any) */}
        {failedDonations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-400 mb-4">
              Failed Transactions
            </h2>
            <div className="space-y-3">
              {failedDonations.map((donation, index) => (
                <div
                  key={`failed-${donation.projectId}-${index}`}
                  className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20"
                >
                  <div className="flex items-center gap-4">
                    {donation.projectImageURL && (
                      <img
                        src={donation.projectImageURL}
                        alt={donation.projectTitle}
                        className="h-12 w-12 rounded-lg object-cover opacity-60"
                      />
                    )}
                    <div>
                      <div className="font-medium text-red-900 dark:text-red-400">
                        {donation.projectTitle}
                      </div>
                      <div className="text-sm text-red-700 dark:text-red-500">
                        {donation.amount} {donation.token.symbol}
                      </div>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    Failed
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onStartNewDonation}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-base font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Make Another Donation
          </button>
          <Link
            href={`/community/${communityId}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-6 py-3 text-base font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            Back to Community
          </Link>
        </div>
      </div>
    </div>
  );
}
