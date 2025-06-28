import { QueryClient } from "@tanstack/react-query";
import { defaultQueryOptions } from "./defaultOptions";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: defaultQueryOptions,
  },
});
