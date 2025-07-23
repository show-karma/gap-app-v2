import { create } from "zustand";

interface ContributorProfileStore {
	isModalOpen: boolean;
	isGlobal: boolean;
	openModal: (options?: { isGlobal?: boolean }) => void;
	closeModal: () => void;
}

export const useContributorProfileModalStore = create<ContributorProfileStore>(
	(set) => ({
		isModalOpen: false,
		isGlobal: false,
		openModal: (options) => {
			set({
				isModalOpen: true,
				isGlobal: options?.isGlobal ?? false,
			});
		},
		closeModal: () => set({ isModalOpen: false, isGlobal: false }),
	}),
);
