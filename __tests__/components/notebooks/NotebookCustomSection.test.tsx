import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotebookCustomSection } from "@/components/Pages/Communities/Notebooks/NotebookCustomSection";
import {
  NOTEBOOK_SANDBOX_ATTRIBUTE,
  NOTEBOOK_SANDBOX_BOOTSTRAP,
  NOTEBOOK_SANDBOX_DOCUMENT,
  NOTEBOOK_SANDBOX_HEIGHT,
  NOTEBOOK_SANDBOX_MAX_HEIGHT,
  NOTEBOOK_SANDBOX_READY,
  NOTEBOOK_SANDBOX_THEME,
  NotebookSandboxFrame,
} from "@/components/Pages/Communities/Notebooks/NotebookSandboxFrame";

/**
 * SEAMLESS MUST NOT MEAN SOFTER.
 *
 * A custom block now draws with no border, no panel and no scrollbar, inside a
 * page whose other sections are ours. Every one of those is a change to how
 * the block LOOKS, and this file exists to hold the line that none of them is
 * a change to what the block CAN DO. The isolation assertions here are
 * deliberately the same assertions the whole-page tier already carries, made
 * again against the seamless variant — because a variant is exactly the kind
 * of branch that grows an exception nobody notices.
 *
 * The seam that "seamless" actually opened is the THEME. To look native the
 * block needs our palette and our typeface, which means the parent now sends
 * the sandbox a bag of CSS. CSS is a fetching language: a custom property that
 * ends up inside `background: var(--x)` will make the browser request whatever
 * `url()` it names, from a document whose whole purpose is to be untrusted.
 * The shell validates what it applies (see the indexer's shell suite); what is
 * pinned HERE is the parent's half — the channel it travels on, what it may
 * contain, and that it carries nothing of the author's.
 */

const SANDBOX_ORIGIN = "https://karma-pages.example";
const AUTHOR_HTML =
  '<script>window.top.location="https://attacker.invalid"</script><h1>Hand-written</h1>';

/** Stands in for the shell, which jsdom does not run. */
function stubFrameWindow() {
  const postMessage = vi.fn();
  Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
    configurable: true,
    get() {
      if (!this.__stubWindow) this.__stubWindow = { postMessage };
      return this.__stubWindow;
    },
  });
  return postMessage;
}

function renderSeamless(html = AUTHOR_HTML) {
  const result = render(
    <NotebookSandboxFrame
      variant="seamless"
      sandboxOrigin={SANDBOX_ORIGIN}
      html={html}
      title="Live detail"
    />
  );
  const iframe = result.container.querySelector("iframe") as HTMLIFrameElement;
  const nonce = decodeURIComponent(new URL(iframe.src).hash.replace("#nonce=", ""));
  return { ...result, iframe, nonce };
}

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

interface PortMessage {
  type?: string;
  [key: string]: unknown;
}

