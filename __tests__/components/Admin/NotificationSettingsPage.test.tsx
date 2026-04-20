import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { NotificationSettingsPage } from "@/components/Pages/Admin/NotificationSettingsPage";
import { useCommunityAdminAccess } from "@/hooks/communities/useCommunityAdminAccess";
import {
  type CommunityConfig,
  useCommunityConfig,
  useCommunityConfigMutation,
} from "@/hooks/useCommunityConfig";
import { useTestNotificationConfig } from "@/hooks/useNotificationConfig";
import type { Community } from "@/types/v2/community";
import "@testing-library/jest-dom";

// ── Mocks ──

vi.mock("@/hooks/useCommunityConfig", () => ({
  useCommunityConfig: vi.fn(),
  useCommunityConfigMutation: vi.fn(),
}));

vi.mock("@/hooks/useNotificationConfig", () => ({
  useTestNotificationConfig: vi.fn(),
}));

vi.mock("@/hooks/communities/useCommunityAdminAccess", () => ({
  useCommunityAdminAccess: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    KARMA_TELEGRAM_BOT_HANDLE: "test_bot",
  },
}));

vi.mock("@/components/Pages/Admin/TelegramPairChatModal", () => ({
  TelegramPairChatModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="telegram-pair-modal" /> : null,
}));

// Cast mocks for typed access
const mockUseCommunityAdminAccess = useCommunityAdminAccess as ReturnType<typeof vi.fn>;
const mockUseCommunityConfig = useCommunityConfig as ReturnType<typeof vi.fn>;
const mockUseCommunityConfigMutation = useCommunityConfigMutation as ReturnType<typeof vi.fn>;
const mockUseTestNotificationConfig = useTestNotificationConfig as ReturnType<typeof vi.fn>;
const mockToast = toast as unknown as {
  success: ReturnType<typeof vi.fn>;
  error: ReturnType<typeof vi.fn>;
};

// ── Mock factories ──

const createCommunity = (overrides: Partial<Community> = {}): Community => ({
  uid: "0xabc123" as `0x${string}`,
  chainID: 10,
  details: {
    name: "Filecoin",
    slug: "filecoin",
  },
  ...overrides,
});

const createConfig = (overrides: Partial<CommunityConfig> = {}): CommunityConfig => ({
  disableReviewerEmails: false,
  telegramEnabled: false,
  telegramChatIds: [],
  slackEnabled: false,
  slackWebhookUrls: [],
  ...overrides,
});

const createAdminAccess = (
  overrides: Partial<{ hasAccess: boolean; isLoading: boolean }> = {}
) => ({
  hasAccess: true,
  isLoading: false,
  checks: {
    isCommunityAdmin: true,
    isOwner: false,
    isSuperAdmin: false,
    isRbacCommunityAdmin: false,
  },
  ...overrides,
});

const createConfigQuery = (
  overrides: Partial<{ data: CommunityConfig | null; isLoading: boolean; error: Error | null }> = {}
) => ({
  data: createConfig(),
  isLoading: false,
  error: null,
  ...overrides,
});

// ── Helpers ──

const setupDefaultMocks = (opts?: {
  config?: CommunityConfig | null;
  hasAccess?: boolean;
  loadingAdmin?: boolean;
  loadingConfig?: boolean;
  error?: Error | null;
}) => {
  mockUseCommunityAdminAccess.mockReturnValue(
    createAdminAccess({
      hasAccess: opts?.hasAccess ?? true,
      isLoading: opts?.loadingAdmin ?? false,
    })
  );
  mockUseCommunityConfig.mockReturnValue(
    createConfigQuery({
      data: opts?.config !== undefined ? opts.config : createConfig(),
      isLoading: opts?.loadingConfig ?? false,
      error: opts?.error ?? null,
    })
  );
};

const renderPage = (community: Community = createCommunity()) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return {
    queryClient,
    ...render(<NotificationSettingsPage community={community} />, { wrapper }),
  };
};

