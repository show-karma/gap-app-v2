/**
 * @file DatePicker — calendar render location (A1 regression).
 *
 * The "Create a Milestone" ProgressDialog uses a HeadlessUI `<Dialog>`, which
 * tears down when a pointer interaction lands outside its `<Dialog.Panel>`.
 * The calendar popover defaults to a `body` portal, so clicking it read as an
 * outside interaction and closed the whole dialog before the calendar was
 * usable. `renderInline` keeps the calendar inside the panel's DOM subtree.
 *
 * These tests lock in the DOM contract: default => portaled to `body`;
 * `renderInline` => a descendant of the surrounding panel. The default is
 * preserved so no non-dialog caller changes behavior.
 */

import { Dialog, Transition } from "@headlessui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { Fragment } from "react";
import { DatePicker } from "@/components/Utilities/DatePicker";

function renderInDialogPanel(props: { renderInline?: boolean }) {
  return render(
    <Transition appear show as={Fragment}>
      <Dialog as="div" onClose={() => {}}>
        <Dialog.Panel data-testid="panel">
          <DatePicker
            onSelect={() => {}}
            placeholder="Select start date"
            renderInline={props.renderInline}
          />
        </Dialog.Panel>
      </Dialog>
    </Transition>
  );
}

describe("DatePicker calendar render location", () => {
  it("opens the calendar when the trigger is clicked", () => {
    render(<DatePicker onSelect={() => {}} placeholder="Select start date" />);
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Open calendar"));
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("by default portals the calendar outside the dialog panel (to body)", () => {
    renderInDialogPanel({});
    fireEvent.click(screen.getByLabelText("Open calendar"));
    const grid = screen.getByRole("grid");
    const panel = screen.getByTestId("panel");
    expect(panel.contains(grid)).toBe(false);
    expect(document.body.contains(grid)).toBe(true);
  });

  it("with renderInline keeps the calendar inside the dialog panel subtree", () => {
    renderInDialogPanel({ renderInline: true });
    fireEvent.click(screen.getByLabelText("Open calendar"));
    const grid = screen.getByRole("grid");
    const panel = screen.getByTestId("panel");
    expect(panel.contains(grid)).toBe(true);
  });
});