describe("the seamless custom block", () => {
  let framePost: ReturnType<typeof stubFrameWindow>;

  beforeEach(() => {
    vi.clearAllMocks();
    framePost = stubFrameWindow();
    document.documentElement.className = "";
  });

  afterEach(() => {
    document.documentElement.className = "";
  });

  /**
   * The shell's end of the private channel, plus everything that has arrived
   * on it in the order it arrived.
   */
  async function connectShell(iframe: HTMLIFrameElement, nonce: string) {
    announce(iframe, nonce);
    await vi.waitFor(() => expect(framePost).toHaveBeenCalled());
    const bootstrap = framePost.mock.calls[framePost.mock.calls.length - 1];
    const port = bootstrap[2][0] as MessagePort;
    const received: PortMessage[] = [];
    port.onmessage = (event: MessageEvent) => {
      received.push(event.data as PortMessage);
    };
    port.start();
    return { port, received };
  }

  // ── Containment, restated against the variant ──────────────────

  describe("containment", () => {
    it("should_sandbox_a_seamless_frame_with_scripts_only", () => {
      const { iframe } = renderSeamless();

      expect(iframe).toHaveAttribute("sandbox", "allow-scripts");
      expect(NOTEBOOK_SANDBOX_ATTRIBUTE).toBe("allow-scripts");
    });

    /**
     * THE MUTATION CHECK.
     *
     * `allow-scripts` with `allow-same-origin` gives the frame back a real
     * origin, and from there it can reach our storage and script its way out.
     * The two tokens together look like nothing in a diff. So this asserts the
     * pair from three directions — the frozen constant, the rendered attribute
     * of a seamless frame, and the rendered attribute of a card frame — because
     * the variant branch is precisely where a per-variant attribute could be
     * introduced without any of the older assertions noticing.
     */
    it.each([
      ["the frozen constant", () => NOTEBOOK_SANDBOX_ATTRIBUTE],
      ["a seamless frame", () => renderSeamless().iframe.getAttribute("sandbox") ?? ""],
      [
        "a card frame",
        () => {
          const result = render(
            <NotebookSandboxFrame
              sandboxOrigin={SANDBOX_ORIGIN}
              html={AUTHOR_HTML}
              title="Custom page"
            />
          );
          const iframe = result.container.querySelector("iframe") as HTMLIFrameElement;
          return iframe.getAttribute("sandbox") ?? "";
        },
      ],
    ])("should_never_pair_allow_scripts_with_allow_same_origin_in_%s", (_label, read) => {
      const tokens = read().split(/\s+/).filter(Boolean);

      expect(tokens).toEqual(["allow-scripts"]);
      expect(tokens).not.toContain("allow-same-origin");
    });

    /**
     * The second containment, and not redundant with the first: the sandbox
     * attribute applies to the FRAME, while an origin is what decides what a
     * document could reach if it were ever loaded any other way.
     */
    it("should_serve_the_shell_from_a_host_that_is_not_ours", () => {
      const { iframe } = renderSeamless();
      const frameHost = new URL(iframe.src).host;

      expect(iframe.src.startsWith(`${SANDBOX_ORIGIN}/`)).toBe(true);
      expect(frameHost).not.toBe(window.location.host);
    });

    it("should_request_no_permissions_and_leak_no_referrer", () => {
      const { iframe } = renderSeamless();

      expect(iframe).not.toHaveAttribute("allow");
      expect(iframe).toHaveAttribute("referrerPolicy", "no-referrer");
    });

    /**
     * NEVER URL-ADDRESSABLE. The document is not in the frame's `src`, not in
     * a query string, not in the fragment, and not anywhere in our own DOM —
     * the only path it takes is the private port.
     */
    it("should_keep_the_document_out_of_every_addressable_surface", async () => {
      const { iframe, nonce, container } = renderSeamless();

      expect(iframe.src).not.toContain("Hand-written");
      expect(iframe.src).not.toContain("script");
      expect(new URL(iframe.src).search).toBe("");
      expect(container.innerHTML).not.toContain("Hand-written");

      await connectShell(iframe, nonce);

      expect(iframe.src).not.toContain("Hand-written");
      expect(document.body.innerHTML).not.toContain("Hand-written");
    });

    /**
     * THE ONE PERMITTED WILDCARD STAYS CONTENTLESS.
     *
     * An opaque origin cannot be named, so the bootstrap has to go to `"*"`.
     * That is only acceptable while the thing handed over is a port. A theme
     * or a document that ever joined it would be readable by any frame that
     * could receive the message.
     */
    it("should_send_nothing_but_a_port_to_the_wildcard_origin", async () => {
      const { iframe, nonce } = renderSeamless();
      await connectShell(iframe, nonce);

      for (const [payload, targetOrigin, transfer] of framePost.mock.calls) {
        expect(targetOrigin).toBe("*");
        expect(payload).toEqual({ type: NOTEBOOK_SANDBOX_BOOTSTRAP, nonce });
        expect(JSON.stringify(payload)).not.toContain("Hand-written");
        expect(transfer).toHaveLength(1);
      }
    });
  });

  // ── Height ─────────────────────────────────────────────────────

  describe("height", () => {
    it("should_follow_the_document_when_the_shell_reports_over_the_port", async () => {
      const { iframe, nonce } = renderSeamless();
      const { port } = await connectShell(iframe, nonce);

      port.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 4200 });

      await vi.waitFor(() => expect(iframe.style.height).toBe("4200px"));
      expect(iframe).toHaveAttribute("data-sandbox-height", "4200");
    });

    it("should_clamp_a_height_that_would_make_the_page_absurdly_tall", async () => {
      const { iframe, nonce } = renderSeamless();
      const { port } = await connectShell(iframe, nonce);

      port.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 10_000_000 });

      await vi.waitFor(() => expect(iframe.style.height).toBe(`${NOTEBOOK_SANDBOX_MAX_HEIGHT}px`));
    });

    /**
     * THE ASSERTION THE SEAMLESS VARIANT MOST NEEDED RE-MADE.
     *
     * This message carries a real source, a real opaque origin and this
     * instance's nonce — everything the READY handshake checks — and still
     * must not move the frame. The port is what proves who is talking; if a
     * window message could resize the block, any frame on the page could
     * reach into a community's report and stretch or collapse a section.
     */
    it("should_ignore_a_height_that_arrives_as_a_window_message", async () => {
      const { iframe, nonce } = renderSeamless();
      await connectShell(iframe, nonce);
      const before = iframe.style.height;

      const event = new MessageEvent("message", {
        origin: "null",
        data: { type: NOTEBOOK_SANDBOX_HEIGHT, nonce, height: 12_000 },
      });
      Object.defineProperty(event, "source", { value: iframe.contentWindow });
      window.dispatchEvent(event);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(iframe.style.height).toBe(before);
      expect(iframe).not.toHaveAttribute("data-sandbox-height");
    });

    // Inert, not a reset: a garbled message leaves the last good height alone.
    it.each([
      ["a numeric string", "4200"],
      ["a css length", "4200px"],
      ["NaN", Number.NaN],
      ["Infinity", Number.POSITIVE_INFINITY],
      ["zero", 0],
      ["a negative number", -1],
      ["an object", { height: 4200 }],
    ])("should_keep_the_last_good_height_when_told_%s", async (_label, value) => {
      const { iframe, nonce } = renderSeamless();
      const { port } = await connectShell(iframe, nonce);
      port.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: 900 });
      await vi.waitFor(() => expect(iframe.style.height).toBe("900px"));

      port.postMessage({ type: NOTEBOOK_SANDBOX_HEIGHT, height: value });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(iframe.style.height).toBe("900px");
    });

    /**
     * A seamless block is never left at the browser's 150px iframe default: it
     * has no card, so there is nothing to read as "this is loading" — it would
     * simply look like a section that got cut off.
     */
    it("should_carry_an_explicit_height_before_the_shell_has_reported", () => {
      const { iframe } = renderSeamless();

      expect(iframe.style.height).toMatch(/^\d+px$/);
      expect(iframe.className).not.toContain("h-[60vh]");
    });
  });

  // ── Theme ──────────────────────────────────────────────────────

  describe("theme", () => {
    it("should_arrive_over_the_private_port_before_the_document", async () => {
      const { iframe, nonce } = renderSeamless();
      const { received } = await connectShell(iframe, nonce);

      await vi.waitFor(() => expect(received.length).toBeGreaterThanOrEqual(2));
      expect(received.map((message) => message.type)).toEqual([
        NOTEBOOK_SANDBOX_THEME,
        NOTEBOOK_SANDBOX_DOCUMENT,
      ]);
    });

    /**
     * The theme is a bag of CSS travelling INTO an untrusted document. It is
     * only safe there because the shell refuses anything it does not
     * recognise — but the parent must not be the thing that makes the shell's
     * job harder, so what it sends is exactly the snapshot's three fields and
     * nothing else, and none of them is ever the author's markup.
     */
    it("should_carry_only_a_mode_a_variable_bag_and_font_faces", async () => {
      const { iframe, nonce } = renderSeamless();
      const { received } = await connectShell(iframe, nonce);

      await vi.waitFor(() => expect(received.length).toBeGreaterThanOrEqual(1));
      const theme = received.find((message) => message.type === NOTEBOOK_SANDBOX_THEME);

      expect(theme).toBeDefined();
      expect(Object.keys(theme ?? {}).sort()).toEqual(["fontFaces", "mode", "type", "vars"]);
      expect(["light", "dark"]).toContain(theme?.mode);
      expect(JSON.stringify(theme)).not.toContain("Hand-written");
    });

    it("should_never_be_posted_as_a_window_message", async () => {
      const { iframe, nonce } = renderSeamless();
      await connectShell(iframe, nonce);

      for (const [payload] of framePost.mock.calls) {
        expect((payload as PortMessage).type).not.toBe(NOTEBOOK_SANDBOX_THEME);
      }
    });

    /**
     * Dark and light follow the HOST. Tailwind's `darkMode: ["class"]` means
     * the class on `<html>` is the mode, so a reader flipping the app's theme
     * switch has to reach the block — otherwise a page goes dark around a
     * block that stays white, which is a worse seam than the border ever was.
     */
    it("should_be_resent_when_the_host_switches_theme", async () => {
      const { iframe, nonce } = renderSeamless();
      const { received } = await connectShell(iframe, nonce);
      await vi.waitFor(() => expect(received.length).toBeGreaterThanOrEqual(2));
      const initial = received.filter((message) => message.type === NOTEBOOK_SANDBOX_THEME).length;

      document.documentElement.classList.add("dark");

      await vi.waitFor(() => {
        const themes = received.filter((message) => message.type === NOTEBOOK_SANDBOX_THEME);
        expect(themes.length).toBeGreaterThan(initial);
        expect(themes[themes.length - 1]?.mode).toBe("dark");
      });
    });

    /**
     * The whole-page tier does NOT get a theme, and that is deliberate rather
     * than an omission. A custom PAGE is the author's own canvas end to end —
     * it has no surrounding sections to match — and pushing our palette into
     * it would restyle documents that already render correctly today.
     */
    it("should_not_be_sent_to_a_card_frame", async () => {
      const result = render(
        <NotebookSandboxFrame
          sandboxOrigin={SANDBOX_ORIGIN}
          html={AUTHOR_HTML}
          title="Custom page"
        />
      );
      const iframe = result.container.querySelector("iframe") as HTMLIFrameElement;
      const nonce = decodeURIComponent(new URL(iframe.src).hash.replace("#nonce=", ""));
      const { received } = await connectShell(iframe, nonce);

      await vi.waitFor(() => expect(received.length).toBeGreaterThanOrEqual(1));
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(received.map((message) => message.type)).toEqual([NOTEBOOK_SANDBOX_DOCUMENT]);
    });
  });

  // ── The render a reader actually sees ──────────────────────────

  describe("the rendered block", () => {
    it("should_draw_no_border_no_card_and_no_background", () => {
      const { iframe } = renderSeamless();
      const classes = iframe.className.split(/\s+/);

      expect(classes).toContain("border-0");
      expect(classes).toContain("bg-transparent");
      expect(iframe.className).not.toMatch(/\brounded/);
      expect(iframe.className).not.toMatch(/\bshadow/);
      expect(iframe.className).not.toMatch(/\bborder-border\b/);
      expect(iframe.className).not.toMatch(/\bbg-background\b/);
      expect(iframe.className).not.toMatch(/\bp[xy]?-\d/);
    });

    /**
     * NO INNER SCROLLBAR, by two mechanisms because one is not enough.
     *
     * The inner document's scrollbar belongs to the inner document, and no CSS
     * of ours can reach across an origin to hide it. `scrolling="no"` is the
     * one attribute that can; `overflow-hidden` handles our own box. An
     * unreachable scrollbar in the middle of a page — the parent's wheel
     * events never enter the frame — is the single most obvious tell that a
     * section is an embed.
     */
    it("should_have_no_inner_scrollbar", () => {
      const { iframe } = renderSeamless();

      expect(iframe).toHaveAttribute("scrolling", "no");
      expect(iframe.className.split(/\s+/)).toContain("overflow-hidden");
    });

    it("should_take_the_full_width_of_the_section_column", () => {
      const { iframe } = renderSeamless();
      const classes = iframe.className.split(/\s+/);

      expect(classes).toContain("w-full");
      expect(classes).toContain("block");
      expect(iframe.className).not.toMatch(/\bmax-w-/);
    });

    it("should_say_which_variant_it_is_for_the_walk", () => {
      const { iframe } = renderSeamless();

      expect(iframe).toHaveAttribute("data-sandbox-variant", "seamless");
    });
  });
});

