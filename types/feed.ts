import { Hex } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";

export interface Feed {
  attester: Hex | string;
  timestamp: number;
  uid: string;
  event:
    | "revoked"
    | "created"
    | "deleted"
    | "updated"
    | "member-added"
    | "milestone-completed"
    | "milestone-rejected"
    | "milestone-approved"
    | "grant-completed";
  type: "project" | "milestone" | "grant" | "community" | "member";
  message: string;
  projectUID?: Hex;
  grantUID?: Hex;
}
