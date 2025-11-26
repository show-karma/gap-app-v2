import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { createContext, useContext } from "react";

export const GrantContext = createContext<IGrantResponse | undefined>(undefined);

export const useGrant = () => useContext(GrantContext);
