'use client';

import React, { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useDonationHistory } from '@/hooks/donation/useDonationHistory';
import { DonationHistoryList } from './components/DonationHistoryList';
import type { Hex } from 'viem';

export default function DonationsPage() {
  const { address } = useAccount();
  const { data: donations, isLoading, error } = useDonationHistory(address as Hex | undefined);

  const totalDonated = useMemo(() => {
    if (!donations) return 0;
    return donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
  }, [donations]);

  const completedCount = useMemo(() => {
    if (!donations) return 0;
    return donations.filter((d) => d.status === 'completed').length;
  }, [donations]);

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Donations</h1>
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            Please connect your wallet to view your donations
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Donations</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Donations</h1>
        <div className="text-center py-12 bg-red-50 rounded-lg">
          <p className="text-red-600">Error loading donations</p>
        </div>
      </div>
    );
  }

  if (!donations || donations.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Donations</h1>
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-4">No donations yet</p>
          <p className="text-sm text-gray-500">
            Start supporting projects to see your donation history here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Donations</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-sm text-gray-600">Total Donations</div>
          <div className="text-2xl font-bold mt-2">{donations.length}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold mt-2">{completedCount}</div>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-sm text-gray-600">Total Amount</div>
          <div className="text-2xl font-bold mt-2">
            {totalDonated.toFixed(4)}
          </div>
        </div>
      </div>

      <DonationHistoryList donations={donations} />
    </div>
  );
}
