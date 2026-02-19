// Mock overlay data for columns that don't have backend APIs yet (Agreement, Invoices, Milestones).
// Real payout data comes from the payout-disbursement feature hooks.

// ─── Types ───────────────────────────────────────────────────────────────────

export type AgreementStatus = "signed" | "not_signed";

export type InvoiceStatus = "not_submitted" | "submitted" | "received" | "paid";

export type MilestoneStatus = "submitted" | "in_review" | "needs_revision" | "verified";

export interface ControlCenterMilestone {
  uid: string;
  title: string;
  approvedAmount: number;
  invoiceStatus: InvoiceStatus;
  invoiceSentDate: string | null;
  invoiceReceived: boolean;
  milestoneStatus: MilestoneStatus;
  paymentInitiatedDate: string | null;
  paymentDisbursedDate: string | null;
  txnHash: string | null;
}

export interface MockOverlay {
  agreementStatus: AgreementStatus;
  agreementSignedDate: string | null;
  milestones: ControlCenterMilestone[];
}

// ─── Deterministic hash for consistent mock generation ───────────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Seeded pseudo-random based on hash
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
}

// ─── Derived helpers ─────────────────────────────────────────────────────────

export function getInvoiceSummary(milestones: ControlCenterMilestone[]) {
  const received = milestones.filter(
    (m) => m.invoiceStatus === "received" || m.invoiceStatus === "paid"
  ).length;
  return { received, total: milestones.length };
}

export function getMilestoneSummary(milestones: ControlCenterMilestone[]) {
  const verified = milestones.filter((m) => m.milestoneStatus === "verified").length;
  const inReview = milestones.filter((m) => m.milestoneStatus === "in_review").length;
  const needsRevision = milestones.filter((m) => m.milestoneStatus === "needs_revision").length;
  const submitted = milestones.filter((m) => m.milestoneStatus === "submitted").length;
  return { verified, inReview, needsRevision, submitted, total: milestones.length };
}

// ─── Mock overlay generator ──────────────────────────────────────────────────

const MILESTONE_TITLES = [
  "Research & Architecture",
  "Core Development",
  "Frontend MVP",
  "Testing & QA",
  "Documentation",
  "Beta Launch",
  "User Feedback Integration",
  "Production Deploy",
];

const INVOICE_STATUSES: InvoiceStatus[] = ["not_submitted", "submitted", "received", "paid"];
const MILESTONE_STATUSES: MilestoneStatus[] = [
  "submitted",
  "in_review",
  "needs_revision",
  "verified",
];

// ─── In-memory edit store (session persistence) ─────────────────────────────

interface MockMilestoneEdit {
  invoiceSentDate?: string | null;
  invoiceReceived?: boolean;
}

interface MockOverlayEdit {
  agreementStatus?: AgreementStatus;
  milestoneEdits?: Record<string, MockMilestoneEdit>;
}

const mockEditStore: Record<string, MockOverlayEdit> = {};

export function setMockAgreementStatus(projectUid: string, signed: boolean): void {
  if (!mockEditStore[projectUid]) {
    mockEditStore[projectUid] = {};
  }
  mockEditStore[projectUid].agreementStatus = signed ? "signed" : "not_signed";
}

export function setMockMilestoneInvoice(
  projectUid: string,
  milestoneUid: string,
  updates: { invoiceSentDate?: string | null; invoiceReceived?: boolean }
): void {
  if (!mockEditStore[projectUid]) {
    mockEditStore[projectUid] = {};
  }
  if (!mockEditStore[projectUid].milestoneEdits) {
    mockEditStore[projectUid].milestoneEdits = {};
  }
  const existing = mockEditStore[projectUid].milestoneEdits![milestoneUid] || {};
  mockEditStore[projectUid].milestoneEdits![milestoneUid] = { ...existing, ...updates };
}

// ─── Mock overlay generator ──────────────────────────────────────────────────

