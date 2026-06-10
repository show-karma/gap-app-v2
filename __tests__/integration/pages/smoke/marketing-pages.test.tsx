import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

/**
 * Smoke tests for top-level marketing pages (landing pages composed of
 * feature-section components). Each section component is mocked with a
 * sentinel; we assert the page renders all expected sections.
 */

// /foundations sections (hero + cta remain in foundations feature folder;
// body sections are shared with the home variants)
vi.mock("@/src/features/foundations/components/cta-section", () => ({
  CTASection: () => <div data-testid="foundations-cta" />,
}));
vi.mock("@/src/features/foundations/components/hero", () => ({
  Hero: () => <div data-testid="foundations-hero" />,
}));
vi.mock("@/components/Seo/FAQJsonLd", () => ({
  FAQJsonLd: () => <div data-testid="foundations-faq-jsonld" />,
}));
vi.mock("@/src/features/home/components/case-studies-section", () => ({
  CaseStudiesSection: () => <div data-testid="home-case-studies" />,
}));
vi.mock("@/src/features/home/components/faq-section", () => ({
  FAQSection: () => <div data-testid="home-faq" />,
}));
vi.mock("@/src/features/home/components/how-it-works-section", () => ({
  HowItWorksSection: () => <div data-testid="home-how-it-works" />,
}));
vi.mock("@/src/features/home/components/numbers-section", () => ({
  NumbersSection: () => <div data-testid="home-numbers" />,
}));
vi.mock("@/src/features/home/components/objections-section", () => ({
  ObjectionsSection: () => <div data-testid="home-objections" />,
}));
vi.mock("@/src/features/home/components/pain-points", () => ({
  PainPoints: () => <div data-testid="home-pain-points" />,
}));
vi.mock("@/src/features/home/components/platform-section", () => ({
  PlatformSection: () => <div data-testid="home-platform" />,
}));
vi.mock("@/src/features/home/components/solution-bridge", () => ({
  SolutionBridge: () => <div data-testid="home-solution-bridge" />,
}));
vi.mock("@/src/features/home/components/audience-switcher", () => ({
  AudienceSwitcher: () => <div data-testid="home-audience-switcher" />,
}));
vi.mock("@/src/features/home/components/hero", () => ({
  Hero: () => <div data-testid="home-hero" />,
}));
vi.mock("@/src/features/home/components/cta-section", () => ({
  CTASection: () => <div data-testid="home-cta" />,
}));

// /nonprofits sections
vi.mock("@/src/features/nonprofits/components/hero", () => ({
  Hero: () => <div data-testid="nonprofits-hero" />,
}));
vi.mock("@/src/features/nonprofits/components/profile-preview", () => ({
  ProfilePreview: () => <div data-testid="nonprofits-profile-preview" />,
}));
vi.mock("@/src/features/nonprofits/components/features-section", () => ({
  FeaturesSection: () => <div data-testid="nonprofits-features" />,
}));
vi.mock("@/src/features/nonprofits/components/free-tools-section", () => ({
  FreeToolsSection: () => <div data-testid="nonprofits-free-tools" />,
}));
vi.mock("@/src/features/nonprofits/components/cta-section", () => ({
  CTASection: () => <div data-testid="nonprofits-cta" />,
}));

// /donor-advisors sections
vi.mock("@/src/features/donor-advisors/components/hero", () => ({
  Hero: () => <div data-testid="donor-advisors-hero" />,
}));
vi.mock("@/src/features/donor-advisors/components/features-section", () => ({
  FeaturesSection: () => <div data-testid="donor-advisors-features" />,
}));
vi.mock("@/src/features/donor-advisors/components/cta-section", () => ({
  CTASection: () => <div data-testid="donor-advisors-cta" />,
}));

