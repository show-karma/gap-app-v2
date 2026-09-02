import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampNotebookSandboxHeight,
  NOTEBOOK_SANDBOX_ATTRIBUTE,
  NOTEBOOK_SANDBOX_BOOTSTRAP,
  NOTEBOOK_SANDBOX_DOCUMENT,
  NOTEBOOK_SANDBOX_HEIGHT,
  NOTEBOOK_SANDBOX_MAX_HEIGHT,
  NOTEBOOK_SANDBOX_MIN_HEIGHT,
  NOTEBOOK_SANDBOX_READY,
  NOTEBOOK_SANDBOX_SEAMLESS_INITIAL_HEIGHT,
  NOTEBOOK_SANDBOX_SEAMLESS_MIN_HEIGHT,
  NOTEBOOK_SANDBOX_THEME,
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

  // Sent as the port is created, so a connection never sits open with nothing
  // on it while an author waits for their page to appear.
  it("should_send_the_document_over_the_private_port_instead", async () => {
    const { iframe, nonce } = renderFrame("<p>secret</p>");
    const received: unknown[] = [];

    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    const port = framePost.mock.calls[0][2][0] as MessagePort;
    port.onmessage = (event) => received.push(event.data);
    port.start();

    await vi.waitFor(() => expect(received.length).toBeGreaterThan(0));
    expect(received[0]).toEqual({ type: NOTEBOOK_SANDBOX_DOCUMENT, html: "<p>secret</p>" });
    // Exactly once: a reconnect must not re-push an unchanged document.
    expect(received).toHaveLength(1);
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

  /**
   * ANSWER EVERY ANNOUNCEMENT. This replaces an earlier "bootstrap exactly
   * once" rule that was wrong for a reason worth recording.
   *
   * A window.postMessage is not queued the way a MessagePort is. If our
   * bootstrap reaches the frame before the shell has attached its listener it
   * is simply gone — and a parent that latches after one send then ignores a
   * shell retrying forever. Both sides behave reasonably and nothing happens.
   * Replying every time converges, because the shell stops announcing once a
   * bootstrap lands.
   */
  it("should_answer_every_announcement_so_a_lost_bootstrap_recovers", async () => {
    const { iframe, nonce } = renderFrame();

    announce(iframe, nonce);
    announce(iframe, nonce);
    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalledTimes(3));
  });

  it("should_hand_over_a_fresh_port_on_each_answer", async () => {
    const { iframe, nonce } = renderFrame();

    announce(iframe, nonce);
    announce(iframe, nonce);

    await vi.waitFor(() => expect(framePost).toHaveBeenCalledTimes(2));
    expect(framePost.mock.calls[0][2][0]).not.toBe(framePost.mock.calls[1][2][0]);
  });

  describe("the handshake reports itself in the DOM", () => {
    it("should_start_out_waiting", () => {
      const { iframe } = renderFrame();

      expect(iframe).toHaveAttribute("data-sandbox-state", "waiting");
      expect(iframe).toHaveAttribute("data-sandbox-ready-count", "0");
      expect(iframe).toHaveAttribute("data-sandbox-bootstrap-count", "0");
    });

    /**
     * The counters separate "the shell never reached us" from "we answered and
     * it did not land" — two causes of a blank frame that look identical from
     * outside the sandbox.
     */
    it("should_count_announcements_and_answers", async () => {
      const { iframe, nonce } = renderFrame();

      announce(iframe, nonce);
      announce(iframe, nonce);

      await vi.waitFor(() => expect(iframe).toHaveAttribute("data-sandbox-ready-count", "2"));
      expect(iframe).toHaveAttribute("data-sandbox-bootstrap-count", "2");
    });

    // The case both counters miss: a shell announcing itself under a type we
    // do not recognise is refused silently, because refusing quietly is right.
    it("should_record_the_last_message_type_its_own_frame_sent", async () => {
      const { iframe } = renderFrame();
      const event = new MessageEvent("message", {
        origin: "null",
        data: { type: "karma:notebook-sandbox:hello" },
      });
      Object.defineProperty(event, "source", { value: iframe.contentWindow });

      window.dispatchEvent(event);

      await vi.waitFor(() =>
        expect(iframe).toHaveAttribute("data-sandbox-last-type", "karma:notebook-sandbox:hello")
      );
      expect(iframe).toHaveAttribute("data-sandbox-ready-count", "0");
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

    // Chatter from OTHER windows is not ours to diagnose, and recording it
    // would bury the one refusal anybody cares about.
    it("should_ignore_messages_from_windows_that_are_not_our_frame", async () => {
      const { iframe } = renderFrame();

      window.dispatchEvent(
        new MessageEvent("message", { origin: "null", data: { type: "other" } })
      );

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(iframe).not.toHaveAttribute("data-sandbox-rejected");
      expect(iframe).not.toHaveAttribute("data-sandbox-last-type");
    });
  });
});

/**
 * Sizing the frame to the document it contains.
 *
 * The parent CANNOT measure this content — the frame is cross-origin and
 * opaque, which is the whole design — so the height has to arrive as a
 * message. That makes it the first thing the shell ever tells the parent, and
 * these tests pin the two properties that keeps honest: it arrives over the
 * PRIVATE PORT (a window message claiming the same thing is not enough), and
 * the number is clamped before it reaches a style attribute.
 *
 * Without this the frame is a fixed 60vh box, and a long report becomes a
 * small window with an inner scrollbar the parent's wheel events cannot reach.
 */
describe("clampNotebookSandboxHeight", () => {
  it.each([
    ["a plain measurement", 4200, 4200],
    ["a fractional one, rounded up so it never leaves a scrollbar", 4200.2, 4201],
    ["one under the minimum", 10, NOTEBOOK_SANDBOX_MIN_HEIGHT],
    ["one over the maximum", 10_000_000, NOTEBOOK_SANDBOX_MAX_HEIGHT],
  ])("should_accept_%s", (_label, value, expected) => {
    expect(clampNotebookSandboxHeight(value)).toBe(expected);
  });

  // `null`, not a fallback number: the caller keeps the height it already has,
  // so a garbled message cannot resize a page it failed to describe.
  it.each([
    ["a string", "4200px"],
    ["a numeric string", "4200"],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["zero", 0],
    ["a negative number", -1],
    ["null", null],
    ["undefined", undefined],
    ["an object", { height: 4200 }],
  ])("should_refuse_%s", (_label, value) => {
    expect(clampNotebookSandboxHeight(value)).toBeNull();
  });
});

describe("NotebookSandboxFrame content height", () => {
  let framePost: ReturnType<typeof stubFrameWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    framePost = stubFrameWindow();
  });

  /** The shell's end of the private channel, as the shell receives it. */
  async function connectShell(iframe: HTMLIFrameElement, nonce: string) {
    announce(iframe, nonce);
    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    return framePost.mock.calls[0][2][0] as MessagePort;
  }

  it("should_size_the_frame_to_the_height_the_shell_reports", async () => {
    const { iframe, nonce } = renderFrame();
    const shellPort = await connectShell(iframe, nonce);

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 4200 });

    await vi.waitFor(() => expect(iframe.style.height).toBe("4200px"));
    expect(iframe).toHaveAttribute("data-sandbox-height", "4200");
  });

  // The fallback is the previous behaviour, deliberately: a shell that never
  // reports renders exactly as it did before this existed.
  it("should_leave_the_fallback_height_in_place_until_the_shell_reports", async () => {
    const { iframe, nonce } = renderFrame();
    await connectShell(iframe, nonce);

    expect(iframe.style.height).toBe("");
    expect(iframe.className).toContain("h-[60vh]");
  });

  it("should_follow_the_shell_when_the_document_grows_or_shrinks", async () => {
    const { iframe, nonce } = renderFrame();
    const shellPort = await connectShell(iframe, nonce);

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 900 });
    await vi.waitFor(() => expect(iframe.style.height).toBe("900px"));

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 5400 });
    await vi.waitFor(() => expect(iframe.style.height).toBe("5400px"));
  });

  it("should_clamp_a_height_that_would_make_the_page_absurdly_tall", async () => {
    const { iframe, nonce } = renderFrame();
    const shellPort = await connectShell(iframe, nonce);

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 10_000_000 });

    await vi.waitFor(() => expect(iframe.style.height).toBe(`${NOTEBOOK_SANDBOX_MAX_HEIGHT}px`));
  });

  // A message that fails the clamp must be inert, not a reset: the frame keeps
  // the last height it was legitimately told about.
  it("should_keep_the_last_good_height_when_a_later_message_is_malformed", async () => {
    const { iframe, nonce } = renderFrame();
    const shellPort = await connectShell(iframe, nonce);

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 900 });
    await vi.waitFor(() => expect(iframe.style.height).toBe("900px"));

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: "12000px" });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(iframe.style.height).toBe("900px");
  });

  /**
   * THE ONE THAT MATTERS HERE. The port is what proves who is talking.
   *
   * A window message can be posted by any frame on the page, and this one
   * carries a real source and a real nonce — everything the READY handshake
   * checks — and still must not move the frame. Resizing on it would make the
   * height the only part of the protocol that any window could drive.
   */
  it("should_ignore_a_height_that_arrives_as_a_window_message", async () => {
    const { iframe, nonce } = renderFrame();
    await connectShell(iframe, nonce);

    const event = new MessageEvent("message", {
      origin: "null",
      data: { type: NOTEBOOK_SANDBOX_HEIGHT, nonce, height: 12_000 },
    });
    Object.defineProperty(event, "source", { value: iframe.contentWindow });
    window.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(iframe.style.height).toBe("");
    expect(iframe).not.toHaveAttribute("data-sandbox-height");
  });

  // The port is replaced on every announcement; the handler has to come with
  // it, or a reconnect silently ends the page's ability to resize.
  it("should_keep_reporting_after_the_shell_reconnects", async () => {
    const { iframe, nonce } = renderFrame();
    await connectShell(iframe, nonce);

    announce(iframe, nonce);
    await vi.waitFor(() => expect(framePost).toHaveBeenCalledTimes(2));
    const reconnected = framePost.mock.calls[1][2][0] as MessagePort;

    reconnected.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 3300 });

    await vi.waitFor(() => expect(iframe.style.height).toBe("3300px"));
  });

  /**
   * The builder's preview pane opts out, and the opt-out has to be real.
   *
   * A preview that grew to a long document would push the textarea the author
   * is typing into off the screen, on every keystroke. Ignoring the message is
   * the behaviour; a `className` that happens to win the cascade is not, because
   * the inline style this component writes would beat it.
   */
  it("should_not_resize_when_the_caller_asked_for_a_fixed_box", async () => {
    const result = render(
      <NotebookSandboxFrame
        sandboxOrigin={ORIGIN}
        html="<h1>hello</h1>"
        title="Custom page preview"
        fitToContent={false}
      />
    );
    const iframe = result.container.querySelector("iframe") as HTMLIFrameElement;
    const nonce = decodeURIComponent(new URL(iframe.src).hash.replace("#nonce=", ""));
    const shellPort = await connectShell(iframe, nonce);

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 4200 });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(iframe.style.height).toBe("");
    expect(iframe).not.toHaveAttribute("data-sandbox-height");
  });

  it("should_ignore_a_message_over_the_port_that_is_not_a_height", async () => {
    const { iframe, nonce } = renderFrame();
    const shellPort = await connectShell(iframe, nonce);

    shellPort.postMessage({ type: "karma:notebook-sandbox:something-else", height: 12_000 });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(iframe.style.height).toBe("");
  });
});

