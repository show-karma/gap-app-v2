import type { IGrantResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { create } from "zustand";
import { gapIndexerApi } from "@/utilities/gapIndexerApi";

interface GrantStore {
	grant: IGrantResponse | undefined;
	setGrant: (grant: IGrantResponse | undefined) => void;
	loading: boolean;
	setLoading: (loading: boolean) => void;
	refreshGrant: () => Promise<IGrantResponse | undefined>;
}

export const useGrantStore = create<GrantStore>((set, get) => ({
	grant: undefined,
	setGrant: (grant: IGrantResponse | undefined) => set({ grant }),
	loading: true,
	setLoading: (loading: boolean) => set({ loading }),
	refreshGrant: async () => {
		const { grant } = get();
		if (!grant) return;
		set({ loading: true });
		try {
			const refreshedGrant = await gapIndexerApi
				.grantBySlug(grant.uid)
				.then((res) => res.data);
			set({ grant: refreshedGrant, loading: false });
			return refreshedGrant;
		} catch (error) {
			console.error("Failed to refresh grant:", error);
			set({ loading: false });
		}
	},
}));
