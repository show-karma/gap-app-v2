import { z } from "zod";

export const simUriSchema = z
  .string()
  .trim()
  .min(1, "Sim AT-URI is required")
  .max(512, "AT-URI is too long")
  .regex(/^at:\/\//, "Must be an AT-URI starting with at://");

export const addressSchema = z
  .string()
  .trim()
  .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid Ethereum address (0x…)");

export const CUSTOM_SIM_VALUE = "__custom__";
export const CUSTOM_ADDRESS_VALUE = "__custom__";

export interface ReviewerOption {
  publicAddress: string;
  name: string;
  email: string;
}

export function truncateMiddle(value: string, head = 24, tail = 12): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
