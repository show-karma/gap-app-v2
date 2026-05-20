import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreadcrumbJsonLd } from "@/components/Seo/BreadcrumbJsonLd";
import { customMetadata } from "@/utilities/meta";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

export const metadata: Metadata = customMetadata({
  title: "Pricing",
  description:
    "Karma is free for individual builders and program administrators. Custom ecosystem and enterprise pricing for whitelabel deployments and dedicated funding programs.",
  path: "/pricing",
});

const styles = {
  h1: "text-3xl font-bold text-black dark:text-white",
  h2: "text-xl font-bold text-black dark:text-white mt-8",
  p: "text-base text-black dark:text-white mt-4",
  ul: "list-disc list-inside mt-4 space-y-2",
  li: "text-base text-zinc-700 dark:text-zinc-300",
  a: "text-blue-500 underline",
};

export default async function PricingPage() {
  // Karma-branded marketing copy — hide on whitelabel tenants so a
  // partner's own /pricing isn't shadowed by ours. Matches the gate on
  // /about and /contact.
  const { isWhitelabel } = await getWhitelabelContext();
  if (isWhitelabel) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Pricing", url: "/pricing" },
        ]}
      />
      <h1 className={styles.h1}>Pricing</h1>

      <p className={styles.p}>
        Karma is free for individuals and program administrators. Ecosystem and enterprise
        deployments are quoted directly so we can scope reviewer workflows, integrations, and
        evaluation depth to the program.
      </p>

      <h2 className={styles.h2}>Free tier</h2>
      <p className={styles.p}>Free for all individual builders and program administrators:</p>
      <ul className={styles.ul}>
        <li className={styles.li}>Unlimited project profiles</li>
        <li className={styles.li}>Apply to any funding program</li>
        <li className={styles.li}>Track milestones and post updates</li>
        <li className={styles.li}>
          Read all public funding data, grants, milestones, and impact metrics
        </li>
        <li className={styles.li}>MCP server access (OAuth + API key authentication)</li>
      </ul>
      <p className={styles.p}>No credit card required.</p>

      <h2 className={styles.h2}>Ecosystem and enterprise</h2>
      <p className={styles.p}>Custom pricing for:</p>
      <ul className={styles.ul}>
        <li className={styles.li}>Whitelabel deployments on your own domain and brand</li>
        <li className={styles.li}>Dedicated funding programs with custom evaluation workflows</li>
        <li className={styles.li}>AI-assisted evaluation at scale</li>
        <li className={styles.li}>Custom integrations and SLA support</li>
        <li className={styles.li}>Reviewer and milestone management workflows</li>
      </ul>
      <p className={styles.p}>
        Contact{" "}
        <a className={styles.a} href="mailto:info@karmahq.xyz">
          info@karmahq.xyz
        </a>{" "}
        for ecosystem pricing — include details about your program structure, expected applicant
        volume, and rough budget so we can scope quickly.
      </p>

      <h2 className={styles.h2}>API access</h2>
      <p className={styles.p}>
        All API endpoints under{" "}
        <a
          className={styles.a}
          href="https://gapapi.karmahq.xyz/v2/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          gapapi.karmahq.xyz/v2/*
        </a>{" "}
        and the MCP server at gapapi.karmahq.xyz/v2/mcp are free to use under fair-use rate limits.
        Rate-limit headers are returned on every response. Heavy programmatic access should contact{" "}
        <a className={styles.a} href="mailto:info@karmahq.xyz">
          info@karmahq.xyz
        </a>{" "}
        for a dedicated tier.
      </p>
    </main>
  );
}
