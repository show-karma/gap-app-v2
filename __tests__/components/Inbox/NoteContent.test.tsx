import { fireEvent, render, screen } from "@testing-library/react";
import { NoteContent } from "@/components/Inbox/NoteContent";
import { OPEN_NOTE_EVENT } from "@/components/Inbox/noteNavigation";

describe("NoteContent", () => {
  it("should_render_plain_text_unchanged", () => {
    render(<NoteContent content="Emailed the team" />);

    expect(screen.getByText("Emailed the team")).toBeInTheDocument();
  });

  it("should_render_a_mention_as_a_link_that_asks_to_open_the_note", () => {
    const listener = vi.fn();
    window.addEventListener(OPEN_NOTE_EVENT, listener);
    render(<NoteContent content="Same as @[Plumbline · M2: Chased](note:n9/0xms) here" />);

    const link = screen.getByRole("button", { name: /Plumbline · M2: Chased/ });
    fireEvent.click(link);

    expect(screen.getByText(/Same as/)).toBeInTheDocument();
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      itemId: "0xms",
      noteId: "n9",
    });
    window.removeEventListener(OPEN_NOTE_EVENT, listener);
  });
});
