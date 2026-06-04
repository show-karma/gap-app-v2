import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { InfoTooltip } from "../InfoTooltip";

describe("InfoTooltip", () => {
  describe("default trigger (no children)", () => {
    it("renders exactly one button", () => {
      const { container } = render(<InfoTooltip content="x" />);

      expect(container.querySelectorAll("button")).toHaveLength(1);
    });

    it("exposes the accessible name 'More information'", () => {
      render(<InfoTooltip content="x" />);

      expect(screen.getByRole("button", { name: "More information" })).toBeInTheDocument();
    });

    it("does not nest a button inside another button", () => {
      const { container } = render(<InfoTooltip content="x" />);

      expect(container.querySelector("button button")).toBeNull();
    });

    it("renders a button that is enabled and focusable", () => {
      render(<InfoTooltip content="x" />);

      const trigger = screen.getByRole("button", { name: "More information" });
      expect(trigger).toBeEnabled();

      trigger.focus();
      expect(trigger).toHaveFocus();
    });

    it("shows the tooltip content on hover", async () => {
      const user = userEvent.setup();
      render(<InfoTooltip content="Helpful info" delayDuration={0} />);

      const trigger = screen.getByRole("button", { name: "More information" });
      await user.hover(trigger);

      const matches = await screen.findAllByText("Helpful info");
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe("custom children with triggerAsChild", () => {
    it("renders the custom trigger without nesting buttons", () => {
      const { container } = render(
        <InfoTooltip content="x" triggerAsChild>
          <button type="button" aria-label="Custom trigger">
            icon
          </button>
        </InfoTooltip>
      );

      expect(container.querySelectorAll("button")).toHaveLength(1);
      expect(container.querySelector("button button")).toBeNull();
      expect(screen.getByRole("button", { name: "Custom trigger" })).toBeInTheDocument();
    });
  });
});
