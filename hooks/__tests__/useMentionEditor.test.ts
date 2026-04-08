import { act, renderHook } from "@testing-library/react";
import { useMentionEditor } from "../useMentionEditor";

describe("useMentionEditor", () => {
  it("should initialize with autocomplete closed and empty filter", () => {
    const { result } = renderHook(() => useMentionEditor());

    expect(result.current.isAutocompleteOpen).toBe(false);
    expect(result.current.filterText).toBe("");
    expect(result.current.isInviteModalOpen).toBe(false);
  });

  describe("handleContentChange", () => {
    it("should call onChange with the new content", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("Hello world", onChange);
      });

      expect(onChange).toHaveBeenCalledWith("Hello world");
    });

    it("should open autocomplete when @ is typed at the start", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("@", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(true);
      expect(result.current.filterText).toBe("");
    });

    it("should open autocomplete when @ is typed after a space", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("Hello @", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(true);
    });

    it("should extract filter text after @", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("Hello @Ali", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(true);
      expect(result.current.filterText).toBe("Ali");
    });

    it("should close autocomplete when no @ is present", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      // First open autocomplete
      act(() => {
        result.current.handleContentChange("Hello @Ali", onChange);
      });
      expect(result.current.isAutocompleteOpen).toBe(true);

      // Then remove the @
      act(() => {
        result.current.handleContentChange("Hello", onChange);
      });
      expect(result.current.isAutocompleteOpen).toBe(false);
      expect(result.current.filterText).toBe("");
    });

    it("should close autocomplete when a newline follows @", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("Hello @Ali\n", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(false);
    });

    it("should close autocomplete when text after @ starts with [ (completed mention)", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("Hello @[Alice](email:alice@example.com)", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(false);
    });

    it("should not open autocomplete when @ is part of an email (preceded by non-whitespace)", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("user@example", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(false);
    });

    it("should open autocomplete when @ is preceded by a newline", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("First line\n@Ali", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(true);
      expect(result.current.filterText).toBe("Ali");
    });

    it("should not trigger autocomplete when enabled is false", () => {
      const { result } = renderHook(() => useMentionEditor({ enabled: false }));
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("Hello @Ali", onChange);
      });

      // onChange is still called, but autocomplete does not open
      expect(onChange).toHaveBeenCalledWith("Hello @Ali");
      expect(result.current.isAutocompleteOpen).toBe(false);
      expect(result.current.filterText).toBe("");
    });
  });

  describe("handleSelectReviewer", () => {
    const reviewer = {
      name: "Alice",
      email: "alice@example.com",
    };

    it("should insert the mention and close autocomplete", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      // Simulate typing @ to open autocomplete
      act(() => {
        result.current.handleContentChange("Hello @Ali", onChange);
      });
      expect(result.current.isAutocompleteOpen).toBe(true);

      // Select the reviewer
      act(() => {
        result.current.handleSelectReviewer(reviewer, "Hello @Ali", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(false);
      expect(result.current.filterText).toBe("");
      expect(onChange).toHaveBeenLastCalledWith(
        expect.stringContaining("@[Alice](email:alice@example.com)")
      );
    });

    it("should call onChange with content that replaces the @filter text", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("@Bob", onChange);
      });

      act(() => {
        result.current.handleSelectReviewer(reviewer, "@Bob", onChange);
      });

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toContain("@[Alice]");
      expect(lastCall).not.toContain("@Bob");
    });

    it("should replace only @filter and preserve text after cursor when mention is mid-sentence", () => {
      const editor = document.createElement("div");
      const textarea = document.createElement("textarea");
      editor.appendChild(textarea);

      const { result } = renderHook(() => useMentionEditor({ editorRef: { current: editor } }));
      const onChange = vi.fn();

      // Simulate typing "Hello @Al world" with cursor at position 9 (after "@Al")
      act(() => {
        textarea.value = "Hello @Al world";
        textarea.selectionStart = 9;
        textarea.selectionEnd = 9;
        result.current.handleContentChange("Hello @Al world", onChange);
      });
      expect(result.current.isAutocompleteOpen).toBe(true);
      expect(result.current.filterText).toBe("Al");

      // Select the reviewer — should replace @Al but preserve " world"
      act(() => {
        textarea.selectionStart = 9;
        textarea.selectionEnd = 9;
        result.current.handleSelectReviewer(reviewer, "Hello @Al world", onChange);
      });

      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toContain("@[Alice](email:alice@example.com)");
      expect(lastCall).toContain("world");
      expect(lastCall).not.toContain("@Al ");
    });
  });

  describe("handleCloseAutocomplete", () => {
    it("should close autocomplete and clear filter text", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("Hello @Ali", onChange);
      });
      expect(result.current.isAutocompleteOpen).toBe(true);

      act(() => {
        result.current.handleCloseAutocomplete();
      });

      expect(result.current.isAutocompleteOpen).toBe(false);
      expect(result.current.filterText).toBe("");
    });
  });

  describe("handleKeyDown", () => {
    const reviewers = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
    ];

    it("should select a reviewer on Enter", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      // Open autocomplete
      act(() => {
        result.current.handleContentChange("Hello @Al", onChange);
      });
      expect(result.current.isAutocompleteOpen).toBe(true);

      // Press Enter on first item (selectedIndex defaults to 0)
      act(() => {
        result.current.handleKeyDown("Enter", reviewers, false, "Hello @Al", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(false);
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toContain("@[Alice](email:alice@example.com)");
    });

    it("should navigate down with ArrowDown", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("@", onChange);
      });

      // Initial selectedIndex is 0, ArrowDown should move to 1
      act(() => {
        result.current.handleKeyDown("ArrowDown", reviewers, false, "@", onChange);
      });
      expect(result.current.selectedIndex).toBe(1);
    });

    it("should navigate up with ArrowUp", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("@", onChange);
      });

      // Move down first, then up
      act(() => {
        result.current.handleKeyDown("ArrowDown", reviewers, false, "@", onChange);
      });
      expect(result.current.selectedIndex).toBe(1);

      act(() => {
        result.current.handleKeyDown("ArrowUp", reviewers, false, "@", onChange);
      });
      expect(result.current.selectedIndex).toBe(0);
    });

    it("should close autocomplete on Escape", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      act(() => {
        result.current.handleContentChange("Hello @", onChange);
      });
      expect(result.current.isAutocompleteOpen).toBe(true);

      act(() => {
        result.current.handleKeyDown("Escape", reviewers, false, "Hello @", onChange);
      });

      expect(result.current.isAutocompleteOpen).toBe(false);
      expect(result.current.filterText).toBe("");
    });
  });

  describe("invite modal", () => {
    it("should open invite modal and close autocomplete", () => {
      const { result } = renderHook(() => useMentionEditor());
      const onChange = vi.fn();

      // Open autocomplete first
      act(() => {
        result.current.handleContentChange("Hello @", onChange);
      });
      expect(result.current.isAutocompleteOpen).toBe(true);

      act(() => {
        result.current.handleOpenInviteModal();
      });

      expect(result.current.isInviteModalOpen).toBe(true);
      expect(result.current.isAutocompleteOpen).toBe(false);
    });

    it("should close invite modal", () => {
      const { result } = renderHook(() => useMentionEditor());

      act(() => {
        result.current.handleOpenInviteModal();
      });
      expect(result.current.isInviteModalOpen).toBe(true);

      act(() => {
        result.current.handleCloseInviteModal();
      });
      expect(result.current.isInviteModalOpen).toBe(false);
    });
  });
});
