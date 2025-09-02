'use client';

import { FC } from 'react';
import { IStatusHistoryEntry } from '@/types/funding-platform';
import { format, parseISO, isValid } from 'date-fns';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { cn } from '@/utilities/tailwind';

interface StatusHistoryTimelineProps {
  history: IStatusHistoryEntry[];
  currentStatus: string;
}

const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900',
    label: 'Pending Review'
  },
  revision_requested: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900',
    label: 'Revision Requested'
  },
  approved: {
    icon: CheckCircleIcon,
    color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900',
    label: 'Approved'
  },
  rejected: {
    icon: XCircleIcon,
    color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900',
    label: 'Rejected'
  },

};

const StatusHistoryTimeline: FC<StatusHistoryTimelineProps> = ({ history, currentStatus }) => {
  const sortedHistory = [...history].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'MMM dd, yyyy HH:mm');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="flow-root">
      <ul role="list">
        {sortedHistory.map((entry, idx) => {
          const config = statusConfig[entry.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = config.icon;
          const isLatest = idx === 0;
          const isCurrent = entry.status === currentStatus && isLatest;
          const isLast = idx === sortedHistory.length - 1;

          return (
            <li key={idx}>
              <div className={cn("relative", !isLast && "pb-8")}>
                {!isLast && (
                  <span
                    className="absolute left-4 top-8 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white dark:ring-gray-900',
                      config.color,
                      isCurrent && 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-gray-900'
                    )}>
                      <StatusIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        isCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                      )}>
                        {config.label}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(Current)</span>
                        )}
                      </p>
                      {entry.reason && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Reason:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                            {entry.reason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-gray-500 dark:text-gray-400">
                      <time dateTime={typeof entry.timestamp === 'string' ? entry.timestamp : entry.timestamp.toISOString()}>
                        {formatDate(typeof entry.timestamp === 'string' ? entry.timestamp : entry.timestamp.toISOString())}
                      </time>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default StatusHistoryTimeline;