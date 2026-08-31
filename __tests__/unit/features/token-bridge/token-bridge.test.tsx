import { act, render, screen, waitFor } from "@testing-library/react";
import { TokenBridge } from "@/src/features/token-bridge/components/token-bridge";
import { TOKEN_BRIDGE_MESSAGE } from "@/src/features/token-bridge/protocol";

const privy = {
  ready: true,
  authenticated: true,
  getAccessToken: vi.fn<() => Promise<string | null>>(),
};

vi.mock("@/contexts/privy-bridge-context", () => ({
  usePrivyBridge: () => privy,
}));

const ORIGINS = ["https://www.filpgf.io"];
const SITE = "https://www.filpgf.io";

/** Frame the document: `window.parent` is what the component checks. */
function frameWindow() {
  const parent = { postMessage: vi.fn() };
  vi.spyOn(window, "parent", "get").mockReturnValue(parent as unknown as Window);
  return parent;
}

function ask(origin: string, data: unknown) {
  const source = { postMessage: vi.fn() };
  act(() => {
    window.dispatchEvent(
      new MessageEvent("message", { origin, data, source: source as unknown as Window })
    );
  });
  return source;
}

const request = (id = "req-1") => ({ type: TOKEN_BRIDGE_MESSAGE.request, id });

describe("TokenBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    privy.ready = true;
    privy.authenticated = true;
    privy.getAccessToken.mockResolvedValue("privy-jwt");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when framed by an allowed origin", () => {
    it("announces readiness and the signed-in state to the parent", async () => {
      const parent = frameWindow();
      render(<TokenBridge origins={ORIGINS} />);

      await waitFor(() =>
        expect(parent.postMessage).toHaveBeenCalledWith(
          { type: TOKEN_BRIDGE_MESSAGE.ready, authenticated: true },
          SITE
        )
      );
      expect(screen.getByText("Session bridge ready.")).toBeInTheDocument();
    });

    it("answers a request with a fresh token, to the asking origin only", async () => {
      frameWindow();
      render(<TokenBridge origins={ORIGINS} />);

      const source = ask(SITE, request("abc"));

      await waitFor(() =>
        expect(source.postMessage).toHaveBeenCalledWith(
          { type: TOKEN_BRIDGE_MESSAGE.response, id: "abc", token: "privy-jwt" },
          SITE
        )
      );
      expect(privy.getAccessToken).toHaveBeenCalledTimes(1);
    });

    it("answers null when nobody is signed in, without touching Privy", async () => {
      privy.authenticated = false;
      frameWindow();
      render(<TokenBridge origins={ORIGINS} />);

      const source = ask(SITE, request());

      await waitFor(() =>
        expect(source.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ token: null }),
          SITE
        )
      );
      expect(privy.getAccessToken).not.toHaveBeenCalled();
    });

    it("answers null when the refresh fails", async () => {
      privy.getAccessToken.mockRejectedValue(new Error("refresh failed"));
      frameWindow();
      render(<TokenBridge origins={ORIGINS} />);

      const source = ask(SITE, request());

      await waitFor(() =>
        expect(source.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ token: null }),
          SITE
        )
      );
    });

    it("holds a request until Privy is ready, then answers it", async () => {
      privy.ready = false;
      frameWindow();
      const { rerender } = render(<TokenBridge origins={ORIGINS} />);

      const source = ask(SITE, request("early"));
      await act(async () => {});
      expect(source.postMessage).not.toHaveBeenCalled();

      privy.ready = true;
      rerender(<TokenBridge origins={ORIGINS} />);

      await waitFor(() =>
        expect(source.postMessage).toHaveBeenCalledWith(
          expect.objectContaining({ id: "early", token: "privy-jwt" }),
          SITE
        )
      );
    });
  });

  describe("refusals", () => {
    it("ignores a request from an origin outside the allowlist", async () => {
      frameWindow();
      render(<TokenBridge origins={ORIGINS} />);

      const source = ask("https://evil.example", request());
      await act(async () => {});

      expect(source.postMessage).not.toHaveBeenCalled();
      expect(privy.getAccessToken).not.toHaveBeenCalled();
    });

    it("ignores a malformed message from an allowed origin", async () => {
      frameWindow();
      render(<TokenBridge origins={ORIGINS} />);

      const source = ask(SITE, { type: TOKEN_BRIDGE_MESSAGE.request });
      await act(async () => {});

      expect(source.postMessage).not.toHaveBeenCalled();
    });

    it("answers nobody on a host with no embedder", async () => {
      const parent = frameWindow();
      render(<TokenBridge origins={[]} />);

      const source = ask(SITE, request());
      await act(async () => {});

      expect(source.postMessage).not.toHaveBeenCalled();
      expect(parent.postMessage).not.toHaveBeenCalled();
      expect(screen.getByText("No site may use this bridge on this host.")).toBeInTheDocument();
    });

    it("does nothing when opened directly rather than framed", async () => {
      render(<TokenBridge origins={ORIGINS} />);

      const source = ask(SITE, request());
      await act(async () => {});

      expect(source.postMessage).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: "Session bridge" })).toBeInTheDocument();
    });
  });
});
