export const defaultQueryOptions = {
  staleTime: 1000 * 60 * 1, // 5 minutes
  gcTime: 1000 * 60 * 1, // 5 minutes
  refetchOnWindowFocus: false,
  refetchOnMount: true,
  refetchOnReconnect: false,
  retry: 1,
};
