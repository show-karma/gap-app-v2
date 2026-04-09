import {
  buildPayoutConfigItems,
  extractProjectSlug,
  parseImportRecords,
  summarizeSaveResponse,
  toErrorReport,
  validateFieldFormats,
} from "@/components/Pages/Admin/ControlCenter/bulkPayoutImport";
import type { PayoutGrantConfig } from "@/src/features/payout-disbursement";

describe("bulkPayoutImport utilities", () => {
  it("extracts slug from project URL", () => {
    expect(extractProjectSlug("https://karmahq.xyz/project/My-Slug?foo=bar")).toBe("my-slug");
  });

  it("parses rows with flexible headers", () => {
    const parsed = parseImportRecords([
      ["Grant UID", "Wallet Address", "Amount"],
      ["grant-alpha", "0x1111111111111111111111111111111111111111", "123.45"],
    ]);

    expect(parsed.fatalErrors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      grantUID: "grant-alpha",
      payoutAddress: "0x1111111111111111111111111111111111111111",
      amount: "123.45",
    });
  });

  it("does not confuse projectUID column with projectName alias", () => {
    const parsed = parseImportRecords([
      ["projectUID", "payoutAddress", "amount"],
      ["project-alpha", "0x1111111111111111111111111111111111111111", "50"],
    ]);

    expect(parsed.fatalErrors).toEqual([]);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0]).toMatchObject({
      projectUID: "project-alpha",
      projectName: "",
    });
  });

  describe("validateFieldFormats", () => {
    it("marks valid row with correct format", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "500",
        },
      ]);
      expect(validated[0].status).toBe("valid");
      expect(validated[0].errors).toEqual([]);
      expect(validated[0].target).toBeNull();
    });

    it("flags invalid address and amount", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "invalid-address",
          amount: "-100",
        },
      ]);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toEqual(
        expect.arrayContaining(["Invalid payout address", "Amount must be greater than 0"])
      );
    });

    it("flags missing payout address", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "",
          amount: "100",
        },
      ]);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Missing payout address");
    });

    it("flags missing amount", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "",
        },
      ]);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Missing amount");
    });

    it("flags amount with too many decimal places", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "1.1234567890123456789",
        },
      ]);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Amount must use up to 18 decimal places");
    });

    it("accepts valid amount with 18 decimal places", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "1.123456789012345678",
        },
      ]);
      expect(validated[0].status).toBe("valid");
    });

    it("flags zero amount", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "0",
        },
      ]);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Amount must be greater than 0");
    });
  });

  it("builds save payload from valid rows only", () => {
    const configs = buildPayoutConfigItems([
      {
        rowNumber: 2,
        grantUID: "grant-alpha",
        projectUID: "project-alpha",
        projectSlug: "",
        projectName: "",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        amount: "250",
        status: "valid",
        errors: [],
        target: {
          grantUID: "grant-alpha",
          projectUID: "project-alpha",
          matchedBy: "direct_uid_pair",
        },
      },
      {
        rowNumber: 3,
        grantUID: "",
        projectUID: "",
        projectSlug: "",
        projectName: "Unknown Project",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        amount: "300",
        status: "invalid",
        errors: ["Project name not found"],
        target: null,
      },
    ]);

    expect(configs).toEqual([
      {
        grantUID: "grant-alpha",
        projectUID: "project-alpha",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        totalGrantAmount: "250",
      },
    ]);
  });

  describe("parseImportRecords fatal errors", () => {
    it("returns fatal error for empty CSV", () => {
      const parsed = parseImportRecords([]);
      expect(parsed.rows).toHaveLength(0);
      expect(parsed.fatalErrors).toContain(
        "CSV appears empty. Include a header row and at least one data row."
      );
    });

    it("returns fatal error for header-only CSV", () => {
      const parsed = parseImportRecords([["projectName", "payoutAddress", "amount"]]);
      expect(parsed.rows).toHaveLength(0);
      expect(parsed.fatalErrors).toContain(
        "CSV appears empty. Include a header row and at least one data row."
      );
    });

    it("returns fatal error when payoutAddress column is missing", () => {
      const parsed = parseImportRecords([
        ["projectName", "amount"],
        ["Alpha Project", "100"],
      ]);
      expect(parsed.rows).toHaveLength(0);
      expect(parsed.fatalErrors).toContain("Missing payout address column");
    });

    it("returns fatal error when amount column is missing", () => {
      const parsed = parseImportRecords([
        ["projectName", "payoutAddress"],
        ["Alpha Project", "0x1111111111111111111111111111111111111111"],
      ]);
      expect(parsed.rows).toHaveLength(0);
      expect(parsed.fatalErrors).toContain("Missing amount column");
    });

    it("returns fatal error when all identifier columns are missing", () => {
      const parsed = parseImportRecords([
        ["payoutAddress", "amount"],
        ["0x1111111111111111111111111111111111111111", "100"],
      ]);
      expect(parsed.rows).toHaveLength(0);
      expect(parsed.fatalErrors).toContain(
        "Missing identifier column. Add one of: grantUID, projectUID, projectSlug/projectURL, projectName."
      );
    });

    it("skips blank data rows", () => {
      const parsed = parseImportRecords([
        ["projectName", "payoutAddress", "amount"],
        ["Alpha Project", "0x1111111111111111111111111111111111111111", "100"],
        ["", "", ""],
        ["Beta Project", "0x2222222222222222222222222222222222222222", "200"],
      ]);
      expect(parsed.fatalErrors).toEqual([]);
      expect(parsed.rows).toHaveLength(2);
    });

    it("returns fatal error when all data rows are blank", () => {
      const parsed = parseImportRecords([
        ["projectName", "payoutAddress", "amount"],
        ["", "", ""],
        ["", "", ""],
      ]);
      expect(parsed.fatalErrors).toContain(
        "No data rows found. Add at least one row below the header."
      );
    });
  });

  describe("extractProjectSlug edge cases", () => {
    it("returns empty string for empty input", () => {
      expect(extractProjectSlug("")).toBe("");
    });

    it("extracts slug from URL with /projects/ path", () => {
      expect(extractProjectSlug("https://example.com/projects/my-project")).toBe("my-project");
    });

    it("treats plain text as slug directly", () => {
      expect(extractProjectSlug("my-project")).toBe("my-project");
    });

    it("strips leading/trailing slashes from plain slug", () => {
      expect(extractProjectSlug("/my-project/")).toBe("my-project");
    });

    it("handles malformed percent-encoding without crashing", () => {
      expect(extractProjectSlug("/project/%E0%A4%A")).toBe("%e0%a4%a");
    });
  });

  describe("toErrorReport", () => {
    it("reports fatal errors", () => {
      const report = toErrorReport([], ["Missing payout address column"]);
      expect(report).toContain("Fatal errors:");
      expect(report).toContain("- Missing payout address column");
    });

    it("reports row-level errors", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "",
          projectUID: "",
          projectSlug: "",
          projectName: "SomeProject",
          payoutAddress: "bad",
          amount: "-1",
        },
      ]);
      const report = toErrorReport(validated, []);
      expect(report).toContain("Row errors:");
      expect(report).toContain("Row 2:");
    });

    it("reports no errors when all rows valid", () => {
      const validated = validateFieldFormats([
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "project-alpha",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100",
        },
      ]);
      const report = toErrorReport(validated, []);
      expect(report).toBe("No errors.");
    });
  });

  describe("summarizeSaveResponse", () => {
    const makeGrantConfig = (grantUID: string): PayoutGrantConfig => ({
      id: "id-1",
      grantUID,
      projectUID: "p1",
      communityUID: "c1",
      payoutAddress: null,
      totalGrantAmount: null,
      tokenAddress: null,
      chainID: null,
      milestoneAllocations: null,
      createdBy: "test",
      updatedBy: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    it("counts successes and failures", () => {
      const result = summarizeSaveResponse({
        success: [makeGrantConfig("g1")],
        failed: [
          { grantUID: "g2", error: "fail" },
          { grantUID: "g3", error: "fail" },
        ],
      });
      expect(result).toEqual({ successCount: 1, failedCount: 2 });
    });

    it("handles all-success response", () => {
      const result = summarizeSaveResponse({
        success: [makeGrantConfig("g1")],
        failed: [],
      });
      expect(result).toEqual({ successCount: 1, failedCount: 0 });
    });
  });
});
