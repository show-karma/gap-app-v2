import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NotebookFrame } from "@/components/Pages/Communities/Notebooks/NotebookFrame";

const SRC = "https://app.karmahq.org/notebooks/filecoin/grants-overview/index.html";

function renderFrame() {
  render(<NotebookFrame src={SRC} title="Grants overview" />);
  return screen.getByTitle("Grants overview") as HTMLIFrameElement;
}

/** Posts a message that appears to come from `source`, as the browser would. */
function postFrom(source: Window | null, data: unknown) {
  fireEvent(
    window,
    new MessageEvent("message", { data, source: source as Window, origin: "null" })
  );
}

describe("NotebookFrame", () => {
  it("shows a loading state until the frame loads", () => {
    renderFrame();

    expect(screen.getByTestId("notebook-frame-loading")).toBeInTheDocument();
  });

  it("clears the loading state once the frame loads", async () => {
    const frame = renderFrame();

    fireEvent.load(frame);

    await waitFor(() => {
      expect(screen.queryByTestId("notebook-frame-loading")).not.toBeInTheDocument();
    });
  });

  // An iframe's onError does not fire for an HTTP 404/500 — the browser renders
  // the server's error page inside the frame instead — and the opaque origin
  // hides the frame's state from the host. A timeout is the only failure signal
  // this component actually has, so it is the one that gets tested.
  describe("failure to load", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("renders an error state when the frame never loads", async () => {
      vi.useFakeTimers();
      renderFrame();

      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });

      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    });

    it("does not call a slow-but-successful load a failure", async () => {
      vi.useFakeTimers();
      const frame = renderFrame();

      await act(async () => {
        vi.advanceTimersByTime(14_000);
      });
      fireEvent.load(frame);
      await act(async () => {
        vi.advanceTimersByTime(10_000);
      });

      expect(screen.queryByText(/could not be loaded/i)).not.toBeInTheDocument();
    });
  });

  it("lazy-loads so the surrounding page is interactive first", () => {
    expect(renderFrame()).toHaveAttribute("loading", "lazy");
  });

  describe("height messages", () => {
    it("resizes when its own frame reports a height", async () => {
      const frame = renderFrame();

      postFrom(frame.contentWindow, { type: "notebook:height", height: 2400 });

      await waitFor(() => {
        expect(frame.style.height).toBe("2400px");
      });
    });

    // The frame is on an opaque origin, so every message it sends has
    // `origin: "null"` — indistinguishable from any other sandboxed frame on
    // the page. Identity has to come from the source window.
    it("ignores a height message from a different window", async () => {
      const frame = renderFrame();
      const before = frame.style.height;

      postFrom(window, { type: "notebook:height", height: 9999 });

      await waitFor(() => {
        expect(frame.style.height).toBe(before);
      });
    });

    it("ignores a message with no source at all", async () => {
      const frame = renderFrame();
      const before = frame.style.height;

      postFrom(null, { type: "notebook:height", height: 9999 });

      await waitFor(() => {
        expect(frame.style.height).toBe(before);
      });
    });

    it.each([
      ["a foreign message type", { type: "something:else", height: 2400 }],
      ["a non-numeric height", { type: "notebook:height", height: "2400" }],
      ["a NaN height", { type: "notebook:height", height: Number.NaN }],
      ["a bare string", "notebook:height"],
      ["null", null],
    ])("ignores %s", async (_label, data) => {
      const frame = renderFrame();
      const before = frame.style.height;

      postFrom(frame.contentWindow, data);

      await waitFor(() => {
        expect(frame.style.height).toBe(before);
      });
    });

    // A hostile or buggy notebook must not be able to blow the layout out to an
    // arbitrary size, nor collapse itself to nothing.
    it("clamps an absurdly large height", async () => {
      const frame = renderFrame();

      postFrom(frame.contentWindow, { type: "notebook:height", height: 10_000_000 });

      await waitFor(() => {
        expect(frame.style.height).toBe("20000px");
      });
    });

    it("clamps a zero or negative height", async () => {
      const frame = renderFrame();

      postFrom(frame.contentWindow, { type: "notebook:height", height: -50 });

      await waitFor(() => {
        expect(frame.style.height).toBe("320px");
      });
    });
  });
});
