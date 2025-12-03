import type { ReactNode } from "react";
import type { ProjectV2Response } from "@/types/project";

export interface NetworkAddressPair {
  network: string;
  address: string;
  verified?: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface InvalidInfo {
  projectName: string;
  projectSlug?: string;
  errorMessage?: string;
}

export interface LinkContractAddressesButtonProps {
  buttonClassName?: string;
  project: ProjectV2Response;
  "data-link-contracts-button"?: string;
  buttonElement?: { text: string; icon: ReactNode; styleClass: string } | null;
  onClose?: () => void;
}

export interface ContractAddressItemProps {
  pair: NetworkAddressPair;
  index: number;
  invalidContracts: Map<string, InvalidInfo>;
  canRemove: boolean;
  onNetworkChange: (index: number, value: string) => void;
  onAddressChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  onVerify?: (index: number) => void;
  supportedNetworks: readonly string[];
}
