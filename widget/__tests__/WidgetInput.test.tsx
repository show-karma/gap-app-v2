import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WidgetInput } from "../WidgetInput";

describe("WidgetInput", () => {
  it("calls onSubmit with trimmed text and clears input", async () => {
    const onSubmit = vi.fn();
    render(<WidgetInput onSubmit={onSubmit} isStreaming={false} />);

    const textarea = screen.getByPlaceholderText(/ask/i);
    await userEvent.type(textarea, "Hello agent");

    const submitBtn = screen.getByRole("button", { name: /send/i });
    await userEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith("Hello agent");
    expect(textarea).toHaveValue("");
  });

  it("does not submit empty input", async () => {
    const onSubmit = vi.fn();
    render(<WidgetInput onSubmit={onSubmit} isStreaming={false} />);

    const submitBtn = screen.getByRole("button", { name: /send/i });
    expect(submitBtn).toBeDisabled();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables input while streaming", () => {
    render(<WidgetInput onSubmit={vi.fn()} isStreaming={true} onStop={vi.fn()} />);

    const textarea = screen.getByPlaceholderText(/ask/i);
    expect(textarea).toBeDisabled();
  });

  it("shows stop button while streaming", async () => {
    const onStop = vi.fn();
    render(<WidgetInput onSubmit={vi.fn()} isStreaming={true} onStop={onStop} />);

    const stopBtn = screen.getByRole("button", { name: /stop/i });
    await userEvent.click(stopBtn);

    expect(onStop).toHaveBeenCalled();
  });

  it("submits on Enter (without Shift)", async () => {
    const onSubmit = vi.fn();
    render(<WidgetInput onSubmit={onSubmit} isStreaming={false} />);

    const textarea = screen.getByPlaceholderText(/ask/i);
    await userEvent.type(textarea, "Hello");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(onSubmit).toHaveBeenCalledWith("Hello");
  });
});
