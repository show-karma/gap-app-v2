/**
 * @file Emit-site coverage for the project EDIT path in `ProjectDialog`.
 *
 * Catalog: `project_edited { project_id, fields_changed }`. Split from the
 * creation suite so neither file carries the other's cases on top of the shared
 * mock wall in `./project-dialog-analytics.mocks`.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "./project-dialog-analytics.mocks";
import {
  eventsNamed,
  mockGetAttestationSigner,
  mockGetProjectById,
  mockUpdateProject,
  setSetupChainAndWallet,
  setShowNetworkSelector,
} from "./project-dialog-analytics.handles";

/**
 * The edit side. `fields_changed` is supposed to answer "what do people edit?",
 * and the emit it replaced sent the form's whole key set — the same 21 names on
 * every submit, including submits that changed nothing.
 *
 * The diff also has to be taken BEFORE `updateProject` runs: that function calls
 * `details.setValues(...)` on the project object it is handed, so anything
 * compared afterwards has already been overwritten with the new values. These
 * tests drive the real dialog, so a diff moved back below the update would come
 * back empty and fail here.
 */
describe("ProjectDialog analytics — editing", () => {
  const STORED_TITLE = "Karma GAP";
  const STORED_DESCRIPTION = "On-chain grant accountability";

  /** The project as the API hands it to the dialog, for the prefilled form. */
  const projectToUpdate = () =>
    ({
      uid: "0xproject-uid",
      chainID: 10,
      owner: "0x1234567890abcdef1234567890abcdef12345678",
      details: {
        title: STORED_TITLE,
        description: STORED_DESCRIPTION,
        problem: "Grants are unaccountable",
        solution: "Attest to them",
        missionSummary: "Fund what works",
        locationOfImpact: "Global",
        slug: "karma-gap",
        businessModel: "nonprofit",
        stageIn: "growth",
        raisedMoney: "1000000",
        pathToTake: "scale",
        tags: ["public-goods"],
        links: [{ type: "twitter", url: "https://x.test/karma" }],
      },
    }) as never;

  /**
   * The same project as the SDK entity `getProjectById` returns — this is the
   * object the diff reads the PREVIOUS values from, and the one `updateProject`
   * would mutate.
   */
  const fetchedProject = () => ({
    uid: "0xproject-uid",
    chainID: 10,
    details: {
      title: STORED_TITLE,
      description: STORED_DESCRIPTION,
      problem: "Grants are unaccountable",
      solution: "Attest to them",
      missionSummary: "Fund what works",
      locationOfImpact: "Global",
      imageURL: "",
      businessModel: "nonprofit",
      stageIn: "growth",
      raisedMoney: "1000000",
      pathToTake: "scale",
      tags: [{ name: "public-goods" }],
      links: [{ type: "twitter", url: "https://x.test/karma" }],
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setShowNetworkSelector(false);

    mockGetProjectById.mockResolvedValue(fetchedProject());
    mockUpdateProject.mockResolvedValue({ uid: "0xproject-uid", details: { slug: "karma-gap" } });

    mockGetAttestationSigner.mockResolvedValue({ signMessage: vi.fn() });
    setSetupChainAndWallet(
      vi.fn().mockResolvedValue({
        gapClient: {
          findSchema: vi.fn().mockReturnValue("mock-schema"),
          generateSlug: vi.fn().mockResolvedValue("karma-gap"),
        },
        walletSigner: { signMessage: vi.fn() },
        chainId: 10,
      })
    );
  });

  const openEditDialog = async () => {
    const { ProjectDialog } = await import("@/components/Dialogs/ProjectDialog");
    const user = userEvent.setup();
    render(
      <ProjectDialog
        projectToUpdate={projectToUpdate()}
        buttonElement={{ text: "Edit project", styleClass: "" }}
      />
    );
    await user.click(screen.getByRole("button", { name: /edit project/i }));
    await waitFor(() => {
      expect(screen.getByDisplayValue(STORED_TITLE)).toBeInTheDocument();
    });
    return user;
  };

  const submitEdit = async (user: ReturnType<typeof userEvent.setup>) => {
    const form = document.querySelector("form");
    if (!form) throw new Error("ProjectDialog form not found");
    fireEvent.submit(form);
    await waitFor(() => expect(mockUpdateProject).toHaveBeenCalled());
    void user;
  };

  it("names only the field the user actually changed", async () => {
    const user = await openEditDialog();

    const titleInput = screen.getByDisplayValue(STORED_TITLE);
    await user.clear(titleInput);
    await user.type(titleInput, "Karma GAP v2");

    await submitEdit(user);

    await waitFor(() => expect(eventsNamed("project_edited")).toHaveLength(1));
    expect(eventsNamed("project_edited")[0]).toEqual([
      "project_edited",
      { project_id: "0xproject-uid", fields_changed: ["title"] },
    ]);
  });

  it("emits nothing when the submit changed nothing", async () => {
    // The old emit reported all 21 form keys here, which made every no-op save
    // look like a full profile rewrite.
    const user = await openEditDialog();

    await submitEdit(user);

    expect(eventsNamed("project_edited")).toHaveLength(0);
  });

  it("names each changed field when several changed", async () => {
    const user = await openEditDialog();

    const titleInput = screen.getByDisplayValue(STORED_TITLE);
    await user.clear(titleInput);
    await user.type(titleInput, "Karma GAP v2");

    const descriptionEditor = screen.getByDisplayValue(STORED_DESCRIPTION);
    await user.clear(descriptionEditor);
    await user.type(descriptionEditor, "Something else entirely");

    await submitEdit(user);

    await waitFor(() => expect(eventsNamed("project_edited")).toHaveLength(1));
    const [, props] = eventsNamed("project_edited")[0] as [string, { fields_changed: string[] }];
    expect([...props.fields_changed].sort()).toEqual(["description", "title"]);
  });

  it("carries field names and never the content behind them", async () => {
    const user = await openEditDialog();

    const descriptionEditor = screen.getByDisplayValue(STORED_DESCRIPTION);
    await user.clear(descriptionEditor);
    await user.type(descriptionEditor, "Confidential roadmap detail");

    await submitEdit(user);

    await waitFor(() => expect(eventsNamed("project_edited")).toHaveLength(1));
    const serialised = JSON.stringify(eventsNamed("project_edited"));
    expect(serialised).not.toContain("Confidential roadmap detail");
    expect(serialised).not.toMatch(/0x[0-9a-fA-F]{40}/);
  });
});
