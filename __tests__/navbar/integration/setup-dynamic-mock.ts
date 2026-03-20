/**
 * Mock next/dynamic for navbar integration tests.
 *
 * navbar.tsx and navbar-desktop-navigation.tsx use dynamic() with ssr:false
 * for NavbarMobileMenu and NavbarUserMenu. In Jest, dynamic() with ssr:false
 * renders the loading fallback (skeleton) instead of the actual component.
 *
 * This mock makes dynamic() resolve synchronously so integration tests can
 * interact with the real components.
 *
 * Usage: import this file at the top of any integration test that renders
 * <Navbar /> or other components using next/dynamic.
 */
import React from "react";

jest.mock("next/dynamic", () => {
  return (loader: () => Promise<any>, _opts?: any) => {
    let Component: any = null;
    loader().then((mod: any) => {
      Component = mod.default || mod;
    });
    const DynamicComponent = (props: any) => {
      if (!Component) return null;
      return React.createElement(Component, props);
    };
    DynamicComponent.displayName = "DynamicMock";
    return DynamicComponent;
  };
});
