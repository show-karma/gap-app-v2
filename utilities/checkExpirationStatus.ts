import type { IExpirationStatus, ISession } from "@/types/auth";

// Check the expiration status of a token
export const checkExpirationStatus = (token: ISession): IExpirationStatus => {
	// Get the current timestamp
	const now = Date.now();

	// If the token is still active, return 'active'
	if (token.exp > now / 1000) return "active";

	// Find the timestamp for the end of the token's grace period
	const threeHoursInMs = 3 * 60 * 60 * 1000;

	// Add three hours to the token's expiration time
	const threeHoursAfterExpiration = token.exp + threeHoursInMs;

	// If the grace period is still active, return 'grace'
	if (threeHoursAfterExpiration > now) return "grace";

	// Otherwise, return 'expired'
	return "expired";
};
