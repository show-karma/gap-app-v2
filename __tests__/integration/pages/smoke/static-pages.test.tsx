import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

/**
 * Smoke tests for static pages — those that render only static markup
 * (legal text, knowledge-base articles, marketing copy). No data fetching,
 * no client-only hooks. Each test asserts the page module loads and renders
 * its top-level heading without throwing.
 */

const renderPage = async (importer: () => Promise<{ default: React.ComponentType }>) => {
  const mod = await importer();
  const Page = mod.default;
  return render(<Page />);
};

describe("Static legal pages", () => {
  it("Terms and Conditions renders", async () => {
    await renderPage(() => import("@/app/terms-and-conditions/page"));
    expect(
      screen.getByRole("heading", { name: /terms and conditions/i, level: 1 })
    ).toBeInTheDocument();
  });

  it("Privacy Policy renders", async () => {
    await renderPage(() => import("@/app/privacy-policy/page"));
    expect(screen.getByRole("heading", { name: /privacy policy/i, level: 1 })).toBeInTheDocument();
  });

  it("Create Project Profile renders", async () => {
    await renderPage(() => import("@/app/create-project-profile/page"));
    expect(
      screen.getByRole("heading", { name: /create your project profile/i, level: 1 })
    ).toBeInTheDocument();
  });
});

describe("Knowledge base pages", () => {
  const knowledgePages: Array<[string, () => Promise<{ default: React.ComponentType }>, RegExp]> = [
    ["index", () => import("@/app/knowledge/page"), /grant funding knowledge base/i],
    [
      "ai-grant-evaluation",
      () => import("@/app/knowledge/ai-grant-evaluation/page"),
      /AI[- ]Assisted Grant Evaluation/i,
    ],
    ["dao-grant-milestones", () => import("@/app/knowledge/dao-grant-milestones/page"), /DAO/i],
    [
      "funding-distribution-mechanisms",
      () => import("@/app/knowledge/funding-distribution-mechanisms/page"),
      /distribution mechanisms/i,
    ],
    [
      "grant-accountability",
      () => import("@/app/knowledge/grant-accountability/page"),
      /grant accountability/i,
    ],
    [
      "grant-document-signing",
      () => import("@/app/knowledge/grant-document-signing/page"),
      /document signing/i,
    ],
    [
      "grant-fund-disbursement",
      () => import("@/app/knowledge/grant-fund-disbursement/page"),
      /disbursement/i,
    ],
    ["grant-kyc", () => import("@/app/knowledge/grant-kyc/page"), /kyc/i],
    ["grant-lifecycle", () => import("@/app/knowledge/grant-lifecycle/page"), /grant lifecycle/i],
    [
      "how-funders-use-project-profiles",
      () => import("@/app/knowledge/how-funders-use-project-profiles/page"),
      /how funders/i,
    ],
    [
      "impact-measurement",
      () => import("@/app/knowledge/impact-measurement/page"),
      /impact measurement/i,
    ],
    ["impact-verification", () => import("@/app/knowledge/impact-verification/page"), /impact/i],
    [
      "manual-vs-platform-grant-tracking",
      () => import("@/app/knowledge/manual-vs-platform-grant-tracking/page"),
      /manual vs platform/i,
    ],
    [
      "milestones-vs-impact",
      () => import("@/app/knowledge/milestones-vs-impact/page"),
      /milestones vs impact/i,
    ],
    [
      "onchain-project-profiles",
      () => import("@/app/knowledge/onchain-project-profiles/page"),
      /onchain project profiles/i,
    ],
    [
      "onchain-reputation",
      () => import("@/app/knowledge/onchain-reputation/page"),
      /onchain reputation/i,
    ],
    [
      "project-profiles-as-resumes",
      () => import("@/app/knowledge/project-profiles-as-resumes/page"),
      /project profiles/i,
    ],
    [
      "project-profiles-software-vs-nonsoftware",
      () => import("@/app/knowledge/project-profiles-software-vs-nonsoftware/page"),
      /software/i,
    ],
    [
      "project-profiles",
      () => import("@/app/knowledge/project-profiles/page"),
      /project profiles/i,
    ],
    ["project-registry", () => import("@/app/knowledge/project-registry/page"), /project registr/i],
    ["project-reputation", () => import("@/app/knowledge/project-reputation/page"), /reputation/i],
    [
      "project-updates-and-reputation",
      () => import("@/app/knowledge/project-updates-and-reputation/page"),
      /reputation/i,
    ],
    [
      "reputation-compounding",
      () => import("@/app/knowledge/reputation-compounding/page"),
      /reputation/i,
    ],
    [
      "whitelabel-funding-platforms",
      () => import("@/app/knowledge/whitelabel-funding-platforms/page"),
      /whitelabel/i,
    ],
    [
      "why-grant-programs-fail",
      () => import("@/app/knowledge/why-grant-programs-fail/page"),
      /grant programs fail/i,
    ],
    [
      "why-grantees-need-project-profiles",
      () => import("@/app/knowledge/why-grantees-need-project-profiles/page"),
      /grantees/i,
    ],
  ];

  it.each(knowledgePages)("/%s renders heading", async (_slug, importer, headingPattern) => {
    await renderPage(importer);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings.length).toBeGreaterThan(0);
    expect(headings.some((h) => headingPattern.test(h.textContent || ""))).toBe(true);
  });
});
