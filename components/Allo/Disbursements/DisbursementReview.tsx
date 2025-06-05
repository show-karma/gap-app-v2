"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/Utilities/Button";
import type { ValidatedCSVRow, PoolInfo } from "@/types/allo";
import { calculateTotalAmount, validateUniqueAddresses } from "@/utilities/allo/csvParser";
import { checkApprovedRecipients, formatPoolAmount } from "@/utilities/allo/query";
import { formatUnits } from "viem";
import { FiAlertCircle, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { Spinner } from "@/components/Utilities/Spinner";

interface DisbursementReviewProps {
  csvData: ValidatedCSVRow[];
  poolInfo: PoolInfo;
  chainId: number;
  onProceed: () => void;
  onBack: () => void;
}

export function DisbursementReview({ csvData, poolInfo, chainId, onProceed, onBack }: DisbursementReviewProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [validationResults, setValidationResults] = useState<{
    approvedCount: number;
    unapprovedCount: number;
    unapprovedAddresses: string[];
    hasUniqueAddresses: boolean;
    totalAmount: bigint;
  } | null>(null);

  useEffect(() => {
    validateData();
  }, [csvData, poolInfo]);

  const validateData = async () => {
    setIsValidating(true);
    try {
      // Check for unique addresses
      const hasUniqueAddresses = validateUniqueAddresses(csvData);
      
      // Check if addresses are approved in the pool
      const addresses = csvData.map(row => row.checksummedAddress);
      const approvalMap = await checkApprovedRecipients(
        poolInfo.poolId,
        chainId,
        addresses
      );
      
      const approvedCount = Array.from(approvalMap.values()).filter(v => v).length;
      const unapprovedAddresses = addresses.filter(addr => !approvalMap.get(addr));
      
      // Calculate total amount
      const totalAmount = calculateTotalAmount(csvData);
      
      setValidationResults({
        approvedCount,
        unapprovedCount: unapprovedAddresses.length,
        unapprovedAddresses,
        hasUniqueAddresses,
        totalAmount,
      });
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  const canProceed = validationResults && 
    validationResults.hasUniqueAddresses && 
    validationResults.unapprovedCount === 0 &&
    validationResults.totalAmount <= poolInfo.availableAmount;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Review Distribution
      </h2>

      {isValidating ? (
        <div className="flex items-center justify-center py-12">
          <Spinner className="mr-2" />
          <span className="text-gray-600 dark:text-gray-400">Validating recipients...</span>
        </div>
      ) : validationResults ? (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Recipients</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{csvData.length}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {formatPoolAmount(validationResults.totalAmount, poolInfo.token)}
              </p>
            </div>
          </div>

          {/* Validation Results */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {validationResults.hasUniqueAddresses ? (
                <FiCheckCircle className="text-green-500" />
              ) : (
                <FiXCircle className="text-red-500" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {validationResults.hasUniqueAddresses ? "All addresses are unique" : "Duplicate addresses found"}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {validationResults.unapprovedCount === 0 ? (
                <FiCheckCircle className="text-green-500" />
              ) : (
                <FiXCircle className="text-red-500" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {validationResults.unapprovedCount === 0 
                  ? "All recipients are approved" 
                  : `${validationResults.unapprovedCount} unapproved recipients found`}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {validationResults.totalAmount <= poolInfo.availableAmount ? (
                <FiCheckCircle className="text-green-500" />
              ) : (
                <FiXCircle className="text-red-500" />
              )}
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {validationResults.totalAmount <= poolInfo.availableAmount
                  ? "Sufficient funds in pool" 
                  : "Insufficient funds in pool"}
              </span>
            </div>
          </div>

          {/* Recipients Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Profile ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {csvData.slice(0, 10).map((row, index) => {
                  const isApproved = !validationResults.unapprovedAddresses.includes(row.checksummedAddress);
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                        {`${row.checksummedAddress.slice(0, 6)}...${row.checksummedAddress.slice(-4)}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {row.amount} {poolInfo.token.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {row.profileId || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          isApproved 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {isApproved ? "Approved" : "Not Approved"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {csvData.length > 10 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                ... and {csvData.length - 10} more recipients
              </p>
            )}
          </div>

          {/* Warning if any issues */}
          {!canProceed && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex">
                <FiAlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-semibold">Cannot proceed with distribution</p>
                  <ul className="mt-1 list-disc list-inside">
                    {!validationResults.hasUniqueAddresses && <li>Remove duplicate addresses</li>}
                    {validationResults.unapprovedCount > 0 && <li>All recipients must be approved in the pool</li>}
                    {validationResults.totalAmount > poolInfo.availableAmount && <li>Total amount exceeds available pool funds</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="secondary"
              onClick={onBack}
            >
              Back
            </Button>
            <Button
              onClick={onProceed}
              disabled={!canProceed}
            >
              Proceed to Distribution
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No validation results available
        </div>
      )}
    </div>
  );
} 