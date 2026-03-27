import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("next/dynamic", () => {
  const dynamicImports: Array<{ ssr: boolean }> = [];
  const mockDynamic = (importFn: () => Promise<any>, options?: { ssr?: boolean }) => {
    dynamicImports.push({ ssr: options?.ssr ?? true });
    const DynamicComponent = (props: any) => <div data-testid="dynamic-component" {...props} />;
    return DynamicComponent;
  };
  mockDynamic._imports = dynamicImports;
  return { default: mockDynamic };
});

import dynamic from "next/dynamic";
import { DeferredLayoutComponents } from "@/components/DeferredLayoutComponents";

const defaultToasterConfig = {
  position: "top-right" as const,
  toastOptions: {},
  containerStyle: {},
};

describe("DeferredLayoutComponents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders without errors", () => {
      const { container } = render(
        <DeferredLayoutComponents isWhitelabel={false} toasterConfig={defaultToasterConfig} />
      );
      expect(container).toBeTruthy();
    });

    it("renders all 9 components when isWhitelabel is false", () => {
      const { container } = render(
        <DeferredLayoutComponents isWhitelabel={false} toasterConfig={defaultToasterConfig} />
      );
      const dynamicComponents = container.querySelectorAll('[data-testid="dynamic-component"]');
      expect(dynamicComponents.length).toBe(9);
    });

    it("renders only 5 always-on components when isWhitelabel is true", () => {
      const { container } = render(
        <DeferredLayoutComponents isWhitelabel={true} toasterConfig={defaultToasterConfig} />
      );
      const dynamicComponents = container.querySelectorAll('[data-testid="dynamic-component"]');
      expect(dynamicComponents.length).toBe(5);
    });
  });

  describe("dynamic imports", () => {
    it("uses ssr: false for all 9 deferred components", () => {
      const imports = (dynamic as any)._imports as Array<{ ssr: boolean }>;
      expect(imports.length).toBe(9);
      for (const entry of imports) {
        expect(entry.ssr).toBe(false);
      }
    });
  });
});
