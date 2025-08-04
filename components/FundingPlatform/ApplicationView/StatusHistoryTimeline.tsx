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
    color: 'text-blue-600 bg-blue-100',
    label: 'Pending Review'
  },
  revision_requested: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-600 bg-yellow-100',
    label: 'Revision Requested'
  },
  approved: {
    icon: CheckCircleIcon,
    color: 'text-green-600 bg-green-100',
    label: 'Approved'
  },
  rejected: {
    icon: XCircleIcon,
    color: 'text-red-600 bg-red-100',
    label: 'Rejected'
  },
  withdrawn: {
    icon: ArrowPathIcon,
    color: 'text-gray-600 bg-gray-100',
    label: 'Withdrawn'
  }
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
      <ul role="list" className="-mb-8">
        {sortedHistory.map((entry, idx) => {
          const config = statusConfig[entry.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = config.icon;
          const isLatest = idx === 0;
          const isCurrent = entry.status === currentStatus && isLatest;

          return (
            <li key={idx}>
              <div className="relative pb-8">
                {idx !== sortedHistory.length - 1 && (
                  <span 
                    className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" 
                    aria-hidden="true" 
                  />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white',
                      config.color,
                      isCurrent && 'ring-4 ring-offset-2 ring-offset-white'
                    )}>
                      <StatusIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        isCurrent ? 'text-gray-900' : 'text-gray-600'
                      )}>
                        {config.label}
                        {isCurrent && (
                          <span className="ml-2 text-xs font-normal text-gray-500">(Current)</span>
                        )}
                      </p>
                      {entry.reason && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">Reason:</p>
                          <p className="text-sm text-gray-700 bg-gray-50 rounded-md p-2">
                            {entry.reason}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="whitespace-nowrap text-right text-xs text-gray-500">
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