export function getMockOverlay(projectUid: string): MockOverlay {
  const hash = simpleHash(projectUid);

  // Agreement: ~60% signed
  const isSigned = hash % 10 < 6;
  const agreementStatus: AgreementStatus = isSigned ? "signed" : "not_signed";
  const agreementSignedDate = isSigned
    ? `2025-${String((hash % 12) + 1).padStart(2, "0")}-${String((hash % 28) + 1).padStart(2, "0")}`
    : null;

  // Generate 2-5 milestones
  const milestoneCount = 2 + (hash % 4);
  const milestones: ControlCenterMilestone[] = [];

  for (let i = 0; i < milestoneCount; i++) {
    const r = seededRandom(hash, i);
    const titleIndex = (hash + i) % MILESTONE_TITLES.length;

    // Earlier milestones more likely to be further along
    const progressBias = i / milestoneCount;
    const invoiceIdx = Math.min(
      INVOICE_STATUSES.length - 1,
      Math.floor((1 - progressBias) * r * INVOICE_STATUSES.length)
    );
    const milestoneIdx = Math.min(
      MILESTONE_STATUSES.length - 1,
      Math.floor((1 - progressBias) * r * MILESTONE_STATUSES.length)
    );

    const invoiceStatus = INVOICE_STATUSES[invoiceIdx];
    const milestoneStatus = MILESTONE_STATUSES[milestoneIdx];
    const isPaid = invoiceStatus === "paid" || invoiceStatus === "received";
    const isVerified = milestoneStatus === "verified";

    milestones.push({
      uid: `mock-ms-${projectUid}-${i}`,
      title: MILESTONE_TITLES[titleIndex],
      approvedAmount: 5000 + Math.floor(seededRandom(hash, i + 100) * 20000),
      invoiceStatus,
      invoiceSentDate:
        invoiceStatus !== "not_submitted"
          ? `2025-${String(((hash + i) % 12) + 1).padStart(2, "0")}-${String(((hash + i * 3) % 28) + 1).padStart(2, "0")}`
          : null,
      invoiceReceived: isPaid,
      milestoneStatus,
      paymentInitiatedDate: isVerified
        ? `2025-${String(((hash + i + 1) % 12) + 1).padStart(2, "0")}-${String(((hash + i * 5) % 28) + 1).padStart(2, "0")}`
        : null,
      paymentDisbursedDate: isVerified
        ? `2025-${String(((hash + i + 2) % 12) + 1).padStart(2, "0")}-${String(((hash + i * 7) % 28) + 1).padStart(2, "0")}`
        : null,
      txnHash: isVerified
        ? `0x${hash.toString(16).padStart(8, "0")}${i.toString(16).padStart(8, "0")}${"ab".repeat(24)}`
        : null,
    });
  }

  // Merge edits from in-memory store
  const edits = mockEditStore[projectUid];
  const finalAgreementStatus = edits?.agreementStatus ?? agreementStatus;
  const finalAgreementSignedDate =
    edits?.agreementStatus === "signed" && agreementStatus !== "signed"
      ? new Date().toISOString().slice(0, 10)
      : edits?.agreementStatus === "not_signed"
        ? null
        : agreementSignedDate;

  const finalMilestones = milestones.map((m) => {
    const mEdit = edits?.milestoneEdits?.[m.uid];
    if (!mEdit) return m;

    const updatedInvoiceSentDate =
      mEdit.invoiceSentDate !== undefined ? mEdit.invoiceSentDate : m.invoiceSentDate;
    const updatedInvoiceReceived =
      mEdit.invoiceReceived !== undefined ? mEdit.invoiceReceived : m.invoiceReceived;

    // Auto-transition invoice status
    let updatedInvoiceStatus = m.invoiceStatus;
    if (updatedInvoiceReceived && m.invoiceStatus !== "paid") {
      updatedInvoiceStatus = "received";
    } else if (updatedInvoiceSentDate && m.invoiceStatus === "not_submitted") {
      updatedInvoiceStatus = "submitted";
    }

    return {
      ...m,
      invoiceSentDate: updatedInvoiceSentDate,
      invoiceReceived: updatedInvoiceReceived,
      invoiceStatus: updatedInvoiceStatus,
    };
  });

  return {
    agreementStatus: finalAgreementStatus,
    agreementSignedDate: finalAgreementSignedDate,
    milestones: finalMilestones,
  };
}

export function generateMockMilestones(projectUid: string): ControlCenterMilestone[] {
  return getMockOverlay(projectUid).milestones;
}
