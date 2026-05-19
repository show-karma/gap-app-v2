import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AskKarmaInput } from "@/src/features/ask-karma/components/ask-karma-input";

describe("AskKarmaInput", () => {
  it("disables the send button while empty", () => {
    render(<AskKarmaInput onSubmit={vi.fn()} isStreaming={false} />);
    expect(screen.getByLabelText("Send message")).toBeDisabled();
  });

  it("enables the send button once the textarea has content", async () => {
    const user = userEvent.setup();
    render(<AskKarmaInput onSubmit={vi.fn()} isStreaming={false} />);
    await user.type(screen.getByPlaceholderText("Type your message..."), "hello");
    expect(screen.getByLabelText("Send message")).not.toBeDisabled();
  });

  it("submits on Enter and clears the textarea", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaInput onSubmit={onSubmit} isStreaming={false} />);
    const textarea = screen.getByPlaceholderText("Type your message...");
    await user.type(textarea, "Hello world");
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("Hello world");
    expect(textarea).toHaveValue("");
  });

  it("does not submit on shift+Enter (newline)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaInput onSubmit={onSubmit} isStreaming={false} />);
    const textarea = screen.getByPlaceholderText("Type your message...");
    await user.type(textarea, "Hello{Shift>}{Enter}{/Shift}world");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(textarea).toHaveValue("Hello\nworld");
  });

  it("submits when the send button is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaInput onSubmit={onSubmit} isStreaming={false} />);
    await user.type(screen.getByPlaceholderText("Type your message..."), "Click me");
    await user.click(screen.getByLabelText("Send message"));
    expect(onSubmit).toHaveBeenCalledWith("Click me");
  });

  it("ignores submits with only whitespace", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaInput onSubmit={onSubmit} isStreaming={false} />);
    await user.type(screen.getByPlaceholderText("Type your message..."), "   ");
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit while streaming", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AskKarmaInput onSubmit={onSubmit} isStreaming={true} onStop={vi.fn()} />);
    // While streaming, the send button is replaced by a stop button — there
    // is no "Send message" affordance to interact with.
    expect(screen.queryByLabelText("Send message")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Stop response")).toBeInTheDocument();
    // Pressing Enter in the textarea should also be a no-op while streaming.
    const textarea = screen.getByPlaceholderText("Type your message...");
    await user.type(textarea, "hi");
    await user.keyboard("{Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("renders the stop button while streaming and invokes onStop when clicked", async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    render(<AskKarmaInput onSubmit={vi.fn()} isStreaming={true} onStop={onStop} />);
    await user.click(screen.getByLabelText("Stop response"));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("supports a custom placeholder", () => {
    render(<AskKarmaInput onSubmit={vi.fn()} isStreaming={false} placeholder="Ask anything…" />);
    expect(screen.getByPlaceholderText("Ask anything…")).toBeInTheDocument();
  });

  it("caps chat message length to prevent oversized prompts", () => {
    render(<AskKarmaInput onSubmit={vi.fn()} isStreaming={false} />);
    const textarea = screen.getByPlaceholderText("Type your message...");
    // Value is intentional and asserted so it can't be lowered silently.
    expect(textarea).toHaveAttribute("maxLength", "4000");
  });

  it("ignores Enter while IME composition is active", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const onSubmit = vi.fn();
    render(<AskKarmaInput onSubmit={onSubmit} isStreaming={false} />);
    const textarea = screen.getByPlaceholderText("Type your message...") as HTMLTextAreaElement;
    // Manually set value (fireEvent.change to avoid userEvent typing one
    // char at a time — we only care about the Enter behaviour).
    fireEvent.change(textarea, { target: { value: "konnichiwa" } });
    // CJK users press Enter to confirm a composition candidate. The
    // KeyboardEvent's `isComposing` flag propagates to event.nativeEvent
    // in React's synthetic event.
    fireEvent.keyDown(textarea, { key: "Enter", isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits on Enter when IME composition is not active", async () => {
    const { fireEvent } = await import("@testing-library/react");
    const onSubmit = vi.fn();
    render(<AskKarmaInput onSubmit={onSubmit} isStreaming={false} />);
    const textarea = screen.getByPlaceholderText("Type your message...") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.keyDown(textarea, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalledWith("hello");
  });
});
