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
      heading: "Why AI Grant Review Beats Manual Evaluation Every Time",
      description:
        "Most grant programs still review applications by hand. Reviewers read hundreds of proposals each round and burn out fast. Scoring criteria drift as fatigue sets in across long sessions. Top evaluators leave because the workload crushes them. Delayed decisions frustrate applicants who wait weeks for answers. Programs miss high-impact projects buried in the pile.",
    },
    solution: {
      heading: "Smarter AI Grant Review That Scales With Your Program",
      description:
        "Karma brings AI grant review to your evaluation workflow. The system pre-screens applications against your criteria in seconds. It generates clear summaries and flags risks automatically. Reviewers focus only on shortlisted proposals that need human judgment. Every AI-assisted score stays transparent and auditable. Your funding decisions remain credible at any scale.",
    },
    capabilities: [
      "AI-generated application summaries with key metrics extracted automatically",
      "Configurable scoring rubrics that ensure consistent evaluation across all reviewers",
      "Automated risk flagging for duplicate applications, budget anomalies, and eligibility gaps",
      "Batch review workflows that let evaluators process applications in focused sessions",
      "Reviewer consensus tracking with disagreement highlighting for discussion",
      "Full audit trail of every review decision, accessible onchain for transparency",
      "Integration with existing reviewer committees and multi-stage evaluation pipelines",
      "Natural language search across all applications to find relevant proposals quickly",
    ],
    faqs: [
      {
        question: "Does the AI make the final funding decision?",
        answer:
          "No. Karma's AI helps reviewers by pre-screening, summarizing, and scoring applications. Human reviewers always make the final call. The AI boosts your team's capacity without removing human judgment. This keeps accountability intact. It also cuts the time reviewers spend on routine triage work.",
      },
      {
        question: "How does AI grant review handle bias in evaluations?",
        answer:
          "The AI applies your scoring rubric the same way for every application. This removes the drift that happens when reviewers get tired. You can audit AI scores at any time. You can also adjust rubric weights to keep evaluations fair. Consistent scoring matters most with large applicant pools.",
      },
      {
        question: "Can I customize the review criteria for different grant programs?",
        answer:
          "Yes. Each grant program on Karma gets its own scoring rubric and review workflow. The AI adapts to your specific requirements. You can weight criteria differently per program. You can add custom evaluation dimensions. You can also adjust thresholds to match your funding priorities.",
      },
      {
        question: "How much faster is AI-assisted review compared to manual review?",
        answer:
          "Programs using Karma see a 60-80% drop in time per application. Reviewers focus on the 20-30% that need deep evaluation. The AI handles initial screening and scoring for the rest. This efficiency gain grows as your program scales. Larger rounds benefit the most from automated pre-screening.",
      },
      {
        question: "What is the ROI of using AI for grant review?",
        answer:
          "Most organizations save significant reviewer hours in the first round. Programs with 200+ applications often recover platform costs through labor savings alone. You also get faster decisions and more consistent scores. Reviewer retention improves because burnout drops. The ROI compounds with each funding cycle.",
      },
      {
        question: "How does Karma protect the privacy of grant applications?",
        answer:
          "Karma stores application data securely with role-based access controls. Only assigned reviewers see the applications in their queue. The AI processes data within your program's boundaries. No application content trains external models. You control who sees what at every stage of the review process.",
      },
      {
        question: "Can I use AI grant review for retroactive funding rounds?",
        answer:
          "Yes. Karma supports retroactive funding evaluations alongside standard grant rounds. You define the scoring rubric for past work just like you would for proposals. The AI screens submissions against your criteria. Reviewers then evaluate the shortlist. This works well for ecosystem reward programs and retroactive public goods funding.",
      },
      {
        question: "What happens if a reviewer disagrees with the AI score?",
        answer:
          "Reviewers can override any AI-generated score. The system logs the override with the reviewer's rationale. This feedback helps improve future scoring accuracy. Disagreements between reviewers also get flagged for discussion. The final decision always rests with your human evaluation team.",
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
      heading: "Why Grant Milestone Tracking Breaks Down for Most Programs",
      description:
        "Most programs lack a reliable way to verify grantee progress. Updates arrive through scattered emails and Google Docs. Program managers chase grantees for status reports every week. Grantees submit vague updates with no proof of work. Funders cannot see whether their capital drives real results. This erodes trust and makes continued funding hard to justify.",
    },
    solution: {
      heading: "Smarter Grant Milestone Tracking With Onchain Proof",
      description:
        "Karma makes grant milestone tracking transparent and verifiable. Every grant gets clear milestones with deliverables and deadlines. Grantees submit evidence directly through the platform. Reviewers verify completions and record decisions onchain via EAS. The entire history stays publicly auditable. No more chasing updates or trusting unverifiable claims.",
    },
    capabilities: [
      "Structured milestone definitions with deliverables, deadlines, and acceptance criteria",
      "Onchain attestations for every milestone completion, creating a tamper-proof record",
      "Reviewer verification workflows with approve, request-changes, and reject actions",
      "Automated notifications when milestones are due, overdue, or completed",
      "Public milestone dashboards that funders and community members can browse",
      "Milestone-linked payment disbursement to release funds only upon verified completion",
      "Historical milestone data for evaluating grantee track records across programs",
      "Bulk milestone status view for program managers tracking dozens of active grants",
    ],
    faqs: [
      {
        question: "What does onchain milestone tracking actually mean?",
        answer:
          "Karma creates an attestation on the Ethereum Attestation Service when a reviewer verifies a milestone. This is a cryptographic record on the blockchain. It proves the milestone was completed at a specific time. No one can alter or delete it. Anyone can verify the attestation using the public blockchain record.",
      },
      {
        question: "Do grantees need crypto wallets to use milestone tracking?",
        answer:
          "Grantees need a wallet for onchain features. Karma supports multiple wallet providers and keeps the process simple. The blockchain parts work behind the scenes. Grantees focus on their deliverables, not on crypto mechanics. Wallet setup takes under two minutes with guided onboarding.",
      },
      {
        question: "Can milestone payments be automated based on completion?",
        answer:
          "Yes. Karma releases funds automatically once a reviewer verifies a milestone. This creates a clear incentive for timely delivery. It removes manual payment delays. Grantees get paid promptly when they deliver verified work. The payment link stays recorded onchain for full auditability.",
      },
      {
        question: "How do reviewers verify milestone completions?",
        answer:
          "Reviewers receive submissions with attached evidence like documents and demos. They approve, request changes, or reject based on predefined criteria. Karma records the review decision onchain for transparency. Reviewers can add comments to help grantees improve. The full history stays accessible to program managers.",
      },
      {
        question: "Can I track milestones across multiple grant programs?",
        answer:
          "Yes. Karma shows a unified view of milestones across all your programs. You see which grantees are on track at a glance. You also spot who falls behind schedule quickly. Cross-program analytics help identify patterns. This data helps you optimize future program design.",
      },
      {
        question: "What evidence can grantees submit for milestone verification?",
        answer:
          "Grantees can upload documents, screenshots, demo links, and code repositories. They can also add written descriptions of their work. The platform stores all evidence alongside the milestone record. Reviewers see everything in one place. This makes verification fast and thorough.",
      },
      {
        question: "How does grant milestone tracking help with funder reporting?",
        answer:
          "Every verified milestone becomes a data point in your program reports. Funders see real progress instead of self-reported narratives. The onchain record adds credibility to every claim. You can generate milestone reports with one click. This saves hours of manual reporting each quarter.",
      },
      {
        question: "Can grantees update milestones after the initial plan is set?",
        answer:
          "Yes. Program managers can approve milestone modifications when project scope changes. The system logs every change with a timestamp. Original milestones and updates both stay visible. This flexibility helps programs adapt without losing accountability. Reviewers see the full change history before making decisions.",
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
      heading: "Why Most Teams Lack a Real Grant Portfolio Dashboard",
      description:
        "Program managers juggle spreadsheets and disconnected tools daily. They piece together grant performance from emails and shared drives. Funders wait months for reports that arrive already outdated. No one can course-correct when grantees fall behind schedule. Funding allocation turns into guesswork without live data. Stakeholder reporting becomes a painful manual chore every quarter.",
    },
    solution: {
      heading: "A Grant Portfolio Dashboard That Updates in Real Time",
      description:
        "Karma gives you a grant portfolio dashboard with live data from every program. You see which grantees are on track at a glance. Funding allocation, milestones, and payments all appear in one view. Funders access portfolio performance without waiting for manual reports. Every data point links back to onchain attestations. The numbers you share with stakeholders are always verifiable.",
    },
    capabilities: [
      "Unified portfolio view across all grant programs with drill-down into individual grants",
      "Real-time milestone completion rates and grantee progress tracking",
      "Funding allocation breakdown showing disbursed, committed, and remaining capital",
      "Program-level performance metrics including completion rates and time-to-milestone",
      "Exportable reports for stakeholder presentations and governance reviews",
      "Customizable views with filters for program, status, category, and time period",
      "At-risk grant detection that highlights projects falling behind schedule",
      "Trend charts showing program health over weeks, months, and funding rounds",
    ],
    faqs: [
      {
        question: "What data does the grant portfolio dashboard show?",
        answer:
          "The dashboard shows funding allocation, milestone completion rates, and grantee progress. You see disbursed, committed, and remaining capital in one view. You can drill down from the portfolio level to individual grants. All data updates in real time as activity happens. You always see the current state of your programs.",
      },
      {
        question: "Can funders and stakeholders access the dashboard?",
        answer:
          "Yes. Karma supports role-based access for external stakeholders. You give funders and board members read-only views. You control what each group can see. Stakeholders can bookmark views and get scheduled email summaries. They never need to ask you for a status update again.",
      },
      {
        question: "How is the dashboard data different from a spreadsheet report?",
        answer:
          "Spreadsheet reports are snapshots that go stale immediately. Karma's dashboard updates in real time as activity happens. The data comes from onchain attestations, so it is verifiable. This removes the manual effort of compiling reports. Stakeholders always see current, trustworthy information.",
      },
      {
        question: "Can I export data from the dashboard?",
        answer:
          "Yes. You export portfolio data in multiple formats for reports or analysis. Exports include onchain verification metadata for independent checks. You can schedule recurring exports or generate them on demand. Saved templates speed up regular reporting. Your team spends minutes instead of hours on stakeholder deliverables.",
      },
      {
        question: "Is the portfolio dashboard suitable for small grant programs?",
        answer:
          "Yes. The dashboard works well for programs managing ten to twenty grants. Real-time visibility saves time regardless of portfolio size. Small programs often benefit most from structured stakeholder reporting. You only pay for the features you use. The platform grows with your program as it scales.",
      },
      {
        question: "How does the dashboard handle multiple funding rounds?",
        answer:
          "Karma tracks each funding round separately within the same dashboard. You compare performance across rounds with side-by-side metrics. Historical data stays accessible for trend analysis. This helps you spot patterns and improve future rounds. You never lose visibility into past program activity.",
      },
      {
        question: "Can I set alerts for underperforming grants?",
        answer:
          "Yes. You configure alert thresholds for milestone delays and low activity. Karma notifies you when grants fall behind schedule. You act early before small issues become big problems. Alerts go to program managers via email or in-platform notifications. This proactive monitoring saves time compared to manual check-ins.",
      },
      {
        question: "Does the dashboard support custom KPIs?",
        answer:
          "Yes. You define custom metrics that matter to your organization. Karma tracks them alongside standard indicators like completion rates. Custom KPIs appear on your dashboard and in exported reports. This flexibility lets you measure what your stakeholders care about most. Setup takes just a few minutes per metric.",
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
      heading: "Why Automated Grant Intake Beats Manual Processing",
      description:
        "Every funding round starts the same way. Applications flood in through forms, emails, and portals. Someone checks each one for completeness by hand. Data entry errors creep into tracking systems. Operations staff burn out on repetitive tasks they could automate. The entire funding cycle slows down because intake is a bottleneck.",
    },
    solution: {
      heading: "Automated Grant Intake From Submission to Reviewer Queue",
      description:
        "Karma delivers automated grant intake from the moment someone applies. The platform validates each submission against your requirements. Incomplete applications trigger requests for missing information. Complete ones route to the right reviewer pool automatically. The entire intake pipeline runs without manual work. You keep full visibility and override control at every step.",
    },
    capabilities: [
      "Customizable application forms with conditional fields and validation rules",
      "Automatic completeness checks that flag missing documents or information",
      "Smart routing to assign applications to reviewer pools based on topic, amount, or region",
      "Duplicate detection to catch resubmitted or overlapping applications",
      "Applicant notification system for submission confirmation and status updates",
      "Batch import support for migrating applications from external systems",
      "Intake analytics showing submission volume, completion rates, and processing time",
      "Multi-language form support for global grant programs accepting international applicants",
    ],
    faqs: [
      {
        question: "Can I customize the grant application form for each program?",
        answer:
          "Yes. Each program gets its own form with custom fields and conditional logic. You build it once and Karma handles the rest. Validation, routing, and notifications all run automatically. You can duplicate forms across programs to save setup time. This cuts launch effort for new funding rounds significantly.",
      },
      {
        question: "What happens when an application is incomplete?",
        answer:
          "Karma spots missing information and notifies the applicant right away. The application stays pending until all required fields are filled. Incomplete submissions never reach your reviewers. Applicants see exactly what they need to fix. This automated follow-up improves completion rates compared to manual outreach.",
      },
      {
        question: "How does automated routing work?",
        answer:
          "You define rules based on grant category, amount, or geographic focus. Karma routes validated applications to the matching reviewer pool. You can override any assignment manually. The system improves routing suggestions over time. Rules scale from simple to complex based on your needs.",
      },
      {
        question: "Can I import applications from other platforms?",
        answer:
          "Yes. Karma supports batch import from spreadsheets and other tools. The import process validates each application against your requirements. It flags issues that need manual attention. You keep all your data during the transition. This makes consolidating applications from multiple sources straightforward.",
      },
      {
        question: "How much does automated grant intake cost?",
        answer:
          "Automated intake comes included in all Karma plans. There are no per-application fees. The system works the same for fifty or five thousand applications. Pricing scales with your program's broader needs. Contact our team for a custom quote based on your volume.",
      },
      {
        question: "How does automated intake handle duplicate applications?",
        answer:
          "Karma checks every submission against existing applications in your system. It flags potential duplicates based on applicant identity and proposal content. Program managers review flagged entries and decide how to proceed. This prevents the same project from consuming multiple review slots. Duplicate detection runs automatically on every submission.",
      },
      {
        question: "Can applicants save and resume their application later?",
        answer:
          "Yes. Applicants can save their progress and return to finish later. Karma stores partial submissions securely. Applicants pick up right where they left off. This reduces abandonment rates for longer application forms. The platform sends reminders to applicants with unfinished drafts.",
      },
      {
        question: "Does automated intake work for rolling admissions?",
        answer:
          "Yes. The intake system processes applications in real time. It works for both round-based and rolling admission programs. Each submission gets validated and routed the moment it arrives. There is no batch processing delay. Applicants receive instant confirmation that their submission was received.",
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
      heading: "Without Grant Eligibility Screening, Reviewers Waste Hours",
      description:
        "About 30-50% of applications fail basic eligibility in most programs. Reviewers still open, read, and reject them by hand. This wastes hours of skilled evaluator time every round. Applicants wait weeks for rejections that could have been instant. The entire funding cycle slows down unnecessarily. Everyone involved gets frustrated by the inefficiency.",
    },
    solution: {
      heading: "Grant Eligibility Screening That Works Instantly",
      description:
        "Karma automates grant eligibility screening for every submission. You define criteria like organization type, geography, and funding caps. The platform screens each application the moment it arrives. Eligible ones move to review right away. Ineligible applicants get clear feedback on what they missed. Your reviewers never waste time on unqualified submissions.",
    },
    capabilities: [
      "Rule-based eligibility engine supporting boolean logic, ranges, and conditional criteria",
      "Instant screening at submission time with real-time feedback to applicants",
      "Configurable criteria per program including organization type, geography, and funding caps",
      "Override controls for program managers to manually qualify edge-case applications",
      "Eligibility analytics showing pass rates, common disqualification reasons, and trends",
      "Transparent criteria publishing so applicants can self-assess before applying",
      "Version-controlled criteria with audit trail showing which rules applied to each application",
      "Soft criteria mode that generates warnings instead of hard rejections for borderline cases",
    ],
    faqs: [
      {
        question: "What types of eligibility criteria can I define?",
        answer:
          "Karma supports criteria for organization type, geography, funding amount, and grant history. You can add technical requirements and custom fields too. Criteria combine with AND/OR logic for complex rules. You set different criteria per funding track within the same program. This targeted screening keeps each track focused on the right applicants.",
      },
      {
        question: "Can applicants see why they were screened out?",
        answer:
          "Yes. Applicants receive specific feedback about which requirements they missed. This helps them improve future submissions. It also reduces support inquiries to your team. You control how much detail applicants see. Transparency builds trust in your program's fairness.",
      },
      {
        question: "What if an applicant is borderline eligible?",
        answer:
          "Program managers can override any automated screening decision. The override gets logged for audit purposes. Borderline applications get flagged for manual review instead of auto-rejection. You can also set up soft criteria that warn instead of reject. This gives you flexibility while keeping full accountability.",
      },
      {
        question: "Does eligibility screening work for rolling applications or just rounds?",
        answer:
          "It works for both. The screening engine processes submissions in real time. Applicants get instant feedback no matter when they apply. Eligible applications route to review immediately. There is no batch processing delay. This works the same for round-based, rolling, and hybrid programs.",
      },
      {
        question: "Can I update eligibility criteria mid-round?",
        answer:
          "Yes. Changes apply to new submissions by default. You can optionally re-screen existing applications against updated criteria. The system tracks which version applied to each application. This versioning supports full auditability. You can always explain why a decision was made.",
      },
      {
        question: "How does eligibility screening reduce reviewer workload?",
        answer:
          "The system filters out unqualified applications before reviewers see them. Programs typically remove 30-50% of submissions this way. Reviewers spend their time on proposals that meet your standards. This cuts review cycles significantly. Your evaluation team focuses on quality instead of quantity.",
      },
      {
        question: "Can I screen for past grant performance?",
        answer:
          "Yes. Karma checks applicant history across your programs. You see if an applicant completed prior milestones or missed deadlines. This track record data informs eligibility decisions automatically. Repeat applicants with strong histories get flagged positively. This rewards reliable grantees and protects your funding.",
      },
      {
        question: "Does screening work for programs with multiple funding tracks?",
        answer:
          "Yes. Each funding track within a program can have its own eligibility rules. An applicant might qualify for one track but not another. Karma screens against the specific track the applicant selected. You manage all tracks from one interface. This keeps multi-track programs organized and fair.",
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
      heading: "Grant Reporting Analytics Are Missing From Most Programs",
      description:
        "Program managers spend days compiling reports from scattered sources. Quarterly updates are outdated before anyone reads them. Boards ask questions the data cannot answer. Programs lack the structure to support real analysis. Teams cannot course-correct during a funding round without live data. Impact measurement stays narrative instead of numbers-driven.",
    },
    solution: {
      heading: "Grant Reporting Analytics That Run on Autopilot",
      description:
        "Karma structures your grant reporting analytics from day one. Reporting becomes a byproduct of normal operations. Program managers access real-time dashboards that answer questions instantly. They generate formatted reports for stakeholders in a few clicks. Onchain attestations back every data point. Your reports stay verifiable and tamper-proof without extra effort.",
    },
    capabilities: [
      "Real-time analytics dashboards covering funding, milestones, grantee performance, and outcomes",
      "One-click report generation for board presentations, funder updates, and governance reviews",
      "Customizable metrics and KPIs tailored to each grant program's goals",
      "Trend analysis showing how program performance evolves across funding rounds",
      "Grantee performance scorecards based on milestone completion and payment history",
      "Exportable data in multiple formats for external analysis or compliance requirements",
      "Onchain-verified data sources so every metric is traceable and auditable",
      "Scheduled report delivery to stakeholders via email on your chosen cadence",
    ],
    faqs: [
      {
        question: "What metrics does Karma track for grant programs?",
        answer:
          "Karma tracks funding allocation, milestone completion rates, and grantee activity. It also monitors reviewer throughput and application volumes. You define custom KPIs that match your goals. All metrics update in real time as activity happens. You get a living picture of program health instead of stale snapshots.",
      },
      {
        question: "Can I create custom reports for different stakeholders?",
        answer:
          "Yes. You configure different report templates for each audience. Board members get high-level summaries. Program managers get detailed operational views. Community reports show public transparency data. Templates are reusable across reporting periods. Setup is a one-time effort that pays off every quarter.",
      },
      {
        question: "How does onchain data improve reporting accuracy?",
        answer:
          "Milestone completions and program events live as onchain attestations. This makes every data point cryptographically verifiable. Stakeholders trust the numbers because no one can alter them. Any metric traces back to its onchain source. This audit trail satisfies rigorous compliance requirements.",
      },
      {
        question: "Can I compare performance across multiple grant programs?",
        answer:
          "Yes. Karma supports cross-program comparison out of the box. You benchmark programs by completion rate and funding efficiency. Side-by-side metrics help leadership allocate resources wisely. You spot best practices from top-performing programs quickly. Custom KPIs work across comparisons too.",
      },
      {
        question: "What is the ROI of switching to automated grant reporting?",
        answer:
          "Most organizations save several days per quarter on manual reports. Real-time data improves decision-making during active rounds. Compliance documentation stays audit-ready at all times. Stakeholders stay informed without chasing your team. The compounding effect of better decisions often exceeds the direct time savings.",
      },
      {
        question: "How quickly can I generate a stakeholder report?",
        answer:
          "You generate a full report in under a minute. Select a template, choose the date range, and export. Karma pulls all data from your live dashboard. No manual data collection is needed. Scheduled reports can also deliver automatically to stakeholder inboxes.",
      },
      {
        question: "Does Karma support impact measurement beyond financial metrics?",
        answer:
          "Yes. You track custom outcome metrics alongside standard financial data. This includes developer activity, community growth, or any KPI you define. Grantees report outcomes through the same milestone workflow. Impact data flows into your reports automatically. This helps you tell a complete story to funders and boards.",
      },
      {
        question: "Can I visualize trends across multiple funding rounds?",
        answer:
          "Yes. Karma shows trend charts across weeks, months, and funding rounds. You see how completion rates and funding efficiency change over time. Pattern detection helps you improve future program design. Historical data stays accessible for as long as you need it. Trend views are exportable for external presentations.",
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
      heading: "Why Grant Payment Tracking Fails Without the Right Tools",
      description:
        "Programs struggle to track where funds go after allocation. Payments flow through multiple channels with no central record. Teams reconcile disbursements manually in spreadsheets. There is no clear link between payments and the work they funded. Grantees face delays with no visibility into when money arrives. Funders lose trust when they cannot trace their capital to results.",
    },
    solution: {
      heading: "Grant Payment Tracking Linked to Verified Milestones",
      description:
        "Karma connects grant payment tracking to every milestone in your program. Each disbursement links to the verified work it funds. Program managers see real-time payment status across all grants. Grantees know exactly when to expect their funds. Funders trace capital from allocation through to delivered results. Onchain records make every transaction permanently auditable.",
    },
    capabilities: [
      "Real-time payment status tracking across all grants and programs",
      "Milestone-linked disbursements that release funds upon verified completion",
      "Payment history with full audit trail for every transaction",
      "Multi-currency and multi-chain payment support for global grant programs",
      "Automated payment scheduling based on milestone verification",
      "Grantee payment portal showing upcoming, pending, and completed disbursements",
      "Fund utilization analytics showing burn rate and remaining allocation per grant",
      "Payment reconciliation dashboard matching disbursements to verified deliverables",
    ],
    faqs: [
      {
        question: "How does milestone-linked payment work?",
        answer:
          "You assign a funding amount to each milestone when setting up a grant. Karma queues the payment automatically when a reviewer verifies the milestone. Funds flow only to verified work. The payment link stays recorded onchain. This creates permanent proof of every disbursement.",
      },
      {
        question: "Can grantees see when they will be paid?",
        answer:
          "Yes. Grantees access a payment portal with upcoming and pending disbursements. They see the verification status of each milestone. This helps them plan project budgets with confidence. Payment visibility reduces support requests significantly. Grantees always know where their submissions stand.",
      },
      {
        question: "Does Karma support both crypto and fiat payments?",
        answer:
          "Karma supports onchain payments across Ethereum, Optimism, Arbitrum, and more. You can also track fiat disbursements alongside onchain transactions. This gives you a unified view of all fund flows. Your tracking stays complete regardless of payment method. The hybrid approach works for programs using mixed disbursement channels.",
      },
      {
        question: "How does payment tracking help with compliance?",
        answer:
          "Every payment links to a verified milestone with a full audit trail. You demonstrate to auditors that funds went to verified work. Onchain records serve as tamper-proof evidence. Compliance preparation time drops significantly. Your documentation stays audit-ready at all times.",
      },
      {
        question: "Can I set spending limits or payment caps per grant?",
        answer:
          "Yes. You define funding caps and per-milestone amounts for each grant. Karma enforces limits automatically and alerts you before overpayment. Budget controls also work at the program level. This prevents accidental overspending across your portfolio. You maintain financial discipline without manual checks.",
      },
      {
        question: "How does Karma handle payment delays or disputes?",
        answer:
          "The platform flags delayed payments in your dashboard automatically. You see which disbursements are overdue and why. Grantees can raise payment inquiries through the platform. Program managers resolve disputes with full transaction history visible. Every action and resolution gets logged for accountability.",
      },
      {
        question: "Can I track payments across multiple blockchain networks?",
        answer:
          "Yes. Karma supports multi-chain payment tracking natively. You monitor disbursements across Ethereum, Optimism, Arbitrum, and other networks. All transactions appear in one unified dashboard. Cross-chain reporting works automatically. This simplifies treasury management for programs funding across ecosystems.",
      },
      {
        question: "What reports can I generate from payment data?",
        answer:
          "You generate financial summaries, disbursement timelines, and burn rate reports. Reports link every payment to its verified milestone. You export data for external auditors or board presentations. Scheduled reports deliver to stakeholders automatically. All financial data stays backed by onchain proof.",
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
      heading: "Multi-Program Grant Management Fails With Scattered Tools",
      description:
        "Organizations running several grant programs end up with a different tool for each. Reviewers toggle between disconnected systems daily. Program managers cannot compare performance across initiatives. Operations teams maintain duplicate workflows doing the same thing. Data stays siloed and institutional knowledge fragments. Launching a new program means starting from scratch every time.",
    },
    solution: {
      heading: "Multi-Program Grant Management on One Unified Platform",
      description:
        "Karma brings multi-program grant management into a single platform. Every program keeps its own configuration and workflows. They all share common infrastructure for applications, milestones, and payments. Program managers get full autonomy over their initiatives. Leadership gets cross-program visibility instantly. Launching a new program takes minutes using proven templates.",
    },
    capabilities: [
      "Independent program configurations for applications, review criteria, and workflows",
      "Shared reviewer pools with program-specific assignments and permissions",
      "Cross-program analytics and reporting for organizational leadership",
      "Program templates that let you launch new initiatives from proven configurations",
      "Centralized grantee profiles showing activity across all programs",
      "Unified payment processing with per-program budget tracking",
      "Role-based access control at both organization and program levels",
      "Program cloning to duplicate a working setup for new funding initiatives in minutes",
    ],
    faqs: [
      {
        question: "Can each program have its own application form and review process?",
        answer:
          "Yes. Every program gets fully independent configuration. This includes application forms, eligibility criteria, and review rubrics. Programs share platform infrastructure but run independently. You clone configurations from existing programs as templates. This saves significant setup time when launching new initiatives.",
      },
      {
        question: "Can reviewers work across multiple programs?",
        answer:
          "Yes. You assign reviewers to multiple programs with different roles in each. A reviewer can lead evaluation in one program and assist in another. Permissions adjust per program automatically. Reviewers see all their assignments in one unified dashboard. This maximizes your evaluator pool without duplicate accounts.",
      },
      {
        question: "How does cross-program reporting work?",
        answer:
          "Karma aggregates data across all programs for leadership. You compare funding allocation and completion rates at the org level. Drill down into individual programs for detailed analysis. Cross-program reports export easily for stakeholders. This helps you identify best practices and allocate resources wisely.",
      },
      {
        question: "How quickly can I launch a new grant program?",
        answer:
          "You launch a new program in minutes using a template. Customize the configuration, add reviewers, and open applications. No technical deployment or setup overhead is needed. Organizations that spent weeks on setup now finish in under an hour. The platform infrastructure handles everything behind the scenes.",
      },
      {
        question: "Is multi-program management suitable for small organizations?",
        answer:
          "Yes. Even two or three programs benefit from unified infrastructure. You eliminate duplicate tools and processes immediately. Cross-program visibility starts from day one. The platform grows with your ambitions. You avoid painful migrations as your funding portfolio expands.",
      },
      {
        question: "How does Karma handle programs with different funding currencies?",
        answer:
          "Each program can use its own funding currency or token. Karma tracks payments across multiple chains and currencies. Portfolio-level reporting normalizes amounts for comparison. This works for organizations funding across different blockchain ecosystems. Treasury managers see a unified view regardless of payment diversity.",
      },
      {
        question: "Can I move grantees between programs?",
        answer:
          "Yes. Grantee profiles persist across your organization. You can invite existing grantees to new programs without re-onboarding. Their track record from prior programs stays visible. This helps you reward reliable grantees with new opportunities. Cross-program grantee history informs better funding decisions.",
      },
      {
        question: "How do permissions work across multiple programs?",
        answer:
          "Karma supports role-based access at both organization and program levels. Organization admins see everything across all programs. Program managers control only their assigned initiatives. Reviewers access only their queued applications. This layered permission model scales cleanly as your portfolio grows.",
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
      heading: "Without Automated Grantee Reminders, Teams Burn Out",
      description:
        "Chasing grantees for updates consumes the most time in grant management. Program managers send dozens of follow-up emails every week. They track responses in spreadsheets that go stale fast. Silent grantees force escalation to leadership. This repetitive work scales linearly with your portfolio size. It becomes the biggest operational bottleneck as programs grow.",
    },
    solution: {
      heading: "Automated Grantee Reminders That Escalate Smartly",
      description:
        "Karma sends automated grantee reminders based on milestone schedules and response history. Reminders escalate gradually from friendly nudges to formal notices. The system adapts to each grantee's responsiveness. Program managers see a dashboard of who responded and who needs attention. Your team focuses only on cases that require personal outreach. Everyone else stays on track automatically.",
    },
    capabilities: [
      "Configurable reminder schedules for milestones, updates, and deadlines",
      "Graduated escalation from gentle nudge to formal notice based on response history",
      "Per-program reminder templates with customizable messaging and tone",
      "Grantee response tracking showing who has updated and who has not",
      "Program manager dashboard highlighting grantees that need personal follow-up",
      "Quiet hours and frequency caps to avoid overwhelming grantees with notifications",
      "Reminder analytics showing open rates, response rates, and escalation trends",
      "Bulk reminder controls for sending program-wide announcements alongside automated sequences",
    ],
    faqs: [
      {
        question: "What types of reminders does Karma send?",
        answer:
          "Karma sends reminders for upcoming deadlines and overdue submissions. It also covers pending update requests and custom events you define. Each type has its own schedule and escalation rules. You preview the full sequence for any grantee. This ensures the right message reaches them at the right time.",
      },
      {
        question: "Can I customize the reminder messages?",
        answer:
          "Yes. Each program gets its own templates with custom messaging and tone. You set different templates for each escalation level. Templates support dynamic fields like grantee name and deadline. You preview how messages render before activating them. This keeps your communications professional and accurate.",
      },
      {
        question: "Will grantees get overwhelmed with too many reminders?",
        answer:
          "No. Karma includes frequency caps and quiet hours. You set the maximum reminders per week and allowed sending hours. The sequence stops automatically when a grantee responds. It resumes only when the next action is due. Grantees can also set their own notification preferences.",
      },
      {
        question: "How do I know which grantees need personal follow-up?",
        answer:
          "The dashboard highlights grantees who ignored multiple automated reminders. You focus personal outreach on the few who genuinely need it. Response history and escalation status give you full context. You stop wasting time on grantees who are already on track. This targeted approach saves hours every week.",
      },
      {
        question: "Can reminders be sent through channels other than email?",
        answer:
          "Karma supports in-platform notifications alongside email. Grantees choose their preferred channel in notification settings. The system tracks delivery and engagement across all channels. Program managers see which channels get the best response rates. This data helps you optimize your communication strategy.",
      },
      {
        question: "How do automated reminders improve milestone completion rates?",
        answer:
          "Programs using Karma's reminders see completion rates rise by 20-30% on average. Grantees receive timely nudges before deadlines pass. Early reminders prevent overdue submissions from piling up. The graduated escalation catches stragglers before they fall too far behind. This keeps your entire portfolio moving forward consistently.",
      },
      {
        question: "Can I pause reminders for specific grantees?",
        answer:
          "Yes. You pause reminders for individual grantees at any time. This is useful when a project faces legitimate delays. The pause logs the reason for audit purposes. You resume the sequence whenever the grantee is ready. This flexibility respects real-world project challenges.",
      },
      {
        question: "Do reminders work for programs with irregular milestone schedules?",
        answer:
          "Yes. Karma triggers reminders based on each milestone's specific deadline. Irregular schedules work the same as regular ones. The system adapts to each grantee's unique timeline. You do not need uniform milestone intervals across your portfolio. This flexibility supports diverse project types within the same program.",
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
      heading: "Grant Application Management Falls Apart With Disconnected Tools",
      description:
        "Most programs piece together workflows from Google Forms, spreadsheets, and email. Applications fall through the cracks between these systems. Applicants get inconsistent updates about their status. Program managers have no single view of where things stand. Tracking breaks down as application volume grows. Scaling this patchwork approach is not possible.",
    },
    solution: {
      heading: "Complete Grant Application Management in One Platform",
      description:
        "Karma handles grant application management from submission through funding decision. Applicants submit through structured forms with built-in validation. Applications flow through configurable review stages automatically. Reviewers evaluate proposals in a purpose-built interface. Every status change gets logged and communicated to applicants. Approved applications transition into active grants with milestones ready to go.",
    },
    capabilities: [
      "Configurable multi-stage application workflows from submission to funding decision",
      "Structured application forms with conditional logic, file uploads, and validation",
      "Pipeline view showing all applications by status with bulk action support",
      "Automated applicant communication at each stage transition with custom templates",
      "Reviewer assignment and workload balancing across evaluation committees",
      "Decision recording with rationale capture for approved, waitlisted, and rejected applications",
      "Seamless transition from approved application to active grant with milestones and payments",
      "Application search and filtering by keyword, category, score, and review stage",
    ],
    faqs: [
      {
        question: "How many stages can a grant application workflow have?",
        answer:
          "As many as your program needs. Common setups include submission, screening, expert review, and final decision. You add, remove, or rename stages to match your process. Each stage gets its own reviewers and automation rules. Conditional branches route applications based on category or score.",
      },
      {
        question: "Can applicants check the status of their application?",
        answer:
          "Yes. Applicants log in to see their application's current stage. They see whether any action is needed from them. Automated emails notify them at each stage transition. This self-service view cuts status inquiry emails dramatically. Your team stops answering the same questions repeatedly.",
      },
      {
        question: "How does Karma handle rejected applications?",
        answer:
          "Rejected applicants get automated notifications with optional feedback. You control whether to share detailed comments or a general notice. Rejected applicants can be invited to reapply in future rounds. This maintains engagement with promising candidates. It also gives applicants clear guidance for improving future proposals.",
      },
      {
        question: "What happens after an application is approved?",
        answer:
          "Approved applications become active grants automatically. Milestones and payment schedules carry over from the proposal. Grantees onboard into milestone tracking without manual re-entry. They receive guidance on how to submit updates. This seamless handoff saves hours of administrative work per grant.",
      },
      {
        question: "Can I reopen or reconsider a declined application?",
        answer:
          "Yes. Program managers move applications between stages at any time. You can reopen declined applications for reconsideration. All transitions get logged for audit purposes. This flexibility helps when new funding opens up. The full decision history stays visible throughout.",
      },
      {
        question: "How does the pipeline view help program managers?",
        answer:
          "The pipeline view shows every application organized by status. You see bottlenecks at a glance. Bulk actions let you move groups of applications together. Filters narrow the view by category, score, or reviewer. This visual overview replaces spreadsheet tracking entirely.",
      },
      {
        question: "Can I customize applicant communications at each stage?",
        answer:
          "Yes. Each stage transition triggers an automated message using your templates. You control the content, tone, and branding. Dynamic fields insert applicant-specific details automatically. This keeps communication consistent across hundreds of applications. Applicants feel informed without your team sending individual emails.",
      },
      {
        question: "How does reviewer workload balancing work?",
        answer:
          "Karma distributes applications across reviewers based on current workload. No single reviewer gets overloaded while others sit idle. You set maximum assignments per reviewer per round. The system tracks review progress in real time. Program managers intervene only when workload imbalances appear.",
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
