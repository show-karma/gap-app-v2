import { PAGES } from "@/utilities/pages";

const styles = {
  h1: "text-2xl font-bold text-start text-black dark:text-white",
  h2: "text-xl font-bold text-start text-black dark:text-white",
  p: "text-base text-start text-black dark:text-white",
  i: "text-sm text-start mb-3 text-black dark:text-white",
  a: "text-base text-start underline text-blue-500 dark:text-blue-500",
  block: "flex flex-col items-start justify-start mb-3",
  ul: "list-inside",
  li: "text-base text-start mb-2 text-zinc-700 dark:text-zinc-300",
};

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col items-center justify-start max-w-full w-full px-8 py-8 text-start mb-10">
      <div className="flex flex-col items-start justify-start h-full max-w-4xl w-full text-start">
        <div className={styles.block}>
          <h1 className={styles.h1}>Privacy Policy</h1>
          <i className={styles.i}>Effective Date: Jan 1, 2025</i>
          <p className={styles.p}>
            Karma (“we”, “us”, or “our”) respects your privacy. This Privacy
            Policy explains how we collect, use, and protect your personal
            information when you use Karma GAP, available at{" "}
            <a className={styles.a} href={PAGES.HOME}>
              gap.karmahq.xyz
            </a>{" "}
            (the “Platform”). By using the Platform, you consent to the
            practices described in this policy.
          </p>
        </div>

        <div className={styles.block}>
          <h2 className={styles.h2}>1. Information We Collect</h2>
          <p className={styles.p}>
            We collect the following types of information:
          </p>
          <ul className={styles.ul} style={{ listStyleType: "lower-alpha" }}>
            <li className={styles.li}>
              <strong>Information You Provide</strong>
              <ul className="pl-4 list-inside">
                <li className={styles.p}>
                  - Project details, milestones, updates, and impact submissions
                </li>
                <li className={styles.p}>
                  - Profile data (e.g., your name, role, organization)
                </li>
                <li className={styles.p}>
                  - Contact information if you voluntarily provide it (e.g.,
                  email)
                </li>
              </ul>
            </li>
            <li className={styles.li}>
              <strong>Automatically Collected Data</strong>
              <ul className="pl-4 list-inside">
                <li className={styles.p}>
                  - IP address, browser type, device information
                </li>
                <li className={styles.p}>
                  - Pages viewed, time spent on the site, and actions taken (via
                  analytics tools)
                </li>
              </ul>
            </li>
          </ul>
          <p className={styles.p}>
            We do <b>not</b> collect sensitive personal information (e.g.,
            financial, biometric, or government-issued ID data).
          </p>
        </div>

        <div className={styles.block}>
          <h2 className={styles.h2}>2. How We Use Your Information</h2>
          <p className={styles.p}>We use the information to:</p>
          <ul className="pl-4 list-inside">
            <li className={styles.p}>- Operate and improve the Platform</li>
            <li className={styles.p}>
              - Display submitted data (e.g., project milestones, public
              profiles)
            </li>
            <li className={styles.p}>
              - Enable transparency and accountability in funding ecosystems
            </li>
            <li className={styles.p}>
              - Analyze engagement for performance and product insights
            </li>
          </ul>
          <p className={styles.p}>
            We may use anonymized and aggregated data for reporting and research
            purposes.
          </p>
        </div>

        <div className={styles.block}>
          <h2 className={styles.h2}>3. Sharing of Information</h2>
          <p className={styles.p}>
            We do <b>not</b> sell your personal data.
          </p>
          <p className={styles.p}>We may share data with:</p>
          <ul className="pl-4 list-inside">
            <li className={styles.p}>
              - Hosting and analytics providers that help us run the Platform
            </li>
            <li className={styles.p}>
              - Partner communities you’ve interacted with (e.g., grant
              programs)
            </li>
            <li className={styles.p}>
              - Legal authorities if required by law or to protect our rights
            </li>
          </ul>
        </div>

        <div className={styles.block}>
          <h2 className={styles.h2}>4. Your Rights</h2>
          <p className={styles.p}>
            Depending on your jurisdiction, you may have the right to:
          </p>
          <ul className="pl-4 list-inside">
            <li className={styles.p}>
              - Access, correct, or delete your data{" "}
            </li>
            <li className={styles.p}>- Request a copy of your data </li>
            <li className={styles.p}>
              - Object to or restrict certain types of processing{" "}
            </li>
          </ul>
          <p className={styles.p}>
            To make a request, contact us at info@karmahq.xyz
          </p>
        </div>
        <div className={styles.block}>
          <h2 className={styles.h2}>5. Data Retention</h2>
          <p className={styles.p}>
            We retain user-submitted data (like project milestones or updates)
            for as long as necessary to support transparency and reporting, or
            as required by our partners. You may request data deletion unless
            legally or contractually restricted.
          </p>
        </div>
        <div className={styles.block}>
          <h2 className={styles.h2}>6. Security</h2>
          <p className={styles.p}>
            We implement reasonable technical and organizational safeguards to
            protect your data, but no system is 100% secure.
          </p>
        </div>
        <div className={styles.block}>
          <h2 className={styles.h2}>7. Third-Party Links</h2>
          <p className={styles.p}>
            The Platform may link to third-party sites. We are not responsible
            for the privacy practices of those sites.
          </p>
        </div>
        <div className={styles.block}>
          <h2 className={styles.h2}>8. Changes to This Policy</h2>
          <p className={styles.p}>
            We may update this Privacy Policy periodically. Changes will be
            posted on this page with an updated effective date.
          </p>
        </div>
        <div className={styles.block}>
          <h2 className={styles.h2}>9. Contact Us</h2>
          <p className={styles.p}>
            If you have questions about this Privacy Policy, contact us at:
            info@karmahq.xyz
          </p>
        </div>
      </div>
    </div>
  );
}
