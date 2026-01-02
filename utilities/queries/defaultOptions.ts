export const defaultQueryOptions = {
  staleTime: 1000 * 60 * 1, // 1 minute
  gcTime: 1000 * 60 * 1, // 1 minute
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  refetchOnReconnect: false,
  retry: 1,
};