// /funders sections
vi.mock("@/src/features/funders/components/case-studies-section", () => ({
  CaseStudiesSection: () => <div data-testid="funders-case-studies" />,
}));
vi.mock("@/src/features/funders/components/faq-section", () => ({
  FAQSection: () => <div data-testid="funders-faq" />,
}));
vi.mock("@/src/features/funders/components/handle-the-vision-section", () => ({
  HandleTheVisionSection: () => <div data-testid="funders-handle-vision" />,
}));
vi.mock("@/src/features/funders/components/hero", () => ({
  Hero: () => <div data-testid="funders-hero" />,
}));
vi.mock("@/src/features/funders/components/how-it-works-section", () => ({
  HowItWorksSection: () => <div data-testid="funders-how-it-works" />,
}));
vi.mock("@/src/features/funders/components/numbers-section", () => ({
  NumbersSection: () => <div data-testid="funders-numbers" />,
}));
vi.mock("@/src/features/funders/components/offering-section", () => ({
  OfferingSection: () => <div data-testid="funders-offering" />,
}));
vi.mock("@/src/features/funders/components/platform-section", () => ({
  PlatformSection: () => <div data-testid="funders-platform" />,
}));

// /for-projects sections
vi.mock("@/src/features/homepage/components/faq", () => ({
  FAQ: () => <div data-testid="homepage-faq" />,
}));
vi.mock("@/src/features/homepage/components/hero", () => ({
  Hero: () => <div data-testid="homepage-hero" />,
}));
vi.mock("@/src/features/homepage/components/how-it-works", () => ({
  HowItWorks: () => <div data-testid="homepage-how-it-works" />,
}));
vi.mock("@/src/features/homepage/components/join-community", () => ({
  JoinCommunity: () => <div data-testid="homepage-join-community" />,
}));
vi.mock("@/src/features/homepage/components/live-funding-opportunities", () => ({
  LiveFundingOpportunities: () => <div data-testid="homepage-live-funding" />,
}));
vi.mock("@/src/features/homepage/components/live-funding-opportunities-skeleton", () => ({
  LiveFundingOpportunitiesSkeleton: () => <div data-testid="homepage-live-funding-skeleton" />,
}));
vi.mock("@/src/features/homepage/components/platform-features", () => ({
  PlatformFeatures: () => <div data-testid="homepage-platform-features" />,
}));
vi.mock("@/src/features/homepage/components/where-builders-grow", () => ({
  WhereBuildersGrow: () => <div data-testid="homepage-where-builders-grow" />,
}));

// /seeds sections
vi.mock("@/src/features/seeds/components/launch/launch-cta", () => ({
  LaunchCTA: () => <div data-testid="seeds-launch-cta" />,
}));
vi.mock("@/src/features/seeds/components/launch/launch-faq", () => ({
  LaunchFAQ: () => <div data-testid="seeds-launch-faq" />,
}));
vi.mock("@/src/features/seeds/components/launch/launch-hero", () => ({
  LaunchHero: () => <div data-testid="seeds-launch-hero" />,
}));
vi.mock("@/src/features/seeds/components/launch/launch-how-to", () => ({
  LaunchHowTo: () => <div data-testid="seeds-launch-how-to" />,
}));
vi.mock("@/src/features/seeds/components/launch/launch-problem", () => ({
  LaunchProblem: () => <div data-testid="seeds-launch-problem" />,
}));
vi.mock("@/src/features/seeds/components/launch/launch-use-cases", () => ({
  LaunchUseCases: () => <div data-testid="seeds-launch-use-cases" />,
}));

// /seeds/fund sections
vi.mock("@/src/features/seeds/components/benefits-section", () => ({
  SeedsBenefits: () => <div data-testid="seeds-benefits" />,
}));
vi.mock("@/src/features/seeds/components/cta-section", () => ({
  SeedsCTA: () => <div data-testid="seeds-cta" />,
}));
vi.mock("@/src/features/seeds/components/faq-section", () => ({
  SeedsFAQ: () => <div data-testid="seeds-faq" />,
}));
vi.mock("@/src/features/seeds/components/hero", () => ({
  SeedsHero: () => <div data-testid="seeds-hero" />,
}));
vi.mock("@/src/features/seeds/components/how-it-works", () => ({
  SeedsHowItWorks: () => <div data-testid="seeds-how-it-works" />,
}));
vi.mock("@/src/features/seeds/components/projects-section", () => ({
  SeedsProjectsSection: () => <div data-testid="seeds-projects" />,
}));

