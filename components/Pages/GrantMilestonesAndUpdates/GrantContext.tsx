import { createContext, useContext } from "react";
import type { Grant } from "@show-karma/karma-gap-sdk/core/class/entities/Grant";

export const GrantContext = createContext<Grant | undefined>(undefined);

export const useGrant = () => useContext(GrantContext);
