import type { Metadata } from "next";
import Link from "next/link";
import { customMetadata } from "@/utilities/meta";

export const metadata: Metadata = customMetadata({
  title: "Contact",
  description:
    "Contact Karma — partnership inquiries, support, security disclosures, and developer documentation.",
  path: "/contact",
});

const styles = {
  h1: "text-3xl font-bold text-black dark:text-white",
  h2: "text-xl font-bold text-black dark:text-white mt-8",
  p: "text-base text-black dark:text-white mt-4",
  a: "text-blue-500 underline",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className={styles.h1}>Contact Karma</h1>

      <h2 className={styles.h2}>General inquiries</h2>
      <p className={styles.p}>
        <a className={styles.a} href="mailto:info@karmahq.xyz">
          info@karmahq.xyz
        </a>{" "}
        — partnerships, support, and general questions.
      </p>

      <h2 className={styles.h2}>Funders</h2>
      <p className={styles.p}>
        Running a grants program and want to use Karma? Email info@karmahq.xyz with details about
        your ecosystem, program structure, and rough budget. We respond within 1-2 business days.
      </p>

      <h2 className={styles.h2}>Builders</h2>
      <p className={styles.p}>
        Looking to apply to a program? Browse open programs at{" "}
        <Link className={styles.a} href="/funding-map">
          Funding Map
        </Link>
        . To create your project profile, start at{" "}
        <Link className={styles.a} href="/create-project-profile">
          Create Project
        </Link>
        .
      </p>

      <h2 className={styles.h2}>Developers and AI agents</h2>
      <p className={styles.p}>
        Karma exposes a public REST API and MCP server. See the{" "}
        <a
          className={styles.a}
          href="https://gapapi.karmahq.xyz/v2/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          API documentation
        </a>{" "}
        and the{" "}
        <Link className={styles.a} href="/mcp/connect">
          MCP setup guide
        </Link>
        .
      </p>

      <h2 className={styles.h2}>Reporting issues</h2>
      <p className={styles.p}>
        For security disclosures, email info@karmahq.xyz with subject &ldquo;Security:&rdquo;. For
        platform bugs or feature requests, mention us at{" "}
        <a
          className={styles.a}
          href="https://x.com/karmahq_"
          target="_blank"
          rel="noopener noreferrer"
        >
          x.com/karmahq_
        </a>{" "}
        or open an issue on{" "}
        <a
          className={styles.a}
          href="https://github.com/show-karma"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        .
      </p>

      <h2 className={styles.h2}>Office hours</h2>
      <p className={styles.p}>
        Karma is a globally-distributed team — there is no single office. Communications happen
        async via email and GitHub.
      </p>
    </main>
  );
}
