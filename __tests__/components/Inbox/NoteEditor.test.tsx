import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { NoteEditor } from "@/components/Inbox/NoteEditor";
import type { ICommunityActionItem } from "@/types/funding-platform";

function makeNote(overrides: Partial<ICommunityActionItem> = {}): ICommunityActionItem {
  return {
    id: "n1",
    milestoneUID: "0xms",
    grantUID: "0xg",
    applicationReference: null,
    communityUID: "0xc",
    programId: "1_10",
    content: "Chased by email",
    followUpAt: null,
    completedAt: null,
    completedByAddress: null,
    createdByAddress: "0xa",
    createdByName: "Erin",
    createdAt: "2026-10-13T00:00:00.000Z",
    updatedAt: "2026-10-13T00:00:00.000Z",
    projectUid: "0xp",
    projectTitle: "Plumbline",
    milestoneTitle: "Milestone 2",
    applicationTitle: null,
    ...overrides,
  };
}

function typeInto(textarea: HTMLTextAreaElement, value: string) {
  fireEvent.change(textarea, { target: { value } });
}

/** The editor is controlled, so the tests need a parent that keeps the value. */
function Harness({
  notes,
  onChange,
  initial = "",
}: {
  notes: ICommunityActionItem[];
  onChange: (value: string) => void;
  initial?: string;
}) {
  const [value, setValue] = useState(initial);
  return (
    <NoteEditor
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
      mentionOptions={notes}
      isLoadingMentions={false}
      aria-label="Note"
    />
  );
}

describe("NoteEditor", () => {
  const notes = [
    makeNote(),
    makeNote({ id: "n2", projectTitle: "Protocol Labs", content: "KYB sent" }),
  ];

  it("should_open_suggestions_after_an_at_sign_and_filter_them", () => {
    render(
      <NoteEditor
        value=""
        onChange={vi.fn()}
        mentionOptions={notes}
        isLoadingMentions={false}
        aria-label="Note"
      />
    );
    const textarea = screen.getByLabelText("Note") as HTMLTextAreaElement;

    typeInto(textarea, "see @prot");

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Protocol Labs/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Plumbline/ })).not.toBeInTheDocument();
  });

  it("should_not_offer_the_note_being_edited", () => {
    render(
      <NoteEditor
        value=""
        onChange={vi.fn()}
        mentionOptions={notes}
        isLoadingMentions={false}
        excludeNoteId="n1"
        aria-label="Note"
      />
    );

    typeInto(screen.getByLabelText("Note"), "@");

    expect(screen.queryByRole("option", { name: /Plumbline/ })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Protocol Labs/ })).toBeInTheDocument();
  });

  it("should_insert_the_token_when_a_suggestion_is_picked", () => {
    const onChange = vi.fn();
    render(<Harness notes={notes} onChange={onChange} />);
    const textarea = screen.getByLabelText("Note") as HTMLTextAreaElement;
    typeInto(textarea, "see @plum");
    textarea.setSelectionRange(9, 9);

    fireEvent.click(screen.getByRole("option", { name: /Plumbline/ }));

    expect(onChange).toHaveBeenLastCalledWith(
      "see @[Plumbline · Milestone 2: Chased by email](note:n1/0xms) "
    );
  });

  it("should_pick_with_the_keyboard", () => {
    const onChange = vi.fn();
    render(<Harness notes={notes} onChange={onChange} />);
    const textarea = screen.getByLabelText("Note") as HTMLTextAreaElement;
    typeInto(textarea, "@");
    textarea.setSelectionRange(1, 1);

    fireEvent.keyDown(textarea, { key: "ArrowDown" });
    fireEvent.keyDown(textarea, { key: "Enter" });

    expect(onChange).toHaveBeenLastCalledWith(
      "@[Protocol Labs · Milestone 2: KYB sent](note:n2/0xms) "
    );
  });
});
