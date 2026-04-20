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

// Helpers to grab card-scoped elements
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

  it("should_disable_pair_new_chat_button_when_telegram_is_off", () => {
    setupDefaultMocks({ config: createConfig({ telegramEnabled: false }) });

    renderPage();

    const pairButton = screen.getByRole("button", { name: /Pair new chat/i });
    expect(pairButton).toBeDisabled();
  });

  it("should_open_pair_modal_when_pair_new_chat_clicked_and_telegram_is_on", () => {
    setupDefaultMocks({ config: createConfig({ telegramEnabled: true }) });

    renderPage();

    expect(screen.queryByTestId("telegram-pair-modal")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Pair new chat/i }));

    expect(screen.getByTestId("telegram-pair-modal")).toBeInTheDocument();
  });

  it("should_call_saveConfig_with_trimmed_telegram_chat_ids_when_save_clicked", () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001111"],
      }),
    });

    renderPage();

    // Add empty row, then save — the empty row should be filtered out
    const telegramCard = getCardByTitle("Telegram");
    const addBtn = within(telegramCard).getByRole("button", { name: /Add chat ID/i });
    fireEvent.click(addBtn);

    const saveBtn = within(telegramCard).getByRole("button", { name: /^Save$/i });
    fireEvent.click(saveBtn);

    expect(saveConfigMutate).toHaveBeenCalledWith(
      {
        slug: "filecoin",
        config: { telegramEnabled: true, telegramChatIds: ["-1001111"] },
      },
      expect.any(Object)
    );
  });

  it("should_re_sync_local_state_to_normalized_values_after_successful_save", () => {
    setupDefaultMocks({
      config: createConfig({
        telegramEnabled: true,
        telegramChatIds: ["-1001111"],
      }),
    });

    renderPage();

    const telegramCard = getCardByTitle("Telegram");
    const addBtn = within(telegramCard).getByRole("button", { name: /Add chat ID/i });
    fireEvent.click(addBtn);

    // Two inputs now — original and a blank one
    expect(within(telegramCard).getAllByRole("textbox")).toHaveLength(2);

    fireEvent.click(within(telegramCard).getByRole("button", { name: /^Save$/i }));

    // Trigger onSuccess to simulate server confirmation. Wrap in act() so the
    // setState calls inside the callback flush before we assert the DOM.
    const handlers = saveConfigMutate.mock.calls[0][1];
    act(() => {
      handlers.onSuccess();
    });

    // Local state should collapse back to just the non-empty row
    const refetchedCard = getCardByTitle("Telegram");
    expect(within(refetchedCard).getAllByRole("textbox")).toHaveLength(1);
    expect(within(refetchedCard).getByDisplayValue("-1001111")).toBeInTheDocument();
    expect(mockToast.success).toHaveBeenCalledWith("Telegram config saved");
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
  it("should_call_saveConfig_with_trimmed_webhook_urls_when_save_clicked", () => {
    setupDefaultMocks({
      config: createConfig({
        slackEnabled: true,
        slackWebhookUrls: ["https://hooks.slack.com/services/AAA"],
      }),
    });

    renderPage();

    const slackCard = getCardByTitle("Slack");
    const addBtn = within(slackCard).getByRole("button", { name: /Add chat ID/i });
    fireEvent.click(addBtn);

    fireEvent.click(within(slackCard).getByRole("button", { name: /^Save$/i }));

    expect(saveConfigMutate).toHaveBeenCalledWith(
      {
        slug: "filecoin",
        config: {
          slackEnabled: true,
          slackWebhookUrls: ["https://hooks.slack.com/services/AAA"],
        },
      },
      expect.any(Object)
    );
  });

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

describe("NotificationSettingsPage — ChatIdsEditor (via parent)", () => {
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

describe("NotificationSettingsPage — NotificationTypesCard", () => {
  it("should_render_all_four_realtime_notification_types", () => {
    setupDefaultMocks();

    renderPage();

    expect(screen.getByText(/Comment on an application .* → reviewers/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Milestone marked complete .* → milestone reviewers/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Post-approval form submitted .* → reviewers/i)).toBeInTheDocument();
    expect(screen.getByText(/@-mention in a comment → the tagged user/i)).toBeInTheDocument();
  });

  it("should_render_all_nine_email_only_notification_types", () => {
    setupDefaultMocks();

    renderPage();

    const emailOnlyTypes = [
      "Daily Reviewer Digest",
      "Milestone Reviewer Digest",
      "Admin Weekly Digest",
      "Milestone Verification → Finance",
      "Post-Approval → per-program admin/finance email list",
      "Invoice Received → Finance",
      "KYC Status Change → Admin",
      "Reviewer invitations",
      "All applicant / grantee emails",
    ];

    for (const type of emailOnlyTypes) {
      expect(screen.getByText(type)).toBeInTheDocument();
    }
  });

  it("should_render_all_five_how_it_behaves_bullets_including_post_approval", () => {
    setupDefaultMocks();

    renderPage();

    // The phrase "all program reviewers and milestone reviewers are notified"
    // appears in TWO bullets (broadcast + post-approval). Assert both are
    // present rather than expecting a single match.
    expect(
      screen.getAllByText(/all program reviewers and milestone reviewers are notified/i)
    ).toHaveLength(2);
    expect(screen.getByText(/Comments from admins or reviewers do/i)).toBeInTheDocument();
    expect(screen.getByText(/grantee marks a milestone complete/i)).toBeInTheDocument();
    expect(
      screen.getByText(/grantee submits the post-approval form for the first time/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Reviewers with a Telegram username/i)).toBeInTheDocument();
    expect(screen.getByText(/kill-switch above only blocks emails/i)).toBeInTheDocument();
  });
});
