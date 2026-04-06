import { createRoot, type Root } from "react-dom/client";
import { ChatWidget } from "./ChatWidget";
import widgetStyles from "./widget.css?inline";

interface KarmaChatConfig {
  apiUrl: string;
  communityId: string;
  title?: string;
  placeholder?: string;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let styleEl: HTMLStyleElement | null = null;

function init(config: KarmaChatConfig) {
  if (!config.apiUrl) throw new Error("KarmaChat.init: apiUrl is required");
  if (!config.communityId) throw new Error("KarmaChat.init: communityId is required");

  // Clean up previous instance if any
  destroy();

  // Inject scoped styles
  styleEl = document.createElement("style");
  styleEl.setAttribute("data-karma-chat", "");
  styleEl.textContent = widgetStyles ?? "";
  document.head.appendChild(styleEl);

  // Create container
  container = document.createElement("div");
  container.className = "karma-chat";
  document.body.appendChild(container);

  // Mount React
  root = createRoot(container);
  root.render(
    <ChatWidget
      apiUrl={config.apiUrl}
      communityId={config.communityId}
      title={config.title}
      placeholder={config.placeholder}
    />
  );
}

function destroy() {
  if (root) {
    root.unmount();
    root = null;
  }
  if (container) {
    container.remove();
    container = null;
  }
  if (styleEl) {
    styleEl.remove();
    styleEl = null;
  }
}

export const KarmaChat = { init, destroy };

// Expose on window for IIFE consumers
if (typeof window !== "undefined") {
  (window as any).KarmaChat = KarmaChat;
}
