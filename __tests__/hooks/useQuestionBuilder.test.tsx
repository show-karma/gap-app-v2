import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuestionBuilderSchema } from "@/hooks/useQuestionBuilder";
import { fundingPlatformService } from "@/services/fundingPlatformService";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/fundingPlatformService", () => ({
  fundingPlatformService: {
    programs: {
      getProgramConfiguration: vi.fn(),
      createProgramConfiguration: vi.fn(),
      updateProgramConfiguration: vi.fn(),
    },
  },
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseAuth = useAuth as vi.MockedFunction<typeof useAuth>;
const mockFundingPrograms = fundingPlatformService.programs as {
  getProgramConfiguration: vi.Mock;
  createProgramConfiguration: vi.Mock;
  updateProgramConfiguration: vi.Mock;
};

describe("useQuestionBuilderSchema", () => {
  let queryClient: QueryClient;
  const programId = "program-123";

  const initialSchema = {
    id: "form-initial",
    title: "Initial Form",
    description: "Initial description",
    fields: [{ id: "field-1", type: "email", label: "Email", required: true }],
    settings: {},
  };

  const updatedSchema = {
    id: "form-updated",
    title: "Updated Form",
    description: "Updated description",
    fields: [{ id: "field-2", type: "text", label: "Project Name", required: true }],
    settings: {},
  };

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      authenticated: true,
      ready: true,
    } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("updates question-schema cache when mutation response nests schema under applicationConfig", async () => {
    mockFundingPrograms.getProgramConfiguration.mockResolvedValue({
      applicationConfig: {
        formSchema: initialSchema,
      },
    });
    mockFundingPrograms.updateProgramConfiguration.mockResolvedValue({
      applicationConfig: {
        formSchema: updatedSchema,
      },
    });

    const { result } = renderHook(() => useQuestionBuilderSchema(programId), { wrapper });

    await waitFor(() => {
      expect(result.current.schema).toEqual(initialSchema);
    });

    act(() => {
      result.current.updateSchema({
        schema: updatedSchema,
        existingConfig: { programId, isEnabled: true } as any,
      });
    });

    await waitFor(() => {
      expect(mockFundingPrograms.updateProgramConfiguration).toHaveBeenCalledTimes(1);
    });

    expect(queryClient.getQueryData(["question-schema", programId])).toEqual(updatedSchema);
  });

  it("does not clobber cached schema when mutation response omits schema fields", async () => {
    mockFundingPrograms.getProgramConfiguration.mockResolvedValue({
      applicationConfig: {
        formSchema: initialSchema,
      },
    });
    mockFundingPrograms.updateProgramConfiguration.mockResolvedValue({
      applicationConfig: {
        isEnabled: true,
      },
    });

    const { result } = renderHook(() => useQuestionBuilderSchema(programId), { wrapper });

    await waitFor(() => {
      expect(result.current.schema).toEqual(initialSchema);
    });

    act(() => {
      result.current.updateSchema({
        schema: updatedSchema,
        existingConfig: { programId, isEnabled: true } as any,
      });
    });

    await waitFor(() => {
      expect(mockFundingPrograms.updateProgramConfiguration).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(queryClient.getQueryData(["question-schema", programId])).toEqual(initialSchema);
    });
  });
});
