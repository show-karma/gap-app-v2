/**
 * Mock next/dynamic for navbar integration tests.
 *
 * navbar.tsx and navbar-desktop-navigation.tsx use dynamic() with ssr:false
 * for NavbarMobileMenu and NavbarUserMenu. In test environments, dynamic()
 * with ssr:false renders the loading fallback (skeleton) instead of the
 * actual component.
 *
 * This mock makes dynamic() resolve via React.lazy + Suspense so that:
 *  1. The real (mocked) component eventually renders after the import resolves.
 *  2. Tests that need the dynamically-loaded component use waitFor() to wait
 *     for it to appear in the DOM.
 *
 * This is the same approach used by setup.ts for all integration tests.
 * Importing this file overrides setup.ts's vi.mock("next/dynamic") with an
 * identical implementation — they are functionally equivalent.
 *
 * Usage: import this file at the top of any integration test that renders
 * <Navbar /> or other components using next/dynamic. Wrap assertions on
 * mobile-menu elements in waitFor() since lazy loading is asynchronous.
 */
import React from "react";

vi.mock("next/dynamic", () => ({
  default: (fn: () => Promise<any>, _opts?: any) => {
    const LazyComponent = React.lazy(() =>
      fn().then((mod: any) => ({
        default: mod.default || Object.values(mod)[0],
      }))
    );
    const DynamicWrapper = (props: any) =>
      React.createElement(
        React.Suspense,
        { fallback: null },
        React.createElement(LazyComponent, props)
      );
    DynamicWrapper.displayName = "DynamicMock";
    return DynamicWrapper;
  },
}));
