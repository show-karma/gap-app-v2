import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { ContactInfoSubscription } from "@/components/ContactInfoSubscription";
import { errorManager } from "@/components/Utilities/errorManager";
import { envVars } from "@/utilities/enviromentVars";
import { INDEXER } from "@/utilities/indexer";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xViewer" }),
}));

vi.mock("@/utilities/auth/token-manager", () => ({
  TokenManager: { getToken: vi.fn().mockResolvedValue("test-token") },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ authenticated: true }),
}));

vi.mock("@/hooks/useProjectAuthorization", () => ({
  useProjectAuthorization: () => ({ isAuthorized: true, isLoading: false }),
}));

vi.mock("@/src/core/rbac/hooks/use-permissions", () => ({
  usePermissionsQuery: () => ({ data: { roles: { roles: [] } } }),
}));

vi.mock("@/store", () => {
  const projectState = {
    project: { uid: "proj-1", details: { slug: "project-one" } },
    isProjectAdmin: true,
    isProjectOwner: false,
    refreshProject: vi.fn(),
  };
  const ownerState = { isOwner: false };

  return {
    useProjectStore: (selector: (state: typeof projectState) => unknown) => selector(projectState),
    useOwnerStore: (selector: (state: typeof ownerState) => unknown) => selector(ownerState),
  };
});

const server = setupServer();
const CONTACT_ID = "507f1f77bcf86cd799439011";
let queryClient: QueryClient;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  vi.clearAllMocks();
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  cleanup();
  queryClient.clear();
  server.resetHandlers();
});
afterAll(() => server.close());

describe("project contact deletion", () => {
  it.each([
    { format: "string", id: CONTACT_ID },
    { format: "legacy $oid", id: { $oid: CONTACT_ID } },
  ])("sends the $format contact ID in the DELETE body", async ({ id }) => {
    const deleteBodies: unknown[] = [];
    server.use(
      http.get(`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SUBSCRIPTION.GET("proj-1")}`, () =>
        HttpResponse.json([{ _id: id, name: "Ada", email: "ada@example.com", telegram: "ada" }])
      ),
      http.delete(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SUBSCRIPTION.DELETE("project-one")}`,
        async ({ request }) => {
          deleteBodies.push(await request.json());
          return HttpResponse.json({ success: true });
        }
      )
    );

    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <ContactInfoSubscription />
      </QueryClientProvider>
    );

    await screen.findByText("ada@example.com");
    // The existing contact row has two icon-only buttons: edit, then delete.
    const [, deleteButton] = screen.getAllByRole("button", { name: "" });
    await user.click(deleteButton);

    await waitFor(() => expect(deleteBodies).toEqual([{ contacts: [CONTACT_ID] }]));
    expect(errorManager).not.toHaveBeenCalled();
  });
});
