import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { type DropdownItem, MultiSelectDropdown } from "../MultiSelectDropdown";

describe("MultiSelectDropdown", () => {
  const items: DropdownItem[] = [
    { id: "0x1111", label: "John Doe" },
    { id: "0x2222", label: "Jane Smith" },
  ];

  const orphanId = "0xa97bcd2f7e40daa8218f94f55b57ab09ec24cde0";

  describe("known selections", () => {
    it("renders a chip for each selected id that matches an item", () => {
      render(<MultiSelectDropdown items={items} selectedIds={["0x1111"]} onChange={vi.fn()} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });
  });

  describe("unknown/orphan selections", () => {
    it("hides a selected id with no matching item by default", () => {
      render(
        <MultiSelectDropdown
          items={items}
          selectedIds={[orphanId]}
          onChange={vi.fn()}
          placeholder="Select items"
        />
      );

      // No chip and no truncated address — falls back to placeholder.
      expect(screen.queryByText(orphanId)).not.toBeInTheDocument();
      expect(screen.getByText("Select items")).toBeInTheDocument();
    });

    it("renders an orphan selection as a chip when showUnknownSelections is on", () => {
      render(
        <MultiSelectDropdown
          items={items}
          selectedIds={[orphanId]}
          onChange={vi.fn()}
          showUnknownSelections
        />
      );

      // Raw id is shown when no label formatter is provided.
      expect(screen.getByText(orphanId)).toBeInTheDocument();
    });

    it("applies the label formatter to orphan chips", () => {
      const formatUnknownLabel = (id: string) => `${id.slice(0, 6)}...${id.slice(-6)}`;
      render(
        <MultiSelectDropdown
          items={items}
          selectedIds={[orphanId]}
          onChange={vi.fn()}
          showUnknownSelections
          formatUnknownLabel={formatUnknownLabel}
        />
      );

      expect(screen.getByText("0xa97b...24cde0")).toBeInTheDocument();
      expect(screen.queryByText(orphanId)).not.toBeInTheDocument();
    });

    it("keeps orphan chips removable and reports the remaining ids", () => {
      const onChange = vi.fn();
      render(
        <MultiSelectDropdown
          items={items}
          selectedIds={["0x1111", orphanId]}
          onChange={onChange}
          showUnknownSelections
        />
      );

      const orphanChip = screen.getByText(orphanId).closest("div");
      expect(orphanChip).not.toBeNull();
      // The chip renders a leading warning icon and a trailing remove (X) icon;
      // the remove control is the last svg.
      const icons = orphanChip?.querySelectorAll("svg");
      const removeIcon = icons?.[icons.length - 1];
      expect(removeIcon).not.toBeUndefined();

      fireEvent.click(removeIcon as SVGElement);

      expect(onChange).toHaveBeenCalledWith(["0x1111"]);
    });

    it("renders both known and orphan chips together", () => {
      render(
        <MultiSelectDropdown
          items={items}
          selectedIds={["0x1111", orphanId]}
          onChange={vi.fn()}
          showUnknownSelections
        />
      );

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText(orphanId)).toBeInTheDocument();
    });
  });
});
