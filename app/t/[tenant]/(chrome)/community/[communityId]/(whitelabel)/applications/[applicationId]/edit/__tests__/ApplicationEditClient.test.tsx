import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { applicationKeys } from "@/src/lib/query-keys";
import type { Application, ApplicationStatus, FundingProgram } from "@/types/whitelabel-entities";
import { track } from "@/utilities/analytics/client";
import { ApplicationEditClient } from "../ApplicationEditClient";
import program1508FormSchema from "./__fixtures__/program-1508-form-schema.json";

const mockApi = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock("@/utilities/api/client", () => ({ api: mockApi }));
vi.mock("@/utilities/analytics/client", () => ({ track: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));
vi.mock("@/src/core/rbac", () => ({ useIsFundingPlatformAdmin: () => false }));
vi.mock("@/src/features/applications/hooks/use-application-status-history", () => ({
  useApplicationStatusHistory: () => ({ statusHistory: [] }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true, login: vi.fn() }),
}));
vi.mock("@/hooks/useRealTimeAIEvaluation", () => ({
  useRealTimeAIEvaluation: () => ({
    evaluation: null,
    evaluationResponse: null,
    isLoading: false,
    error: null,
    triggerEvaluation: vi.fn(),
    clearEvaluation: vi.fn(),
  }),
}));
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const REFERENCE = "APP-1";

function createProgram(enableRealTimeEvaluation = false): FundingProgram {
  return {
    programId: "program-1",
    name: "Test Program",
    metadata: { endsAt: "2999-01-01T00:00:00.000Z" },
    applicationConfig: {
      isEnabled: true,
      formSchema: {
        fields: [
          { id: "projectName", type: "text", label: "Project name", required: true },
          { id: "summary", type: "text", label: "Summary", required: false },
        ],
        aiConfig: { enableRealTimeEvaluation },
      },
    },
  } as unknown as FundingProgram;
}

function createApplication(status: ApplicationStatus): Application {
  return {
    referenceNumber: REFERENCE,
    programId: "program-1",
    status,
    applicationData: { summary: "Imported summary" },
    statusHistory: [],
  } as unknown as Application;
}

function renderEdit(status: ApplicationStatus, program = createProgram()) {
  mockApi.get.mockResolvedValue(program);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ApplicationEditClient communityId="filecoin" application={createApplication(status)} />
    </QueryClientProvider>
  );
  return queryClient;
}

