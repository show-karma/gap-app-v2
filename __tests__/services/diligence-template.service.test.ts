import { beforeEach, describe, expect, it, vi } from "vitest";

const mockApiGet = vi.fn();
const mockApiPut = vi.fn();

vi.mock("@/utilities/api/client", () => ({
  api: {
    get: (...args: unknown[]) => mockApiGet(...args),
    post: vi.fn(),
    put: (...args: unknown[]) => mockApiPut(...args),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    getPaginated: vi.fn(),
  },
}));

import { getDiligenceTemplate, saveDiligenceTemplate } from "@/services/diligence.service";

/**
 * Wire contract for the diligence template. The in-report dialog must read and
 * write the REPORT-scoped endpoint (which the backend resolves to the report's
 * owner, so a super-admin acts on the owner's questions), while the standalone
 * template editor keeps the caller-scoped `/me` endpoint.
 */
describe("diligence template service endpoints", () => {
  const template = { questions: [{ id: "q-1", text: "Budget?" }], updatedAt: null };

  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPut.mockReset();
    mockApiGet.mockResolvedValue(template);
    mockApiPut.mockResolvedValue(template);
  });

  it("reads the caller's own template when no report is given", async () => {
    await getDiligenceTemplate();

    expect(mockApiGet.mock.calls[0][0]).toBe("/v2/donor-research/me/diligence-template");
  });

  it("reads the report owner's template when a report is given", async () => {
    await getDiligenceTemplate("report-1");

    expect(mockApiGet.mock.calls[0][0]).toBe(
      "/v2/donor-research/reports/report-1/diligence-template"
    );
  });

  it("writes the caller's own template when no report is given", async () => {
    await saveDiligenceTemplate({ questions: [{ id: "q-1", text: "Budget?" }] });

    expect(mockApiPut.mock.calls[0][0]).toBe("/v2/donor-research/me/diligence-template");
  });

  it("writes the report owner's template when a report is given", async () => {
    await saveDiligenceTemplate({ questions: [{ id: "q-1", text: "Budget?" }] }, "report-1");

    const [url, body] = mockApiPut.mock.calls[0];
    expect(url).toBe("/v2/donor-research/reports/report-1/diligence-template");
    expect(body).toEqual({ questions: [{ id: "q-1", text: "Budget?" }] });
  });
});
