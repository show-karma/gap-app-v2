/**
 * @vitest-environment jsdom
 */
import { KarmaChat } from "../entry";

// Mock the ChatWidget to avoid needing full React rendering
vi.mock("../ChatWidget", () => ({
  ChatWidget: () => <div data-testid="chat-widget">mocked</div>,
}));

// Mock the CSS inline import (Vite-specific feature not available in vitest)
vi.mock("../widget.css?inline", () => ({
  default: ".karma-chat { display: block; }",
}));

afterEach(() => {
  KarmaChat.destroy();
  document.body.innerHTML = "";
});

describe("KarmaChat", () => {
  it("mounts a container element to the body", () => {
    KarmaChat.init({ apiUrl: "https://test.api/v2/agent/stream", communityId: "filecoin" });

    const container = document.querySelector(".karma-chat");
    expect(container).toBeInTheDocument();
  });

  it("injects a style element", () => {
    KarmaChat.init({ apiUrl: "https://test.api/v2/agent/stream", communityId: "filecoin" });

    const style = document.querySelector("style[data-karma-chat]");
    expect(style).toBeInTheDocument();
  });

  it("destroy removes the container", () => {
    KarmaChat.init({ apiUrl: "https://test.api/v2/agent/stream", communityId: "filecoin" });
    KarmaChat.destroy();

    expect(document.querySelector(".karma-chat")).not.toBeInTheDocument();
  });

  it("throws if apiUrl is missing", () => {
    expect(() => KarmaChat.init({ communityId: "filecoin" } as any)).toThrow(/apiUrl/);
  });

  it("throws if communityId is missing", () => {
    expect(() => KarmaChat.init({ apiUrl: "https://test.api" } as any)).toThrow(/communityId/);
  });
});
