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
   * The nonce has to CROSS THE BOUNDARY, not merely exist.
   *
   * The first version generated a nonce, put it in the URL and checked it on
   * the way in — then omitted it from the bootstrap, so the shell (which
   * validates it) could never connect. The test asserted the message type and
   * the target and stopped there, which is precisely the gap that let it ship:
   * a shape assertion that never looked at the payload the other side reads.
   */
  it("should_send_the_nonce_on_the_bootstrap_so_the_shell_can_accept_it", async () => {
    const { iframe, nonce } = renderFrame();

    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    expect(windowSends()[0].data.nonce).toBe(nonce);
  });

  // It is a correlation token, not a secret, and it is scoped to one frame:
  // two mounted frames must not be interchangeable.
  it("should_bootstrap_each_frame_with_its_own_nonce", async () => {
    const first = renderFrame();
    const second = renderFrame();

    announce(second.iframe, second.nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    expect(windowSends()[0].data.nonce).toBe(second.nonce);
    expect(windowSends()[0].data.nonce).not.toBe(first.nonce);
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

/**
 * Idempotence and observability, both added after a blank frame that produced
 * no console output at all.
 *
 * A shell that retries its announcement is the natural fix for a lost first
 * one — and the version before this opened a FRESH CHANNEL on every retry,
 * so the document went over a port the shell had already discarded. The bug
 * would only have appeared once the other side got more robust, which is the
 * worst time to find it.
 */
describe("NotebookSandboxFrame handshake robustness", () => {
  let framePost: ReturnType<typeof stubFrameWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    framePost = stubFrameWindow();
  });

  it("should_bootstrap_once_however_many_times_the_shell_announces_itself", async () => {
    const { iframe, nonce } = renderFrame();

    announce(iframe, nonce);
    announce(iframe, nonce);
    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    expect(framePost).toHaveBeenCalledTimes(1);
  });

  // A genuine reload is a different thing from a retry, and must reconnect.
  it("should_bootstrap_again_after_the_frame_reloads", async () => {
    const { iframe, nonce } = renderFrame();
    announce(iframe, nonce);
    await vi.waitFor(() => expect(framePost).toHaveBeenCalledTimes(1));

    iframe.dispatchEvent(new Event("load"));
    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalledTimes(2));
  });

  describe("the handshake reports itself in the DOM", () => {
    it("should_start_out_waiting", () => {
      const { iframe } = renderFrame();

      expect(iframe).toHaveAttribute("data-sandbox-state", "waiting");
    });

    it("should_report_connected_once_the_port_is_handed_over", async () => {
      const { iframe, nonce } = renderFrame();

      announce(iframe, nonce);

      await vi.waitFor(() => expect(iframe).toHaveAttribute("data-sandbox-state", "connected"));
    });

    // The whole point: refusing quietly is correct, and silence is exactly
    // what makes a blank frame impossible to diagnose. The reason is recorded
    // where someone inspecting the element will find it.
    it.each([
      ["nonce", { nonce: "wrong" }],
      ["origin", { origin: "https://sandbox.example" }],
    ])("should_record_%s_as_the_reason_it_refused", async (reason, overrides) => {
      const { iframe, nonce } = renderFrame();

      announce(iframe, nonce, overrides);

      await vi.waitFor(() => expect(iframe).toHaveAttribute("data-sandbox-rejected", reason));
      expect(framePost).not.toHaveBeenCalled();
    });

    it("should_not_record_a_rejection_for_unrelated_page_chatter", async () => {
      const { iframe } = renderFrame();

      window.dispatchEvent(
        new MessageEvent("message", { origin: "null", data: { type: "other" } })
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(iframe).not.toHaveAttribute("data-sandbox-rejected");
    });
  });
});
