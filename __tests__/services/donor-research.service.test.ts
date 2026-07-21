import { listResearchReports } from "@/services/donor-research.service";
import { api } from "@/utilities/api/client";

vi.mock("@/utilities/api/client", () => ({ api: { get: vi.fn() } }));

const mockedApiGet = vi.mocked(api.get);

describe("donor research service", () => {
  it("passes the report status to the list endpoint", async () => {
    mockedApiGet.mockResolvedValue({ items: [], limit: 25, offset: 0 });

    await listResearchReports({ limit: 25, status: "complete" });

    expect(mockedApiGet).toHaveBeenCalledWith("/v2/donor-research/reports", {
      params: { limit: 25, status: "complete" },
    });
  });
});
