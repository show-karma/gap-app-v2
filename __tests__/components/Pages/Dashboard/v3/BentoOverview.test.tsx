import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BentoOverview } from "@/components/Pages/Dashboard/v3/BentoOverview";
import type { DashModule } from "@/components/Pages/Dashboard/v3/module";

// Render motion elements/AnimatePresence synchronously (jsdom has no layout
// engine). Scoped here rather than globally so it can't mask motion behavior
// in other suites.
vi.mock("motion/react", () => import("@/__tests__/helpers/motion-mock"));

const makeModule = (key: string, label: string, detail: string): DashModule => ({
  key,
  label,
  icon: key === "projects" ? "rocket" : "users",
  status: "ready",
  summary: { big: 2, rows: [] },
  empty: { prompt: "", cta: { label: "" } },
  render: () => <div>{detail}</div>,
});

describe("BentoOverview", () => {
  const modules = [
    makeModule("projects", "My projects", "PROJECTS DETAIL"),
    makeModule("communities", "My communities", "COMMUNITIES DETAIL"),
  ];

  beforeEach(() => {
    // Drill-in writes the module key to location.hash; jsdom keeps the URL
    // across tests in this file, so reset it to avoid auto-opening a module.
    window.history.replaceState(null, "", window.location.pathname);
  });

  it("renders one tile per module in the overview", () => {
    render(<BentoOverview modules={modules} />);
    expect(screen.getByText("My projects")).toBeInTheDocument();
    expect(screen.getByText("My communities")).toBeInTheDocument();
    expect(screen.queryByText("PROJECTS DETAIL")).not.toBeInTheDocument();
  });

  it("drills into a module on tile click and back again", async () => {
    render(<BentoOverview modules={modules} />);

    fireEvent.click(screen.getByRole("button", { name: /open my projects/i }));

    // The clicked tile morphs into the drill-in via a shared layoutId
    // (AnimatePresence mode="popLayout"), so the new view mounts immediately
    // while the overview fades out alongside it — both content and its
    // eventual removal need to be awaited.
    expect(await screen.findByText("PROJECTS DETAIL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back to overview/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("My communities")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /back to overview/i }));

    // Back to the grid.
    expect(await screen.findByText("My communities")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("PROJECTS DETAIL")).not.toBeInTheDocument());
  });

  it("opens a drill-in via pushState so the browser Back button can close it", async () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    render(<BentoOverview modules={modules} />);

    fireEvent.click(screen.getByRole("button", { name: /open my projects/i }));
    await screen.findByText("PROJECTS DETAIL");

    // pushState (not replaceState) leaves a history entry for the overview, so
    // browser Back pops the hash and the hashchange listener closes the drill-in
    // instead of exiting the page.
    expect(pushSpy).toHaveBeenCalledWith(null, "", "#projects");
    expect(window.location.hash).toBe("#projects");
    pushSpy.mockRestore();
  });

  it("closes the drill-in when the browser navigates back off the hash", async () => {
    render(<BentoOverview modules={modules} />);
    fireEvent.click(screen.getByRole("button", { name: /open my projects/i }));
    expect(await screen.findByText("PROJECTS DETAIL")).toBeInTheDocument();

    // Simulate the browser Back button: the pushed hash is popped and a
    // hashchange fires. The drill-in should return to the overview.
    window.history.replaceState(null, "", window.location.pathname);
    act(() => {
      window.dispatchEvent(new Event("hashchange"));
    });

    await waitFor(() => expect(screen.queryByText("PROJECTS DETAIL")).not.toBeInTheDocument());
    expect(screen.getByText("My communities")).toBeInTheDocument();
  });

  it("reports focus changes so callers can hide overview-only affordances", async () => {
    const onFocusChange = vi.fn();
    render(<BentoOverview modules={modules} onFocusChange={onFocusChange} />);

    expect(onFocusChange).toHaveBeenLastCalledWith(null);

    fireEvent.click(screen.getByRole("button", { name: /open my projects/i }));
    await waitFor(() => expect(onFocusChange).toHaveBeenLastCalledWith("projects"));

    fireEvent.click(await screen.findByRole("button", { name: /back to overview/i }));
    await waitFor(() => expect(onFocusChange).toHaveBeenLastCalledWith(null));
  });

  describe("hash deep-linking", () => {
    const fireHashChange = () =>
      act(() => {
        window.dispatchEvent(new Event("hashchange"));
      });

    it("auto-opens the module whose key matches the URL hash on mount", async () => {
      window.history.replaceState(null, "", "#projects");
      render(<BentoOverview modules={modules} />);

      expect(await screen.findByText("PROJECTS DETAIL")).toBeInTheDocument();
    });

    it("ignores a hash that matches no module key on mount", () => {
      window.history.replaceState(null, "", "#nope");
      render(<BentoOverview modules={modules} />);

      expect(screen.getByText("My projects")).toBeInTheDocument();
      expect(screen.queryByText("PROJECTS DETAIL")).not.toBeInTheDocument();
    });

    it("opens a module when the hash changes to its key", async () => {
      render(<BentoOverview modules={modules} />);
      expect(screen.queryByText("COMMUNITIES DETAIL")).not.toBeInTheDocument();

      window.history.replaceState(null, "", "#communities");
      fireHashChange();

      expect(await screen.findByText("COMMUNITIES DETAIL")).toBeInTheDocument();
    });

    it("returns to the overview when the hash no longer matches a module", async () => {
      window.history.replaceState(null, "", "#projects");
      render(<BentoOverview modules={modules} />);
      expect(await screen.findByText("PROJECTS DETAIL")).toBeInTheDocument();

      window.history.replaceState(null, "", window.location.pathname);
      fireHashChange();

      await waitFor(() => expect(screen.queryByText("PROJECTS DETAIL")).not.toBeInTheDocument());
      expect(screen.getByText("My projects")).toBeInTheDocument();
    });
  });
});
