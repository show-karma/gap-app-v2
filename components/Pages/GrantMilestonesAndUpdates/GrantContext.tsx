import { createContext, useContext } from "react";
import type { GrantResponse } from "@/types/v2/grant";

export const GrantContext = createContext<GrantResponse | undefined>(undefined);

export const useGrant = () => useContext(GrantContext);