describe("ApplicationEditClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.put.mockResolvedValue({ referenceNumber: REFERENCE });
  });

  describe("draft application", () => {
    it("shows Save draft alongside the submit button", async () => {
      renderEdit("draft");
      expect(await screen.findByTestId("save-draft-btn")).toHaveTextContent("Save draft");
      expect(screen.getByTestId("submit-application-btn")).toBeInTheDocument();
    });

    it("saves partial work with saveAsDraft without running required-field validation", async () => {
      renderEdit("draft");
      fireEvent.click(await screen.findByTestId("save-draft-btn"));

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith(`/v2/funding-applications/${REFERENCE}`, {
          applicationData: { Summary: "Imported summary" },
          saveAsDraft: true,
        });
      });
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Draft saved"));
      expect(mockPush).not.toHaveBeenCalled();
      expect(track).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith("application_draft_saved", {
        program_id: "program-1",
        community_id: "filecoin",
        is_new: false,
      });
    });

    it("keeps full validation on submit", async () => {
      renderEdit("draft");
      fireEvent.click(await screen.findByTestId("submit-application-btn"));

      await waitFor(() => {
        expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
      });
      expect(mockApi.put).not.toHaveBeenCalled();
    });

    it("submits without saveAsDraft and confirms the submission", async () => {
      renderEdit("draft");
      fireEvent.change(await screen.findByLabelText(/Project name/), {
        target: { value: "My project" },
      });
      fireEvent.click(screen.getByTestId("submit-application-btn"));

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith(`/v2/funding-applications/${REFERENCE}`, {
          applicationData: { "Project name": "My project", Summary: "Imported summary" },
        });
      });
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Application submitted"));
      expect(mockPush).toHaveBeenCalledWith(`/community/filecoin/applications/${REFERENCE}`);
      expect(track).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith("application_submitted", {
        program_id: "program-1",
        community_id: "filecoin",
        time_to_submit_s: null,
      });
    });

    it("hands the submitted application to the detail page without a stale cache", async () => {
      const submitted = { referenceNumber: REFERENCE, status: "pending" };
      mockApi.put.mockResolvedValue(submitted);
      const queryClient = renderEdit("draft");
      fireEvent.change(await screen.findByLabelText(/Project name/), {
        target: { value: "My project" },
      });
      fireEvent.click(screen.getByTestId("submit-application-btn"));

      await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
      expect(queryClient.getQueryData(applicationKeys.detail("filecoin", REFERENCE, true))).toEqual(
        submitted
      );
    });

    it("keeps Save draft available before the AI feedback step", async () => {
      renderEdit("draft", createProgram(true));
      expect(await screen.findByTestId("get-ai-feedback-btn")).toBeInTheDocument();
      expect(screen.getByTestId("save-draft-btn")).toBeEnabled();
    });
  });

  // Program 1508 (Filecoin ProPGF Kernel 2027), where Sentry 7853602321 was
  // reported. Every re-render of ApplicationEditClient used to rebuild
  // `initialData`, and useApplicationForm reset the form whenever that
  // object's identity changed — wiping whatever the applicant had typed.
  describe("re-rendering with program 1508's form", () => {
    const SAVED_NAME = "Saved project name";
    const TYPED_NAME = "Typed but not yet saved";

    function create1508Program(): FundingProgram {
      return {
        programId: "1508",
        name: "Filecoin ProPGF Kernel 2027",
        metadata: { endsAt: "2999-01-01T00:00:00.000Z" },
        applicationConfig: { isEnabled: true, formSchema: program1508FormSchema },
      } as unknown as FundingProgram;
    }

    function create1508Application(): Application {
      return {
        referenceNumber: REFERENCE,
        programId: "1508",
        status: "draft",
        applicationData: { field_kernel2027_02: SAVED_NAME },
        statusHistory: [],
      } as unknown as Application;
    }

    function render1508Edit() {
      mockApi.get.mockResolvedValue(create1508Program());
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const application = create1508Application();
      const tree = () => (
        <QueryClientProvider client={queryClient}>
          <ApplicationEditClient communityId="filecoin" application={application} />
        </QueryClientProvider>
      );
      const utils = render(tree());
      return { rerenderSameProps: () => utils.rerender(tree()) };
    }

    async function typeProjectName() {
      const input = await screen.findByLabelText(/1\.1 Project Name/);
      expect(input).toHaveValue(SAVED_NAME);
      fireEvent.change(input, { target: { value: TYPED_NAME } });
      expect(input).toHaveValue(TYPED_NAME);
      return input;
    }

    it("keeps unsaved typing when the page re-renders with the same application", async () => {
      const { rerenderSameProps } = render1508Edit();
      const input = await typeProjectName();

      rerenderSameProps();

      await waitFor(() => expect(screen.getByLabelText(/1\.1 Project Name/)).toBe(input));
      expect(input).toHaveValue(TYPED_NAME);
    });

    it("keeps unsaved typing while a draft save is in flight", async () => {
      // Never settles, so isSavingDraft stays true and the page re-renders
      // exactly once into the saving state.
      mockApi.put.mockReturnValue(new Promise(() => {}));
      render1508Edit();
      const input = await typeProjectName();

      fireEvent.click(screen.getByTestId("save-draft-btn"));

      // The page has re-rendered into the saving state: the button is now a spinner.
      await waitFor(() => expect(screen.queryByTestId("save-draft-btn")).not.toBeInTheDocument());
      expect(mockApi.put).toHaveBeenCalledTimes(1);
      expect(mockApi.put.mock.calls[0][1]).toMatchObject({
        applicationData: { "1.1 Project Name": TYPED_NAME },
        saveAsDraft: true,
      });
      expect(input).toHaveValue(TYPED_NAME);
    });
  });

  describe("non-draft application", () => {
    it("shows only the submit button", async () => {
      renderEdit("pending");
      expect(await screen.findByTestId("submit-application-btn")).toBeInTheDocument();
      expect(screen.queryByTestId("save-draft-btn")).not.toBeInTheDocument();
    });

    it("never sends saveAsDraft and keeps the existing toast", async () => {
      renderEdit("pending");
      fireEvent.change(await screen.findByLabelText(/Project name/), {
        target: { value: "My project" },
      });
      fireEvent.click(screen.getByTestId("submit-application-btn"));

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith(`/v2/funding-applications/${REFERENCE}`, {
          applicationData: { "Project name": "My project", Summary: "Imported summary" },
        });
      });
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Application updated successfully")
      );
      expect(track).not.toHaveBeenCalled();
    });
  });
});
