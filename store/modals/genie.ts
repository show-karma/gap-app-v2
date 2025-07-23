import { create } from "zustand";

interface GrantGenieModalStore {
	isGrantGenieModalOpen: boolean;
	setIsGrantGenieModalOpen: (isGrantGenieModalOpen: boolean) => void;
	openGrantGenieModal: () => void;
	closeGrantGenieModal: () => void;
}

export const useGrantGenieModalStore = create<GrantGenieModalStore>(
	(set, get) => ({
		isGrantGenieModalOpen: false,
		setIsGrantGenieModalOpen: (isGrantGenieModalOpen: boolean) =>
			set({ isGrantGenieModalOpen }),
		openGrantGenieModal: () => set({ isGrantGenieModalOpen: true }),
		closeGrantGenieModal: () => set({ isGrantGenieModalOpen: false }),
	}),
);
