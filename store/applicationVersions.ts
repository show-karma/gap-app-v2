import { create } from "zustand";
import { IApplicationVersion } from "@/types/funding-platform";

interface ApplicationVersionsState {
  // UI State only - data fetching moved to React Query
  selectedVersionId: string | null;
  selectedVersion: IApplicationVersion | null;
  
  // Actions
  selectVersion: (versionId: string, versions: IApplicationVersion[]) => void;
  clearSelection: () => void;
  reset: () => void;
}

export const useApplicationVersionsStore = create<ApplicationVersionsState>((set) => ({
  // Initial state
  selectedVersionId: null,
  selectedVersion: null,

  // Select a version to view
  selectVersion: (versionId: string, versions: IApplicationVersion[]) => {
    const version = versions.find(v => v.id === versionId);
    
    if (version) {
      set({ 
        selectedVersionId: versionId,
        selectedVersion: version,
      });
    }
  },

  // Clear current selection
  clearSelection: () => {
    set({ 
      selectedVersionId: null,
      selectedVersion: null,
    });
  },

  // Reset the entire store
  reset: () => {
    set({
      selectedVersionId: null,
      selectedVersion: null,
    });
  },
}));