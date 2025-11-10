'use client';

import React, { useMemo } from 'react';
import { DonationHistoryItem } from './DonationHistoryItem';
import type {
  DonationHistoryListProps,
  DonationGroupProps
} from '../types';
import type { DonationApiResponse } from '@/hooks/donation/types';

const DonationGroup = React.memo<DonationGroupProps>(({ date, donations }) => (
  <div className="space-y-3">
    <h3 className="font-semibold text-gray-700">{date}</h3>
    {donations.map((donation) => (
      <DonationHistoryItem key={donation.uid} donation={donation} />
    ))}
  </div>
));

DonationGroup.displayName = 'DonationGroup';

export const DonationHistoryList = React.memo<DonationHistoryListProps>(
  ({ donations }) => {
    const groupedDonations = useMemo(() => {
      return donations.reduce(
        (acc, donation) => {
          const date = new Date(donation.createdAt).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(donation);
          return acc;
        },
        {} as Record<string, DonationApiResponse[]>
      );
    }, [donations]);

    return (
      <div className="space-y-6">
        {Object.entries(groupedDonations).map(([date, items]) => (
          <DonationGroup key={date} date={date} donations={items} />
        ))}
      </div>
    );
  }
);

DonationHistoryList.displayName = 'DonationHistoryList';
