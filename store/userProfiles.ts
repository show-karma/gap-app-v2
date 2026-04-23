import { create } from "zustand";
import type { PublicUserProfileInfo } from "@/services/community-admins.service";
import { communityAdminsService } from "@/services/community-admins.service";

export interface UserProfileEntry extends PublicUserProfileInfo {
  isFetching?: boolean;
  isTried?: boolean;
}

interface UserProfilesStore {
  profiles: Record<string, UserProfileEntry>;
  populateProfiles: (addresses: string[]) => Promise<void>;
}

const BATCH_SIZE = 20;

export const useUserProfiles = create<UserProfilesStore>((set, get) => ({
  profiles: {},

  populateProfiles: async (addresses: string[]) => {
    const currentProfiles = get().profiles;

    const validAddress = (addr: string): boolean => /^0x[0-9a-fA-F]{40}$/i.test(addr);

    // Lowercase + dedupe + filter valid ETH addresses
    const uniqueAddresses = [
      ...new Set(
        addresses
          .filter((addr): addr is string => !!addr && validAddress(addr))
          .map((addr) => addr.toLowerCase())
      ),
    ];

    // Skip addresses already fetched or currently in-flight
    const pending = uniqueAddresses.filter((addr) => {
      const entry = currentProfiles[addr];
      return !entry || (!entry.isTried && !entry.isFetching);
    });

    if (pending.length === 0) return;

    // Mark all pending as in-flight
    set((state) => {
      const updates: Record<string, UserProfileEntry> = {};
      for (const addr of pending) {
        updates[addr] = {
          ...state.profiles[addr],
          publicAddress: addr,
          name: "",
          isFetching: true,
        };
      }
      return { profiles: { ...state.profiles, ...updates } };
    });

    // Process in chunks of BATCH_SIZE
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const chunk = pending.slice(i, i + BATCH_SIZE);

      try {
        const resultMap = await communityAdminsService.getPublicUserProfiles(chunk);

        set((state) => {
          const updates: Record<string, UserProfileEntry> = {};
          for (const addr of chunk) {
            const found = resultMap.get(addr);
            if (found) {
              updates[addr] = { ...found, isFetching: false, isTried: true };
            } else {
              updates[addr] = {
                ...state.profiles[addr],
                publicAddress: addr,
                name: "",
                isFetching: false,
                isTried: true,
              };
            }
          }
          return { profiles: { ...state.profiles, ...updates } };
        });
      } catch {
        // Swallow errors — mark all chunk addresses as tried so we don't retry indefinitely
        set((state) => {
          const updates: Record<string, UserProfileEntry> = {};
          for (const addr of chunk) {
            updates[addr] = {
              ...state.profiles[addr],
              publicAddress: addr,
              name: "",
              isFetching: false,
              isTried: true,
            };
          }
          return { profiles: { ...state.profiles, ...updates } };
        });
      }
    }
  },
}));
