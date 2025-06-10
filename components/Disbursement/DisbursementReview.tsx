"use client";

import React from "react";
import { DisbursementRecipient } from "../../types/disbursement";

interface DisbursementReviewProps {
  recipients: DisbursementRecipient[];
}

export const DisbursementReview: React.FC<DisbursementReviewProps> = ({
  recipients,
}) => {
  if (recipients.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-6">
        <div className="bg-purple-100 rounded-lg p-2 mr-3">
          <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">📋 Review Recipients</h2>
      </div>
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
            <tr>
              <th
                scope="col"
                className="py-4 pl-6 pr-3 text-left text-sm font-semibold text-gray-900"
              >
                👤 Recipient Address
              </th>
              <th
                scope="col"
                className="px-3 py-4 text-left text-sm font-semibold text-gray-900"
              >
                💰 Amount (USDC)
              </th>
              <th
                scope="col"
                className="px-3 py-4 text-left text-sm font-semibold text-gray-900"
              >
                ✅ Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {recipients.map((recipient, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                  <code className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs">
                    {recipient.address}
                  </code>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  <span className="font-medium text-gray-900">
                    {recipient.amount}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm">
                  {recipient.error ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      ❌ {recipient.error}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✅ Valid
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}; 