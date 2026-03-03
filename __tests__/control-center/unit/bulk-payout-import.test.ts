import {
  buildPayoutConfigItems,
  extractProjectSlug,
  parseImportRecords,
  validateAndMatchImportRows,
} from "@/components/Pages/Admin/ControlCenter/bulkPayoutImport";
import type { TableRow } from "@/components/Pages/Admin/ControlCenter/ControlCenterTable";

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
});
