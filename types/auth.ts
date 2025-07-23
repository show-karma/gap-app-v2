export interface ISession {
	publicAddress: string;
	/**
	 * Timestamp indicating when the session was created, in Unix milliseconds.
	 */
	iat: number;
	/**
	 * Timestamp indicating when the session should expire, in Unix milliseconds.
	 */
	exp: number;
}

export type IExpirationStatus = "expired" | "active" | "grace";
