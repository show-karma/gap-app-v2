import { act, fireEvent, render, screen } from "@testing-library/react";

const mockEnv = { VERCEL_ENV: "preview" as string | undefined };
vi.mock("@/utilities/enviromentVars", () => ({
  get envVars() {
    return { VERCEL_ENV: mockEnv.VERCEL_ENV };
  },
}));

const mockBridge = {
  loginAttempted: false,
  authenticated: false,
};
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyLoginAttempted: () => mockBridge.loginAttempted,
  usePrivyBridge: () => ({ authenticated: mockBridge.authenticated }),
}));

import { PrivyOriginDiagnostic } from "@/components/Utilities/PrivyOriginDiagnostic";

const RUNBOOK_HREF =
  "https://github.com/show-karma/gap-app-v2/blob/main/docs/auth/privy-preview-deployments.md";

type ObserverCallback = (list: { getEntries: () => PerformanceEntry[] }) => void;

let lastObserverCallback: ObserverCallback | null = null;
let observeOptions: PerformanceObserverInit | undefined;
const disconnect = vi.fn();

function installPerformanceObserver(supported = true) {
  lastObserverCallback = null;
  observeOptions = undefined;
  class MockPerformanceObserver {
    constructor(cb: ObserverCallback) {
      lastObserverCallback = cb;
    }
    observe(opts: PerformanceObserverInit) {
      if (!supported) throw new TypeError("unsupported");
      observeOptions = opts;
    }
    disconnect = disconnect;
  }
  vi.stubGlobal("PerformanceObserver", MockPerformanceObserver);
}

function emitResource(name: string, responseStatus?: number) {
  const entry = { entryType: "resource", name, responseStatus } as unknown as PerformanceEntry;
  act(() => {
    lastObserverCallback?.({ getEntries: () => [entry] });
  });
}

describe("PrivyOriginDiagnostic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockEnv.VERCEL_ENV = "preview";
    mockBridge.loginAttempted = false;
    mockBridge.authenticated = false;
    installPerformanceObserver(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  describe("environment gating", () => {
    it("renders nothing when VERCEL_ENV is not preview", () => {
      mockEnv.VERCEL_ENV = "production";
      mockBridge.loginAttempted = true;
      const { container } = render(<PrivyOriginDiagnostic />);
      emitResource("https://auth.privy.io/api/v1/siwe/init", 403);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("arming", () => {
    it("does not register a PerformanceObserver before a login attempt", () => {
      mockBridge.loginAttempted = false;
      render(<PrivyOriginDiagnostic />);
      expect(observeOptions).toBeUndefined();
    });

    it("does not show the banner before a login attempt even on a 403", () => {
      mockBridge.loginAttempted = false;
      render(<PrivyOriginDiagnostic />);
      emitResource("https://auth.privy.io/api/v1/siwe/init", 403);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("no false positive without a 403", () => {
    it("never shows on a slow-but-working login (no timeout trip)", () => {
      mockBridge.loginAttempted = true;
      render(<PrivyOriginDiagnostic />);

      // A working but slow emailed-OTP flow: time passes, successful Privy traffic
      // flows, but no 403 ever arrives. The banner must stay hidden.
      act(() => vi.advanceTimersByTime(120_000));
      emitResource("https://auth.privy.io/api/v1/siwe/init", 200);
      emitResource("https://auth.privy.io/embedded", undefined);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not treat cross-origin status 0 as a block", () => {
      mockBridge.loginAttempted = true;
      render(<PrivyOriginDiagnostic />);

      // Status 0 is normal for a cross-origin success without Timing-Allow-Origin.
      emitResource("https://auth.privy.io/embedded", 0);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("PerformanceObserver corroboration", () => {
    it("fires on an explicit 403 entry for the Privy auth origin", () => {
      mockBridge.loginAttempted = true;
      render(<PrivyOriginDiagnostic />);

      emitResource("https://auth.privy.io/api/v1/siwe/init", 403);

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      const link = screen.getByRole("link", { name: /runbook/i });
      expect(link).toHaveAttribute("href", RUNBOOK_HREF);
    });

    it("ignores a 403 for other origins", () => {
      mockBridge.loginAttempted = true;
      render(<PrivyOriginDiagnostic />);

      emitResource("https://api.karmahq.xyz/api/projects", 403);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("ignores entries without responseStatus support", () => {
      mockBridge.loginAttempted = true;
      render(<PrivyOriginDiagnostic />);

      emitResource("https://auth.privy.io/api/v1/siwe/init", undefined);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("unsupported engine", () => {
    it("stays hidden when observe() throws (no responseStatus support)", () => {
      installPerformanceObserver(false);
      mockBridge.loginAttempted = true;
      render(<PrivyOriginDiagnostic />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("success clears the advisory", () => {
    it("renders nothing when already authenticated", () => {
      mockBridge.loginAttempted = true;
      mockBridge.authenticated = true;
      render(<PrivyOriginDiagnostic />);

      emitResource("https://auth.privy.io/api/v1/siwe/init", 403);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("clears a shown banner once authentication later succeeds", () => {
      mockBridge.loginAttempted = true;
      const { rerender } = render(<PrivyOriginDiagnostic />);

      // The banner trips on a 403...
      emitResource("https://auth.privy.io/api/v1/siwe/init", 403);
      expect(screen.getByRole("alert")).toBeInTheDocument();

      // ...then authentication succeeds (e.g. the origin was allowlisted and the user
      // retried). The banner must disappear.
      mockBridge.authenticated = true;
      act(() => {
        rerender(<PrivyOriginDiagnostic />);
      });

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("dismiss", () => {
    it("hides the banner when the dismiss button is clicked", () => {
      mockBridge.loginAttempted = true;
      render(<PrivyOriginDiagnostic />);
      emitResource("https://auth.privy.io/api/v1/siwe/init", 403);

      const dismiss = screen.getByRole("button", {
        name: /dismiss privy preview origin warning/i,
      });
      expect(dismiss).toBeInTheDocument();
      fireEvent.click(dismiss);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("cleanup", () => {
    it("disconnects the PerformanceObserver on unmount", () => {
      mockBridge.loginAttempted = true;
      const { unmount } = render(<PrivyOriginDiagnostic />);
      unmount();
      expect(disconnect).toHaveBeenCalled();
    });
  });
});
