import { render, screen } from "@testing-library/react";
import { WidgetMessage } from "../WidgetMessage";

describe("WidgetMessage", () => {
  it("renders plain text content", () => {
    render(<WidgetMessage content="Hello world" from="assistant" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("renders markdown content with bold", () => {
    render(<WidgetMessage content="This is **bold** text" from="assistant" />);
    const strong = document.querySelector("strong");
    expect(strong).toBeInTheDocument();
    expect(strong?.textContent).toBe("bold");
  });

  it("applies user styling for user messages", () => {
    const { container } = render(<WidgetMessage content="My message" from="user" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("flex-row-reverse");
  });

  it("applies assistant styling for assistant messages", () => {
    const { container } = render(<WidgetMessage content="Bot reply" from="assistant" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("flex-row");
    expect(wrapper.className).not.toContain("flex-row-reverse");
  });
});
