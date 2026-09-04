vi.mock("next/cache", () => ({
  unstable_cache: (loader: () => unknown) => loader,
}));

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "@/utilities/api/client";
import { INDEXER } from "@/utilities/indexer";
import {
  type NotebookIndicatorCatalogDto,
  NotebookIndicatorCatalogDtoSchema,
  type NotebookIndicatorDatapointsDto,
  NotebookIndicatorDatapointsDtoSchema,
  type NotebookIndicatorDto,
  NotebookIndicatorDtoSchema,
} from "../notebook-indicators.dto";
import {
  getNotebookIndicatorCatalog,
  getNotebookIndicatorSeries,
} from "../notebook-indicators.query";

const mockApiGet = api.get as unknown as ReturnType<typeof vi.fn>;

function indicator(id = "c565f9a6-8df5-442d-9199-8b4f1025ec6b"): NotebookIndicatorDto {
  return {
    id,
    name: "drand-relay-statuspage",
    description: "Statuspage severity",
    unitOfMeasure: "severity level",
    programs: null,
    communityUID: null,
    kernelId: "randomness-relays",
    syncType: "auto",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-08-25T00:00:00Z",
  };
}

function catalogPage(
  payload: NotebookIndicatorDto[],
  page: number,
  totalPages: number,
  totalCount: number
): NotebookIndicatorCatalogDto {
  return {
    payload,
    pagination: {
      totalCount,
      page,
      limit: 100,
      totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

function datapoint(
  id: string,
  value: string | null,
  endDate: string,
  updatedAt = endDate
): NotebookIndicatorDatapointsDto["payload"][number] {
  return {
    id,
    value,
    breakdown: null,
    startDate: endDate,
    endDate,
    period: null,
    proof: null,
    thresholdOp: null,
    thresholdValue: null,
    source: "auto",
    createdAt: endDate,
    updatedAt,
  };
}

function datapointPage(
  payload: NotebookIndicatorDatapointsDto["payload"],
  page = 1,
  totalPages = 1,
  totalCount = payload.length
): NotebookIndicatorDatapointsDto {
  return {
    payload,
    pagination: {
      totalCount,
      page,
      limit: 100,
      totalPages,
      nextPage: page < totalPages ? page + 1 : null,
      prevPage: page > 1 ? page - 1 : null,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

describe("getNotebookIndicatorCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exhausts the paginated catalog and returns picker-ready options", async () => {
    const first = indicator("11111111-1111-4111-8111-111111111111");
    const second = { ...indicator("22222222-2222-4222-8222-222222222222"), name: "Alpha" };
    mockApiGet
      .mockResolvedValueOnce(catalogPage([first], 1, 2, 2))
      .mockResolvedValueOnce(catalogPage([second], 2, 2, 2));

    const result = await getNotebookIndicatorCatalog();

    expect(mockApiGet).toHaveBeenNthCalledWith(
      1,
      INDEXER.INDICATORS.V2.LIST({ page: 1, limit: 100 }),
      {
        schema: NotebookIndicatorCatalogDtoSchema,
        isAuthorized: false,
      }
    );
    expect(mockApiGet).toHaveBeenNthCalledWith(
      2,
      INDEXER.INDICATORS.V2.LIST({ page: 2, limit: 100 }),
      {
        schema: NotebookIndicatorCatalogDtoSchema,
        isAuthorized: false,
      }
    );
    expect(result).toEqual({
      total: 2,
      indicators: [
        {
          id: second.id,
          label: "Alpha",
          description: second.description,
          unit: second.unitOfMeasure,
          kernelId: second.kernelId,
          communityUID: second.communityUID,
          syncType: "auto",
        },
        {
          id: first.id,
          label: first.name,
          description: first.description,
          unit: first.unitOfMeasure,
          kernelId: first.kernelId,
          communityUID: first.communityUID,
          syncType: "auto",
        },
      ],
    });
  });

  it("fails visibly when pagination claims rows that were not returned", async () => {
    mockApiGet.mockResolvedValueOnce(catalogPage([indicator()], 1, 1, 20));

    await expect(getNotebookIndicatorCatalog()).rejects.toThrow("catalog");
  });
});

describe("getNotebookIndicatorSeries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-31T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("coerces strings, drops bad values, de-duplicates corrected dates, and sorts", async () => {
    mockApiGet
      .mockResolvedValueOnce(indicator())
      .mockResolvedValueOnce(
        datapointPage([
          datapoint("new", " 357440 ", "2026-08-25T00:00:00Z", "2026-08-26T00:00:00Z"),
          datapoint("empty", "", "2026-08-24T00:00:00Z"),
          datapoint("null", null, "2026-08-23T00:00:00Z"),
          datapoint("bad", "healthy", "2026-08-22T00:00:00Z"),
          datapoint("old", "1", "2026-08-25T00:00:00Z", "2026-08-25T00:00:00Z"),
          datapoint("first", "2.5", "2026-07-01T00:00:00Z"),
        ])
      );

    const result = await getNotebookIndicatorSeries(indicator().id, "all");

    expect(result).toEqual({
      indicator: {
        id: indicator().id,
        label: "drand-relay-statuspage",
        description: "Statuspage severity",
        unit: "severity level",
        communityUID: null,
        kernelId: "randomness-relays",
      },
      preset: "all",
      points: [
        { date: "2026-07-01", value: 2.5 },
        { date: "2026-08-25", value: 357440 },
      ],
      latestPoint: { date: "2026-08-25", value: 357440 },
      receivedPointCount: 6,
      discardedPointCount: 3,
      supersededPointCount: 1,
    });
  });

  it("applies the closed preset on the server while retaining latest-point metadata", async () => {
    mockApiGet
      .mockResolvedValueOnce(indicator())
      .mockResolvedValueOnce(
        datapointPage([
          datapoint("old", "10", "2026-07-01T00:00:00Z"),
          datapoint("latest", "20", "2026-08-01T00:00:00Z"),
        ])
      );

    const result = await getNotebookIndicatorSeries(indicator().id, "30d");

    expect(result.points).toEqual([]);
    expect(result.latestPoint).toEqual({ date: "2026-08-01", value: 20 });
    expect(result.preset).toBe("30d");
  });

  it("treats 12m as a UTC calendar window", async () => {
    mockApiGet
      .mockResolvedValueOnce(indicator())
      .mockResolvedValueOnce(
        datapointPage([
          datapoint("outside", "1", "2025-08-30T00:00:00Z"),
          datapoint("boundary", "2", "2025-08-31T00:00:00Z"),
        ])
      );

    const result = await getNotebookIndicatorSeries(indicator().id, "12m");

    expect(result.points).toEqual([{ date: "2025-08-31", value: 2 }]);
  });

  it("fetches every datapoint page and supports an optional project filter", async () => {
    mockApiGet
      .mockResolvedValueOnce(indicator())
      .mockResolvedValueOnce(
        datapointPage([datapoint("one", "1", "2026-08-01T00:00:00Z")], 1, 2, 2)
      )
      .mockResolvedValueOnce(
        datapointPage([datapoint("two", "2", "2026-08-02T00:00:00Z")], 2, 2, 2)
      );

    const result = await getNotebookIndicatorSeries(indicator().id, "all", {
      projectUID: "0xproject",
    });

    expect(mockApiGet).toHaveBeenNthCalledWith(1, INDEXER.INDICATORS.V2.GET_BY_ID(indicator().id), {
      schema: NotebookIndicatorDtoSchema,
      isAuthorized: false,
    });
    expect(mockApiGet).toHaveBeenNthCalledWith(
      2,
      INDEXER.INDICATORS.V2.DATAPOINTS(indicator().id, {
        projectUID: "0xproject",
        page: 1,
        limit: 100,
      }),
      { schema: NotebookIndicatorDatapointsDtoSchema, isAuthorized: false }
    );
    expect(mockApiGet).toHaveBeenNthCalledWith(
      3,
      INDEXER.INDICATORS.V2.DATAPOINTS(indicator().id, {
        projectUID: "0xproject",
        page: 2,
        limit: 100,
      }),
      { schema: NotebookIndicatorDatapointsDtoSchema, isAuthorized: false }
    );
    expect(result.points).toHaveLength(2);
  });

  it("rejects unsafe identifiers and unknown preset tokens before requesting", async () => {
    await expect(getNotebookIndicatorSeries("../secret", "all")).rejects.toThrow();
    await expect(getNotebookIndicatorSeries(indicator().id, "7d" as "all")).rejects.toThrow();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("fails closed when page metadata or indicator identity drifts", async () => {
    const wrongSecondPage = datapointPage([datapoint("two", "2", "2026-08-02T00:00:00Z")], 2, 2, 2);
    wrongSecondPage.pagination.page = 3;
    mockApiGet
      .mockResolvedValueOnce(indicator())
      .mockResolvedValueOnce(
        datapointPage([datapoint("one", "1", "2026-08-01T00:00:00Z")], 1, 2, 2)
      )
      .mockResolvedValueOnce(wrongSecondPage);

    await expect(getNotebookIndicatorSeries(indicator().id)).rejects.toThrow("inconsistent page");

    vi.clearAllMocks();
    mockApiGet
      .mockResolvedValueOnce(indicator("22222222-2222-4222-8222-222222222222"))
      .mockResolvedValueOnce(datapointPage([]));

    await expect(getNotebookIndicatorSeries(indicator().id)).rejects.toThrow("requested");

    vi.clearAllMocks();
    mockApiGet.mockResolvedValueOnce(indicator()).mockResolvedValueOnce(datapointPage([], 1, 1, 1));

    await expect(getNotebookIndicatorSeries(indicator().id)).rejects.toThrow("expected 1");
  });
});
