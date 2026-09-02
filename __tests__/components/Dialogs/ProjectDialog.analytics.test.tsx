/**
 * @file Emit-site coverage for the project CREATION funnel in `ProjectDialog`.
 *
 * Catalog: `project_create_started { entry_point }` and
 * `project_create_failed { chain_id, error_code }`.
 *
 * `project_create_started` is deliberately emitted before the wallet is
 * involved (R2: project create is a wallet-signing flow, so it keeps a
 * `_started` leg). The drop-off between "opened the funnel" and "signed the
 * attestation" is only measurable if this fires on submit rather than after a
 * successful attestation — so that ordering is what these tests pin, along with
 * `_failed` carrying a machine error code and never the raw error message.
 *
 * The edit side lives in `ProjectDialog.analytics.editing.test.tsx`; both share
 * the mock wall in `./project-dialog-analytics.mocks`.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "./project-dialog-analytics.mocks";
import {
  eventsNamed,
  mockEnsureCorrectChain,
  mockGetAttestationSigner,
  mockProjectAttest,
  mockSetupChainAndWallet,
  mockTrack,
  setProjectAttest,
  setSetupChainAndWallet,
  setShowNetworkSelector,
} from "./project-dialog-analytics.handles";

describe("ProjectDialog analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setShowNetworkSelector(false);

    setProjectAttest(vi.fn().mockResolvedValue({ tx: [{ hash: "0xtx" }] }));

    mockGetAttestationSigner.mockResolvedValue({ signMessage: vi.fn() });
    mockEnsureCorrectChain.mockResolvedValue({
      success: true,
      chainId: 10,
      gapClient: {
        findSchema: vi.fn().mockReturnValue("mock-schema"),
        generateSlug: vi.fn().mockResolvedValue("my-project"),
      },
    });
    setSetupChainAndWallet(
      vi.fn().mockResolvedValue({
        gapClient: {
          findSchema: vi.fn().mockReturnValue("mock-schema"),
          generateSlug: vi.fn().mockResolvedValue("my-project"),
        },
        walletSigner: { signMessage: vi.fn() },
        chainId: 10,
      })
    );
  });

  const fillStepZero = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(screen.getByPlaceholderText('e.g. "My awesome project"'), "My awesome project");
    const markdownEditors = screen.getAllByTestId("markdown-editor");
    await user.type(markdownEditors[0], "Description");
    await user.type(markdownEditors[1], "Problem");
    await user.type(markdownEditors[2], "Solution");
    await user.type(markdownEditors[3], "Mission summary");
  };

  const advanceToSubmit = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Your/organization handle")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Describe your business model")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /add contact/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /add contact/i }));

    const form = document.querySelector("form");
    if (!form) throw new Error("ProjectDialog form not found");
    fireEvent.submit(form);
  };

  const driveCreate = async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();
    render(<ProjectDialog />);
    await user.click(screen.getByRole("button", { name: /add project/i }));
    await fillStepZero(user);
    await advanceToSubmit(user);
  };

  it("emits project_create_started once, on submit", async () => {
    await driveCreate();

    await waitFor(() => expect(eventsNamed("project_create_started")).toHaveLength(1));
    expect(eventsNamed("project_create_started")[0]).toEqual([
      "project_create_started",
      { entry_point: "project_dialog" },
    ]);
  });

  it("emits project_create_started BEFORE the wallet is prepared", async () => {
    await driveCreate();

    await waitFor(() => expect(mockSetupChainAndWallet).toHaveBeenCalled());
    // The funnel's whole value is the gap between opening it and signing. If
    // this event moved after the wallet step, every user who abandoned at the
    // wallet prompt would vanish from the funnel entirely.
    const startedAt = mockTrack.mock.invocationCallOrder[0];
    const walletAt = mockSetupChainAndWallet.mock.invocationCallOrder[0];
    expect(startedAt).toBeLessThan(walletAt);
  });

  it("does not emit project_create_started when validation blocks the submit", async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();
    render(<ProjectDialog />);
    await user.click(screen.getByRole("button", { name: /add project/i }));

    // Submit the empty form: the resolver rejects and onSubmit never runs.
    const form = document.querySelector("form");
    if (!form) throw new Error("ProjectDialog form not found");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Description is required")).toBeInTheDocument();
    });
    expect(eventsNamed("project_create_started")).toHaveLength(0);
    expect(mockProjectAttest).not.toHaveBeenCalled();
  });

  it("emits project_create_failed with a machine error_code when the attestation throws", async () => {
    setProjectAttest(vi.fn().mockRejectedValue(new Error("user rejected the request")));

    await driveCreate();

    await waitFor(() => expect(eventsNamed("project_create_failed")).toHaveLength(1));
    const [, props] = eventsNamed("project_create_failed")[0];
    expect(props).toHaveProperty("error_code");
    expect(typeof (props as { error_code: unknown }).error_code).toBe("string");
    // The raw message is the one thing that must not ride along: it is
    // unbounded, user-influenced text on a high-cardinality property.
    expect(JSON.stringify(props)).not.toContain("user rejected the request");
  });

  it("carries a chain_id (or explicit null) on project_create_failed", async () => {
    setProjectAttest(vi.fn().mockRejectedValue(new Error("boom")));

    await driveCreate();

    await waitFor(() => expect(eventsNamed("project_create_failed")).toHaveLength(1));
    const [, props] = eventsNamed("project_create_failed")[0];
    expect(props).toHaveProperty("chain_id");
    expect(Object.keys(props as object).sort()).toEqual(["chain_id", "error_code"]);
  });

  it("puts no wallet address or email on any create event", async () => {
    await driveCreate();

    await waitFor(() => expect(mockTrack).toHaveBeenCalled());
    const serialised = JSON.stringify(mockTrack.mock.calls);
    expect(serialised).not.toMatch(/0x[0-9a-fA-F]{40}/);
    expect(serialised).not.toContain("test@example.com");
  });
});
