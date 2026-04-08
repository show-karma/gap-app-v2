/**
 * Shared test providers for integration journey tests.
 *
 * Re-exports the battle-tested renderWithProviders / renderHookWithProviders
 * from __tests__/utils/render.tsx which wraps components in:
 *   - QueryClientProvider (retry: false, gcTime: 0)
 *   - Optional PrivyBridgeProvider for auth state injection
 *
 * Journey tests should import from here so provider details are
 * centralised in one place.
 */

export {
  createTestQueryClient,
  renderHookWithProviders,
  renderWithProviders,
  type TestAuthState,
} from "../utils/render";
