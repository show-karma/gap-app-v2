import { fireEvent, render, screen } from "@testing-library/react";
import { ApplicationTabBar } from "../ApplicationTabBar";
import { TAB_ICONS } from "../ApplicationTabBar.constants";

const tabs = [
  { key: "details" as const, label: "Application Details", Icon: TAB_ICONS.details },
  { key: "comments" as const, label: "Comments", Icon: TAB_ICONS.comments, count: 2 },
];

describe("ApplicationTabBar", () => {
  it("uses the customizable primary foreground for the active tab", () => {
    render(<ApplicationTabBar tabs={tabs} activeTab="comments" onTabChange={vi.fn()} />);

    const activeTab = screen.getByRole("tab", { name: /comments/i });
    expect(activeTab).toHaveClass("bg-primary", "text-primary-foreground");
    expect(activeTab.querySelector("span")).toHaveClass(
      "bg-primary-foreground/15",
      "text-primary-foreground"
    );
  });

  it("changes tabs when selected", () => {
    const onTabChange = vi.fn();
    render(<ApplicationTabBar tabs={tabs} activeTab="details" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole("tab", { name: /comments/i }));
    expect(onTabChange).toHaveBeenCalledWith("comments");
  });
});
