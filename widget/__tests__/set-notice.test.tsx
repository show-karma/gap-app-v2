/**
 * @vitest-environment jsdom
 */
import { act } from "@testing-library/react";
import KarmaChat from "../entry";

// Render just the notice so the test can see what the host's call produced.
vi.mock("../ChatWidget", () => ({
  ChatWidget: ({ notice }: { notice?: { text: string } }) => (
    <div data-testid="chat-widget">{notice?.text ?? "(no notice)"}</div>
  ),
}));

vi.mock("../widget.css?inline", () => ({ default: ".karma-chat { display: block; }" }));

vi.mock("../useWidgetStream", () => ({
  useWidgetStream: () => ({ sendMessage: vi.fn(), abort: vi.fn() }),
  abortWidgetStream: vi.fn(),
}));

vi.mock("@/store/agentChat", () => ({
  useAgentChatStore: Object.assign(() => ({}), {
    getState: () => ({
      clearMessages: vi.fn(),
      setOpen: vi.fn(),
      setAgentContext: vi.fn(),
      toggleOpen: vi.fn(),
    }),
  }),
}));

const config = { apiUrl: "https://test.api/v2/agent/stream", communityId: "filecoin" };
const widgetText = () => document.querySelector('[data-testid="chat-widget"]')?.textContent;

afterEach(() => {
  act(() => KarmaChat.destroy());
  document.body.innerHTML = "";
});

describe("KarmaChat.setNotice", () => {
  it("replaces the notice after init", async () => {
    act(() => KarmaChat.init({ ...config, notice: { text: "Answers here are general." } }));
    expect(widgetText()).toBe("Answers here are general.");

    act(() => KarmaChat.setNotice({ text: "Ask in the app." }));
    expect(widgetText()).toBe("Ask in the app.");
  });

  it("clears the notice with undefined", () => {
    act(() => KarmaChat.init({ ...config, notice: { text: "Answers here are general." } }));
    act(() => KarmaChat.setNotice(undefined));
    expect(widgetText()).toBe("(no notice)");
  });

  it("keeps every other option when the notice changes", () => {
    act(() => KarmaChat.init({ ...config, placement: "anchored", notice: { text: "a" } }));
    act(() => KarmaChat.setNotice({ text: "b" }));
    // The FAB is only rendered for "fab" placement, and the ChatWidget mock
    // renders nothing else — so the absence of a launcher proves the original
    // placement survived the re-render.
    expect(document.querySelector(".karma-chat button")).toBeNull();
    expect(widgetText()).toBe("b");
  });

  it("is a no-op before init and after destroy", () => {
    expect(() => KarmaChat.setNotice({ text: "early" })).not.toThrow();
    act(() => KarmaChat.init({ ...config }));
    expect(widgetText()).toBe("(no notice)");
    act(() => KarmaChat.destroy());
    expect(() => KarmaChat.setNotice({ text: "late" })).not.toThrow();
  });
});
