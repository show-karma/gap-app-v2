import { create } from "zustand";
import type { Citation, QueryIntent, QueryPagination, RankedEntity } from "../types/philanthropy";

interface SearchResult {
  entities: RankedEntity[];
  citations: Citation[];
  intent: QueryIntent;
  pagination: QueryPagination;
}

interface GrantAtlasStore {
  query: string;
  narrative: string;
  result: SearchResult | null;
  isSearching: boolean;
  error: string | null;

  setQuery: (query: string) => void;
  setNarrative: (narrative: string) => void;
  setResult: (result: SearchResult | null) => void;
  setSearching: (searching: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useGrantAtlasStore = create<GrantAtlasStore>((set) => ({
  query: "",
  narrative: "",
  result: null,
  isSearching: false,
  error: null,

  setQuery: (query) => set({ query }),
  setNarrative: (narrative) => set({ narrative }),
  setResult: (result) => set({ result }),
  setSearching: (searching) => set({ isSearching: searching }),
  setError: (error) => set({ error }),
  reset: () => set({ query: "", narrative: "", result: null, error: null }),
}));
