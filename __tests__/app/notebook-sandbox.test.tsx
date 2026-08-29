import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_SANDBOX_TOKENS,
  NOTEBOOK_SANDBOX,
  NotebookFrame,
} from "@/components/Pages/Communities/Notebooks/NotebookFrame";

/**
 * BLOCKING topology invariant for the notebook embed.
 *
 * Notebook bundles are served from gap-app-v2's OWN origin. `allow-same-origin`
 * would therefore return the frame to this app's real origin — full DOM access,
 * cookies, the Privy session — turning tenant-authored JavaScript into stored
 * XSS on an authenticated origin. Under same-origin hosting there is no
 * configuration in which that token is acceptable; it is a sandbox escape, not
 * a fallback.
 *
 * These assertions run against the RENDERED attribute rather than the source
 * string, so a wrapper component, a sanitiser, or a prop that widened the value
 * at runtime cannot slip past. Mutation-checked: changing the rendered sandbox
 * to include `allow-same-origin` fails these tests.
 *
 * If this file is ever deleted or relaxed, the change must be justified against
 * the P2 exit condition — client self-service authoring requires moving to a
 * separate registrable origin FIRST, at which point the topology assertion
 * changes shape rather than disappearing.
 */

const SRC = "https://app.karmahq.org/notebooks/filecoin/grants-overview/index.html";

function renderFrame() {
  render(<NotebookFrame src={SRC} title="Grants overview" />);
  const frame = screen.getByTitle("Grants overview");
  expect(frame.tagName).toBe("IFRAME");
  return frame;
}

describe("notebook iframe sandbox (blocking invariant)", () => {
  it("renders a sandbox attribute at all", () => {
    const frame = renderFrame();

    // An absent attribute is not an empty sandbox — it is NO sandbox, the most
    // permissive state possible.
    expect(frame.hasAttribute("sandbox")).toBe(true);
  });

  it("grants allow-scripts on the rendered attribute", () => {
    const frame = renderFrame();

    expect(frame.getAttribute("sandbox")?.split(/\s+/)).toContain("allow-scripts");
  });

  it.each(FORBIDDEN_SANDBOX_TOKENS)("never grants %s on the rendered attribute", (token) => {
    const frame = renderFrame();

    expect(frame.getAttribute("sandbox")?.split(/\s+/)).not.toContain(token);
  });

  // The single assertion that matters most, stated on its own so a failure
  // names the actual danger.
  it("never grants allow-same-origin, which would undo the sandbox entirely", () => {
    const frame = renderFrame();

    expect(frame.getAttribute("sandbox")).not.toContain("allow-same-origin");
  });

  it("grants allow-scripts and nothing else", () => {
    const frame = renderFrame();

    const tokens = (frame.getAttribute("sandbox") ?? "").split(/\s+/).filter(Boolean);
    expect(tokens).toEqual(["allow-scripts"]);
  });

  it("renders exactly the exported constant", () => {
    const frame = renderFrame();

    // Pins the component to the constant the rest of the codebase reasons
    // about, so a divergence cannot hide behind an equivalent-looking string.
    expect(frame.getAttribute("sandbox")).toBe(NOTEBOOK_SANDBOX);
    expect(NOTEBOOK_SANDBOX).toBe("allow-scripts");
  });

  it("exposes no prop that could widen the sandbox", () => {
    // A `sandbox` prop would make the invariant a caller's choice. Passing one
    // must not change the rendered attribute.
    const props = { src: SRC, title: "Grants overview", sandbox: "allow-same-origin" };
    render(<NotebookFrame {...(props as never)} />);

    const frames = screen.getAllByTitle("Grants overview");
    for (const frame of frames) {
      expect(frame.getAttribute("sandbox")).toBe("allow-scripts");
    }
  });

  it("points the frame at the src it was given, unmodified", () => {
    const frame = renderFrame();

    expect(frame.getAttribute("src")).toBe(SRC);
  });
});
