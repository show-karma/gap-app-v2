import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { FAQPageJsonLd } from "@/components/Seo/FAQPageJsonLd";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Grant Management Solutions - Karma",
  description:
    "Explore Karma's grant management solutions for foundations, nonprofits, DAOs, and universities. AI-powered evaluation, milestone tracking, and impact measurement.",
  path: "/solutions",
});

const solutionCategories = [
  {
    title: "Core Features",
    links: [
      { href: "/solutions/ai-grant-review", label: "AI Grant Review" },
      { href: "/solutions/grant-milestone-tracking", label: "Grant Milestone Tracking" },
      { href: "/solutions/grant-portfolio-dashboard", label: "Grant Portfolio Dashboard" },
      { href: "/solutions/automated-grant-intake", label: "Automated Grant Intake" },
      { href: "/solutions/grant-reporting-analytics", label: "Grant Reporting & Analytics" },
      { href: "/solutions/grant-application-management", label: "Grant Application Management" },
    ],
  },
  {
    title: "By Organization Type",
    links: [
      { href: "/solutions/grant-management-for-nonprofits", label: "For Nonprofits" },
      { href: "/solutions/grant-management-for-daos", label: "For DAOs" },
      { href: "/solutions/grant-management-for-universities", label: "For Universities" },
      { href: "/solutions/grant-management-for-web3", label: "For Web3" },
      { href: "/solutions/grant-management-for-government", label: "For Government" },
      { href: "/solutions/grant-management-for-open-source", label: "For Open Source" },
    ],
  },
  {
    title: "Guides & Resources",
    links: [
      {
        href: "/solutions/how-to-choose-grant-management-software",
        label: "How to Choose Grant Management Software",
      },
      {
        href: "/solutions/grant-management-software-buying-guide",
        label: "Buying Guide",
      },
      { href: "/solutions/grant-management-best-practices", label: "Best Practices" },
      {
        href: "/solutions/switching-from-spreadsheets-to-grant-management",
        label: "Switching from Spreadsheets",
      },
    ],
  },
  {
    title: "Comparisons",
    links: [
      {
        href: "/solutions/grant-management-software-comparison",
        label: "Software Comparison",
      },
      {
        href: "/solutions/grant-management-software-vs-spreadsheets",
        label: "Software vs Spreadsheets",
      },
      { href: "/solutions/alternative-to-submittable", label: "Alternative to Submittable" },
      { href: "/solutions/alternative-to-fluxx", label: "Alternative to Fluxx" },
    ],
  },
];

const faqs = [
  {
    question: "What grant management solutions does Karma offer?",
    answer:
      "Karma offers a full-stack grant management platform including AI-powered application review, milestone tracking, impact measurement, portfolio dashboards, automated grantee reminders, and reporting analytics. All data is stored onchain for transparency and accountability.",
  },
  {
    question: "Who is Karma designed for?",
    answer:
      "Karma serves foundations, nonprofits, DAOs, universities, government agencies, and any organization that manages grant programs. The platform is modular so you can use just the features you need.",
  },
  {
    question: "How is Karma different from traditional grant management software?",
    answer:
      "Karma combines modern AI-powered evaluation with onchain transparency. Unlike traditional tools, Karma stores milestones and outcomes as verifiable onchain attestations, creating a permanent record of impact that builds grantee reputation over time.",
  },
];

export default function SolutionsIndexPage() {
  return (
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Solutions", path: "/solutions" },
        ]}
      />
      <FAQPageJsonLd faqs={faqs} />

      {/* Visible breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        <ol className="flex items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-900 dark:text-gray-100 font-medium">Solutions</li>
        </ol>
      </nav>

      <h1 className="text-4xl font-bold mb-4">Grant Management Solutions</h1>
      <p className="text-xl text-muted-foreground mb-4 max-w-3xl">
        Explore how Karma helps organizations of all sizes run structured, transparent, and
        impactful grant programs.
      </p>

      {/* Trust signal bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 border-l-2 border-primary pl-3 mb-6">
        <span>Trusted by 200+ grant programs</span>
        <span aria-hidden="true" className="hidden sm:inline">
          |
        </span>
        <span>$50M+ in active grants</span>
        <span aria-hidden="true" className="hidden sm:inline">
          |
        </span>
        <span>4.8/5 from program managers</span>
      </div>

      {/* Above-fold CTA */}
      <div className="flex flex-wrap items-center gap-4 mb-12">
        <Link
          href="/foundations"
          className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Start Managing Grants
        </Link>
        <Link
          href="/funding-map"
          className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline"
        >
          Explore grant programs &rarr;
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-10 mb-16">
        {solutionCategories.map((category) => (
          <section key={category.title} className="space-y-4">
            <h2 className="text-2xl font-semibold">{category.title}</h2>
            <ul className="space-y-2">
              {category.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="space-y-6 mb-12">
        <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
        {faqs.map((faq) => (
          <div key={faq.question} className="space-y-2">
            <h3 className="text-lg font-medium">{faq.question}</h3>
            <p className="text-muted-foreground">{faq.answer}</p>
          </div>
        ))}
      </section>

      {/* Bottom CTA with risk reversal */}
      <div className="bg-secondary rounded-2xl p-8 text-center space-y-4">
        <h2 className="text-2xl font-semibold">Ready to modernize your grant management?</h2>
        <p className="text-muted-foreground">
          Join hundreds of organizations using Karma to run transparent, impactful grant programs.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/foundations"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Start Managing Grants
          </Link>
          <Link
            href="/solutions/how-to-choose-grant-management-software"
            className="inline-block border border-primary text-primary px-6 py-3 rounded-lg font-medium hover:bg-primary/5 transition-colors"
          >
            Read Our Buying Guide
          </Link>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Free to start &middot; No credit card required &middot; Set up in under 30 minutes
        </p>
      </div>
    </main>
  );
}
