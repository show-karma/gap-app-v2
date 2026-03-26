import { applicationHandlers } from "./applications.handlers";
import { authHandlers } from "./auth.handlers";
import { claimsHandlers } from "./claims.handlers";
import { commentHandlers } from "./comments.handlers";
import { communityHandlers } from "./communities.handlers";
import { donationHandlers } from "./donations.handlers";
import { payoutHandlers } from "./payouts.handlers";
import { programHandlers } from "./programs.handlers";
import { projectHandlers } from "./projects.handlers";

export { BASE } from "./base-url";

export function defaultHandlers() {
  return [
    ...authHandlers(),
    ...applicationHandlers(),
    ...communityHandlers(),
    ...programHandlers(),
    ...projectHandlers(),
    ...payoutHandlers(),
    ...claimsHandlers(),
    ...commentHandlers(),
    ...donationHandlers(),
  ];
}

export {
  authHandlers,
  applicationHandlers,
  communityHandlers,
  programHandlers,
  projectHandlers,
  payoutHandlers,
  claimsHandlers,
  commentHandlers,
  donationHandlers,
};
