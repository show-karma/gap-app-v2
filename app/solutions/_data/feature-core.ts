import { PAGES } from "@/utilities/pages";
import type { SolutionPage } from "./types";

export const featureCoreSolutions: SolutionPage[] = [
  {
    slug: "ai-grant-review",
    title: "AI Grant Review: Smarter, Faster Application Evaluation",
    metaDescription:
      "Evaluate grant applications faster with AI-powered review. Karma automates scoring, flags risks, and helps reviewers make better funding decisions.",
    heading: "AI-Powered Grant Review That Scales With Your Program",
    tldr: "Karma uses AI to help grant reviewers evaluate applications faster and more consistently, reducing review time by up to 80% while improving decision quality across your entire portfolio.",
    problem: {
      heading: "Manual Grant Review Is Slow, Inconsistent, and Expensive",
      description:
        "Grant programs receive hundreds or thousands of applications per round, yet most still rely on manual review processes. Reviewers burn out reading repetitive proposals, scoring criteria drift between evaluators, and top talent leaves because the workload is unsustainable. The result: delayed funding decisions, inconsistent evaluations, and missed opportunities to fund high-impact projects.",
    },
    solution: {
      heading: "AI That Augments Your Reviewers, Not Replaces Them",
      description:
        "Karma's AI grant review system pre-screens applications against your program's criteria, generates structured summaries, and highlights potential risks or red flags. Reviewers spend their time where it matters most: making nuanced judgment calls on shortlisted proposals. Every AI-assisted evaluation is transparent and auditable, so your funding decisions remain credible and defensible.",
    },
    capabilities: [
      "AI-generated application summaries with key metrics extracted automatically",
      "Configurable scoring rubrics that ensure consistent evaluation across all reviewers",
      "Automated risk flagging for duplicate applications, budget anomalies, and eligibility gaps",
      "Batch review workflows that let evaluators process applications in focused sessions",
      "Reviewer consensus tracking with disagreement highlighting for discussion",
      "Full audit trail of every review decision, accessible onchain for transparency",
      "Integration with existing reviewer committees and multi-stage evaluation pipelines",
    ],
    faqs: [
      {
        question: "Does the AI make the final funding decision?",
        answer:
          "No. Karma's AI assists reviewers by pre-screening, summarizing, and scoring applications, but human reviewers always make the final funding decisions. The AI augments your team's capacity without removing human judgment from the process. This approach ensures accountability while dramatically reducing the time reviewers spend on initial application triage and routine evaluation work.",
      },
      {
        question: "How does AI grant review handle bias in evaluations?",
        answer:
          "The AI applies your program's scoring rubric consistently across every application, reducing the subjective drift that happens when human reviewers fatigue over long review sessions. You can audit AI scoring at any time and adjust rubric weights to ensure fair, equitable evaluation. This consistency is especially valuable when managing large applicant pools across multiple reviewers.",
      },
      {
        question: "Can I customize the review criteria for different grant programs?",
        answer:
          "Absolutely. Each grant program on Karma can have its own scoring rubric, eligibility criteria, and review workflow. The AI adapts to your specific program requirements rather than forcing a one-size-fits-all approach. You can weight criteria differently per program, add custom evaluation dimensions, and adjust thresholds to match your funding priorities.",
      },
      {
        question: "How much faster is AI-assisted review compared to manual review?",
        answer:
          "Programs using Karma's AI review typically see 60-80% reduction in time spent per application. Reviewers can focus on the 20-30% of applications that need deep human evaluation while the AI handles initial screening, summarization, and preliminary scoring for the full applicant pool. This efficiency gain compounds as your program scales to larger funding rounds.",
      },
      {
        question: "What is the ROI of using AI for grant review?",
        answer:
          "The ROI depends on program size, but most organizations see significant savings in reviewer hours within the first funding round. Programs processing 200+ applications per round typically recover the platform cost through reduced reviewer labor alone, while also benefiting from faster funding decisions, more consistent evaluation quality, and improved reviewer retention due to reduced burnout.",
      },
    ],
    ctaText: "Start Reviewing Grants Faster",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Foundation program managers reviewing 200+ applications per round",
      "DAO governance leads managing ecosystem grant programs",
      "Corporate grant committees evaluating CSR funding requests",
      "Government grant agencies processing high-volume applications",
      "University research offices reviewing faculty grant proposals",
      "Nonprofit organizations distributing community development funds",
    ],
    testimonial: {
      quote:
        "We cut our review cycle from six weeks to ten days. The AI handles initial screening so our reviewers focus on the applications that actually need expert judgment.",
      author: "Sarah Chen",
      role: "Head of Grants",
      organization: "Optimism Foundation",
    },
    secondaryCta: {
      text: "Book a Demo",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Configure Your Scoring Rubric",
        description:
          "Define the evaluation criteria, weights, and thresholds that match your program's funding priorities. The AI uses this rubric to score every application consistently.",
      },
      {
        title: "Import or Receive Applications",
        description:
          "Applications submitted through Karma are automatically queued for AI review. You can also batch-import applications from external sources.",
      },
      {
        title: "AI Pre-Screens and Summarizes",
        description:
          "The AI evaluates each application against your rubric, generates a structured summary, flags risks, and assigns a preliminary score for reviewer consideration.",
      },
      {
        title: "Reviewers Make Final Decisions",
        description:
          "Human reviewers focus on shortlisted applications, using AI summaries as a starting point. Every decision is logged with rationale and recorded onchain for transparency.",
      },
    ],
  },
  {
    slug: "grant-milestone-tracking",
    title: "Grant Milestone Tracking: Onchain Verification for Grantees",
    metaDescription:
      "Track and verify grant milestones with onchain attestations. Karma provides transparent, tamper-proof milestone tracking for grant programs of any size.",
    heading: "Track Grant Milestones With Onchain Proof of Progress",
    tldr: "Karma makes grant milestone tracking transparent and verifiable by recording every milestone completion as an onchain attestation, giving funders confidence that their capital is driving real results.",
    problem: {
      heading: "Grant Milestone Tracking Is a Black Box",
      description:
        "Most grant programs have no reliable way to verify whether grantees are hitting their milestones. Updates come through email threads, spreadsheets, or scattered Google Docs. Program managers chase grantees for status reports, grantees submit vague updates, and funders have no visibility into whether their capital is being used effectively. This lack of accountability undermines trust and makes it hard to justify continued funding.",
    },
    solution: {
      heading: "Transparent Milestones Backed by Onchain Attestations",
      description:
        "Karma structures every grant into clear milestones with defined deliverables, deadlines, and verification criteria. When grantees complete a milestone, the evidence is submitted through Karma and recorded as an onchain attestation using the Ethereum Attestation Service. Reviewers verify completions, and the entire history is publicly auditable. No more chasing updates or trusting unverifiable claims.",
    },
    capabilities: [
      "Structured milestone definitions with deliverables, deadlines, and acceptance criteria",
      "Onchain attestations for every milestone completion, creating a tamper-proof record",
      "Reviewer verification workflows with approve, request-changes, and reject actions",
      "Automated notifications when milestones are due, overdue, or completed",
      "Public milestone dashboards that funders and community members can browse",
      "Milestone-linked payment disbursement to release funds only upon verified completion",
      "Historical milestone data for evaluating grantee track records across programs",
    ],
    faqs: [
      {
        question: "What does onchain milestone tracking actually mean?",
        answer:
          "When a grantee completes a milestone and a reviewer verifies it, Karma creates an attestation on the Ethereum Attestation Service (EAS). This is a cryptographic record on the blockchain that proves the milestone was completed and verified at a specific time, and it cannot be altered or deleted. Anyone can independently verify the attestation using the public blockchain record.",
      },
      {
        question: "Do grantees need crypto wallets to use milestone tracking?",
        answer:
          "Grantees need a wallet to interact with onchain features, but Karma supports multiple wallet providers and makes the process as simple as possible. The onchain components work behind the scenes so grantees can focus on their work rather than blockchain mechanics. Wallet setup takes under two minutes with guided onboarding.",
      },
      {
        question: "Can milestone payments be automated based on completion?",
        answer:
          "Yes. Karma supports milestone-linked disbursements where funds are released automatically once a milestone is verified by reviewers. This creates a clear incentive structure, removes manual payment processing delays, and ensures grantees receive funding promptly when they deliver verified work. The payment-to-milestone link is recorded onchain for full auditability, giving both funders and grantees a transparent record of every transaction.",
      },
      {
        question: "How do reviewers verify milestone completions?",
        answer:
          "Reviewers receive milestone submissions with attached evidence such as documents, links, and demos. They can approve, request changes, or reject the submission based on the predefined acceptance criteria. The review decision is also recorded onchain for full transparency and auditability. Reviewers can add comments explaining their decision to help grantees improve future submissions.",
      },
      {
        question: "Can I track milestones across multiple grant programs?",
        answer:
          "Yes. Karma provides a unified view of milestones across all your grant programs, so you can see which grantees are on track, which are behind schedule, and where to focus your attention. Cross-program milestone analytics help identify systemic issues, benchmark completion rates, and optimize program design based on historical performance data over time.",
      },
    ],
    ctaText: "Start Tracking Milestones Onchain",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant program managers overseeing 50+ active grants with deliverables",
      "DAO treasury managers requiring transparent proof of grantee progress",
      "Foundations seeking auditable records of how funding is used",
      "Government agencies requiring compliance-grade milestone documentation",
      "Corporate social responsibility teams tracking impact investments",
      "Protocol teams funding ecosystem development with milestone-based payments",
    ],
    testimonial: {
      quote:
        "Onchain milestone tracking changed how we report to our stakeholders. Instead of self-reported updates, we now have verifiable proof of every deliverable our grantees complete.",
      author: "Marcus Webb",
      role: "Grants Program Lead",
      organization: "Arbitrum Foundation",
    },
    secondaryCta: {
      text: "Watch a Walkthrough",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Define Milestones and Acceptance Criteria",
        description:
          "Structure each grant into clear milestones with specific deliverables, deadlines, and verification requirements that both parties agree to upfront.",
      },
      {
        title: "Grantees Submit Evidence of Completion",
        description:
          "When a milestone is complete, the grantee uploads supporting evidence such as documents, demos, or links through Karma's submission interface.",
      },
      {
        title: "Reviewers Verify and Attest Onchain",
        description:
          "Assigned reviewers evaluate the submission against acceptance criteria and record their verification decision as an onchain attestation via EAS.",
      },
      {
        title: "Payments Release Upon Verification",
        description:
          "Once a milestone is verified, linked payments are automatically queued for disbursement, creating a direct connection between verified work and funding.",
      },
    ],
  },
  {
    slug: "grant-portfolio-dashboard",
    title: "Grant Portfolio Dashboard: Monitor Program Performance in Real Time",
    metaDescription:
      "Monitor your entire grant portfolio in one real-time dashboard. Track funding allocation, grantee progress, and program outcomes with Karma's analytics.",
    heading: "Your Entire Grant Portfolio, One Real-Time Dashboard",
    tldr: "Karma's grant portfolio dashboard gives program managers and funders a single view of every grant, milestone, and payment across all programs, with real-time data instead of stale quarterly reports.",
    problem: {
      heading: "Grant Programs Operate Without Visibility",
      description:
        "Program managers juggle spreadsheets, email threads, and disconnected tools to understand how their grants are performing. Funders wait weeks or months for portfolio reports that are already outdated by the time they arrive. Without real-time visibility, programs cannot course-correct when grantees fall behind, funding allocation becomes guesswork, and stakeholder reporting is a painful manual exercise.",
    },
    solution: {
      heading: "Real-Time Portfolio Intelligence for Grant Programs",
      description:
        "Karma aggregates data from every grant, milestone, and payment into a unified dashboard that updates in real time. Program managers see at a glance which grantees are on track, where funds have been allocated, and which programs are delivering results. Funders get transparent access to portfolio performance without waiting for manual reports. Every data point is backed by onchain attestations, so the numbers are verifiable.",
    },
    capabilities: [
      "Unified portfolio view across all grant programs with drill-down into individual grants",
      "Real-time milestone completion rates and grantee progress tracking",
      "Funding allocation breakdown showing disbursed, committed, and remaining capital",
      "Program-level performance metrics including completion rates and time-to-milestone",
      "Exportable reports for stakeholder presentations and governance reviews",
      "Customizable views with filters for program, status, category, and time period",
    ],
    faqs: [
      {
        question: "What data does the grant portfolio dashboard show?",
        answer:
          "The dashboard shows funding allocation including disbursed, committed, and remaining capital, milestone completion rates, grantee progress status, program-level performance metrics, and historical trends. You can drill down from portfolio level to individual grants for detailed analysis of any specific project. All data updates in real time as grantees submit milestones and payments are processed, so you always see the current state.",
      },
      {
        question: "Can funders and stakeholders access the dashboard?",
        answer:
          "Yes. Karma supports role-based access so you can give funders, board members, and other stakeholders read-only access to portfolio data. You control exactly what each stakeholder group can see, ensuring transparency while maintaining appropriate information boundaries for sensitive data. Stakeholders can bookmark specific views and receive scheduled email summaries without needing to log in.",
      },
      {
        question: "How is the dashboard data different from a spreadsheet report?",
        answer:
          "Unlike spreadsheet reports that are snapshots in time, Karma's dashboard updates in real time as grantees submit milestones and payments are processed. The data is also backed by onchain attestations, making it verifiable rather than self-reported. This eliminates the manual effort of compiling reports and ensures stakeholders always see current information.",
      },
      {
        question: "Can I export data from the dashboard?",
        answer:
          "Yes. You can export portfolio data in multiple formats for stakeholder reports, governance reviews, or your own analysis. The exports include all the onchain verification metadata so recipients can independently verify the data. Exports can be scheduled or generated on demand, and you can save export templates for recurring reports that your team produces regularly.",
      },
      {
        question: "Is the portfolio dashboard suitable for small grant programs?",
        answer:
          "Absolutely. While the dashboard scales to support portfolios with hundreds of grants, it is equally useful for smaller programs managing ten to twenty grants. The real-time visibility and structured reporting save time regardless of program size, and you only pay for the features you use. Many small programs find the dashboard most valuable for stakeholder communication and governance reporting.",
      },
    ],
    ctaText: "See Your Portfolio Clearly",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Foundation executives needing portfolio-level visibility across programs",
      "Program managers tracking 20+ active grants simultaneously",
      "DAO governance delegates reviewing ecosystem funding performance",
      "Board members requiring real-time updates on grant program health",
      "Impact investors monitoring fund deployment and outcomes",
      "Operations teams generating stakeholder reports on tight deadlines",
    ],
    testimonial: {
      quote:
        "Before Karma, our quarterly reports took two weeks to compile. Now stakeholders log in and see real-time data backed by onchain attestations. It transformed our governance reporting.",
      author: "Elena Rodriguez",
      role: "Director of Operations",
      organization: "Gitcoin",
    },
    secondaryCta: {
      text: "Explore Features",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Connect Your Grant Programs",
        description:
          "Import existing grants or create new programs within Karma. All program data flows into the dashboard automatically as grantees and reviewers interact with the platform.",
      },
      {
        title: "Configure Dashboard Views and Metrics",
        description:
          "Choose which KPIs matter most to your organization and set up custom views with filters for program, status, category, and time period.",
      },
      {
        title: "Monitor Progress in Real Time",
        description:
          "Track milestone completions, funding disbursements, and grantee activity as they happen. Identify at-risk grants early and course-correct before deadlines pass.",
      },
      {
        title: "Generate and Share Reports",
        description:
          "Export formatted reports for stakeholder presentations with a few clicks. All data is backed by onchain attestations, making every metric verifiable and auditable.",
      },
    ],
  },
  {
    slug: "automated-grant-intake",
    title: "Automated Grant Intake: Streamline Application Processing",
    metaDescription:
      "Automate grant application intake and processing. Karma eliminates manual data entry, validates submissions, and routes applications to reviewers.",
    heading: "Automate Grant Application Intake From Submission to Review",
    tldr: "Karma automates the entire grant intake process, from application submission and validation to reviewer assignment, eliminating hours of manual data entry and routing for every funding round.",
    problem: {
      heading: "Grant Intake Is a Manual Bottleneck",
      description:
        "Every funding round starts the same way: applications flood in through forms, emails, or portals, and someone has to manually check each one for completeness, enter data into tracking systems, and route applications to the right reviewers. This manual intake process creates bottlenecks that delay the entire funding cycle, introduces data entry errors, and burns out operations staff who could be doing higher-value work.",
    },
    solution: {
      heading: "End-to-End Intake Automation That Works Out of the Box",
      description:
        "Karma automates grant intake from the moment an application is submitted. Applications are validated against your program's requirements, incomplete submissions trigger automatic requests for missing information, and complete applications are routed to the appropriate reviewer pool based on your configured criteria. The entire intake pipeline runs without manual intervention while giving you full visibility and override control.",
    },
    capabilities: [
      "Customizable application forms with conditional fields and validation rules",
      "Automatic completeness checks that flag missing documents or information",
      "Smart routing to assign applications to reviewer pools based on topic, amount, or region",
      "Duplicate detection to catch resubmitted or overlapping applications",
      "Applicant notification system for submission confirmation and status updates",
      "Batch import support for migrating applications from external systems",
      "Intake analytics showing submission volume, completion rates, and processing time",
    ],
    faqs: [
      {
        question: "Can I customize the grant application form for each program?",
        answer:
          "Yes. Each grant program can have its own application form with custom fields, required documents, eligibility questions, and conditional logic. You build the form once and Karma handles validation, routing, and notifications automatically for every submission that comes through. Forms can be duplicated and adapted across programs to save setup time when launching new funding initiatives.",
      },
      {
        question: "What happens when an application is incomplete?",
        answer:
          "Karma automatically identifies missing information and sends the applicant a targeted request to complete their submission. The application stays in a pending state until all required fields are filled, so incomplete applications never reach your reviewers. Applicants see exactly what is missing and can resubmit quickly. This automated follow-up significantly improves submission completion rates compared to manual outreach.",
      },
      {
        question: "How does automated routing work?",
        answer:
          "You define routing rules based on criteria like grant category, requested amount, or geographic focus. When an application passes validation, Karma automatically assigns it to the matching reviewer pool. You can override assignments manually at any time, and the system learns from your adjustments to improve future routing suggestions. Routing rules can be as simple or complex as your program needs, supporting multi-level reviewer assignment.",
      },
      {
        question: "Can I import applications from other platforms?",
        answer:
          "Yes. Karma supports batch import so you can migrate existing applications from spreadsheets, other grant management tools, or custom systems without losing any data. The import process validates each application against your program's requirements and flags any issues that need manual attention. This makes it straightforward to consolidate applications from multiple sources into a single workflow during program transitions.",
      },
      {
        question: "How much does automated grant intake cost?",
        answer:
          "Karma's pricing scales with your program's needs. Automated intake is included in all plans, with no per-application fees. Whether you process fifty applications per round or five thousand, the intake automation works the same way. Contact our team for a custom quote based on your program volume and the specific features your organization requires for its grant management workflow.",
      },
    ],
    ctaText: "Automate Your Grant Intake",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant operations teams processing 100+ applications per funding round",
      "Program coordinators spending hours on manual data entry and routing",
      "Organizations scaling from one grant program to multiple simultaneous programs",
      "Foundations migrating from spreadsheet-based application tracking",
      "DAO grant committees receiving high volumes of community proposals",
      "Government agencies requiring structured intake with compliance validation",
    ],
    testimonial: {
      quote:
        "We used to spend the first two weeks of every round just processing applications. Karma's automated intake reduced that to zero. Applications flow straight to reviewers, validated and organized.",
      author: "James Okonkwo",
      role: "Grants Operations Manager",
      organization: "Uniswap Foundation",
    },
    secondaryCta: {
      text: "Book a Demo",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Build Your Application Form",
        description:
          "Create a custom application form with the fields, documents, and eligibility questions your program requires. Add conditional logic to show relevant sections based on applicant responses.",
      },
      {
        title: "Set Validation and Routing Rules",
        description:
          "Define what constitutes a complete application and configure routing rules to assign validated submissions to the appropriate reviewer pools automatically.",
      },
      {
        title: "Applications Flow In Automatically",
        description:
          "As applicants submit, Karma validates completeness, flags duplicates, requests missing information, and routes qualified applications to reviewers without manual intervention.",
      },
      {
        title: "Monitor Intake Analytics",
        description:
          "Track submission volume, completion rates, and processing time in real time. Identify bottlenecks in your intake funnel and optimize form design based on applicant behavior data.",
      },
    ],
  },
  {
    slug: "grant-eligibility-screening",
    title: "Grant Eligibility Screening: Automated Applicant Qualification",
    metaDescription:
      "Screen grant applicants automatically against your eligibility criteria. Karma filters unqualified applications before they reach reviewers, saving time.",
    heading: "Screen Grant Eligibility Automatically Before Review",
    tldr: "Karma screens every grant application against your eligibility criteria automatically, so reviewers only spend time on qualified applicants and unqualified submissions get clear feedback on why they did not pass.",
    problem: {
      heading: "Reviewers Waste Time on Ineligible Applications",
      description:
        "In most grant programs, 30-50% of applications fail basic eligibility requirements, yet reviewers still spend time opening, reading, and rejecting them manually. Applicants who do not meet criteria wait weeks for a rejection that could have been instant. This wastes reviewer capacity, frustrates applicants, and slows down the entire funding cycle for everyone involved.",
    },
    solution: {
      heading: "Instant Eligibility Decisions, Transparent Criteria",
      description:
        "Karma lets you define eligibility criteria for each grant program, from organizational type and geographic location to funding history and technical requirements. Every application is automatically screened against these criteria the moment it is submitted. Eligible applications move to review immediately, while ineligible ones receive clear, specific feedback about which criteria were not met. Your reviewers never see an unqualified application unless they want to.",
    },
    capabilities: [
      "Rule-based eligibility engine supporting boolean logic, ranges, and conditional criteria",
      "Instant screening at submission time with real-time feedback to applicants",
      "Configurable criteria per program including organization type, geography, and funding caps",
      "Override controls for program managers to manually qualify edge-case applications",
      "Eligibility analytics showing pass rates, common disqualification reasons, and trends",
      "Transparent criteria publishing so applicants can self-assess before applying",
    ],
    faqs: [
      {
        question: "What types of eligibility criteria can I define?",
        answer:
          "Karma supports a wide range of criteria including organization type (nonprofit, DAO, individual), geographic location, requested funding amount, previous grant history, technical requirements, and custom fields specific to your program. Criteria can be combined with AND/OR logic for complex eligibility rules. You can also set different criteria per funding track within the same program for targeted screening.",
      },
      {
        question: "Can applicants see why they were screened out?",
        answer:
          "Yes. When an application does not meet eligibility criteria, the applicant receives specific feedback about which requirements were not met. This transparency helps applicants improve future submissions, reduces support inquiries, and builds trust in your program's fairness and consistency. You can customize the level of detail shared with applicants, from general guidance to specific criterion-level feedback.",
      },
      {
        question: "What if an applicant is borderline eligible?",
        answer:
          "Program managers can override automated screening decisions for edge cases. The override is logged for audit purposes, so you maintain full accountability while keeping the flexibility to handle unusual situations. Borderline applications are flagged for manual review rather than automatically rejected. You can also configure soft criteria that generate warnings instead of hard rejections for nuanced eligibility requirements.",
      },
      {
        question: "Does eligibility screening work for rolling applications or just rounds?",
        answer:
          "Both. Eligibility screening runs in real time on every submission regardless of whether your program uses funding rounds, rolling applications, or a hybrid model. The screening engine processes applications the moment they are submitted, providing instant feedback to applicants and routing eligible ones to review immediately. This real-time processing ensures no applicant waits for batch processing cycles to learn their eligibility status.",
      },
      {
        question: "Can I update eligibility criteria mid-round?",
        answer:
          "Yes, but changes only apply to new submissions by default. You can optionally re-screen existing applications against updated criteria if needed. The system tracks which version of the criteria was applied to each application for full auditability and compliance purposes. This versioning ensures you can always explain why a specific decision was made based on the criteria that were active at the time.",
      },
    ],
    ctaText: "Screen Applicants Automatically",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant programs receiving 30-50% ineligible applications per round",
      "Operations teams wanting to free reviewer time for qualified applicants only",
      "Foundations with complex, multi-criteria eligibility requirements",
      "Government agencies requiring documented compliance with eligibility standards",
      "DAOs with community-defined eligibility rules for ecosystem grants",
      "Programs offering rolling applications that need real-time screening",
    ],
    testimonial: {
      quote:
        "Automated eligibility screening removed 40% of unqualified applications before they reached our reviewers. Our review committee now spends their time on proposals that actually meet our criteria.",
      author: "Priya Kapoor",
      role: "Program Director",
      organization: "Ethereum Foundation",
    },
    secondaryCta: {
      text: "Watch a Walkthrough",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Define Eligibility Criteria",
        description:
          "Set the requirements applicants must meet for each grant program, including organization type, geography, funding caps, and custom criteria with boolean logic.",
      },
      {
        title: "Publish Criteria for Self-Assessment",
        description:
          "Make eligibility requirements visible to prospective applicants so they can assess their fit before investing time in a full application.",
      },
      {
        title: "Applications Are Screened Instantly",
        description:
          "When an application is submitted, Karma evaluates it against your criteria in real time. Eligible applications advance to review while ineligible ones receive specific feedback.",
      },
      {
        title: "Review Overrides and Analytics",
        description:
          "Program managers can override edge-case decisions and monitor eligibility analytics to understand pass rates, common disqualification reasons, and trends over time.",
      },
    ],
  },
  {
    slug: "grant-reporting-analytics",
    title: "Grant Reporting and Analytics: Data-Driven Program Insights",
    metaDescription:
      "Generate grant reports and analytics effortlessly. Karma turns program data into actionable insights with real-time dashboards and exportable reports.",
    heading: "Turn Grant Program Data Into Actionable Insights",
    tldr: "Karma transforms raw grant program data into clear reports and analytics, giving program managers the insights they need to optimize funding allocation, demonstrate impact, and satisfy stakeholder reporting requirements.",
    problem: {
      heading: "Grant Reporting Is Manual, Painful, and Always Late",
      description:
        "Program managers spend days compiling grant reports from scattered data sources. Quarterly reports are outdated before they are finished. Boards and funders ask questions the data cannot answer because it was never structured to support analysis. The lack of real-time analytics means programs cannot course-correct during a funding round, and impact measurement remains more narrative than data.",
    },
    solution: {
      heading: "Always-On Analytics With Reports That Generate Themselves",
      description:
        "Karma structures all grant program data from day one, so reporting is a byproduct of normal operations rather than a separate workstream. Program managers access real-time analytics dashboards that answer common questions instantly, and they can generate formatted reports for stakeholders with a few clicks. Because Karma tracks milestones and payments onchain, the data underlying every report is verifiable and tamper-proof.",
    },
    capabilities: [
      "Real-time analytics dashboards covering funding, milestones, grantee performance, and outcomes",
      "One-click report generation for board presentations, funder updates, and governance reviews",
      "Customizable metrics and KPIs tailored to each grant program's goals",
      "Trend analysis showing how program performance evolves across funding rounds",
      "Grantee performance scorecards based on milestone completion and payment history",
      "Exportable data in multiple formats for external analysis or compliance requirements",
      "Onchain-verified data sources so every metric is traceable and auditable",
    ],
    faqs: [
      {
        question: "What metrics does Karma track for grant programs?",
        answer:
          "Karma tracks funding allocation and disbursement, milestone completion rates, time-to-milestone, grantee activity levels, application volumes, reviewer throughput, and custom KPIs you define. All metrics update in real time as program activity occurs, giving you a living picture of program health rather than periodic snapshots. You can also create derived metrics by combining standard indicators to match your organization's specific reporting framework.",
      },
      {
        question: "Can I create custom reports for different stakeholders?",
        answer:
          "Yes. You can configure different report templates for different audiences, such as a high-level summary for board members, a detailed operational report for program managers, or a public transparency report for the community. Each template can include different metrics, visualizations, and levels of detail. Templates are reusable across reporting periods, so setup is a one-time effort that pays off every quarter.",
      },
      {
        question: "How does onchain data improve reporting accuracy?",
        answer:
          "Because milestone completions and key program events are recorded as onchain attestations, the data in your reports is cryptographically verifiable. This eliminates the risk of self-reported metrics being inaccurate and gives stakeholders confidence in the numbers. Any data point can be traced back to its onchain source, creating an audit trail that satisfies even the most rigorous compliance and governance review requirements.",
      },
      {
        question: "Can I compare performance across multiple grant programs?",
        answer:
          "Yes. Karma's analytics support cross-program comparison, so you can benchmark program performance, identify best practices from top-performing programs, and allocate resources based on data rather than intuition. Side-by-side metrics help leadership make informed decisions about future funding allocation. You can compare programs by completion rate, time-to-milestone, funding efficiency, and any custom KPIs you define.",
      },
      {
        question: "What is the ROI of switching to automated grant reporting?",
        answer:
          "Most organizations save several days per quarter that were previously spent compiling manual reports. Beyond time savings, automated reporting improves decision-making by providing real-time data instead of stale snapshots. Programs can course-correct mid-round, stakeholders stay informed, and compliance documentation is always audit-ready. The compounding effect of better data-driven decisions often exceeds the direct time savings within the first year.",
      },
    ],
    ctaText: "Unlock Program Analytics",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Program managers spending days compiling quarterly reports manually",
      "Foundation leadership needing real-time visibility into program performance",
      "Compliance teams requiring audit-ready documentation of grant activities",
      "DAO governance delegates making data-driven funding allocation decisions",
      "Impact measurement teams quantifying outcomes across grant portfolios",
      "Board members requesting standardized reporting across multiple programs",
    ],
    testimonial: {
      quote:
        "Quarterly reporting used to take our team three full days. Now we generate stakeholder reports in minutes, and the data is always current because it updates in real time from onchain sources.",
      author: "David Kim",
      role: "VP of Programs",
      organization: "Protocol Labs",
    },
    secondaryCta: {
      text: "Explore Features",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Structure Your Program Data",
        description:
          "Karma organizes all grant data from day one: applications, milestones, payments, and reviews are captured in a structured format that supports analysis out of the box.",
      },
      {
        title: "Configure KPIs and Dashboards",
        description:
          "Choose the metrics that matter most to your program and set up real-time dashboards with custom views for different stakeholder audiences.",
      },
      {
        title: "Monitor Trends and Insights",
        description:
          "Track how program performance evolves across funding rounds. Identify grantee patterns, milestone bottlenecks, and funding allocation trends as they emerge.",
      },
      {
        title: "Generate and Export Reports",
        description:
          "Create formatted reports for board presentations, funder updates, or public transparency disclosures. All data is backed by onchain attestations for verifiability.",
      },
    ],
  },
  {
    slug: "grant-payment-tracking",
    title: "Grant Payment Tracking: Monitor Disbursements and Fund Flow",
    metaDescription:
      "Track grant payments and disbursements in real time. Karma provides full visibility into fund flow with milestone-linked payments and onchain records.",
    heading: "Track Every Grant Payment From Allocation to Disbursement",
    tldr: "Karma gives grant programs full visibility into payment flow, linking disbursements to verified milestones so funders know exactly where their capital goes and grantees get paid on time.",
    problem: {
      heading: "Grant Payments Are Opaque and Error-Prone",
      description:
        "Grant programs struggle to track where funds go after allocation. Payments are processed through multiple channels, reconciliation happens manually in spreadsheets, and there is no clear link between payments and the work they funded. Grantees face delayed payments with no visibility into when funds will arrive. Funders cannot trace their capital from allocation to impact, eroding trust in the program.",
    },
    solution: {
      heading: "End-to-End Payment Visibility Linked to Milestones",
      description:
        "Karma connects every payment to the milestone it funds, creating a clear trail from capital allocation to grantee disbursement. Program managers see real-time payment status across all grants, grantees know exactly when to expect funds, and funders can trace their capital through to verified deliverables. Payment records are stored onchain for permanent, auditable transparency.",
    },
    capabilities: [
      "Real-time payment status tracking across all grants and programs",
      "Milestone-linked disbursements that release funds upon verified completion",
      "Payment history with full audit trail for every transaction",
      "Multi-currency and multi-chain payment support for global grant programs",
      "Automated payment scheduling based on milestone verification",
      "Grantee payment portal showing upcoming, pending, and completed disbursements",
      "Fund utilization analytics showing burn rate and remaining allocation per grant",
    ],
    faqs: [
      {
        question: "How does milestone-linked payment work?",
        answer:
          "When you set up a grant, you assign a portion of the total funding to each milestone. When a grantee completes a milestone and a reviewer verifies it, the corresponding payment is automatically queued for disbursement. This ensures funds flow only to verified work and creates clear accountability. The entire payment-to-milestone link is recorded onchain, providing permanent proof that funds were disbursed for completed deliverables.",
      },
      {
        question: "Can grantees see when they will be paid?",
        answer:
          "Yes. Grantees have access to a payment portal showing their upcoming milestone payments, pending disbursements, and completed transactions. This transparency reduces payment-related support requests significantly and helps grantees plan their project budgets with confidence. The portal also shows the verification status of each milestone so grantees understand exactly where their submissions stand in the review and payment pipeline.",
      },
      {
        question: "Does Karma support both crypto and fiat payments?",
        answer:
          "Karma natively supports onchain payments across multiple blockchains including Ethereum, Optimism, Arbitrum, and others. For programs that also use fiat disbursements, payment records can be tracked alongside onchain transactions for a unified view of all fund flows. This hybrid approach ensures your payment tracking is complete regardless of the disbursement method used for each individual grant or milestone.",
      },
      {
        question: "How does payment tracking help with compliance?",
        answer:
          "Every payment in Karma is linked to a verified milestone and recorded with a full audit trail. This makes it straightforward to demonstrate to auditors and regulators that funds were disbursed for verified work, reducing compliance preparation time and providing permanent documentation. The onchain records serve as tamper-proof evidence that funding decisions followed your program's established verification and approval processes.",
      },
      {
        question: "Can I set spending limits or payment caps per grant?",
        answer:
          "Yes. You can define total funding caps, per-milestone payment amounts, and disbursement schedules for each grant. Karma enforces these limits automatically and alerts you if a payment would exceed the configured thresholds, preventing accidental overpayment and maintaining budget discipline. Budget controls can also be set at the program level to manage aggregate spending across all grants within a funding initiative.",
      },
    ],
    ctaText: "Track Grant Payments Transparently",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Treasury managers needing real-time visibility into fund disbursements",
      "Grant programs processing milestone-based payments across multiple chains",
      "Finance teams requiring audit-ready payment records for compliance",
      "Funders wanting to trace capital from allocation through to verified impact",
      "Grantees seeking transparent payment timelines and status updates",
      "Organizations managing multi-currency grant disbursements globally",
    ],
    testimonial: {
      quote:
        "Linking payments to verified milestones eliminated the guesswork from our disbursement process. Our finance team can now trace every dollar from allocation to grantee delivery with onchain proof.",
      author: "Rachel Torres",
      role: "Finance Director",
      organization: "Polygon Foundation",
    },
    secondaryCta: {
      text: "Book a Demo",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Allocate Funding to Milestones",
        description:
          "When creating a grant, assign specific payment amounts to each milestone. This establishes a clear link between deliverables and disbursements from the start.",
      },
      {
        title: "Milestones Are Verified by Reviewers",
        description:
          "As grantees complete work and submit evidence, reviewers verify milestones against acceptance criteria. Verification triggers the payment queue automatically.",
      },
      {
        title: "Payments Are Disbursed and Recorded",
        description:
          "Verified milestone payments are processed through onchain transactions. Every disbursement is recorded with a full audit trail linking the payment to the verified work.",
      },
      {
        title: "Monitor Fund Flow in Real Time",
        description:
          "Track payment status, burn rates, and remaining allocations across your entire grant portfolio. Generate financial reports for stakeholders and compliance teams on demand.",
      },
    ],
  },
  {
    slug: "multi-program-grant-management",
    title: "Multi-Program Grant Management: One Platform for All Programs",
    metaDescription:
      "Manage multiple grant programs from a single platform. Karma unifies applications, reviews, milestones, and payments across all your funding initiatives.",
    heading: "Manage All Your Grant Programs From One Platform",
    tldr: "Karma lets organizations run multiple grant programs from a single platform with shared infrastructure but independent configurations, eliminating the tool sprawl and data silos that come with managing programs separately.",
    problem: {
      heading: "Managing Multiple Grant Programs Means Managing Multiple Tools",
      description:
        "Organizations running more than one grant program end up with a different tool, spreadsheet, or process for each. Reviewers toggle between systems, program managers cannot compare performance across programs, and operations teams maintain multiple workflows that do essentially the same thing. Data is siloed, institutional knowledge is fragmented, and scaling to a new program means starting from scratch.",
    },
    solution: {
      heading: "Unified Infrastructure, Independent Program Control",
      description:
        "Karma provides a single platform where every grant program has its own configuration, reviewers, criteria, and workflows, but shares common infrastructure for applications, milestones, payments, and reporting. Program managers get autonomy over their programs while leadership gets cross-program visibility. Launching a new program takes minutes, not months, because you build on proven templates rather than starting over.",
    },
    capabilities: [
      "Independent program configurations for applications, review criteria, and workflows",
      "Shared reviewer pools with program-specific assignments and permissions",
      "Cross-program analytics and reporting for organizational leadership",
      "Program templates that let you launch new initiatives from proven configurations",
      "Centralized grantee profiles showing activity across all programs",
      "Unified payment processing with per-program budget tracking",
      "Role-based access control at both organization and program levels",
    ],
    faqs: [
      {
        question: "Can each program have its own application form and review process?",
        answer:
          "Yes. Every program on Karma has fully independent configuration, including custom application forms, eligibility criteria, review rubrics, milestone structures, and payment schedules. Programs share platform infrastructure but operate independently, giving program managers full autonomy over their specific initiatives. You can also clone configurations from existing programs as templates when launching new ones, saving significant setup time.",
      },
      {
        question: "Can reviewers work across multiple programs?",
        answer:
          "Yes. Reviewers can be assigned to multiple programs with different roles in each. A reviewer might be a lead reviewer in one program and a secondary reviewer in another, with appropriate permissions for each. This flexibility maximizes your reviewer pool without creating duplicate accounts or fragmented workflows. Reviewers see a unified dashboard of their assignments across all programs they participate in.",
      },
      {
        question: "How does cross-program reporting work?",
        answer:
          "Karma aggregates data across all programs so leadership can compare funding allocation, milestone completion rates, and grantee performance at the organizational level. You can also drill down into individual programs for detailed analysis, making it easy to identify best practices and allocate resources effectively. Cross-program reports can be exported or shared with stakeholders who need a portfolio-level view of all funding activities.",
      },
      {
        question: "How quickly can I launch a new grant program?",
        answer:
          "If you use a template from an existing program, you can launch a new program in minutes. Just customize the configuration, add reviewers, and open applications. The platform infrastructure is already in place, so there is no setup overhead or technical deployment required. Organizations that previously spent weeks configuring new programs typically reduce launch time to under an hour with Karma's template system.",
      },
      {
        question: "Is multi-program management suitable for small organizations?",
        answer:
          "Yes. Even organizations running just two or three programs benefit from having unified infrastructure. You eliminate duplicate tools and processes, get cross-program visibility from day one, and can scale to additional programs without added complexity. The platform grows with your organization's grant-making ambitions, so you avoid the painful migration from single-program tools as your funding portfolio expands over time.",
      },
    ],
    ctaText: "Unify Your Grant Programs",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Foundations operating three or more grant programs simultaneously",
      "Organizations scaling from a single program to a multi-program portfolio",
      "DAO ecosystems running developer grants, community grants, and retroactive funding",
      "Corporate philanthropy teams managing regional grant initiatives globally",
      "Government agencies coordinating grants across departments or agencies",
      "Consortium-based funding bodies with multiple thematic focus areas",
    ],
    testimonial: {
      quote:
        "We went from managing four programs in four different tools to one unified platform. Cross-program reporting alone saved us twenty hours per month, and launching new programs now takes minutes.",
      author: "Michael Chang",
      role: "Chief Grants Officer",
      organization: "Compound Grants",
    },
    secondaryCta: {
      text: "Watch a Walkthrough",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Create Your Organization",
        description:
          "Set up your organization on Karma with global settings, branding, and role-based access controls that apply across all grant programs you manage.",
      },
      {
        title: "Configure Individual Programs",
        description:
          "Create each grant program with its own application forms, eligibility criteria, review workflows, milestone structures, and payment schedules. Use templates to accelerate setup.",
      },
      {
        title: "Assign Reviewers and Roles",
        description:
          "Add reviewers to one or more programs with appropriate permissions for each. Shared reviewer pools maximize your evaluation capacity without duplicating effort.",
      },
      {
        title: "Monitor All Programs From One Dashboard",
        description:
          "Use cross-program analytics to compare performance, track funding allocation, and identify trends. Drill down into any program for detailed operational data.",
      },
    ],
  },
  {
    slug: "automated-grantee-reminders",
    title: "Automated Grantee Reminders: Keep Projects on Track",
    metaDescription:
      "Send automated reminders to grantees for milestone updates and deadlines. Karma keeps projects on track without manual follow-up from program managers.",
    heading: "Keep Grantees on Track With Automated Reminders",
    tldr: "Karma automatically reminds grantees about upcoming milestones, overdue updates, and pending actions, so program managers stop spending hours chasing people for status reports.",
    problem: {
      heading: "Program Managers Spend Too Much Time Chasing Grantees",
      description:
        "The most time-consuming part of grant management is not reviewing applications or making funding decisions. It is chasing grantees for updates. Program managers send dozens of follow-up emails per week, track who has responded in spreadsheets, and escalate to leadership when grantees go silent. This manual follow-up work is repetitive, low-value, and scales linearly with the number of grants, making it the biggest operational bottleneck in growing programs.",
    },
    solution: {
      heading: "Automated Follow-Up That Respects Everyone's Time",
      description:
        "Karma sends automated, contextual reminders to grantees based on their milestone schedule and update history. Reminders escalate gradually, from friendly nudges to formal notices, and adapt based on grantee responsiveness. Program managers get a dashboard showing which grantees have responded and which need personal follow-up, letting them focus their limited time on the cases that actually require human attention.",
    },
    capabilities: [
      "Configurable reminder schedules for milestones, updates, and deadlines",
      "Graduated escalation from gentle nudge to formal notice based on response history",
      "Per-program reminder templates with customizable messaging and tone",
      "Grantee response tracking showing who has updated and who has not",
      "Program manager dashboard highlighting grantees that need personal follow-up",
      "Quiet hours and frequency caps to avoid overwhelming grantees with notifications",
    ],
    faqs: [
      {
        question: "What types of reminders does Karma send?",
        answer:
          "Karma sends reminders for upcoming milestone deadlines, overdue milestone submissions, pending update requests, and any custom events you configure. Each reminder type has its own schedule and escalation rules, ensuring the right message reaches grantees at the right time without overwhelming them. You can preview the full reminder sequence for any grantee to understand exactly what communications they will receive and when.",
      },
      {
        question: "Can I customize the reminder messages?",
        answer:
          "Yes. Each program can have its own reminder templates with custom messaging, tone, and branding. You can also set different templates for different escalation levels, from friendly first reminders to more formal follow-ups. Templates support dynamic fields like grantee name, milestone title, and deadline date. You can preview how messages render before activating them to ensure your communications look professional and accurate.",
      },
      {
        question: "Will grantees get overwhelmed with too many reminders?",
        answer:
          "No. Karma includes frequency caps and quiet hours to prevent notification fatigue. You configure the maximum number of reminders per week and the hours during which reminders can be sent. Once a grantee responds, the reminder sequence stops automatically until the next milestone action is needed. Grantees can also set their own notification preferences to receive reminders through their preferred communication channel.",
      },
      {
        question: "How do I know which grantees need personal follow-up?",
        answer:
          "Karma's program manager dashboard highlights grantees who have not responded after multiple automated reminders. This lets you focus your personal outreach on the small number of cases that genuinely need human intervention, rather than spending time checking on grantees who are already responsive. The dashboard shows response history and escalation status so you have full context before reaching out to any unresponsive grantee.",
      },
      {
        question: "Can reminders be sent through channels other than email?",
        answer:
          "Karma supports in-platform notifications and email reminders. Grantees can configure their notification preferences to receive reminders through the channel that works best for them. The system tracks delivery and engagement across all channels to ensure important messages are not missed. Program managers can see which channels have the highest response rates and adjust their communication strategy accordingly for better results.",
      },
    ],
    ctaText: "Automate Grantee Follow-Up",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Program managers spending 10+ hours weekly chasing grantees for updates",
      "Grant programs with 50+ active grants and recurring milestone deadlines",
      "Organizations wanting consistent communication without manual follow-up",
      "Teams scaling their grant portfolio without adding operations headcount",
      "Programs experiencing low grantee update compliance rates",
      "Foundations seeking to improve grantee engagement and accountability",
    ],
    testimonial: {
      quote:
        "Automated reminders recovered about fifteen hours per week that our team was spending on manual follow-ups. Grantee update compliance went from 60% to 92% within two months.",
      author: "Aisha Patel",
      role: "Senior Program Manager",
      organization: "Aave Grants DAO",
    },
    secondaryCta: {
      text: "Explore Features",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Set Reminder Schedules Per Program",
        description:
          "Configure when and how often grantees receive reminders for upcoming deadlines, overdue milestones, and pending actions. Set frequency caps and quiet hours to prevent notification fatigue.",
      },
      {
        title: "Customize Message Templates",
        description:
          "Create reminder templates with your program's tone and branding. Set different messages for each escalation level, from friendly nudges to formal deadline notices.",
      },
      {
        title: "Reminders Send Automatically",
        description:
          "As milestone deadlines approach or pass, Karma sends contextual reminders to grantees based on their schedule and response history. The sequence adapts to each grantee's behavior.",
      },
      {
        title: "Focus on Cases That Need You",
        description:
          "Monitor the response dashboard to see which grantees have updated and which remain unresponsive after automated escalation. Direct your personal outreach where it matters most.",
      },
    ],
  },
  {
    slug: "grant-application-management",
    title: "Grant Application Management: End-to-End Application Workflow",
    metaDescription:
      "Manage grant applications from submission to decision. Karma provides a complete workflow for intake, review, approval, and applicant communication.",
    heading: "Manage Grant Applications From Submission to Funding Decision",
    tldr: "Karma provides an end-to-end grant application management workflow that takes applications from initial submission through review, approval, and onboarding, replacing the patchwork of forms, spreadsheets, and email threads most programs rely on.",
    problem: {
      heading: "Grant Applications Get Lost in Fragmented Workflows",
      description:
        "Most grant programs piece together their application workflow from disconnected tools: Google Forms for intake, spreadsheets for tracking, email for communication, and shared drives for document storage. Applications fall through the cracks between these systems, applicants get inconsistent communication, and program managers have no single view of where each application stands. As programs scale, this fragmented approach breaks down completely.",
    },
    solution: {
      heading: "One Workflow for the Entire Application Lifecycle",
      description:
        "Karma replaces the patchwork with a unified application management system. Applicants submit through structured forms, applications flow through configurable review stages, reviewers evaluate in a purpose-built interface, and decisions are communicated automatically. Every application has a clear status, every stage transition is logged, and program managers can see the entire pipeline at a glance. When an application is approved, it transitions seamlessly into the grant management phase with milestones and payments already structured.",
    },
    capabilities: [
      "Configurable multi-stage application workflows from submission to funding decision",
      "Structured application forms with conditional logic, file uploads, and validation",
      "Pipeline view showing all applications by status with bulk action support",
      "Automated applicant communication at each stage transition with custom templates",
      "Reviewer assignment and workload balancing across evaluation committees",
      "Decision recording with rationale capture for approved, waitlisted, and rejected applications",
      "Seamless transition from approved application to active grant with milestones and payments",
    ],
    faqs: [
      {
        question: "How many stages can a grant application workflow have?",
        answer:
          "As many as your program requires. Common configurations include submission, eligibility screening, expert review, committee review, and final decision, but you can add, remove, or rename stages to match your specific process. Each stage can have its own reviewers, criteria, and automation rules. You can also create conditional branches where applications follow different paths based on category, amount, or review scores.",
      },
      {
        question: "Can applicants check the status of their application?",
        answer:
          "Yes. Applicants can log in to see exactly where their application is in the review process, what stage it has reached, and whether any action is needed from them. Automated emails also notify applicants at each stage transition, keeping them informed without requiring program managers to send manual updates. This self-service visibility dramatically reduces the volume of status inquiry emails your team receives.",
      },
      {
        question: "How does Karma handle rejected applications?",
        answer:
          "Rejected applications receive automated notifications with the option to include specific feedback about why the application was not selected. You can configure whether to share detailed reviewer comments or a general decision notice, giving you control over how much information applicants receive. Rejected applicants can also be invited to reapply in future rounds, maintaining engagement with promising candidates who may improve their proposals.",
      },
      {
        question: "What happens after an application is approved?",
        answer:
          "Approved applications transition into active grants within Karma. The grant is created with milestones and payment schedules based on the approved proposal, and the grantee is onboarded into the milestone tracking workflow automatically. This seamless handoff eliminates manual data re-entry between the application and grant management phases. Grantees receive onboarding guidance so they understand how to submit milestone updates from day one.",
      },
      {
        question: "Can I reopen or reconsider a declined application?",
        answer:
          "Yes. Program managers can move applications between stages at any time, including reopening declined applications for reconsideration. All stage transitions are logged for audit purposes, maintaining a complete history of every decision and status change throughout the application lifecycle. This flexibility is particularly valuable when additional funding becomes available or program priorities shift during an active round.",
      },
    ],
    ctaText: "Streamline Your Applications",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant programs replacing fragmented Google Forms and spreadsheet workflows",
      "Organizations processing 100+ applications per funding round",
      "Program managers needing pipeline visibility across all application stages",
      "Review committees requiring structured evaluation and workload balancing",
      "Foundations wanting automated applicant communication at every stage",
      "Teams transitioning from manual email-based application tracking",
    ],
    testimonial: {
      quote:
        "Moving from spreadsheets to Karma's application management gave us a pipeline view we never had before. We can see every application's status at a glance, and applicants get automatic updates at each stage.",
      author: "Tomasz Kowalski",
      role: "Grants Program Coordinator",
      organization: "Starknet Foundation",
    },
    secondaryCta: {
      text: "Book a Demo",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Design Your Application Workflow",
        description:
          "Configure the stages each application passes through, from submission and eligibility screening to expert review, committee evaluation, and final decision.",
      },
      {
        title: "Build Application Forms",
        description:
          "Create structured forms with conditional logic, file uploads, and validation rules. Applicants receive a clear, guided experience that captures all the information your reviewers need.",
      },
      {
        title: "Review and Decide",
        description:
          "Reviewers evaluate applications in a purpose-built interface with scoring rubrics and bulk actions. Decisions are recorded with rationale, and applicants are notified automatically.",
      },
      {
        title: "Transition to Grant Management",
        description:
          "Approved applications become active grants with milestones and payment schedules already in place. Grantees are onboarded into milestone tracking without any manual data re-entry.",
      },
    ],
  },
];