// Capture mutate calls so individual tests can assert payloads
let saveConfigMutate: ReturnType<typeof vi.fn>;
let testConfigMutate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();

  saveConfigMutate = vi.fn();
  testConfigMutate = vi.fn();

  mockUseCommunityConfigMutation.mockReturnValue({
    mutate: saveConfigMutate,
    isPending: false,
  });

  mockUseTestNotificationConfig.mockReturnValue({
    mutate: testConfigMutate,
    isPending: false,
  });
});

// ── Helpers to grab card-scoped elements ──

const getCardByTitle = (title: string): HTMLElement => {
  const heading = screen.getByText(title);
  // Walk up to the card container (rounded-xl border)
  let el: HTMLElement | null = heading;
  while (el && !el.className?.includes?.("rounded-xl")) {
    el = el.parentElement;
  }
  if (!el) throw new Error(`Card for "${title}" not found`);
  return el;
};

// Helper to invoke onSuccess on every captured mock call (for global save flow)
const flushPendingMutations = async (overrideOnSuccess?: () => void) => {
  await act(async () => {
    for (const callArgs of saveConfigMutate.mock.calls) {
      const handlers = callArgs[1];
      if (handlers?.onSuccess) {
        if (overrideOnSuccess) overrideOnSuccess();
        else handlers.onSuccess();
      }
    }
  });
};

// ── Tests ──

describe("NotificationSettingsPage — auth gate", () => {
  it("should_render_spinner_when_admin_access_is_loading", () => {
    setupDefaultMocks({ loadingAdmin: true });

    const { container } = renderPage();

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText(/Notification Settings/i)).not.toBeInTheDocument();
  });

  it("should_render_spinner_when_config_is_loading", () => {
    setupDefaultMocks({ loadingConfig: true });

    const { container } = renderPage();

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should_render_not_authorized_message_when_user_lacks_access", () => {
    setupDefaultMocks({ hasAccess: false });

    renderPage(createCommunity({ uid: "0xdeadbeef" as `0x${string}` }));

    expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    expect(screen.getByText(/0xdeadbeef/)).toBeInTheDocument();
  });

  it("should_render_error_message_when_community_config_query_errors", () => {
    setupDefaultMocks({ error: new Error("boom") });

    renderPage();

    expect(screen.getByText(/Failed to load notification configuration/i)).toBeInTheDocument();
  });
});

describe("NotificationSettingsPage — header", () => {
  it("should_render_community_name_in_subtitle", () => {
    setupDefaultMocks();

    renderPage(createCommunity({ details: { name: "Optimism", slug: "optimism" } }));

    expect(screen.getByRole("heading", { name: /Notification Settings/i })).toBeInTheDocument();
    expect(screen.getByText(/Optimism sends real-time/i)).toBeInTheDocument();
  });
});

describe("NotificationSettingsPage — reviewer heads-up banner", () => {
  it("should_render_reviewer_banner_with_telegram_username_guidance", () => {
    setupDefaultMocks();

    renderPage();

    const headsUpHeading = screen.getByText(/Heads-up for your reviewers/i);
    expect(headsUpHeading).toBeInTheDocument();
    // Scope to the banner so we don't collide with the reference card, which
    // also mentions "Telegram username" in the rules-of-thumb section.
    const banner = headsUpHeading.closest("div.rounded-lg") as HTMLElement;
    expect(banner).not.toBeNull();
    expect(within(banner).getByText(/Telegram username/i)).toBeInTheDocument();
  });
});

describe("NotificationSettingsPage — sticky subnav", () => {
  it("should_render_anchor_links_to_channels_and_reference_sections", () => {
    setupDefaultMocks();

    renderPage();

    const channelsLink = screen.getByRole("link", { name: /Channels/i });
    const referenceLink = screen.getByRole("link", { name: /Reference/i });

    expect(channelsLink).toHaveAttribute("href", "#channels");
    expect(referenceLink).toHaveAttribute("href", "#reference");
  });

  it("should_render_corresponding_section_anchors_with_scroll_offset_class", () => {
    setupDefaultMocks();

    const { container } = renderPage();

    const channelsSection = container.querySelector("section#channels");
    const referenceSection = container.querySelector("section#reference");

    expect(channelsSection).toBeInTheDocument();
    expect(referenceSection).toBeInTheDocument();
    // scroll-mt-* class anchors the section header below the sticky subnav
    expect(channelsSection?.className).toMatch(/scroll-mt-/);
    expect(referenceSection?.className).toMatch(/scroll-mt-/);
  });
});

