import { createRoot, type Root } from "react-dom/client";
import { useAgentChatStore } from "@/store/agentChat";
import { type ChatNotice, ChatWidget } from "./ChatWidget";
import { abortWidgetStream, type GetAuthToken } from "./useWidgetStream";
import widgetStyles from "./widget.css?inline";

interface KarmaChatConfig {
  apiUrl: string;
  communityId: string;
  title?: string;
  placeholder?: string;
  /**
   * Optional. Return the signed-in user's access token to get personalized
   * answers, or null for an anonymous conversation — the endpoint accepts
   * both, and omitting this entirely is a supported way to run the widget.
   *
   * Called before every message, so a host can hand back a freshly refreshed
   * token rather than one captured at init.
   */
  getAuthToken?: GetAuthToken;
  /**
   * Optional standing note above the composer, e.g. to say that answers here
   * are not personalized because this host has no session to pass.
   */
  notice?: ChatNotice;
  /**
   * Which palette the panel paints in.
   *
   * `"auto"` (default) follows the host: a `dark` class on <html> or <body>,
   * the `data-theme="dark"` some hosts use instead, and otherwise the OS
   * preference — re-read whenever the host flips, so a theme toggle takes the
   * panel with it.
   */
  theme?: "auto" | "light" | "dark";
  /**
   * Mark shown in the panel header and empty state. Defaults to `"none"`,
   * which renders the neutral sparkles icon: this bundle runs on customers'
   * own sites, where stamping the Karma logo into their page is a branding
   * decision that belongs to them, not a styling default.
   */
  brand?: "karma" | "none";
  /**
   * Short label beside the title, e.g. "Community" — the in-app panel shows
   * one to say which context the answers are scoped to.
   */
  badge?: string;
  /**
   * The line under "How can I help?" before anyone has asked anything.
   * Defaults to one naming the community by its id.
   */
  emptyDescription?: string;
  /**
   * Where the panel lives and who opens it.
   *
   * `"fab"` (default) renders the floating bottom-right button, which is what
   * an embedding site needs when it has no chrome of its own to hang a trigger
   * off. `"anchored"` drops the panel from under a fixed ~4rem header and
   * renders no button at all — for a host with its own trigger, which then
   * drives `KarmaChat.open()` / `toggle()`.
   */
  placement?: "fab" | "anchored";
}

/** Does the host consider itself dark right now? */
function hostPrefersDark(): boolean {
  const root = document.documentElement;
  if (root.classList.contains("dark") || document.body?.classList.contains("dark")) return true;
  if (root.getAttribute("data-theme") === "dark") return true;
  if (root.classList.contains("light") || root.getAttribute("data-theme") === "light") {
    return false;
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let styleEl: HTMLStyleElement | null = null;
let stopThemeWatch: (() => void) | null = null;

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

  // Theme. Applied to the container as an attribute rather than by inheriting
  // the host's custom properties, which `all: initial` in widget.css severs.
  const requested = config.theme ?? "auto";
  const applyTheme = () => {
    if (!container) return;
    const dark = requested === "auto" ? hostPrefersDark() : requested === "dark";
    container.setAttribute("data-theme", dark ? "dark" : "light");
  };
  applyTheme();

  if (requested === "auto") {
    // The host may flip its theme at any time; watch the two places it says so.
    const observer = new MutationObserver(applyTheme);
    const watched = { attributes: true, attributeFilter: ["class", "data-theme"] };
    observer.observe(document.documentElement, watched);
    if (document.body) observer.observe(document.body, watched);

    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener("change", applyTheme);

    stopThemeWatch = () => {
      observer.disconnect();
      media?.removeEventListener("change", applyTheme);
    };
  }

  // Mount React
  root = createRoot(container);
  root.render(
    <ChatWidget
      apiUrl={config.apiUrl}
      communityId={config.communityId}
      title={config.title}
      placeholder={config.placeholder}
      getAuthToken={config.getAuthToken}
      notice={config.notice}
      brand={config.brand}
      badge={config.badge}
      emptyDescription={config.emptyDescription}
      placement={config.placement}
    />
  );
}

// NOTE: destroy() mutates the shared useAgentChatStore. This is safe because
// the widget runs on external sites, never alongside the main app. If dual
// usage becomes a requirement, create a widget-scoped store slice.
function destroy() {
  // Abort any in-flight SSE stream before unmounting React
  abortWidgetStream();

  stopThemeWatch?.();
  stopThemeWatch = null;

  // Reset shared store so re-init starts clean
  const store = useAgentChatStore.getState();
  store.clearMessages();
  store.setOpen(false);
  store.setAgentContext(null);

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

/*
 * Open/close from the host.
 *
 * Only `"fab"` placement ships a button of its own; a host that suppressed it
 * has to be able to say "open" some other way, and reaching into the widget's
 * DOM for a launcher that no longer exists is not that way.
 *
 * These are safe to call before `init`: they set the shared store, and the
 * panel reads it when it mounts.
 */
function open() {
  useAgentChatStore.getState().setOpen(true);
}

function close() {
  useAgentChatStore.getState().setOpen(false);
}

function toggle() {
  useAgentChatStore.getState().toggleOpen();
}

// Default export so the IIFE `name: "KarmaChat"` exposes these
// directly on window.KarmaChat (not nested as window.KarmaChat.KarmaChat)
export default { init, destroy, open, close, toggle };