/**
 * The seamless variant: a custom block that has to look like it was rendered
 * by the page around it.
 *
 * WHAT MUST NOT CHANGE is checked here too, and deliberately in the same file
 * as the containment tests. "Seamless" is a request to make the isolation
 * INVISIBLE, and the failure mode of granting that request is making it
 * absent — the tempting way to give an author's HTML the page's fonts and
 * colours is to stop putting it in a frame at all, or to add
 * `allow-same-origin` so it can read the parent's stylesheet. Both are one
 * short diff, both look like presentation work, and both are catastrophic.
 * The first test in this block is the one that catches them.
 */
describe("NotebookSandboxFrame seamless variant", () => {
  let framePost: ReturnType<typeof stubFrameWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    framePost = stubFrameWindow();
    document.documentElement.className = "";
  });

  function renderSeamless(html = "<p>inline</p>") {
    const result = render(
      <NotebookSandboxFrame
        variant="seamless"
        sandboxOrigin={ORIGIN}
        html={html}
        title="Custom section"
      />
    );
    const iframe = result.container.querySelector("iframe") as HTMLIFrameElement;
    const nonce = decodeURIComponent(new URL(iframe.src).hash.replace("#nonce=", ""));
    return { ...result, iframe, nonce };
  }

  async function connectSeamless(iframe: HTMLIFrameElement, nonce: string) {
    announce(iframe, nonce);
    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    return framePost.mock.calls[0][2][0] as MessagePort;
  }

  /** Every message the shell receives over the port, in order. */
  function collect(port: MessagePort) {
    const seen: Record<string, unknown>[] = [];
    port.onmessage = (event: MessageEvent) => seen.push(event.data);
    return seen;
  }

  // THE ONE THAT MATTERS IN THIS BLOCK.
  it("should_contain_a_seamless_block_exactly_as_strictly_as_a_card", () => {
    const { iframe } = renderSeamless();

    expect(iframe).toHaveAttribute("sandbox", NOTEBOOK_SANDBOX_ATTRIBUTE);
    expect((iframe.getAttribute("sandbox") ?? "").split(/\s+/)).not.toContain("allow-same-origin");
    expect(iframe.src.startsWith(`${ORIGIN}/`)).toBe(true);
  });

  it("should_draw_no_border_no_background_and_no_radius", () => {
    const { iframe } = renderSeamless();

    expect(iframe.className).toContain("border-0");
    expect(iframe.className).toContain("bg-transparent");
    expect(iframe.className).not.toContain("rounded");
    expect(iframe.className).not.toContain("border-border");
  });

  it("should_be_a_full_width_block_with_no_inner_scrollbar", () => {
    const { iframe } = renderSeamless();

    expect(iframe.className).toContain("w-full");
    // `block`, because an iframe is inline by default and would otherwise sit
    // on a text baseline with descender space beneath it — a few pixels of gap
    // that reads as sloppy spacing and appears nowhere in the markup.
    expect(iframe.className).toContain("block");
    expect(iframe.className).toContain("overflow-hidden");
    expect(iframe).toHaveAttribute("scrolling", "no");
  });

  it("should_never_leave_a_seamless_block_without_a_height", () => {
    const { iframe } = renderSeamless();

    // Zero until measured would make a section invisible on a shell that never
    // reports, and an invisible section is indistinguishable from a deleted one.
    expect(iframe.style.height).toBe(`${NOTEBOOK_SANDBOX_SEAMLESS_INITIAL_HEIGHT}px`);
  });

  it("should_size_itself_to_the_height_reported_over_the_port", async () => {
    const { iframe, nonce } = renderSeamless();
    const shellPort = await connectSeamless(iframe, nonce);

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 640 });

    await vi.waitFor(() => expect(iframe.style.height).toBe("640px"));
  });

  /**
   * The floor that applies to a whole PAGE must not apply to a block.
   *
   * A one-line callout between two composed sections is a legitimate thing to
   * write, and 320px of floor would pad it with a quarter of a screen of blank
   * page that no author asked for and none could remove.
   */
  it("should_honour_a_short_block_rather_than_padding_it_to_the_page_floor", async () => {
    const { iframe, nonce } = renderSeamless();
    const shellPort = await connectSeamless(iframe, nonce);

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 72 });

    await vi.waitFor(() => expect(iframe.style.height).toBe("72px"));
    expect(NOTEBOOK_SANDBOX_SEAMLESS_MIN_HEIGHT).toBe(0);
  });

  it("should_still_clamp_a_height_that_would_make_the_page_absurdly_tall", async () => {
    const { iframe, nonce } = renderSeamless();
    const shellPort = await connectSeamless(iframe, nonce);

    shellPort.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 9_000_000 });

    await vi.waitFor(() => expect(iframe.style.height).toBe(`${NOTEBOOK_SANDBOX_MAX_HEIGHT}px`));
  });

  /**
   * A height must come over the PORT or not at all.
   *
   * The port is what proves who is talking: it has two ends and nothing else
   * on the page holds one. A window message claiming the same type has no such
   * proof, and honouring it would let any frame on the page resize this one.
   */
  it("should_refuse_a_height_that_arrives_as_a_window_message", async () => {
    const { iframe, nonce } = renderSeamless();
    await connectSeamless(iframe, nonce);

    const event = new MessageEvent("message", {
      origin: "null",
      data: { type: NOTEBOOK_SANDBOX_HEIGHT, nonce, height: 9000 },
    });
    Object.defineProperty(event, "source", { value: iframe.contentWindow });
    window.dispatchEvent(event);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(iframe.style.height).toBe(`${NOTEBOOK_SANDBOX_SEAMLESS_INITIAL_HEIGHT}px`);
  });

  describe("the theme it sends", () => {
    it("should_send_the_theme_before_the_document", async () => {
      const { iframe, nonce } = renderSeamless();
      announce(iframe, nonce);
      await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
      const shellPort = framePost.mock.calls[0][2][0] as MessagePort;
      const seen = collect(shellPort);

      // A port preserves order, so the shell holds the palette and the font
      // faces before the document it must style with them arrives. The other
      // order works and paints once in Times New Roman first — which is
      // precisely the seam this variant exists to remove.
      await vi.waitFor(() => expect(seen).toHaveLength(2));
      expect(seen[0].type).toBe(NOTEBOOK_SANDBOX_THEME);
      expect(seen[1].type).toBe(NOTEBOOK_SANDBOX_DOCUMENT);
    });

    it("should_send_the_mode_the_app_is_actually_in", async () => {
      document.documentElement.classList.add("dark");
      const { iframe, nonce } = renderSeamless();
      announce(iframe, nonce);
      await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
      const seen = collect(framePost.mock.calls[0][2][0] as MessagePort);

      await vi.waitFor(() => expect(seen.length).toBeGreaterThan(0));
      expect(seen[0]).toMatchObject({ type: NOTEBOOK_SANDBOX_THEME, mode: "dark" });
      expect(seen[0]).toHaveProperty("vars");
      expect(seen[0]).toHaveProperty("fontFaces");
    });

    /**
     * A reader who flips to dark mode and is left with one blindingly light
     * block in the middle of the page has found the seam in the most visible
     * way there is.
     */
    it("should_re_send_the_theme_when_the_root_class_changes", async () => {
      const { iframe, nonce } = renderSeamless();
      announce(iframe, nonce);
      await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
      const seen = collect(framePost.mock.calls[0][2][0] as MessagePort);
      await vi.waitFor(() => expect(seen).toHaveLength(2));

      document.documentElement.classList.add("dark");

      await vi.waitFor(() => expect(seen).toHaveLength(3));
      expect(seen[2]).toMatchObject({ type: NOTEBOOK_SANDBOX_THEME, mode: "dark" });
    });

    /**
     * A card frame is a panel with its own border on our own background, and
     * has never wanted our fonts inside it. Sending them would change how tier
     * B looks as a side effect of building tier A.
     */
    it("should_send_no_theme_to_a_card_frame", async () => {
      const { iframe, nonce } = renderFrame();
      announce(iframe, nonce);
      await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
      const seen = collect(framePost.mock.calls[0][2][0] as MessagePort);

      await vi.waitFor(() => expect(seen).toHaveLength(1));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(seen.map((message) => message.type)).toEqual([NOTEBOOK_SANDBOX_DOCUMENT]);
    });

    // It travels the same private channel the document does. A theme posted to
    // "*" would be contentless enough to be harmless, which is exactly why the
    // rule has to be pinned rather than argued about: CONTENT NEVER GOES TO "*".
    it("should_send_the_theme_over_the_port_never_to_a_wildcard_window", async () => {
      const { iframe, nonce } = renderSeamless();
      announce(iframe, nonce);
      await vi.waitFor(() => expect(framePost).toHaveBeenCalled());

      for (const call of framePost.mock.calls) {
        expect(call[0]).not.toMatchObject({ type: NOTEBOOK_SANDBOX_THEME });
      }
    });
  });
});
