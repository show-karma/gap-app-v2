import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NOTEBOOK_SANDBOX_ATTRIBUTE,
  NOTEBOOK_SANDBOX_BOOTSTRAP,
  NOTEBOOK_SANDBOX_DOCUMENT,
  NOTEBOOK_SANDBOX_READY,
  NotebookSandboxFrame,
} from "@/components/Pages/Communities/Notebooks/NotebookSandboxFrame";

const ORIGIN = "https://sandbox.example";

/**
 * The containment tests for the one place author HTML is rendered.
 *
 * These are not style assertions. `allow-scripts` together with
 * `allow-same-origin` silently defeats the sandbox — the frame regains a real
 * origin and can script its way back out — and the edit that does it is one
 * word in a diff that looks like it is loosening nothing.
 *
 * The delivery tests encode a correction worth remembering. The first version
 * posted the document with an exact target origin, which READS as the careful
 * choice and is in fact broken: a frame without `allow-same-origin` has an
 * OPAQUE origin, so the browser discards a message targeted at anything else.
 * Exact-origin targeting and the sandbox we require cannot coexist. The
 * resolution is a private MessagePort, and the invariant the tests now pin is
 * the one that survives: CONTENT never goes to `"*"` — the single wildcard
 * carries a port and nothing else.
 */

/** Stands in for the shell, which jsdom does not run. */
function stubFrameWindow() {
  const postMessage = vi.fn();
  Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
    configurable: true,
    get() {
      // Identity must be stable per element: the component compares
      // `event.source` against it.
      if (!this.__stubWindow) this.__stubWindow = { postMessage };
      return this.__stubWindow;
    },
  });
  return postMessage;
}

function renderFrame(html = "<h1>hello</h1>") {
  const result = render(
    <NotebookSandboxFrame sandboxOrigin={ORIGIN} html={html} title="Custom page preview" />
  );
  // Scoped to THIS render's container: a test that mounts two frames would
  // otherwise trip over the shared title.
  const iframe = result.container.querySelector("iframe") as HTMLIFrameElement;
  const nonce = decodeURIComponent(new URL(iframe.src).hash.replace("#nonce=", ""));
  return { ...result, iframe, nonce };
}

/** The shell announcing itself, with everything overridable for the negatives. */
function announce(
  iframe: HTMLIFrameElement,
  nonce: string,
  overrides: { source?: unknown; origin?: string; nonce?: string } = {}
) {
  const event = new MessageEvent("message", {
    origin: overrides.origin ?? "null",
    data: { type: NOTEBOOK_SANDBOX_READY, nonce: overrides.nonce ?? nonce },
  });
  Object.defineProperty(event, "source", {
    value: "source" in overrides ? overrides.source : iframe.contentWindow,
  });
  window.dispatchEvent(event);
}

describe("NotebookSandboxFrame containment", () => {
  it("should_sandbox_the_frame_with_scripts_only", () => {
    renderFrame();

    expect(screen.getByTitle("Custom page preview")).toHaveAttribute("sandbox", "allow-scripts");
  });

  // THE ONE THAT MATTERS. Its own test so a failure names the actual danger
  // rather than reporting an attribute mismatch.
  it("should_never_grant_allow_same_origin_which_would_defeat_the_sandbox", () => {
    renderFrame();

    const sandbox = screen.getByTitle("Custom page preview").getAttribute("sandbox") ?? "";
    expect(sandbox.split(/\s+/)).not.toContain("allow-same-origin");
  });

  it.each([
    "allow-same-origin",
    "allow-top-navigation",
    "allow-popups",
    "allow-modals",
    "allow-forms",
  ])("should_not_grant_%s", (token) => {
    expect(NOTEBOOK_SANDBOX_ATTRIBUTE.split(/\s+/)).not.toContain(token);
  });

  it("should_keep_the_sandbox_token_list_to_exactly_allow_scripts", () => {
    expect(NOTEBOOK_SANDBOX_ATTRIBUTE).toBe("allow-scripts");
  });

  it("should_load_the_shell_from_the_sandbox_origin_never_our_own", () => {
    const { iframe } = renderFrame();

    expect(iframe.src.startsWith(`${ORIGIN}/`)).toBe(true);
  });

  it("should_request_no_permissions_and_leak_no_referrer", () => {
    const { iframe } = renderFrame();

    expect(iframe).not.toHaveAttribute("allow");
    expect(iframe).toHaveAttribute("referrerPolicy", "no-referrer");
  });

  // A fragment never reaches the server, so the nonce stays between us and the
  // shell rather than turning up in an access log.
  it("should_carry_an_unguessable_per_instance_nonce_in_the_fragment", () => {
    const first = renderFrame().nonce;
    const second = renderFrame().nonce;

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(16);
  });
});

describe("NotebookSandboxFrame delivery", () => {
  let framePost: ReturnType<typeof stubFrameWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    framePost = stubFrameWindow();
  });

  /** Every payload the parent sent to the frame window, with its target. */
  const windowSends = () =>
    framePost.mock.calls.map(([data, target]) => ({ data, target }) as { data: any; target: any });

  it("should_send_nothing_before_the_shell_announces_itself", () => {
    renderFrame();

    expect(framePost).not.toHaveBeenCalled();
  });

  it("should_hand_over_a_port_once_the_shell_announces_itself", async () => {
    const { iframe, nonce } = renderFrame();

    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalledTimes(1));
    const [{ data, target }] = windowSends();
    expect(data.type).toBe(NOTEBOOK_SANDBOX_BOOTSTRAP);
    expect(target).toBe("*");
    expect(framePost.mock.calls[0][2]).toHaveLength(1);
  });

  /**
   * THE INVARIANT, stated positively and negatively.
   *
   * The wildcard is permitted exactly once and only because an opaque origin
   * cannot be named. What it carries must never be the author's document.
   */
  it("should_never_send_the_document_through_a_wildcard_window_message", async () => {
    const { iframe, nonce } = renderFrame("<p>secret</p>");

    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    for (const { data, target } of windowSends()) {
      const serialised = JSON.stringify(data ?? {});
      if (target === "*") {
        expect(serialised).not.toContain("secret");
        expect(serialised).not.toContain("html");
      }
    }
  });

  it("should_send_the_document_over_the_private_port_instead", async () => {
    const { iframe, nonce } = renderFrame("<p>secret</p>");

    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    const port = framePost.mock.calls[0][2][0] as MessagePort;
    const received: unknown[] = [];
    port.onmessage = (event) => received.push(event.data);
    port.start();

    await vi.waitFor(() => expect(received).toHaveLength(1));
    expect(received[0]).toEqual({ type: NOTEBOOK_SANDBOX_DOCUMENT, html: "<p>secret</p>" });
  });

  describe("announcements it must refuse", () => {
    it.each([
      // Not our frame's window: any page can post to us claiming anything.
      ["a different window", { source: { postMessage: vi.fn() } }],
      // A real origin is not a sandboxed frame, whatever it says.
      ["a real origin", { origin: ORIGIN }],
      ["our own origin", { origin: "http://localhost" }],
      // Another sandboxed frame on the page shares the opaque origin, so the
      // nonce is what distinguishes ours from theirs.
      ["the wrong nonce", { nonce: "not-the-nonce" }],
    ])("should_ignore_an_announcement_from_%s", async (_label, overrides) => {
      const { iframe, nonce } = renderFrame();

      announce(iframe, nonce, overrides);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(framePost).not.toHaveBeenCalled();
    });
  });
});
