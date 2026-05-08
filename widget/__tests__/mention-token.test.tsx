import { render } from "@testing-library/react";
import type { ChatMention } from "@/store/agentChat";
import { mentionToToken, renderWithMentionPills } from "../mention-token";

describe("mentionToToken", () => {
  it("emits @[label](mention:kind:id?project=parent) when parentSlug present", () => {
    const m: ChatMention = {
      id: "milestone-1",
      kind: "milestone",
      label: "Milestone 1",
      primaryId: "0xabc",
      parentSlug: "fund-2",
    };
    expect(mentionToToken(m)).toBe("@[Milestone 1](mention:milestone:0xabc?project=fund-2)");
  });

  it("omits the project tail when no parentSlug", () => {
    const m: ChatMention = {
      id: "project-1",
      kind: "project",
      label: "Fund#2",
      primaryId: "fund-2",
    };
    expect(mentionToToken(m)).toBe("@[Fund#2](mention:project:fund-2)");
  });

  it("strips ] from labels (would terminate the link text)", () => {
    const m: ChatMention = {
      id: "x",
      kind: "milestone",
      label: "Phase [1] Goals]",
      primaryId: "0x1",
    };
    expect(mentionToToken(m)).toBe("@[Phase [1) Goals)](mention:milestone:0x1)");
  });
});

describe("renderWithMentionPills", () => {
  it("renders plain text unchanged when no tokens are present", () => {
    const { container } = render(<>{renderWithMentionPills("just some text")}</>);
    expect(container.textContent).toBe("just some text");
  });

  it("renders a pill for an embedded mention token", () => {
    const { container } = render(
      <>{renderWithMentionPills("@[Fund#2](mention:project:fund-2) what is the status?")}</>
    );
    const pill = container.querySelector("span");
    expect(pill?.textContent).toBe("@Fund#2");
    expect(container.textContent).toBe("@Fund#2 what is the status?");
  });

  it("renders multiple pills in order interleaved with text", () => {
    const text = "compare @[A](mention:milestone:0xa?project=p1) and @[B](mention:milestone:0xb)";
    const { container } = render(<>{renderWithMentionPills(text)}</>);
    const pills = container.querySelectorAll("span");
    expect(pills.length).toBe(2);
    expect(pills[0].textContent).toBe("@A");
    expect(pills[1].textContent).toBe("@B");
    expect(container.textContent).toBe("compare @A and @B");
  });
});
