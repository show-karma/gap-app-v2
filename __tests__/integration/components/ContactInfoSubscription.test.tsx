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

describe.each([
  { format: "string", id: CONTACT_ID },
  { format: "legacy $oid", id: { $oid: CONTACT_ID } },
])("project contacts with $format IDs", ({ id }) => {
  function renderContacts() {
    return render(
      <QueryClientProvider client={queryClient}>
        <ContactInfoSubscription />
      </QueryClientProvider>
    );
  }

  it("deletes the requested contact and removes it from the refreshed list", async () => {
    const deleteBodies: unknown[] = [];
    let contacts = [{ _id: id, name: "Ada", email: "ada@example.com", telegram: "ada_user" }];
    server.use(
      http.get(`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SUBSCRIPTION.GET("proj-1")}`, () =>
        HttpResponse.json(contacts)
      ),
      http.delete(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SUBSCRIPTION.DELETE("project-one")}`,
        async ({ request }) => {
          deleteBodies.push(await request.json());
          contacts = [];
          return HttpResponse.json({ success: true });
        }
      )
    );

    const user = userEvent.setup();
    renderContacts();

    await screen.findByText("ada@example.com");
    // The existing contact row has two icon-only buttons: edit, then delete.
    const [, deleteButton] = screen.getAllByRole("button", { name: "" });
    await user.click(deleteButton);

    await waitFor(() => expect(deleteBodies).toEqual([{ contacts: [CONTACT_ID] }]));
    await waitFor(() => expect(screen.queryByText("ada@example.com")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Add Contact" })).toBeInTheDocument();
    expect(errorManager).not.toHaveBeenCalled();
  });

  it("edits the same contact using its normalized ID and displays the saved values", async () => {
    const updateBodies: unknown[] = [];
    let contact = { _id: id, name: "Ada", email: "ada@example.com", telegram: "ada_user" };
    server.use(
      http.get(`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SUBSCRIPTION.GET("proj-1")}`, () =>
        HttpResponse.json([contact])
      ),
      http.put(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SUBSCRIPTION.UPDATE("project-one", CONTACT_ID)}`,
        async ({ request }) => {
          const body = (await request.json()) as { name: string; email: string; telegram: string };
          updateBodies.push(body);
          contact = { ...contact, name: body.name, email: body.email, telegram: body.telegram };
          return HttpResponse.json({ success: true });
        }
      )
    );
    const user = userEvent.setup();
    renderContacts();
    await screen.findByText("ada@example.com");
    const [editButton] = screen.getAllByRole("button", { name: "" });
    await user.click(editButton);
    expect(screen.getByLabelText("Name *")).toHaveValue("Ada");
    expect(screen.getByLabelText("E-mail *")).toHaveValue("ada@example.com");
    await user.clear(screen.getByLabelText("Name *"));
    await user.type(screen.getByLabelText("Name *"), "Ada Updated");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateBodies).toEqual([
        { id: CONTACT_ID, name: "Ada Updated", email: "ada@example.com", telegram: "ada_user" },
      ])
    );
    await screen.findByText("Ada Updated");
    expect(screen.getByLabelText("Name *")).toHaveValue("");
    expect(errorManager).not.toHaveBeenCalled();
  });

  it("keeps the contact visible and reports a failed deletion", async () => {
    server.use(
      http.get(`${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SUBSCRIPTION.GET("proj-1")}`, () =>
        HttpResponse.json([
          { _id: id, name: "Ada", email: "ada@example.com", telegram: "ada_user" },
        ])
      ),
      http.delete(
        `${envVars.NEXT_PUBLIC_GAP_INDEXER_URL}${INDEXER.SUBSCRIPTION.DELETE("project-one")}`,
        () => HttpResponse.json({ message: "Database unavailable" }, { status: 500 })
      )
    );
    const user = userEvent.setup();
    renderContacts();
    await screen.findByText("ada@example.com");
    const [, deleteButton] = screen.getAllByRole("button", { name: "" });
    await user.click(deleteButton);

    await waitFor(() => expect(errorManager).toHaveBeenCalledTimes(1));
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
  });
});