/**
 * The section wrapper.
 *
 * There is nothing between the frame and the page's own layout — no div, no
 * padding, no measure of its own — because a wrapper with any box of its own
 * would put the block on a different measure from the sections above and below
 * it, and a few pixels of misalignment reads as sloppiness rather than as a
 * decision.
 */
describe("NotebookCustomSection", () => {
  beforeEach(() => {
    stubFrameWindow();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should_render_the_frame_directly_with_no_wrapper_of_its_own", () => {
    vi.stubEnv("NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN", SANDBOX_ORIGIN);

    const { container } = render(
      <NotebookCustomSection
        section={{ type: "custom-html", html: AUTHOR_HTML, title: "Live detail" }}
      />
    );

    expect(container.firstElementChild?.tagName).toBe("IFRAME");
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("should_name_the_frame_for_a_screen_reader_without_drawing_a_heading", () => {
    vi.stubEnv("NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN", SANDBOX_ORIGIN);

    const { container } = render(
      <NotebookCustomSection
        section={{ type: "custom-html", html: AUTHOR_HTML, title: "Live detail" }}
      />
    );

    expect(container.querySelector("iframe")).toHaveAttribute("title", "Live detail");
    expect(container.textContent).toBe("");
  });

  /**
   * FAIL CLOSED, AND SILENTLY. With no sandbox origin there is nowhere safe to
   * put the document, so it is not rendered at all — and critically it is not
   * rendered anywhere else either. An error panel would tell a reader about
   * our configuration in the middle of a page that is otherwise complete.
   */
  it("should_render_nothing_at_all_when_the_sandbox_is_unconfigured", () => {
    vi.stubEnv("NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN", "");

    const { container } = render(
      <NotebookCustomSection section={{ type: "custom-html", html: AUTHOR_HTML }} />
    );

    expect(container.innerHTML).toBe("");
    expect(container.innerHTML).not.toContain("Hand-written");
  });

  /**
   * A same-origin value is misconfiguration, not a convenience: serving an
   * author's document from the app origin is the one thing this design exists
   * to prevent, so it must fail closed exactly as an absent value does.
   */
  it.each([
    ["our own origin as a relative path", "/notebook-sandbox"],
    ["a value that is not an origin", "not-an-origin"],
    ["an origin with a path", "https://karma-pages.example/shell"],
  ])("should_render_nothing_when_the_origin_is_%s", (_label, configured) => {
    vi.stubEnv("NEXT_PUBLIC_NOTEBOOK_SANDBOX_ORIGIN", configured);

    const { container } = render(
      <NotebookCustomSection section={{ type: "custom-html", html: AUTHOR_HTML }} />
    );

    expect(container.innerHTML).toBe("");
  });
});
