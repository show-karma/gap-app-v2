"use client";

import { useState } from "react";
import { PoolLookup } from "@/components/Allo/Disbursements/PoolLookup";
import { CSVUpload } from "@/components/Allo/Disbursements/CSVUpload";
import { DisbursementReview } from "@/components/Allo/Disbursements/DisbursementReview";
import { DistributionExecution } from "@/components/Allo/Disbursements/DistributionExecution";
import { formatPoolAmount } from "@/utilities/allo/query";
import type { PoolInfo, ValidatedCSVRow } from "@/types/allo";

export default function DisbursementPage() {
  const [step, setStep] = useState<'lookup' | 'upload' | 'review' | 'distribute'>('lookup');
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [chainId, setChainId] = useState<number>(10); // Default to Optimism
  const [csvData, setCsvData] = useState<ValidatedCSVRow[]>([]);

  const handlePoolFound = (info: PoolInfo, poolChainId: number) => {
    setPoolInfo(info);
    setChainId(poolChainId);
    setStep('upload');
  };

  const handleCSVParsed = (data: ValidatedCSVRow[]) => {
    setCsvData(data);
    setStep('review');
  };

  const handleProceedToDistribution = () => {
    setStep('distribute');
  };

  const handleDistributionComplete = (txHash: string) => {
    console.log("Distribution completed with transaction hash:", txHash);
    // Could add success state or redirect here
  };

  const handleBack = () => {
    if (step === 'upload') {
      setStep('lookup');
    } else if (step === 'review') {
      setStep('upload');
    } else if (step === 'distribute') {
      setStep('review');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Grant Disbursement
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Distribute funds to approved grant recipients
        </p>
      </div>

      <div className="flex justify-center mb-8">
        <div className="flex items-center space-x-4">
          <StepIndicator step={1} currentStep={step} label="Lookup Pool" />
          <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600" />
          <StepIndicator step={2} currentStep={step} label="Upload CSV" />
          <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600" />
          <StepIndicator step={3} currentStep={step} label="Review" />
          <div className="w-16 h-0.5 bg-gray-300 dark:bg-gray-600" />
          <StepIndicator step={4} currentStep={step} label="Distribute" />
        </div>
      </div>

      <div className="min-h-[400px]">
        {step === 'lookup' && (
          <PoolLookup onPoolFound={handlePoolFound} />
        )}
        
        {step === 'upload' && poolInfo && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="space-y-1">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Pool ID:</strong> {poolInfo.poolId}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Strategy:</strong> {poolInfo.strategy.name}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Total Amount:</strong> {formatPoolAmount(poolInfo.totalAmount, poolInfo.token)}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Chain:</strong> {getChainName(chainId)}
                </p>
              </div>
            </div>
            <CSVUpload onCSVParsed={handleCSVParsed} poolInfo={poolInfo} />
          </div>
        )}
        
        {step === 'review' && poolInfo && csvData.length > 0 && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="space-y-1">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Pool ID:</strong> {poolInfo.poolId}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Strategy:</strong> {poolInfo.strategy.name}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Total Amount:</strong> {formatPoolAmount(poolInfo.totalAmount, poolInfo.token)}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Chain:</strong> {getChainName(chainId)}
                </p>
              </div>
            </div>
            <DisbursementReview
              csvData={csvData}
              poolInfo={poolInfo}
              chainId={chainId}
              onProceed={handleProceedToDistribution}
              onBack={handleBack}
            />
          </div>
        )}
        
        {step === 'distribute' && poolInfo && csvData.length > 0 && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="space-y-1">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Pool ID:</strong> {poolInfo.poolId}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Strategy:</strong> {poolInfo.strategy.name}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Total Amount:</strong> {formatPoolAmount(poolInfo.totalAmount, poolInfo.token)}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Chain:</strong> {getChainName(chainId)}
                </p>
              </div>
            </div>
            <DistributionExecution
              csvData={csvData}
              poolInfo={poolInfo}
              chainId={chainId}
              onBack={handleBack}
              onComplete={handleDistributionComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ 
  step, 
  currentStep, 
  label 
}: { 
  step: number; 
  currentStep: 'lookup' | 'upload' | 'review' | 'distribute'; 
  label: string;
}) {
  const stepMap = {
    'lookup': 1,
    'upload': 2,
    'review': 3,
    'distribute': 4
  };
  
  const isActive = stepMap[currentStep] >= step;
  const isCurrent = stepMap[currentStep] === step;
  
  return (
    <div className="flex flex-col items-center">
      <div 
        className={`
          w-10 h-10 rounded-full flex items-center justify-center font-semibold
          ${isCurrent 
            ? 'bg-blue-600 text-white' 
            : isActive 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'
          }
        `}
      >
        {step}
      </div>
      <span className="mt-2 text-xs text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    10: "Optimism",
    42161: "Arbitrum",
    42220: "Celo",
    11155420: "Optimism Sepolia",
    11155111: "Sepolia",
    84532: "Base Sepolia",
  };
  return chainNames[chainId] || `Chain ${chainId}`;
} 