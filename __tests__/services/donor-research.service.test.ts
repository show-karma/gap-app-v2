import { listResearchReports } from "@/services/donor-research.service";
import fetchData from "@/utilities/fetchData";

vi.mock("@/utilities/fetchData", () => ({ default: vi.fn() }));

const mockedFetchData = vi.mocked(fetchData);

describe("donor research service", () => {
  it("passes the report status to the list endpoint", async () => {
    mockedFetchData.mockResolvedValue([{ items: [], limit: 25, offset: 0 }, null, null, 200]);

    await listResearchReports({ limit: 25, status: "complete" });

    expect(mockedFetchData).toHaveBeenCalledWith(
      "/v2/donor-research/reports",
      "GET",
      {},
      { limit: 25, status: "complete" }
    );
  });
});
