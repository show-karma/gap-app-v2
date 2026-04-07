import { createRoot, type Root } from "react-dom/client";
import { useAgentChatStore } from "@/store/agentChat";
import { ChatWidget } from "./ChatWidget";
import { abortWidgetStream } from "./useWidgetStream";
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

// NOTE: destroy() mutates the shared useAgentChatStore. This is safe because
// the widget runs on external sites, never alongside the main app. If dual
// usage becomes a requirement, create a widget-scoped store slice.
function destroy() {
  // Abort any in-flight SSE stream before unmounting React
  abortWidgetStream();

  // Reset shared store so re-init starts clean
  const store = useAgentChatStore.getState();
  store.clearMessages();
  store.setOpen(false);

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

// Default export so the IIFE `name: "KarmaChat"` exposes init/destroy
// directly on window.KarmaChat (not nested as window.KarmaChat.KarmaChat)
export default { init, destroy };
