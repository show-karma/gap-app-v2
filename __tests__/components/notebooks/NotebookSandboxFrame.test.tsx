import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  NOTEBOOK_SANDBOX_ATTRIBUTE,
  NOTEBOOK_SANDBOX_MESSAGE,
  NotebookSandboxFrame,
} from "@/components/Pages/Communities/Notebooks/NotebookSandboxFrame";

const ORIGIN = "https://sandbox.example";

function renderFrame(html = "<h1>hello</h1>") {
  return render(
    <NotebookSandboxFrame sandboxOrigin={ORIGIN} html={html} title="Custom page preview" />
  );
}

/**
 * The containment tests for the one place author HTML is rendered.
 *
 * These are not style assertions. `allow-scripts` together with
 * `allow-same-origin` silently defeats the sandbox — the frame regains a real
 * origin and can script its way back out — and the edit that does it is one
 * word in a diff that looks like it is loosening nothing. So the pair is
 * asserted directly, from several angles, and the test is written to fail
 * loudly rather than to describe current behaviour.
 */

describe("NotebookSandboxFrame containment", () => {
  it("should_sandbox_the_frame_with_scripts_only", () => {
    renderFrame();

    expect(screen.getByTitle("Custom page preview")).toHaveAttribute("sandbox", "allow-scripts");
  });

  // THE ONE THAT MATTERS. Stated as its own test so a failure names the
  // actual danger rather than an attribute mismatch.
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

  // Guards the constant itself, so a change made anywhere still trips.
  it("should_keep_the_sandbox_token_list_to_exactly_allow_scripts", () => {
    expect(NOTEBOOK_SANDBOX_ATTRIBUTE).toBe("allow-scripts");
  });

  it("should_load_the_shell_from_the_sandbox_origin_never_our_own", () => {
    renderFrame();

    const src = screen.getByTitle("Custom page preview").getAttribute("src") ?? "";
    expect(src.startsWith(`${ORIGIN}/`)).toBe(true);
  });

  // A custom page has no business with the camera, the microphone or payments.
  it("should_request_no_permissions_and_leak_no_referrer", () => {
    renderFrame();

    const frame = screen.getByTitle("Custom page preview");
    expect(frame).not.toHaveAttribute("allow");
    expect(frame).toHaveAttribute("referrerPolicy", "no-referrer");
  });
});

/**
 * The document is handed over, never linked to.
 *
 * A draft has not been saved, so review has to happen before there is anything
 * to link to — otherwise the review is theatre performed after the fact.
 */
describe("NotebookSandboxFrame delivery", () => {
  function readyShell() {
    const postMessage = vi.fn();
    // jsdom does not run the shell, so stand in for it: the component must
    // wait to be told the frame is listening.
    Object.defineProperty(HTMLIFrameElement.prototype, "contentWindow", {
      configurable: true,
      get: () => ({ postMessage }),
    });
    return postMessage;
  }

  it("should_not_post_the_document_before_the_shell_says_it_is_listening", () => {
    const postMessage = readyShell();

    renderFrame();

    expect(postMessage).not.toHaveBeenCalled();
  });

  it("should_post_the_document_targeted_at_the_sandbox_origin_never_a_wildcard", async () => {
    const postMessage = readyShell();
    renderFrame("<p>body</p>");

    window.dispatchEvent(
      new MessageEvent("message", { origin: ORIGIN, data: `${NOTEBOOK_SANDBOX_MESSAGE}:ready` })
    );

    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledTimes(1));
    expect(postMessage).toHaveBeenCalledWith(
      { type: NOTEBOOK_SANDBOX_MESSAGE, html: "<p>body</p>" },
      // Explicit target: a wildcard would hand the document to whatever
      // happened to be framed if the src were ever wrong.
      ORIGIN
    );
  });

  it("should_ignore_a_ready_message_from_any_other_origin", async () => {
    const postMessage = readyShell();
    renderFrame();

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "https://evil.example",
        data: `${NOTEBOOK_SANDBOX_MESSAGE}:ready`,
      })
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(postMessage).not.toHaveBeenCalled();
  });
});
