import type { ReactNode } from "react";
import type { Project as ProjectResponse } from "@/types/v2/project";

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
  project: ProjectResponse;
  "data-link-contracts-button"?: string;
  buttonElement?: { text: string; icon: ReactNode; styleClass: string } | null;
  onClose?: () => void;
  readOnly?: boolean;
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
  readOnly?: boolean;
}