describe("NotificationSettingsPage — kill switch", () => {
  it("should_render_off_state_when_disableReviewerEmails_is_false", () => {
    setupDefaultMocks({ config: createConfig({ disableReviewerEmails: false }) });

    renderPage();

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByText(/Reviewer, admin & finance emails are off/i)).not.toBeInTheDocument();
  });

  it("should_render_on_state_with_red_banner_when_disableReviewerEmails_is_true", () => {
    setupDefaultMocks({ config: createConfig({ disableReviewerEmails: true }) });

    renderPage();

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Reviewer, admin & finance emails are off/i)).toBeInTheDocument();
  });

  it("should_call_saveConfig_with_disableReviewerEmails_true_when_toggled_on", () => {
    setupDefaultMocks({ config: createConfig({ disableReviewerEmails: false }) });

    renderPage();

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(saveConfigMutate).toHaveBeenCalledWith(
      { slug: "filecoin", config: { disableReviewerEmails: true } },
      expect.any(Object)
    );
  });

  it("should_fire_toast_success_when_kill_switch_save_succeeds", () => {
    setupDefaultMocks({ config: createConfig({ disableReviewerEmails: false }) });

    renderPage();

    fireEvent.click(screen.getByRole("switch"));

    // Trigger the onSuccess callback the component passed to mutate
    const callArgs = saveConfigMutate.mock.calls[0];
    const handlers = callArgs[1];
    handlers.onSuccess();

    expect(mockToast.success).toHaveBeenCalledWith("Reviewer emails disabled");
  });

  it("should_NOT_show_global_save_bar_when_only_kill_switch_is_toggled", () => {
    setupDefaultMocks({ config: createConfig({ disableReviewerEmails: false }) });

    renderPage();

    fireEvent.click(screen.getByRole("switch"));

    // Kill switch saves immediately and never contributes to dirty count
    expect(
      screen.queryByRole("button", { name: /Save notification settings/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/changes? pending/i)).not.toBeInTheDocument();
  });
});

describe("NotificationSettingsPage — provider cards layout", () => {
  it("should_render_both_telegram_and_slack_provider_cards", () => {
    setupDefaultMocks();

    renderPage();

    expect(screen.getByText("Telegram")).toBeInTheDocument();
    expect(screen.getByText("Slack")).toBeInTheDocument();
    expect(screen.getByText(/Karma bot → group\/channel/i)).toBeInTheDocument();
    expect(screen.getByText(/Incoming webhook/i)).toBeInTheDocument();
  });
});

describe("NotificationSettingsPage — provider cards collapse-when-off", () => {
  it("should_collapse_slack_card_body_when_slack_is_disabled", () => {
    setupDefaultMocks({ config: createConfig({ slackEnabled: false }) });

    renderPage();

    const slackCard = getCardByTitle("Slack");
    // When collapsed, the URL editor is hidden and a hint is shown
    expect(within(slackCard).queryByPlaceholderText(/hooks.slack.com/i)).not.toBeInTheDocument();
    expect(within(slackCard).getByText(/Toggle on to add webhook URLs/i)).toBeInTheDocument();
  });

  it("should_collapse_telegram_card_body_when_telegram_is_disabled", () => {
    setupDefaultMocks({ config: createConfig({ telegramEnabled: false }) });

    renderPage();

    const tgCard = getCardByTitle("Telegram");
    expect(within(tgCard).queryByPlaceholderText(/-1001234567890/i)).not.toBeInTheDocument();
    expect(
      within(tgCard).queryByRole("button", { name: /Pair new chat/i })
    ).not.toBeInTheDocument();
    expect(
      within(tgCard).getByText(/Toggle on to configure chat IDs and pair a new group/i)
    ).toBeInTheDocument();
  });

  it("should_expand_telegram_card_body_when_telegram_is_enabled", () => {
    setupDefaultMocks({ config: createConfig({ telegramEnabled: true }) });

    renderPage();

    const tgCard = getCardByTitle("Telegram");
    expect(within(tgCard).getByPlaceholderText(/-1001234567890/i)).toBeInTheDocument();
    expect(within(tgCard).getByRole("button", { name: /Pair new chat/i })).toBeInTheDocument();
  });
});

