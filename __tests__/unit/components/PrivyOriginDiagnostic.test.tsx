import { act, fireEvent, render, screen } from "@testing-library/react";

const mockEnv = { VERCEL_ENV: "preview" as string | undefined };
vi.mock("@/utilities/enviromentVars", () => ({
  get envVars() {
    return { VERCEL_ENV: mockEnv.VERCEL_ENV };
  },
}));

const mockBridge = {
  loadRequested: false,
  authenticated: false,
};
vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyLoadRequested: () => mockBridge.loadRequested,
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
    mockBridge.loadRequested = false;
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
      mockBridge.loadRequested = true;
      const { container } = render(<PrivyOriginDiagnostic />);
      act(() => vi.advanceTimersByTime(20_000));
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe("arming", () => {
    it("does not arm (no banner) before a login attempt", () => {
      mockBridge.loadRequested = false;
      render(<PrivyOriginDiagnostic />);
      act(() => vi.advanceTimersByTime(20_000));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not register a PerformanceObserver before a login attempt", () => {
      mockBridge.loadRequested = false;
      render(<PrivyOriginDiagnostic />);
      expect(observeOptions).toBeUndefined();
    });
  });

  describe("timeout path", () => {
    it("shows the alert with the runbook link after the block timeout", () => {
      mockBridge.loadRequested = true;
      render(<PrivyOriginDiagnostic />);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(15_000));

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      const link = screen.getByRole("link", { name: /runbook/i });
      expect(link).toHaveAttribute("href", RUNBOOK_HREF);
    });
  });

  describe("PerformanceObserver corroboration", () => {
    it("fires immediately on a 403 entry for the Privy auth origin", () => {
      mockBridge.loadRequested = true;
      render(<PrivyOriginDiagnostic />);

      emitResource("https://auth.privy.io/api/v1/siwe/init", 403);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("fires on a blocked (status 0) entry for the Privy auth origin", () => {
      mockBridge.loadRequested = true;
      render(<PrivyOriginDiagnostic />);

      emitResource("https://auth.privy.io/embedded", 0);

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("ignores entries for other origins and successful Privy responses", () => {
      mockBridge.loadRequested = true;
      render(<PrivyOriginDiagnostic />);

      emitResource("https://api.karmahq.xyz/api/projects", 403);
      emitResource("https://auth.privy.io/api/v1/siwe/init", 200);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("ignores entries without responseStatus support and waits for the timeout", () => {
      mockBridge.loadRequested = true;
      render(<PrivyOriginDiagnostic />);

      emitResource("https://auth.privy.io/api/v1/siwe/init", undefined);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(15_000));
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("responseStatus unsupported engine", () => {
    it("degrades to the timeout-only path when observe() throws", () => {
      installPerformanceObserver(false);
      mockBridge.loadRequested = true;
      render(<PrivyOriginDiagnostic />);

      act(() => vi.advanceTimersByTime(15_000));
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("success cancels the advisory", () => {
    it("renders nothing when authenticated before the timeout", () => {
      mockBridge.loadRequested = true;
      mockBridge.authenticated = true;
      render(<PrivyOriginDiagnostic />);

      act(() => vi.advanceTimersByTime(20_000));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("dismiss", () => {
    it("hides the banner when the dismiss button is clicked", () => {
      mockBridge.loadRequested = true;
      render(<PrivyOriginDiagnostic />);
      act(() => vi.advanceTimersByTime(15_000));

      const dismiss = screen.getByRole("button", {
        name: /dismiss privy preview origin warning/i,
      });
      expect(dismiss).toBeInTheDocument();
      fireEvent.click(dismiss);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("cleanup", () => {
    it("clears the timer on unmount so no banner appears later", () => {
      mockBridge.loadRequested = true;
      const { unmount } = render(<PrivyOriginDiagnostic />);
      unmount();

      act(() => vi.advanceTimersByTime(20_000));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("disconnects the PerformanceObserver on unmount", () => {
      mockBridge.loadRequested = true;
      const { unmount } = render(<PrivyOriginDiagnostic />);
      unmount();
      expect(disconnect).toHaveBeenCalled();
    });
  });
});
