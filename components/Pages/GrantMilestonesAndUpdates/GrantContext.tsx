import { createContext, useContext } from "react";
import type { Grant } from "@/types/v2/grant";

export const GrantContext = createContext<Grant | undefined>(undefined);

export const useGrant = () => useContext(GrantContext);