describe("NotificationSettingsPage — Telegram provider card", () => {
  it("should_render_chat_ids_from_props", () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001111", "-1002222"],
      }),
    });

    renderPage();

    expect(screen.getByDisplayValue("-1001111")).toBeInTheDocument();
    expect(screen.getByDisplayValue("-1002222")).toBeInTheDocument();
  });

  it("should_open_pair_modal_when_pair_new_chat_clicked_and_telegram_is_on", () => {
    setupDefaultMocks({ config: createConfig({ telegramEnabled: true }) });

    renderPage();

    expect(screen.queryByTestId("telegram-pair-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pair new chat/i }));

    expect(screen.getByTestId("telegram-pair-modal")).toBeInTheDocument();
  });

  it("should_NOT_clobber_unsaved_local_edits_when_parent_refetches_props", () => {
    // Regression test for commit a17bed6b: editing telegram chat ID then a sibling
    // mutation invalidates community-config — local state must persist.
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["a"],
      }),
    });

    const { rerender } = renderPage();

    const telegramCard = getCardByTitle("Telegram");
    const input = within(telegramCard).getByDisplayValue("a") as HTMLInputElement;

    // User edits the input locally
    fireEvent.change(input, { target: { value: "a-edited" } });
    expect(within(telegramCard).getByDisplayValue("a-edited")).toBeInTheDocument();

    // Simulate refetch returning new chatIds (e.g. sibling Slack save invalidated query)
    mockUseCommunityConfig.mockReturnValue(
      createConfigQuery({
        data: createConfig({
          telegramEnabled: true,
          telegramChatIds: ["a", "b"],
        }),
      })
    );

    // rerender preserves the same root + wrapper, so component state persists
    rerender(<NotificationSettingsPage community={createCommunity()} />);

    const refetchedCard = getCardByTitle("Telegram");

    // The input still shows the user's unsaved edit, NOT the refetched value
    expect(within(refetchedCard).getByDisplayValue("a-edited")).toBeInTheDocument();
    expect(within(refetchedCard).queryByDisplayValue("b")).not.toBeInTheDocument();
  });

  it("should_call_test_mutation_with_telegram_payload_when_test_button_clicked", () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001111", "-1002222"],
      }),
    });

    renderPage();

    const telegramCard = getCardByTitle("Telegram");
    fireEvent.click(within(telegramCard).getByRole("button", { name: /Test/i }));

    expect(testConfigMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: "TELEGRAM",
        chatId: "-1001111",
        chatIds: ["-1001111", "-1002222"],
        webhookUrl: null,
      }),
      expect.any(Object)
    );
  });

  it("should_show_toast_success_when_test_mutation_returns_success_true", () => {
    setupDefaultMocks({
      config: createConfig({ telegramEnabled: true, telegramChatIds: ["-1001"] }),
    });

    renderPage();

    fireEvent.click(within(getCardByTitle("Telegram")).getByRole("button", { name: /Test/i }));

    const handlers = testConfigMutate.mock.calls[0][1];
    handlers.onSuccess({ success: true, message: "Sent OK" });

    expect(mockToast.success).toHaveBeenCalledWith("Sent OK");
  });

  it("should_show_toast_error_when_test_mutation_returns_success_false", () => {
    setupDefaultMocks({
      config: createConfig({ telegramEnabled: true, telegramChatIds: ["-1001"] }),
    });

    renderPage();

    fireEvent.click(within(getCardByTitle("Telegram")).getByRole("button", { name: /Test/i }));

    const handlers = testConfigMutate.mock.calls[0][1];
    handlers.onSuccess({ success: false, message: "Bot blocked" });

    expect(mockToast.error).toHaveBeenCalledWith("Bot blocked");
  });
});

