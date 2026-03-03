import {
  buildPayoutConfigItems,
  extractProjectSlug,
  parseImportRecords,
  summarizeSaveResponse,
  toErrorReport,
  validateAndMatchImportRows,
} from "@/components/Pages/Admin/ControlCenter/bulkPayoutImport";
import type { TableRow } from "@/components/Pages/Admin/ControlCenter/ControlCenterTable";
import type { PayoutGrantConfig } from "@/src/features/payout-disbursement";

const tableRows: TableRow[] = [
  {
    grantUid: "grant-alpha",
    projectUid: "project-alpha",
    projectName: "Alpha Project",
    projectSlug: "alpha-project",
    grantName: "Alpha Grant",
    grantProgramId: "program-1",
    grantChainId: 10,
    projectChainId: 10,
    currentPayoutAddress: "0x1111111111111111111111111111111111111111",
    currentAmount: "100",
  },
  {
    grantUid: "grant-beta-1",
    projectUid: "project-beta",
    projectName: "Beta Project",
    projectSlug: "beta-project",
    grantName: "Beta Grant 1",
    grantProgramId: "program-1",
    grantChainId: 10,
    projectChainId: 10,
    currentPayoutAddress: "0x2222222222222222222222222222222222222222",
    currentAmount: "200",
  },
  {
    grantUid: "grant-beta-2",
    projectUid: "project-beta",
    projectName: "Beta Project",
    projectSlug: "beta-project",
    grantName: "Beta Grant 2",
    grantProgramId: "program-1",
    grantChainId: 10,
    projectChainId: 10,
    currentPayoutAddress: "0x3333333333333333333333333333333333333333",
    currentAmount: "300",
  },
];

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

  it("validates direct UID pair when pair exists", () => {
    const rows = [
      {
        rowNumber: 2,
        grantUID: "grant-alpha",
        projectUID: "project-alpha",
        projectSlug: "",
        projectName: "",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        amount: "500",
      },
    ];
    const validated = validateAndMatchImportRows(rows, tableRows);
    expect(validated[0].status).toBe("valid");
    expect(validated[0].target).toMatchObject({
      grantUID: "grant-alpha",
      projectUID: "project-alpha",
      matchedBy: "direct_uid_pair",
    });
  });

  it("accepts direct UID pair when row is not in current page payload", () => {
    const rows = [
      {
        rowNumber: 2,
        grantUID: "grant-off-page",
        projectUID: "project-off-page",
        projectSlug: "",
        projectName: "",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        amount: "500",
      },
    ];
    const validated = validateAndMatchImportRows(rows, tableRows);
    expect(validated[0].status).toBe("valid");
    expect(validated[0].target).toMatchObject({
      grantUID: "grant-off-page",
      projectUID: "project-off-page",
      matchedBy: "direct_uid_pair",
    });
  });

  it("rejects direct UID pair when grant/project mismatch", () => {
    const rows = [
      {
        rowNumber: 2,
        grantUID: "grant-alpha",
        projectUID: "project-beta",
        projectSlug: "",
        projectName: "",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        amount: "500",
      },
    ];

    const validated = validateAndMatchImportRows(rows, tableRows);
    expect(validated[0].status).toBe("invalid");
    expect(validated[0].errors).toContain("Grant UID and project UID do not match");
  });

  it("flags ambiguous project-name-only match", () => {
    const rows = [
      {
        rowNumber: 2,
        grantUID: "",
        projectUID: "",
        projectSlug: "",
        projectName: "Beta Project",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        amount: "100",
      },
    ];
    const validated = validateAndMatchImportRows(rows, tableRows);
    expect(validated[0].status).toBe("invalid");
    expect(validated[0].errors.join(" ")).toContain("Ambiguous match");
  });

  it("flags invalid address and amount", () => {
    const rows = [
      {
        rowNumber: 2,
        grantUID: "grant-alpha",
        projectUID: "",
        projectSlug: "",
        projectName: "",
        payoutAddress: "invalid-address",
        amount: "-100",
      },
    ];
    const validated = validateAndMatchImportRows(rows, tableRows);
    expect(validated[0].status).toBe("invalid");
    expect(validated[0].errors).toEqual(
      expect.arrayContaining(["Invalid payout address", "Amount must be greater than 0"])
    );
  });

  it("flags duplicate mapped grant rows", () => {
    const rows = [
      {
        rowNumber: 2,
        grantUID: "grant-alpha",
        projectUID: "",
        projectSlug: "",
        projectName: "",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        amount: "100",
      },
      {
        rowNumber: 3,
        grantUID: "grant-alpha",
        projectUID: "",
        projectSlug: "",
        projectName: "",
        payoutAddress: "0x1111111111111111111111111111111111111111",
        amount: "200",
      },
    ];
    const validated = validateAndMatchImportRows(rows, tableRows);
    expect(validated[0].status).toBe("valid");
    expect(validated[1].status).toBe("invalid");
    expect(validated[1].errors.join(" ")).toContain("Duplicate mapping");
  });

  it("builds save payload from valid rows only", () => {
    const rows = validateAndMatchImportRows(
      [
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "250",
        },
        {
          rowNumber: 3,
          grantUID: "",
          projectUID: "",
          projectSlug: "",
          projectName: "Unknown Project",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "300",
        },
      ],
      tableRows
    );

    const configs = buildPayoutConfigItems(rows);
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

  describe("validation edge cases", () => {
    it("resolves unique project name to single grant", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "",
          projectUID: "",
          projectSlug: "",
          projectName: "Alpha Project",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100",
        },
      ];
      const validated = validateAndMatchImportRows(rows, tableRows);
      expect(validated[0].status).toBe("valid");
      expect(validated[0].target).toMatchObject({
        grantUID: "grant-alpha",
        projectUID: "project-alpha",
        matchedBy: "project_name",
      });
    });

    it("resolves project by slug", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "",
          projectUID: "",
          projectSlug: "alpha-project",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100",
        },
      ];
      const validated = validateAndMatchImportRows(rows, tableRows);
      expect(validated[0].status).toBe("valid");
      expect(validated[0].target).toMatchObject({
        grantUID: "grant-alpha",
        projectUID: "project-alpha",
        matchedBy: "project_slug",
      });
    });

    it("flags missing payout address", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "",
          amount: "100",
        },
      ];
      const validated = validateAndMatchImportRows(rows, tableRows);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Missing payout address");
    });

    it("flags missing amount", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "",
        },
      ];
      const validated = validateAndMatchImportRows(rows, tableRows);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Missing amount");
    });

    it("flags amount with too many decimal places", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "grant-alpha",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "1.1234567890123456789",
        },
      ];
      const validated = validateAndMatchImportRows(rows, tableRows);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Amount must use up to 18 decimal places");
    });

    it("flags unknown project name", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "",
          projectUID: "",
          projectSlug: "",
          projectName: "NonExistentProject999",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100",
        },
      ];
      const validated = validateAndMatchImportRows(rows, tableRows);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Project name not found");
    });

    it("flags row with no identifiers at all", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "",
          projectUID: "",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100",
        },
      ];
      const validated = validateAndMatchImportRows(rows, tableRows);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain(
        "Provide at least one identifier (grant UID, project UID, slug/url, or name)"
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
      const validated = validateAndMatchImportRows(
        [
          {
            rowNumber: 2,
            grantUID: "",
            projectUID: "",
            projectSlug: "",
            projectName: "NonExistentProject999",
            payoutAddress: "bad",
            amount: "-1",
          },
        ],
        tableRows
      );
      const report = toErrorReport(validated, []);
      expect(report).toContain("Row errors:");
      expect(report).toContain("Row 2:");
    });

    it("reports no errors when all rows valid", () => {
      const validated = validateAndMatchImportRows(
        [
          {
            rowNumber: 2,
            grantUID: "grant-alpha",
            projectUID: "project-alpha",
            projectSlug: "",
            projectName: "",
            payoutAddress: "0x1111111111111111111111111111111111111111",
            amount: "100",
          },
        ],
        tableRows
      );
      const report = toErrorReport(validated, []);
      expect(report).toBe("No errors.");
    });
  });

  describe("pagination-limited matching", () => {
    // The BulkPayoutImportPanel receives only the current page's data (e.g. 25 of 485 rows).
    // Name/slug matching is limited to these loaded rows. Direct UID pairs bypass this.
    const pageOneRows: TableRow[] = [tableRows[0]]; // Only Alpha Project loaded

    it("name match fails for projects not on the current page", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "",
          projectUID: "",
          projectSlug: "",
          projectName: "Beta Project", // exists but not in pageOneRows
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100",
        },
      ];
      const validated = validateAndMatchImportRows(rows, pageOneRows);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Project name not found");
    });

    it("direct UID pair still works for off-page projects", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "grant-beta-1",
          projectUID: "project-beta",
          projectSlug: "",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100",
        },
      ];
      const validated = validateAndMatchImportRows(rows, pageOneRows);
      expect(validated[0].status).toBe("valid");
      expect(validated[0].target).toMatchObject({
        grantUID: "grant-beta-1",
        projectUID: "project-beta",
        matchedBy: "direct_uid_pair",
      });
    });

    it("slug match fails for projects not on the current page", () => {
      const rows = [
        {
          rowNumber: 2,
          grantUID: "",
          projectUID: "",
          projectSlug: "beta-project",
          projectName: "",
          payoutAddress: "0x1111111111111111111111111111111111111111",
          amount: "100",
        },
      ];
      const validated = validateAndMatchImportRows(rows, pageOneRows);
      expect(validated[0].status).toBe("invalid");
      expect(validated[0].errors).toContain("Project slug/url not found");
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