// /projects sections
vi.mock("@/components/Pages/Projects", () => ({
  ProjectsExplorer: () => <div data-testid="projects-explorer" />,
  ProjectsHeroSection: () => <div data-testid="projects-hero" />,
  ProjectsLoading: () => <div data-testid="projects-loading" />,
  ProjectsStatsSection: () => <div data-testid="projects-stats" />,
}));

const renderPage = async (importer: () => Promise<{ default: React.ComponentType }>) => {
  const { default: Page } = await importer();
  return render(<Page />);
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("/foundations marketing page", () => {
  it("renders all foundation sections", async () => {
    await renderPage(() => import("@/app/foundations/page"));
    [
      "foundations-hero",
      "home-pain-points",
      "home-solution-bridge",
      "home-numbers",
      "home-platform",
      "home-case-studies",
      "home-how-it-works",
      "home-objections",
      "home-faq",
      "foundations-cta",
    ].forEach((id) => {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    });
  });
});

describe("/ marketing page (audience-neutral)", () => {
  it("renders hero, audience switcher, cta", async () => {
    await renderPage(() => import("@/app/page"));
    expect(screen.getByTestId("home-hero")).toBeInTheDocument();
    expect(screen.getByTestId("home-audience-switcher")).toBeInTheDocument();
    expect(screen.getByTestId("home-cta")).toBeInTheDocument();
  });
});

describe("/nonprofits marketing page", () => {
  it("renders hero, profile preview, features, free tools, cta", async () => {
    await renderPage(() => import("@/app/nonprofits/page"));
    [
      "nonprofits-hero",
      "nonprofits-profile-preview",
      "nonprofits-features",
      "nonprofits-free-tools",
      "nonprofits-cta",
    ].forEach((id) => {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    });
  });
});

describe("/donor-advisors marketing page", () => {
  it("renders hero, features, cta", async () => {
    await renderPage(() => import("@/app/donor-advisors/page"));
    ["donor-advisors-hero", "donor-advisors-features", "donor-advisors-cta"].forEach((id) => {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    });
  });
});

describe("/funders marketing page", () => {
  it("renders all funder sections", async () => {
    await renderPage(() => import("@/app/funders/page"));
    [
      "funders-hero",
      "funders-numbers",
      "funders-platform",
      "funders-handle-vision",
      "funders-case-studies",
      "funders-how-it-works",
      "funders-offering",
      "funders-faq",
    ].forEach((id) => {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    });
  });
});

describe("/for-projects marketing page", () => {
  it("renders core homepage feature sections", async () => {
    await renderPage(() => import("@/app/for-projects/page"));
    expect(screen.getByTestId("homepage-hero")).toBeInTheDocument();
    expect(screen.getByTestId("homepage-platform-features")).toBeInTheDocument();
    expect(screen.getByTestId("homepage-faq")).toBeInTheDocument();
  });
});

describe("/seeds marketing pages", () => {
  it("/seeds renders all launch sections", async () => {
    await renderPage(() => import("@/app/seeds/page"));
    [
      "seeds-launch-hero",
      "seeds-launch-problem",
      "seeds-launch-how-to",
      "seeds-launch-use-cases",
      "seeds-launch-faq",
      "seeds-launch-cta",
    ].forEach((id) => {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    });
  });

  it("/seeds/fund renders all fund sections", async () => {
    await renderPage(() => import("@/app/seeds/fund/page"));
    [
      "seeds-hero",
      "seeds-how-it-works",
      "seeds-benefits",
      "seeds-projects",
      "seeds-faq",
      "seeds-cta",
    ].forEach((id) => {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    });
  });
});

describe("/projects explorer page", () => {
  it("renders hero, explorer, stats", async () => {
    await renderPage(() => import("@/app/projects/page"));
    expect(screen.getByTestId("projects-hero")).toBeInTheDocument();
    expect(screen.getByTestId("projects-explorer")).toBeInTheDocument();
    expect(screen.getByTestId("projects-stats")).toBeInTheDocument();
  });
});