describe("NotificationSettingsPage — Slack provider card", () => {
  it("should_call_test_mutation_with_slack_payload_when_test_button_clicked", () => {
    setupDefaultMocks({
      config: createConfig({
        slackEnabled: true,
        slackWebhookUrls: [
          "https://hooks.slack.com/services/AAA",
          "https://hooks.slack.com/services/BBB",
        ],
      }),
    });

    renderPage();

    const slackCard = getCardByTitle("Slack");
    fireEvent.click(within(slackCard).getByRole("button", { name: /Test/i }));

    expect(testConfigMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: "SLACK",
        chatId: null,
        webhookUrl: "https://hooks.slack.com/services/AAA",
        webhookUrls: [
          "https://hooks.slack.com/services/AAA",
          "https://hooks.slack.com/services/BBB",
        ],
      }),
      expect.any(Object)
    );
  });
});

describe("NotificationSettingsPage — IdsEditor (via Telegram card)", () => {
  it("should_append_an_empty_input_when_add_chat_id_clicked", () => {
    setupDefaultMocks({
      config: createConfig({ telegramEnabled: true, telegramChatIds: ["-1001"] }),
    });

    renderPage();

    const telegramCard = getCardByTitle("Telegram");
    expect(within(telegramCard).getAllByRole("textbox")).toHaveLength(1);

    fireEvent.click(within(telegramCard).getByRole("button", { name: /Add chat ID/i }));

    expect(within(telegramCard).getAllByRole("textbox")).toHaveLength(2);
  });

  it("should_remove_empty_row_without_confirmation_prompt", () => {
    setupDefaultMocks({
      config: createConfig({ telegramEnabled: true, telegramChatIds: ["-1001", ""] }),
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    const telegramCard = getCardByTitle("Telegram");
    const inputs = within(telegramCard).getAllByRole("textbox");
    expect(inputs).toHaveLength(2);

    // Find the trash button next to the empty row (second row)
    const trashButtons = within(telegramCard)
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg.lucide-trash2") !== null);
    // Click trash on the second (empty) row
    fireEvent.click(trashButtons[1]);

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(within(telegramCard).getAllByRole("textbox")).toHaveLength(1);

    confirmSpy.mockRestore();
  });

  it("should_prompt_confirm_when_removing_non_empty_row_and_remove_only_when_confirmed", () => {
    setupDefaultMocks({
      config: createConfig({ telegramEnabled: true, telegramChatIds: ["-1001", "-1002"] }),
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();

    const telegramCard = getCardByTitle("Telegram");
    const trashButtons = within(telegramCard)
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg.lucide-trash2") !== null);

    fireEvent.click(trashButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Remove chat ID "-1001"?');
    expect(within(telegramCard).getAllByRole("textbox")).toHaveLength(1);
    expect(within(telegramCard).getByDisplayValue("-1002")).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("should_NOT_remove_non_empty_row_when_user_cancels_confirm_dialog", () => {
    setupDefaultMocks({
      config: createConfig({ telegramEnabled: true, telegramChatIds: ["-1001", "-1002"] }),
    });

    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);

    renderPage();

    const telegramCard = getCardByTitle("Telegram");
    const trashButtons = within(telegramCard)
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg.lucide-trash2") !== null);

    fireEvent.click(trashButtons[0]);

    expect(confirmSpy).toHaveBeenCalledWith('Remove chat ID "-1001"?');
    expect(within(telegramCard).getAllByRole("textbox")).toHaveLength(2);

    confirmSpy.mockRestore();
  });
});

describe("NotificationSettingsPage — KarmaBotSetupPanel", () => {
  it("should_render_bot_handle_from_envVars_in_setup_instructions", () => {
    setupDefaultMocks({ config: createConfig({ telegramEnabled: true }) });

    renderPage();

    expect(screen.getByText("@test_bot")).toBeInTheDocument();
    expect(screen.getByText(/Set up Karma bot/i)).toBeInTheDocument();
  });
});

describe("NotificationSettingsPage — reference card", () => {
  it("should_render_reference_card_heading", () => {
    setupDefaultMocks();

    renderPage();

    expect(screen.getByText(/What triggers a notification/i)).toBeInTheDocument();
  });

  it("should_render_all_four_realtime_events_with_recipients", () => {
    setupDefaultMocks();

    renderPage();

    expect(screen.getByText(/Real-time \(Telegram \/ Slack\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Comment posted on application/i)).toBeInTheDocument();
    expect(screen.getByText(/Milestone marked complete/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Post-approval form submitted \(first time only\)/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/@-mention in any comment/i)).toBeInTheDocument();
    // Recipient column
    expect(screen.getByText(/The mentioned user \(any role\)/i)).toBeInTheDocument();
  });

  it("should_render_all_nine_email_only_events", () => {
    setupDefaultMocks();

    renderPage();

    const emailOnlyEvents = [
      "Daily Reviewer Digest",
      "Daily Milestone Reviewer Digest",
      "Admin Weekly Digest",
      "Milestone Verification",
      "Post-approval form submission",
      "Invoice received",
      "KYC status change",
      "Reviewer invitations",
      "Applicant / grantee emails",
    ];

    for (const evt of emailOnlyEvents) {
      expect(screen.getByText(evt)).toBeInTheDocument();
    }
  });

  it("should_render_rules_of_thumb_callout_with_three_rules", () => {
    setupDefaultMocks();

    renderPage();

    expect(screen.getByText(/Rules of thumb/i)).toBeInTheDocument();
    expect(screen.getByText(/email kill switch silences/i)).toBeInTheDocument();
    expect(screen.getByText(/intentional duplication/i)).toBeInTheDocument();
    expect(screen.getByText(/To be @-tagged in a Telegram group/i)).toBeInTheDocument();
  });
});

describe("NotificationSettingsPage — global sticky save bar", () => {
  it("should_NOT_render_save_bar_when_no_dirty_changes", () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001"],
      }),
    });

    renderPage();

    expect(
      screen.queryByRole("button", { name: /Save notification settings/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/changes? pending/i)).not.toBeInTheDocument();
  });

  it("should_render_save_bar_with_singular_label_when_one_channel_is_dirty", () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001"],
      }),
    });

    renderPage();

    const telegramCard = getCardByTitle("Telegram");
    const input = within(telegramCard).getByDisplayValue("-1001") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "-1099" } });

    expect(screen.getByRole("button", { name: /Save notification settings/i })).toBeInTheDocument();
    expect(screen.getByText("1 change pending")).toBeInTheDocument();
  });

  it("should_render_save_bar_with_plural_label_when_both_channels_are_dirty", () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001"],
        slackEnabled: true,
        slackWebhookUrls: ["https://hooks.slack.com/services/AAA"],
      }),
    });

    renderPage();

    // Dirty TG by editing existing chat id
    const telegramCard = getCardByTitle("Telegram");
    const tgInput = within(telegramCard).getByDisplayValue("-1001") as HTMLInputElement;
    fireEvent.change(tgInput, { target: { value: "-1099" } });

    // Dirty Slack by editing existing webhook
    const slackCard = getCardByTitle("Slack");
    const slackInput = within(slackCard).getByDisplayValue(
      "https://hooks.slack.com/services/AAA"
    ) as HTMLInputElement;
    fireEvent.change(slackInput, {
      target: { value: "https://hooks.slack.com/services/BBB" },
    });

    expect(screen.getByText("2 changes pending")).toBeInTheDocument();
  });

  it("should_call_saveConfig_with_trimmed_telegram_chat_ids_when_global_save_clicked", async () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001111"],
      }),
    });

    renderPage();

    // Edit the existing row to dirty the channel (without saving)
    const telegramCard = getCardByTitle("Telegram");
    const input = within(telegramCard).getByDisplayValue("-1001111") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "-1009999" } });

    // Add a blank row — should be filtered out at save time
    fireEvent.click(within(telegramCard).getByRole("button", { name: /Add chat ID/i }));

    fireEvent.click(screen.getByRole("button", { name: /Save notification settings/i }));

    expect(saveConfigMutate).toHaveBeenLastCalledWith(
      {
        slug: "filecoin",
        config: { telegramEnabled: true, telegramChatIds: ["-1009999"] },
      },
      expect.any(Object)
    );
  });

  it("should_call_saveConfig_with_trimmed_slack_webhooks_when_global_save_clicked", async () => {
    setupDefaultMocks({
      config: createConfig({
        slackEnabled: true,
        slackWebhookUrls: ["https://hooks.slack.com/services/AAA"],
      }),
    });

    renderPage();

    const slackCard = getCardByTitle("Slack");
    const input = within(slackCard).getByDisplayValue(
      "https://hooks.slack.com/services/AAA"
    ) as HTMLInputElement;
    fireEvent.change(input, {
      target: { value: "https://hooks.slack.com/services/CCC" },
    });

    fireEvent.click(within(slackCard).getByRole("button", { name: /Add webhook URL/i }));

    fireEvent.click(screen.getByRole("button", { name: /Save notification settings/i }));

    expect(saveConfigMutate).toHaveBeenLastCalledWith(
      {
        slug: "filecoin",
        config: {
          slackEnabled: true,
          slackWebhookUrls: ["https://hooks.slack.com/services/CCC"],
        },
      },
      expect.any(Object)
    );
  });

  it("should_fire_both_telegram_and_slack_mutations_when_both_dirty", () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001"],
        slackEnabled: true,
        slackWebhookUrls: ["https://hooks.slack.com/services/A"],
      }),
    });

    renderPage();

    // Dirty both
    fireEvent.change(
      within(getCardByTitle("Telegram")).getByDisplayValue("-1001") as HTMLInputElement,
      { target: { value: "-1099" } }
    );
    fireEvent.change(
      within(getCardByTitle("Slack")).getByDisplayValue(
        "https://hooks.slack.com/services/A"
      ) as HTMLInputElement,
      { target: { value: "https://hooks.slack.com/services/B" } }
    );

    fireEvent.click(screen.getByRole("button", { name: /Save notification settings/i }));

    // Two persisted mutations fired (kill switch was not toggled here)
    const persistedCalls = saveConfigMutate.mock.calls.filter(
      (c) => "telegramEnabled" in (c[0]?.config ?? {}) || "slackEnabled" in (c[0]?.config ?? {})
    );
    expect(persistedCalls).toHaveLength(2);
  });

  it("should_re_sync_baselines_and_clear_dirty_after_successful_global_save", async () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001111"],
      }),
    });

    renderPage();

    const telegramCard = getCardByTitle("Telegram");
    const input = within(telegramCard).getByDisplayValue("-1001111") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "-1009999" } });

    // Add an empty row that should be filtered out
    fireEvent.click(within(telegramCard).getByRole("button", { name: /Add chat ID/i }));
    expect(within(telegramCard).getAllByRole("textbox")).toHaveLength(2);

    // Click global Save
    fireEvent.click(screen.getByRole("button", { name: /Save notification settings/i }));

    // Trigger onSuccess for all pending mutations and let microtasks flush
    await flushPendingMutations();

    // Local state should collapse back to the single non-empty row
    const refetchedCard = getCardByTitle("Telegram");
    expect(within(refetchedCard).getAllByRole("textbox")).toHaveLength(1);
    expect(within(refetchedCard).getByDisplayValue("-1009999")).toBeInTheDocument();

    // Save bar is hidden now (no dirty state)
    expect(
      screen.queryByRole("button", { name: /Save notification settings/i })
    ).not.toBeInTheDocument();

    // Success toast fired
    expect(mockToast.success).toHaveBeenCalled();
  });
});
