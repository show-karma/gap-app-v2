import { PROJECT_NAME } from "@/constants/brand"
import { PAGES } from "@/utilities/pages"

const styles = {
  h1: "text-2xl font-bold text-start text-black dark:text-white",
  h2: "text-xl font-bold text-start text-black dark:text-white",
  p: "text-base text-start mb-2 text-black dark:text-white",
  i: "text-sm text-start text-black dark:text-white mb-3",
  a: "text-base text-start underline text-blue-500 dark:text-blue-500",
}

export default function TermsAndConditions() {
  return (
    <div className="flex flex-col items-center justify-start max-w-full w-full px-8 py-8 text-start mb-10">
      <div className="flex flex-col items-start justify-start h-full max-w-4xl w-full text-start">
        <h1 className={styles.h1}>Terms and Conditions</h1>
        <i className={styles.i}>Effective Date: Jan 1, 2025</i>
        <p className={styles.p}>
          Welcome to {PROJECT_NAME} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), a product
          operated by Karma. By accessing or using{" "}
          <a className={styles.a} href={PAGES.HOME}>
            karmahq.xyz
          </a>{" "}
          or any related services (collectively, the &ldquo;Platform&rdquo;), you agree to be bound
          by these Terms of Use. If you do not agree to these terms, please do not use the Platform.
        </p>

        <h2 className={styles.h2}>1. Use of the Platform</h2>
        <p className={styles.p}>
          {PROJECT_NAME} provides infrastructure for projects, grantees, evaluators, and funding
          communities to share updates, track milestones, and document impact. You may use the
          Platform only for lawful purposes and in accordance with these Terms.
          <br />
          By continuing to use the Platform, you acknowledge and agree to these Terms of Use.
        </p>
        <h2 className={styles.h2}>2. User Submissions</h2>
        <p className={styles.p}>
          When you submit content to the Platform — including but not limited to milestones,
          updates, impact reports, endorsements, or profile information — you retain ownership of
          your content but grant Karma a worldwide, non-exclusive, royalty-free license to host,
          display, reproduce, and distribute that content for purposes related to the Platform’s
          operations, including improving transparency and accountability for public goods funding.
          <br />
          You are solely responsible for any content you provide and agree not to submit anything
          false, misleading, unlawful, or infringing on the rights of others.
        </p>
        <h2 className={styles.h2}>3. No Guarantees or Warranties</h2>
        <p className={styles.p}>
          {PROJECT_NAME} is provided &quot;as is&quot; and &quot;as available.&quot; We make no
          representations or warranties of any kind regarding the accuracy, completeness,
          reliability, or usefulness of any information presented on the Platform, including
          user-generated content or project data.
          <br />
          Karma is not responsible for decisions made by funders, communities, or other users based
          on the information provided via the Platform.
        </p>
        <h2 className={styles.h2}>4. Limitation of Liability</h2>
        <p className={styles.p}>
          To the fullest extent permitted by law, Karma and its affiliates shall not be liable for
          any indirect, incidental, consequential, or punitive damages arising from your use of (or
          inability to use) the Platform or reliance on any content available through it.
        </p>
        <h2 className={styles.h2}>5. Modifications</h2>
        <p className={styles.p}>
          We reserve the right to update or modify these Terms of Use at any time. Changes will be
          posted to this page with an updated effective date. Continued use of the Platform after
          changes constitutes acceptance of the new Terms.
        </p>
        <h2 className={styles.h2}>6. Privacy</h2>
        <span className={styles.p}>
          Your use of the Platform is also subject to our{" "}
          <a className={styles.a} href={PAGES.PRIVACY_POLICY}>
            Privacy Policy
          </a>
          . Please review it to understand how we collect, use, and store your data.
        </span>
        <h2 className={styles.h2}>7. Governing Law</h2>
        <span className={styles.p}>
          These Terms are governed by the laws of the State of California, without regard to
          conflict of law principles.
        </span>
      </div>
    </div>
  )
}
