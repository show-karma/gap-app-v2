"use client";

import React, { createContext, useContext } from "react";
import { 
  IProjectResponse, 
  IGrantResponse, 
  ICommunityResponse 
} from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

// Funding-specific context interfaces
export interface IFundingContextData {
  project: IProjectResponse;
  grant?: IGrantResponse;
  community?: ICommunityResponse;
  isLoading?: boolean;
  error?: Error | null;
}

export interface IFundingContext {
  data: IFundingContextData | null;
  setGrant: (grant: IGrantResponse) => void;
  setCommunity: (community: ICommunityResponse) => void;
}

// Create the contexts
const FundingContext = createContext<IFundingContext | undefined>(undefined);

// Hook to use funding context
export const useFundingContext = (): IFundingContext => {
  const context = useContext(FundingContext);
  if (context === undefined) {
    throw new Error("useFundingContext must be used within a FundingProvider");
  }
  return context;
};

// Provider component
interface FundingProviderProps {
  children: React.ReactNode;
  project: IProjectResponse;
  grant?: IGrantResponse;
  community?: ICommunityResponse;
}

export const FundingProvider: React.FC<FundingProviderProps> = ({
  children,
  project,
  grant,
  community,
}) => {
  const [currentGrant, setCurrentGrant] = React.useState<IGrantResponse | undefined>(grant);
  const [currentCommunity, setCurrentCommunity] = React.useState<ICommunityResponse | undefined>(community);

  const contextData: IFundingContextData = {
    project,
    grant: currentGrant,
    community: currentCommunity,
    isLoading: false,
    error: null,
  };

  const contextValue: IFundingContext = {
    data: contextData,
    setGrant: setCurrentGrant,
    setCommunity: setCurrentCommunity,
  };

  return (
    <FundingContext.Provider value={contextValue}>
      {children}
    </FundingContext.Provider>
  );
};

// Hook to safely try to use funding context (returns null if not available)
export const useFundingContextSafe = (): IFundingContext | null => {
  try {
    return useFundingContext();
  } catch {
    return null;
  }
}; 