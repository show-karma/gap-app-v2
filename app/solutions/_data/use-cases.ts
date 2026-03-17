import { PAGES } from "@/utilities/pages";
import type { SolutionPage } from "./types";

export const useCasesSolutions: SolutionPage[] = [
  {
    slug: "streamline-grant-applications",
    title: "Streamline Grant Applications",
    metaDescription:
      "Simplify your grant application process with structured submissions, automated validation, and centralized tracking. Reduce time-to-funding with Karma.",
    heading: "How to Streamline Grant Applications",
    tldr: "Karma replaces scattered spreadsheets and email threads with a single platform where applicants submit structured proposals, reviewers score them with AI assistance, and program managers track every application from submission to approval.",
    problem: {
      heading: "Why You Struggle to Streamline Grant Applications with Manual Tools",
      description:
        "Most grant programs collect applications through Google Forms and email. Reviewers juggle multiple tabs to evaluate each proposal. Scoring stays inconsistent because no shared rubric exists. Submissions get lost in overflowing inboxes. Applicants never know where their proposal stands. These delays push funding timelines back by weeks or months.",
    },
    solution: {
      heading: "How Karma Helps You Streamline Grant Applications End to End",
      description:
        "Karma gives you a structured application flow from start to finish. Grantees submit proposals through a standardized interface. AI-powered review helps evaluators score each application consistently. The system flags incomplete submissions before they reach reviewers. Program managers see every application in a centralized dashboard. You streamline grant applications and cut turnaround time significantly.",
    },
    capabilities: [
      "Structured proposal submission with required fields and validation",
      "AI-assisted review that scores applications and highlights key details",
      "Centralized application dashboard with filtering and status tracking",
      "Automated notifications for applicants at each stage of review",
      "Configurable review rubrics tailored to your program criteria",
      "Bulk actions for processing multiple applications efficiently",
      "Template library for reusable application forms across rounds",
      "Duplicate detection to catch repeated or spam submissions early",
    ],
    faqs: [
      {
        question: "Can I customize the application form fields?",
        answer:
          "Yes. Program managers define required and optional fields. You add custom questions and set validation rules. Every submission meets your criteria before it reaches reviewers. You can also create reusable templates across funding rounds. This saves time so you never rebuild forms from scratch.",
      },
      {
        question: "How does AI-assisted review work?",
        answer:
          "Karma's AI analyzes each application against your rubric. It generates a summary score and highlights strengths. It also flags gaps in the submission. Reviewers use this as a starting point. They can override or adjust scores based on judgment. The AI improves as you refine your criteria over time.",
      },
      {
        question: "Can applicants track their submission status?",
        answer:
          "Yes. Applicants see real-time updates on their submissions. They know if their proposal is received, under review, or decided. Automated notifications go out at each stage. This removes the need for follow-up emails. Applicants stay informed without contacting your team.",
      },
      {
        question: "Does this integrate with existing grant platforms?",
        answer:
          "Karma works as a standalone platform. It also supports importing applications from external sources. Onchain attestations provide a permanent record of every decision. You can export data in standard formats for other systems. Karma fits into your workflow without replacing everything.",
      },
      {
        question: "How long does it take to set up an application pipeline?",
        answer:
          "Most program managers launch a pipeline within a day. You define form fields and set review criteria. Then you invite reviewers through the web interface. No developer involvement is needed. Starter templates help you get running fast.",
      },
      {
        question: "What happens if an applicant submits an incomplete proposal?",
        answer:
          "Karma validates submissions before they enter the review queue. Required fields must be filled before the applicant can submit. If something is missing, the system prompts the applicant to fix it. This keeps your reviewers focused on complete proposals only.",
      },
      {
        question: "Can I run multiple application rounds at the same time?",
        answer:
          "Yes. Karma supports parallel application rounds within one program. Each round has its own form, criteria, and reviewer pool. You manage them all from a single dashboard. This makes it easy to handle seasonal or rolling application cycles.",
      },
      {
        question: "How does Karma help reduce bias in the application process?",
        answer:
          "Structured rubrics ensure every reviewer evaluates the same dimensions. AI scoring provides a consistent baseline for comparison. Reviewers see the same data in the same format. This reduces the influence of writing style on outcomes. The result is fairer evaluations across all applicants.",
      },
    ],
    ctaText: "Streamline Your Applications",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant program managers handling 50+ applications per round",
      "Foundations transitioning from spreadsheets to structured workflows",
      "DAO grants committees seeking transparent application processes",
      "Government grant offices modernizing legacy intake systems",
      "Accelerator programs managing cohort-based applications",
      "Nonprofits receiving cross-border funding applications in multiple languages",
    ],
    testimonial: {
      quote:
        "We cut our application processing time from six weeks to ten days. Reviewers spend their time evaluating proposals instead of chasing missing information, and applicants finally have visibility into where they stand.",
      author: "Mariana Torres",
      role: "Grants Program Director",
      organization: "Meridian Foundation",
    },
    secondaryCta: {
      text: "See How Applications Work",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Configure Your Application Form",
        description:
          "Define required fields, custom questions, and validation rules tailored to your grant program criteria.",
      },
      {
        title: "Collect Structured Submissions",
        description:
          "Applicants submit proposals through a standardized interface that ensures completeness before review.",
      },
      {
        title: "Review with AI Assistance",
        description:
          "AI scores each application against your rubric while human reviewers focus on nuanced evaluation.",
      },
      {
        title: "Approve and Notify",
        description:
          "Approve successful applications with one click and automatically notify applicants of decisions at every stage.",
      },
    ],
  },
  {
    slug: "automate-grant-reviews",
    title: "Automate Grant Reviews",
    metaDescription:
      "Speed up grant reviews with AI-powered scoring, structured rubrics, and reviewer assignment. Cut review cycles from weeks to days with Karma.",
    heading: "Automate Your Grant Review Process",
    tldr: "Karma's AI review engine scores applications against your criteria, assigns reviewers automatically, and provides structured evaluation workflows that cut review cycles from weeks to days while improving consistency.",
    problem: {
      heading: "Manual Processes Make It Hard to Automate Grant Reviews",
      description:
        "Review committees spend hours reading proposals one by one. Reviewers apply criteria inconsistently across applications. Scheduling review meetings becomes a logistical nightmare. Without structured rubrics, outcomes depend on who reviews which proposal. Programs with hundreds of applicants face backlogs. These delays push funding decisions back by months.",
    },
    solution: {
      heading: "Automate Grant Reviews with AI Scoring and Structured Rubrics",
      description:
        "Karma lets you automate grant reviews using AI that evaluates proposals against your criteria. Each application gets a preliminary score with detailed reasoning. Structured rubrics ensure every reviewer evaluates the same dimensions. Automated assignment distributes workload evenly across your team. Human reviewers keep full control to accept or override any recommendation.",
    },
    capabilities: [
      "AI scoring engine that evaluates applications against configurable criteria",
      "Automated reviewer assignment with workload balancing",
      "Structured rubrics that enforce consistent evaluation across all reviewers",
      "Side-by-side comparison view for competing applications",
      "Review progress tracking with deadline alerts",
      "Audit trail of all review decisions and score justifications",
      "Batch review tools for processing high-volume programs",
      "Reviewer calibration reports to identify scoring inconsistencies",
    ],
    faqs: [
      {
        question: "Can I define my own review criteria?",
        answer:
          "Yes. You set the rubric dimensions, scoring scales, and weightings. Both AI and human reviewers evaluate against your criteria. You can create different rubrics for different grant categories. This gives you full flexibility over how each track is assessed.",
      },
      {
        question: "How accurate is the AI scoring?",
        answer:
          "The AI serves as a first-pass assistant. It flags incomplete applications and identifies strong candidates. It also provides reasoning for every score. Reviewers always have the final say. The system aligns better with your standards as you refine rubric weightings over time.",
      },
      {
        question: "Can multiple reviewers score the same application?",
        answer:
          "Yes. Karma supports multi-reviewer workflows. Each reviewer scores independently against the same rubric. The platform aggregates scores and highlights disagreements. This consensus approach reduces individual bias. Borderline applications get fair consideration from multiple perspectives.",
      },
      {
        question: "How does automated reviewer assignment work?",
        answer:
          "Karma distributes applications based on workload and expertise tags. You set maximum review loads per reviewer. Assignment rules route applications to evaluators with relevant knowledge. Reviewers get notifications when new applications arrive. They track their queue in a personal dashboard.",
      },
      {
        question: "What happens if a reviewer disagrees with the AI score?",
        answer:
          "Reviewers can override any AI score with their own assessment. They provide written justification for the change. The platform records both scores for a full audit trail. This keeps the process transparent. You get AI efficiency with human oversight built in.",
      },
      {
        question: "How long does it take to set up automated reviews?",
        answer:
          "Most teams configure their rubric and reviewer pool within a few hours. You define scoring dimensions and assign weights. Then you invite reviewers and set assignment rules. Karma handles the rest. No technical skills are needed to get started.",
      },
      {
        question: "Can I track how consistent my reviewers are?",
        answer:
          "Yes. Karma provides calibration reports that compare reviewer scores. You can spot reviewers who score consistently high or low. This helps you run calibration sessions. Consistent scoring leads to fairer outcomes for all applicants.",
      },
      {
        question: "Does automated review work for non-English applications?",
        answer:
          "Karma's AI supports multiple languages for review. It can score applications written in common languages. Reviewers see translated summaries alongside the original text. This makes cross-border grant programs easier to manage.",
      },
    ],
    ctaText: "Automate Your Reviews",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Programs receiving 100+ applications per funding round",
      "Review committees struggling with inconsistent scoring",
      "Grant managers seeking to reduce review cycle time",
      "Organizations with distributed reviewer teams across time zones",
      "Foundations scaling review capacity without adding headcount",
      "Nonprofit boards requiring audit-ready documentation of review decisions",
    ],
    testimonial: {
      quote:
        "Our review cycle dropped from five weeks to eight days. The AI pre-screening catches incomplete applications immediately, and structured rubrics mean our six reviewers finally score consistently without endless calibration meetings.",
      author: "David Okafor",
      role: "Head of Grants Operations",
      organization: "Catalyst DAO",
    },
    secondaryCta: {
      text: "Explore AI Review Features",
      href: PAGES.SOLUTIONS.DETAIL("ai-grant-review"),
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Define Your Review Rubric",
        description:
          "Set scoring dimensions, scales, and weightings that reflect your program's evaluation priorities.",
      },
      {
        title: "Assign Reviewers Automatically",
        description:
          "Karma distributes applications across your reviewer pool with balanced workloads and expertise matching.",
      },
      {
        title: "AI Pre-Screens Applications",
        description:
          "Each application receives an AI-generated score with detailed reasoning as a starting point for human review.",
      },
      {
        title: "Finalize Decisions with Human Oversight",
        description:
          "Reviewers accept, adjust, or override AI scores and submit final evaluations through a structured workflow.",
      },
    ],
  },
  {
    slug: "track-grant-milestones",
    title: "Track Grant Milestones Effectively",
    metaDescription:
      "Monitor grant milestones with onchain attestations, real-time dashboards, and automated progress alerts. Keep every funded project accountable with Karma.",
    heading: "Track Grant Milestones Effectively",
    tldr: "Karma lets program managers define milestones at the grant level, track progress in real time through dashboards, and record completions as onchain attestations, creating a permanent and verifiable record of grantee delivery.",
    problem: {
      heading: "Without the Right Tools, You Cannot Track Grant Milestones",
      description:
        "Funded projects often disappear after the check clears. Milestone updates arrive sporadically via email or Notion docs. No standard format exists for reporting progress. Program managers spend hours chasing grantees for updates. Stakeholders lack a clear picture of which projects are on track. This poor visibility leads to wasted funds and broken trust.",
    },
    solution: {
      heading: "Track Grant Milestones in Real Time with Onchain Verification",
      description:
        "Karma structures post-funding accountability with clear milestones. Programs define deliverables at the grant level. Grantees submit updates through the platform. Program managers review and approve each completion. Every approved milestone becomes an onchain attestation via EAS. Dashboards let you track grant milestones across your entire portfolio at a glance.",
    },
    capabilities: [
      "Customizable milestone definitions with deadlines and deliverables",
      "Grantee self-reporting through structured milestone update forms",
      "Program manager review and approval workflow for each milestone",
      "Onchain attestations via EAS for every completed milestone",
      "Portfolio-wide milestone dashboard with progress indicators",
      "Automated reminders for upcoming and overdue milestones",
      "Evidence attachment support for documents, links, and screenshots",
      "Milestone templates for common grant structures",
    ],
    faqs: [
      {
        question: "What are onchain attestations?",
        answer:
          "Onchain attestations are signed records stored on a blockchain. They use the Ethereum Attestation Service (EAS). Each one proves a milestone was completed and approved. No one can alter or delete these records. Anyone with the attestation ID can verify it independently.",
      },
      {
        question: "Can grantees submit evidence with their milestone updates?",
        answer:
          "Yes. Grantees attach links, documents, and screenshots to each update. Reviewers see all evidence alongside the milestone criteria. This structured evidence collection backs every decision with proof. It improves accountability across your entire portfolio.",
      },
      {
        question: "How do I see milestone progress across all my grants?",
        answer:
          "Karma provides a portfolio dashboard for this purpose. It shows completion rates, overdue items, and upcoming deadlines. You can filter by program, status, or date range. The dashboard updates in real time as grantees submit and reviewers approve.",
      },
      {
        question: "Can I set different milestones for different grants?",
        answer:
          "Yes. Each grant has its own milestones with unique deliverables. You can also create templates for common structures. Templates save time when onboarding new grantees. You adjust each template per grant as needed.",
      },
      {
        question: "What happens when a grantee misses a milestone deadline?",
        answer:
          "Karma sends automated reminders before deadlines. It flags overdue milestones in the dashboard. Program managers receive alerts and can extend deadlines. They can also request updated timelines or escalate the issue. The overdue status stays visible in all portfolio reports.",
      },
      {
        question: "How do onchain records help with future funding decisions?",
        answer:
          "Every milestone record is portable across programs. Future funders can review a grantee's delivery history. Strong track records help grantees win more funding. Poor records signal risk before money is committed. This creates healthy incentives for consistent delivery.",
      },
      {
        question: "Can I track milestones for grants funded outside Karma?",
        answer:
          "Yes. You can import existing grants and define milestones for them. The tracking and verification features work the same way. This lets you consolidate oversight in one place. You do not need to have processed the original application through Karma.",
      },
      {
        question: "Do grantees need blockchain experience to submit updates?",
        answer:
          "No. Grantees submit updates through a simple web form. Karma handles the onchain attestation in the background. Grantees do not need a wallet or any blockchain knowledge. The process feels like filling out any online form.",
      },
    ],
    ctaText: "Start Tracking Milestones",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Program managers overseeing 20+ active funded projects",
      "Foundations requiring verifiable proof of grantee delivery",
      "DAOs seeking transparent post-funding accountability",
      "Grant programs with complex multi-phase deliverables",
      "Organizations reporting milestone progress to governance bodies",
      "Research funders tracking deliverables across multi-year academic grants",
    ],
    testimonial: {
      quote:
        "Before Karma, we lost track of half our funded projects within three months. Now every milestone is visible in one dashboard, and onchain attestations give our stakeholders proof that funds are producing real results.",
      author: "Priya Sharma",
      role: "Program Manager",
      organization: "OpenBuild Grants",
    },
    secondaryCta: {
      text: "Learn About Onchain Attestations",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Define Milestones per Grant",
        description:
          "Set clear deliverables, deadlines, and success criteria for each funded project using templates or custom definitions.",
      },
      {
        title: "Grantees Submit Updates",
        description:
          "Grantees report progress through structured forms with supporting evidence attached to each milestone.",
      },
      {
        title: "Review and Approve",
        description:
          "Program managers evaluate milestone submissions against criteria and approve or request revisions.",
      },
      {
        title: "Record Onchain",
        description:
          "Every approved milestone is recorded as an onchain attestation via EAS, creating a permanent and verifiable delivery record.",
      },
    ],
  },
  {
    slug: "manage-grant-portfolios",
    title: "Manage Grant Portfolios at Scale",
    metaDescription:
      "Manage hundreds of grants in one dashboard with milestone tracking, impact metrics, and portfolio-level reporting. Scale grant management with Karma.",
    heading: "Manage Grant Portfolios at Scale",
    tldr: "Karma gives program managers a single dashboard to oversee hundreds of grants, track milestone progress across all funded projects, and generate portfolio-level reports for stakeholders and governance bodies.",
    problem: {
      heading: "Growing Programs Struggle to Manage Grant Portfolios Effectively",
      description:
        "Each grant has its own timeline, milestones, and reporting needs. Program managers end up juggling spreadsheets and chat threads. No single view shows portfolio health at a glance. At-risk projects hide until it is too late to intervene. Stakeholders ask questions no one can answer quickly. Managing a portfolio this way breaks down as the program grows.",
    },
    solution: {
      heading: "One Dashboard to Manage Grant Portfolios Across All Programs",
      description:
        "Karma aggregates all funded projects into one portfolio dashboard. You see real-time status, milestone completion rates, and key metrics. Filter by program, status, or funding round to focus on what matters. Generate portfolio-level reports for governance or donors in a few clicks. When a project falls behind, you see it right away. You manage grant portfolios efficiently without switching between tools.",
    },
    capabilities: [
      "Portfolio dashboard with real-time status for all funded grants",
      "Filtering and sorting by program, round, status, or custom tags",
      "Aggregated milestone completion metrics across the portfolio",
      "CIDS-compatible reporting for stakeholder communication",
      "Exportable reports for governance bodies and donors",
      "Project health indicators that flag at-risk grants automatically",
      "Historical tracking to compare performance across funding rounds",
      "Custom tags and categories for organizing grants by theme or region",
    ],
    faqs: [
      {
        question: "How many grants can I manage on Karma?",
        answer:
          "There is no practical limit. Karma handles dozens to hundreds of grants at once. The dashboard scales with your portfolio. Performance stays consistent whether you track twenty or five hundred grants. Your workflow stays smooth as the program grows.",
      },
      {
        question: "Can I compare performance across different funding rounds?",
        answer:
          "Yes. Karma tracks historical data across rounds. You compare milestone completion rates and delivery timelines. This longitudinal view reveals trends over time. You can spot improving or declining grantees. It helps you refine your funding strategy with real evidence.",
      },
      {
        question: "What is CIDS reporting?",
        answer:
          "CIDS stands for Common Impact Data Standard. It provides a standardized format for reporting grant outcomes. Karma supports CIDS-compatible exports for interoperability. Your data works with other grant management systems. Reports follow a shared vocabulary that funders and peers understand.",
      },
      {
        question: "Can I tag and categorize grants within the portfolio?",
        answer:
          "Yes. Karma supports custom tags and categories for any grant. Group projects by theme, technology, or region. Filtered views focus on specific subsets of your portfolio. This makes targeted analysis easy. You assess performance within individual categories quickly.",
      },
      {
        question: "How do portfolio health indicators work?",
        answer:
          "Karma calculates health scores based on milestone completion and deadlines. Grants that fall behind trigger visual alerts. You also get optional email notifications. Program managers can intervene early. This prevents problems from hiding until the end-of-round review.",
      },
      {
        question: "Can I share portfolio dashboards with external stakeholders?",
        answer:
          "Yes. You can generate read-only dashboard links for stakeholders. They see project status and milestone progress in real time. You control which data is visible externally. This reduces the number of status update requests your team handles.",
      },
      {
        question: "How does Karma handle grants from multiple programs?",
        answer:
          "Karma supports multiple programs within one organization. Each program has its own criteria and milestones. The portfolio dashboard shows data across all programs. You can also filter to view one program at a time. This unified view simplifies oversight.",
      },
      {
        question: "Can I export portfolio data for external analysis?",
        answer:
          "Yes. Karma exports data in standard formats including CSV and CIDS. You feed this into your own analytics tools. Exports include milestone data, performance metrics, and summaries. This gives you full flexibility for custom analysis.",
      },
    ],
    ctaText: "Manage Your Portfolio",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Foundations managing 50+ concurrent grants across multiple programs",
      "DAO treasuries overseeing ecosystem funding allocations",
      "Grant program directors reporting to governance bodies",
      "Organizations running parallel grant tracks with shared oversight",
      "Impact investors monitoring portfolio-wide delivery metrics",
      "Government agencies consolidating oversight across multiple grant categories",
    ],
    testimonial: {
      quote:
        "We went from scrambling through five spreadsheets to seeing our entire 200-grant portfolio in a single view. The health indicators caught three at-risk projects weeks before they would have surfaced in our quarterly review.",
      author: "James Whitfield",
      role: "Portfolio Director",
      organization: "Horizon Grants Collective",
    },
    secondaryCta: {
      text: "View Portfolio Dashboard Demo",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Import Your Grants",
        description:
          "Add your funded projects to Karma through bulk import or manual entry with milestone definitions attached.",
      },
      {
        title: "Configure Dashboard Views",
        description:
          "Set up filters, tags, and custom categories to organize your portfolio by program, round, or theme.",
      },
      {
        title: "Monitor in Real Time",
        description:
          "Track milestone progress, health indicators, and upcoming deadlines across all grants from a single dashboard.",
      },
      {
        title: "Generate Portfolio Reports",
        description:
          "Export CIDS-compatible reports and stakeholder summaries directly from live data with a few clicks.",
      },
    ],
  },
  {
    slug: "improve-grant-accountability",
    title: "Improve Grant Accountability",
    metaDescription:
      "Strengthen grant accountability with onchain attestations, milestone verification, and transparent progress tracking. Build trust with Karma.",
    heading: "Improve Grant Accountability",
    tldr: "Karma makes grant accountability concrete by recording every milestone, review, and approval as an onchain attestation. Stakeholders can independently verify what was funded, what was delivered, and when, without relying on self-reported claims alone.",
    problem: {
      heading: "Trust-Based Models Fail to Improve Grant Accountability",
      description:
        "Most programs rely on grantees to self-report progress. No independent verification exists for milestone claims. Stakeholders cannot confirm whether funds were used as intended. Community members have no way to check delivery records. This erodes confidence in the entire program over time. Problems only surface when it is too late to act.",
    },
    solution: {
      heading: "Improve Grant Accountability with Verifiable Onchain Records",
      description:
        "Karma adds a verification layer to your grant program. Grantees submit milestone updates through the platform. Program managers review and approve each one. Every decision becomes an onchain attestation via EAS. These records are publicly verifiable by anyone. Stakeholders confirm delivery independently. This helps you improve grant accountability and build lasting trust.",
    },
    capabilities: [
      "Onchain attestations for every milestone approval and rejection",
      "Public project profiles showing verified delivery history",
      "Reviewer verification workflows with structured evidence requirements",
      "Stakeholder-facing dashboards for independent progress monitoring",
      "Historical accountability records across all funding rounds",
      "Community review integration for broader oversight",
      "Portable grantee reputation across programs using Karma",
      "Configurable visibility controls for public and private data",
    ],
    faqs: [
      {
        question: "How does onchain accountability differ from regular reporting?",
        answer:
          "Regular reports are documents that can be edited or lost. Onchain attestations are immutable blockchain records. Anyone can verify them independently. They provide cryptographic proof of what was approved and when. These records cannot be altered after the fact.",
      },
      {
        question: "Can community members see grant progress?",
        answer:
          "Yes. Karma provides public project profiles for every grantee. Anyone can view milestone history and approval records. Community members follow specific projects for updates. This creates oversight beyond the core program team. Transparency builds trust with your broader community.",
      },
      {
        question: "Does this replace trust in grantees?",
        answer:
          "No. It complements trust with verification. Honest grantees benefit from a verifiable track record. Strong records help them win future funding. The system creates accountability without assuming bad faith. High performers build a portable reputation across programs.",
      },
      {
        question: "What happens when a grantee misses a milestone?",
        answer:
          "Missed milestones appear in the dashboard and public profile. Program managers follow up or adjust timelines. The transparency ensures missed milestones cannot be overlooked. Grantees have a natural incentive to communicate about delays early. Stakeholders stay informed about delivery risks.",
      },
      {
        question: "Can accountability data be used across different programs?",
        answer:
          "Yes. Onchain attestations make delivery history portable. Any program manager can review a grantee's past performance. This rewards consistent delivery across the ecosystem. It also helps funders avoid teams with patterns of underdelivery. Cross-program visibility benefits everyone.",
      },
      {
        question: "How does accountability affect grantee behavior?",
        answer:
          "Programs using Karma report higher milestone completion rates. Grantees submit updates more consistently. They communicate delays proactively. Public visibility creates positive pressure without punishment. Better behavior leads to stronger outcomes across the portfolio.",
      },
      {
        question: "Can I use Karma for accountability without blockchain features?",
        answer:
          "Yes. The dashboards and milestone tracking work without onchain features. You still get structured verification and public profiles. Onchain attestations add an extra layer of trust. You can enable them later when your program is ready.",
      },
      {
        question: "How do governance bodies use accountability data?",
        answer:
          "Governance bodies access public dashboards and verified reports. They see delivery rates and milestone completion across the program. This data supports funding renewal decisions. It replaces anecdotal evidence with verifiable records. Governance votes become more informed and confident.",
      },
    ],
    ctaText: "Improve Accountability",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "DAO grant programs accountable to token-holder governance",
      "Foundations seeking verifiable proof of grantee delivery",
      "Programs rebuilding community trust after accountability failures",
      "Governance bodies requiring independent verification of fund usage",
      "Grant ecosystems promoting cross-program reputation building",
      "Impact investors requiring independent verification of fund deployment",
    ],
    testimonial: {
      quote:
        "Our community governance votes for grant funding increased by 40% after we adopted Karma. Token holders finally had verifiable proof that their funds were producing results, and that trust translated directly into stronger program support.",
      author: "Elena Vasquez",
      role: "Governance Lead",
      organization: "Nexus Protocol",
    },
    secondaryCta: {
      text: "See Accountability in Action",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Set Milestone Requirements",
        description:
          "Define clear deliverables and evidence requirements for each milestone so expectations are unambiguous from the start.",
      },
      {
        title: "Collect Verified Updates",
        description:
          "Grantees submit structured milestone reports with supporting evidence through the platform.",
      },
      {
        title: "Record Decisions Onchain",
        description:
          "Every approval or rejection is recorded as an immutable onchain attestation via EAS for independent verification.",
      },
      {
        title: "Share Public Profiles",
        description:
          "Stakeholders and community members view verified delivery records through public project profiles and dashboards.",
      },
    ],
  },
  {
    slug: "reduce-grant-admin-overhead",
    title: "Reduce Grant Administration Overhead",
    metaDescription:
      "Cut grant admin time in half with automated reviews, milestone tracking, and reporting. Spend less time on paperwork, more on impact with Karma.",
    heading: "Reduce Grant Administration Overhead",
    tldr: "Karma automates the repetitive parts of grant management, including application processing, review coordination, milestone follow-ups, and reporting, so program teams can focus on strategy and grantee support instead of administrative busywork.",
    problem: {
      heading: "Admin Tasks Pile Up When You Cannot Reduce Grant Admin Overhead",
      description:
        "Program staff spend most of their time on repetitive tasks. They collect applications, coordinate reviewers, and chase grantees. Compiling reports takes days of manual work. Answering status inquiries eats into productive hours. These tasks pull attention from mentoring and program design. The admin burden grows faster than the team can handle.",
    },
    solution: {
      heading: "Reduce Grant Admin Overhead with Automation Across the Lifecycle",
      description:
        "Karma eliminates administrative bottlenecks at every stage. Applications flow through structured intake with automatic validation. AI handles initial screening so reviewers focus on borderline cases. Milestone tracking sends reminders and flags overdue items. Portfolio reports generate from live data instead of manual compilation. You reduce grant admin overhead and free your team for high-value work.",
    },
    capabilities: [
      "Automated application intake with validation and duplicate detection",
      "AI-powered initial screening that triages applications by quality",
      "Automated milestone reminders sent directly to grantees",
      "Self-generating portfolio reports from real-time data",
      "Bulk actions for approvals, notifications, and status updates",
      "Configurable notification rules to reduce manual follow-ups",
      "CIDS reporting exports that compile automatically",
      "Template-based workflows for repeatable grant processes",
    ],
    faqs: [
      {
        question: "How much time can we save with Karma?",
        answer:
          "Programs typically cut administrative time by 40 to 60 percent. The biggest gains come from automated application processing. Milestone tracking reminders save hours of follow-up. Self-generating reports eliminate manual compilation. Teams often reclaim multiple days per week for strategic work.",
      },
      {
        question: "Does automation mean less control?",
        answer:
          "No. Karma automates repetitive tasks but keeps humans in charge. You set the rules and configure workflows. You approve or override at every stage. Think of it as delegating paperwork to a system. You focus on decisions that need human judgment.",
      },
      {
        question: "Can we phase in automation gradually?",
        answer:
          "Yes. Start with milestone tracking alone. Add application management when your team is ready. Layer on AI reviews over time. Each feature works independently. Most teams begin with reminders and dashboards first.",
      },
      {
        question: "What administrative tasks does Karma automate first?",
        answer:
          "The quickest wins are milestone reminders and application validation. Portfolio report generation saves the most staff time. These three features eliminate the most repetitive work. Minimal configuration gets them running. Results show up in the first week.",
      },
      {
        question: "How does Karma handle duplicate or spam applications?",
        answer:
          "Karma detects duplicates by matching wallet and email addresses. It also flags similar proposal content. Suspected duplicates go to manual review. Legitimate resubmissions are not lost. Spam stays out of your active reviewer queue.",
      },
      {
        question: "Can Karma reduce the number of status inquiry emails?",
        answer:
          "Yes. Applicants and grantees see their status in real time. Automated notifications go out at every stage. This removes the main reason people email for updates. Programs report a sharp drop in status inquiries within weeks.",
      },
      {
        question: "How does Karma help with audit preparation?",
        answer:
          "Karma keeps structured records of every decision and action. Onchain attestations provide tamper-proof evidence. You export audit-ready reports with a few clicks. This eliminates the scramble before audit season. Your data is always organized and verifiable.",
      },
      {
        question: "Is training required for staff to use Karma?",
        answer:
          "Minimal training is needed. The interface is designed for program managers. Guided setup wizards walk you through configuration. Most teams are productive within a day. No technical background is required.",
      },
    ],
    ctaText: "Reduce Admin Overhead",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Small program teams managing large portfolios with limited staff",
      "Grant managers spending more time on admin than strategy",
      "Organizations seeking to reduce cost-per-grant processed",
      "Programs with high application volumes and manual intake processes",
      "Teams looking to redirect staff time toward grantee mentoring",
      "Foundations preparing for audits requiring structured operational records",
    ],
    testimonial: {
      quote:
        "We eliminated roughly 20 hours per week of manual follow-ups and report compilation. Our two-person grants team now manages the same portfolio that used to require four people, and we actually have time to support our grantees.",
      author: "Rachel Kim",
      role: "Operations Lead",
      organization: "Evergreen Fund",
    },
    secondaryCta: {
      text: "Calculate Your Time Savings",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Audit Your Current Workflow",
        description:
          "Identify the most time-consuming administrative tasks in your grant lifecycle to prioritize automation.",
      },
      {
        title: "Configure Automated Workflows",
        description:
          "Set up application validation, milestone reminders, and notification rules through the web interface.",
      },
      {
        title: "Enable AI Screening",
        description:
          "Activate AI-powered application triage to handle initial screening and flag incomplete submissions automatically.",
      },
      {
        title: "Generate Reports Automatically",
        description:
          "Let portfolio dashboards and CIDS-compatible reports compile themselves from live data instead of manual assembly.",
      },
    ],
  },
  {
    slug: "scale-grant-programs",
    title: "Scale Your Grant Programs",
    metaDescription:
      "Scale grant programs without scaling headcount. Karma's automation, dashboards, and AI review let small teams manage large portfolios efficiently.",
    heading: "Scale Your Grant Programs",
    tldr: "Karma enables grant programs to grow from dozens to hundreds of funded projects without proportionally increasing staff. Automation, AI review, and structured workflows let small teams manage large portfolios efficiently.",
    problem: {
      heading: "Manual Processes Prevent You from Scaling Grant Programs",
      description:
        "When a grant program succeeds, demand grows fast. More applicants submit proposals each round. More funded projects need milestone tracking. More reports need generating for stakeholders. Without scalable systems, the only option is hiring more staff. Many programs hit a ceiling where they cannot process more grants. Quality drops as volume increases.",
    },
    solution: {
      heading: "Scale Grant Programs with Automation and AI-Powered Workflows",
      description:
        "Karma provides infrastructure to scale grant operations smoothly. AI review handles growing application volumes without adding reviewers. Structured milestone tracking manages hundreds of projects with the same effort as dozens. Portfolio dashboards give full visibility without manual data assembly. Programs that needed ten staff can now operate with three or four. You scale grant programs without sacrificing quality.",
    },
    capabilities: [
      "AI review that scales with application volume automatically",
      "Portfolio dashboards that handle hundreds of active grants",
      "Templated milestone structures for repeatable grant types",
      "Bulk operations for processing grants at scale",
      "Automated grantee communications and status notifications",
      "Multi-program support for organizations running several grant tracks",
      "Role-based access for expanding teams with clear permissions",
      "Seasonal volume handling without temporary staff",
    ],
    faqs: [
      {
        question: "At what size does Karma become necessary?",
        answer:
          "Programs managing over 20 to 30 active grants see clear benefits. Below that, spreadsheets may work fine. Above that, admin burden grows faster than staff can handle. Programs expecting growth should adopt Karma early. This avoids a painful migration later.",
      },
      {
        question: "Can we run multiple grant programs on one platform?",
        answer:
          "Yes. Karma supports multiple programs within one organization. Each has its own criteria, rubrics, and templates. Dashboards show data across all programs or filter to one. You manage everything from a single login.",
      },
      {
        question: "Do we need technical staff to use Karma?",
        answer:
          "No. Karma is built for program managers. Setup and daily operations use the web interface. Guided wizards and starter templates get you running fast. Your team can be fully operational within a day. Technical integrations are optional for advanced users.",
      },
      {
        question: "How does pricing scale?",
        answer:
          "Costs scale reasonably with program size. Growing your portfolio does not create huge cost jumps. Contact the team for pricing details. The model keeps scaling financially sustainable. Adding grants and rounds stays affordable.",
      },
      {
        question: "Can Karma handle seasonal spikes in application volume?",
        answer:
          "Yes. AI review and automated intake handle volume spikes smoothly. The platform processes fifty or five hundred applications consistently. You do not need temporary staff for busy periods. Review timelines stay on track regardless of volume.",
      },
      {
        question: "How do I maintain quality as my program grows?",
        answer:
          "Structured rubrics ensure consistent evaluation at any volume. AI scoring provides a baseline for every application. Automated workflows prevent steps from being skipped. Dashboard alerts catch problems early. Quality stays high even as the portfolio expands.",
      },
      {
        question: "Can I add team members with different permission levels?",
        answer:
          "Yes. Karma supports role-based access control. You assign viewer, reviewer, or admin roles. Each role sees only what they need. This keeps your growing team organized. Permissions scale with your program.",
      },
      {
        question: "How long does it take to migrate from spreadsheets?",
        answer:
          "Most teams complete migration within a week. Karma supports bulk import for existing grants. You configure templates and workflows during setup. Historical data can be imported for continuity. The team provides onboarding support to make it smooth.",
      },
    ],
    ctaText: "Scale Your Program",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant programs growing beyond 30 active projects",
      "Small teams managing portfolios that outpace their headcount",
      "Organizations launching new grant tracks alongside existing ones",
      "Ecosystem funds expanding into multiple grant categories",
      "Programs preparing for significant growth in upcoming rounds",
      "Venture philanthropy funds scaling deal flow without proportional hiring",
    ],
    testimonial: {
      quote:
        "We tripled our grant portfolio from 40 to 120 projects without hiring a single additional program manager. Karma's automation handled the volume increase while our team focused on the strategic decisions that actually require human judgment.",
      author: "Marcus Chen",
      role: "Ecosystem Grants Lead",
      organization: "Vanguard Network",
    },
    secondaryCta: {
      text: "See Scaling Case Studies",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Assess Your Current Capacity",
        description:
          "Identify bottlenecks in your grant workflow that will break as application and project volume increases.",
      },
      {
        title: "Migrate to Structured Workflows",
        description:
          "Replace spreadsheets and manual processes with Karma's templated application, review, and milestone tracking systems.",
      },
      {
        title: "Activate AI and Automation",
        description:
          "Enable AI review, automated notifications, and bulk operations to handle increased volume without adding staff.",
      },
      {
        title: "Monitor and Optimize",
        description:
          "Use portfolio dashboards and performance analytics to continuously refine your processes as the program grows.",
      },
    ],
  },
  {
    slug: "transparent-grant-management",
    title: "Transparent Grant Management",
    metaDescription:
      "Run transparent grant programs with public dashboards, onchain attestations, and verifiable milestone records. Build community trust with Karma.",
    heading: "Transparent Grant Management",
    tldr: "Karma makes grant management transparent by default. Public dashboards, onchain attestations, and open milestone records let stakeholders, community members, and governance bodies see exactly how funds are being used and what results they produce.",
    problem: {
      heading: "Opaque Processes Undermine Transparent Grant Management",
      description:
        "Most grant programs operate as black boxes. Community members fund programs through governance votes. They get little visibility into fund allocation or project delivery. Token holders cannot verify whether milestones were met. This opacity breeds skepticism and reduces participation. Programs struggle to secure future funding even when they perform well.",
    },
    solution: {
      heading: "Build Transparent Grant Management with Public Dashboards and Onchain Proof",
      description:
        "Karma builds transparency into every step of the grant lifecycle. Applications, reviews, and milestone completions are visible through public dashboards. Onchain attestations create verifiable records anyone can audit. Community members see which projects were funded and track their progress. They verify outcomes without relying on summary reports. Transparent grant management becomes your default, not an afterthought.",
    },
    capabilities: [
      "Public-facing dashboards showing funded projects and their status",
      "Onchain attestations providing immutable proof of approvals and completions",
      "Open milestone records visible to all stakeholders",
      "Community review features enabling public feedback on funded projects",
      "Governance-ready reports with verifiable data backing every claim",
      "Grantee profile pages with full delivery history across programs",
      "Granular visibility controls for balancing openness and confidentiality",
      "Real-time stakeholder notifications for milestone events",
    ],
    faqs: [
      {
        question: "Is everything public by default?",
        answer:
          "Milestone progress and completion records are public. Internal review discussions can stay private if you prefer. You control visibility settings at the program level. This lets you balance openness with confidentiality. Sensitive applicant information stays protected.",
      },
      {
        question: "How does transparency help with governance votes?",
        answer:
          "Community members verify program results through public data. Strong delivery records build a track record for future funding. Evidence replaces anecdotal advocacy in governance discussions. Voter participation increases when people trust the data. Funding allocations become more confident and informed.",
      },
      {
        question: "Can we selectively share data?",
        answer:
          "Yes. Karma offers granular visibility controls per program. Make milestone data public while keeping scores private. Or open everything for full transparency. Different tracks can have different settings. You match visibility to your stakeholder needs.",
      },
      {
        question: "Does this work for non-Web3 grant programs?",
        answer:
          "Yes. Dashboards, milestone tracking, and reporting work for any program. You do not need blockchain experience. Onchain attestations are optional. Public dashboards alone provide meaningful transparency. You adopt Web3 features when you are ready.",
      },
      {
        question: "How do public dashboards affect grantee behavior?",
        answer:
          "Grantees submit updates more consistently when progress is visible. They communicate delays proactively. Public visibility creates positive accountability. Completion rates improve across the portfolio. No punitive mechanisms are needed to drive better behavior.",
      },
      {
        question: "Can stakeholders subscribe to project updates?",
        answer:
          "Yes. Stakeholders follow specific projects on the public dashboard. They receive notifications when milestones are submitted or approved. This keeps interested parties informed without extra work from your team. It builds engagement with your grant program.",
      },
      {
        question: "How does transparency affect applicant trust?",
        answer:
          "Applicants see that the program treats all submissions fairly. Public rubrics and visible processes reduce concerns about favoritism. Transparent programs attract more high-quality applicants. Trust works both ways in grant management.",
      },
      {
        question: "Can I measure the impact of transparency on governance?",
        answer:
          "Yes. Karma tracks engagement metrics on public dashboards. You can compare governance participation before and after launch. Programs typically see higher voter turnout and approval rates. The data helps you demonstrate the value of transparency.",
      },
    ],
    ctaText: "Make Your Program Transparent",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "DAO-funded grant programs accountable to token-holder communities",
      "Public foundations required to demonstrate fund usage transparently",
      "Programs seeking to increase governance participation through visibility",
      "Ecosystem funds building trust with diverse stakeholder groups",
      "Organizations using transparency as a competitive advantage for funding",
      "Multilateral funders coordinating transparent grant programs across regions",
    ],
    testimonial: {
      quote:
        "After launching public dashboards, our governance approval rate for new funding rounds jumped from 55% to 82%. Community members told us they finally felt confident voting yes because they could verify exactly where previous funds went.",
      author: "Amir Hossein",
      role: "Community Programs Lead",
      organization: "Solstice DAO",
    },
    secondaryCta: {
      text: "Explore Public Dashboard Features",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Enable Public Dashboards",
        description:
          "Activate public-facing project views so stakeholders and community members can see funded projects and their status.",
      },
      {
        title: "Configure Visibility Settings",
        description:
          "Choose which data is public and which remains private using granular per-program visibility controls.",
      },
      {
        title: "Record Milestones Onchain",
        description:
          "Approved milestones are attested onchain via EAS, creating immutable records anyone can verify independently.",
      },
      {
        title: "Share with Stakeholders",
        description:
          "Distribute dashboard links and governance-ready reports backed by verifiable data to build community trust.",
      },
    ],
  },
  {
    slug: "data-driven-grant-decisions",
    title: "Make Data-Driven Grant Decisions",
    metaDescription:
      "Make smarter grant decisions with portfolio analytics, grantee track records, and historical performance data. Move beyond gut instinct with Karma.",
    heading: "Make Data-Driven Grant Decisions",
    tldr: "Karma provides the data foundation for smarter grant decisions. Historical grantee performance, portfolio analytics, and milestone completion trends help program managers allocate funds based on evidence rather than intuition.",
    problem: {
      heading: "Without Data, You Cannot Make Data-Driven Grant Decisions",
      description:
        "Most grant decisions rely on a proposal document and a short review. Past performance rarely factors into the process. Programs fund the best writers, not the best builders. Scattered records make it hard to check delivery history. Programs cannot learn from past rounds. Funding strategy stays based on gut instinct rather than evidence.",
    },
    solution: {
      heading: "Make Data-Driven Grant Decisions with Performance Analytics",
      description:
        "Karma collects performance data across the entire grant lifecycle. When reviewing a new application, you see the applicant's past delivery record. Portfolio analytics show which categories delivered the most impact. Trends over time help you refine criteria and adjust funding amounts. You make data-driven grant decisions based on real outcomes instead of proposal quality alone.",
    },
    capabilities: [
      "Grantee track record profiles showing historical delivery performance",
      "Portfolio analytics with milestone completion trends across rounds",
      "Comparative analysis tools for evaluating applicants against peers",
      "Funding allocation insights based on historical outcome data",
      "Custom dashboards for tracking metrics that matter to your program",
      "CIDS-compatible impact data exports for cross-program analysis",
      "Round-over-round performance comparison reports",
      "Category-level outcome analysis for strategic planning",
    ],
    faqs: [
      {
        question: "What data does Karma track?",
        answer:
          "Karma tracks applications, review scores, and milestone completions. It records approval timelines and grantee delivery rates. Portfolio-level aggregates are available too. Reviewer consistency metrics help calibrate your team. All data is structured and ready for analysis.",
      },
      {
        question: "Can I see a grantee's performance from other programs?",
        answer:
          "Yes. Onchain attestations make delivery history portable. You view track records from any program using Karma. This helps you identify reliable grantees. It also flags teams with patterns of underdelivery. Cross-program data improves every funding decision.",
      },
      {
        question: "How does this improve decision quality?",
        answer:
          "Programs using performance data report better outcomes. They identify reliable grantees and spot underperformers early. Criteria adjustments reflect what actually works. Proposal writing quality matters less than delivery history. Resources flow toward teams with proven track records.",
      },
      {
        question: "Is the data exportable for our own analysis?",
        answer:
          "Yes. Karma exports in standard formats including CIDS-compatible outputs. Feed this data into your own analytics tools. Exports include raw milestones, performance metrics, and summaries. You run custom analyses beyond Karma's built-in dashboards.",
      },
      {
        question: "How quickly does useful performance data accumulate?",
        answer:
          "After one complete round with milestone tracking, you have useful data. Within two to three rounds, trend analysis becomes meaningful. You spot patterns in grantee performance and category effectiveness. Early adopters benefit most as data grows each round.",
      },
      {
        question: "Can I use data to justify funding decisions to stakeholders?",
        answer:
          "Yes. Every data point links back to a verified source. You share performance reports with governance bodies. Data-backed justifications carry more weight than narratives. Stakeholders gain confidence in your allocation decisions. This strengthens support for future funding rounds.",
      },
      {
        question: "How does Karma handle grantees who are new to the ecosystem?",
        answer:
          "New grantees start with no track record in Karma. Their applications are evaluated on proposal quality and criteria fit. As they complete milestones, their delivery record grows. After one round, they have data that supports future applications. The system rewards follow-through over time.",
      },
      {
        question: "Can I compare outcomes across different grant categories?",
        answer:
          "Yes. Karma provides category-level analytics. You see which themes or project types deliver the best results. This informs how you allocate funds across categories. Programs optimize their mix based on evidence. Strategic planning becomes grounded in real outcomes.",
      },
    ],
    ctaText: "Make Smarter Decisions",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Program managers seeking evidence-based funding allocation",
      "Foundations transitioning from intuition-based to data-driven decisions",
      "Grant committees evaluating repeat applicants across rounds",
      "Ecosystem funds optimizing category-level funding strategies",
      "Governance bodies requiring data-backed justification for allocations",
      "Research institutions benchmarking grantee outcomes across disciplines",
    ],
    testimonial: {
      quote:
        "In our third funding round on Karma, we could finally see which project categories consistently delivered results and which underperformed. We shifted 30% of our budget based on that data, and our milestone completion rate jumped from 64% to 85%.",
      author: "Fatima Al-Rashid",
      role: "Strategy Director",
      organization: "Polaris Grants Program",
    },
    secondaryCta: {
      text: "See Analytics in Action",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Collect Structured Data",
        description:
          "Use Karma's milestone tracking and review workflows to build a structured performance dataset across your grants.",
      },
      {
        title: "Analyze Grantee Track Records",
        description:
          "Review applicants' historical delivery performance from previous rounds and other programs using onchain attestation data.",
      },
      {
        title: "Identify Portfolio Trends",
        description:
          "Use analytics dashboards to spot patterns in category performance, delivery rates, and funding effectiveness over time.",
      },
      {
        title: "Refine Funding Strategy",
        description:
          "Adjust criteria, allocation amounts, and program design based on evidence from past outcomes rather than intuition.",
      },
    ],
  },
  {
    slug: "grant-impact-reporting",
    title: "Grant Impact Reporting",
    metaDescription:
      "Generate grant impact reports with verified milestone data, portfolio metrics, and CIDS-compatible exports. Prove your program's value with Karma.",
    heading: "Grant Impact Reporting",
    tldr: "Karma turns verified milestone data and portfolio metrics into comprehensive impact reports. Generate CIDS-compatible exports, stakeholder summaries, and governance presentations backed by onchain-verified delivery records rather than unverifiable claims.",
    problem: {
      heading: "Manual Processes Make Grant Impact Reporting Expensive and Unreliable",
      description:
        "Programs face growing demands to demonstrate impact. Staff spend days compiling data from spreadsheets and emails. The resulting reports rely on self-reported data with no verification. Stakeholders question numbers they cannot independently check. Report production costs eat into program budgets. Valuable staff time goes to formatting instead of analysis.",
    },
    solution: {
      heading: "Automate Grant Impact Reporting with Verified Data",
      description:
        "Karma generates impact reports directly from your verified program data. Every data point traces back to an onchain attestation or structured milestone record. CIDS-compatible exports meet emerging standards for impact measurement. Program managers generate reports in minutes instead of days. Stakeholders trust the numbers because they can verify them. Grant impact reporting becomes fast, reliable, and credible.",
    },
    capabilities: [
      "Auto-generated impact reports from verified milestone and outcome data",
      "CIDS-compatible exports for standardized impact measurement",
      "Stakeholder-ready summaries with charts and key metrics",
      "Onchain verification links for every data point in the report",
      "Customizable report templates for different audiences",
      "Historical reporting across multiple funding rounds",
      "Exportable formats for governance presentations and donor updates",
      "Narrative sections for qualitative commentary alongside verified data",
    ],
    faqs: [
      {
        question: "What is the CIDS format?",
        answer:
          "CIDS stands for Common Impact Data Standard. It provides a shared vocabulary for impact reporting. Reports become comparable across programs and funders. Adopting CIDS makes your data interoperable with other organizations. It reduces effort for cross-ecosystem impact assessments.",
      },
      {
        question: "How long does it take to generate a report?",
        answer:
          "Minutes, not days. Karma collects structured data throughout the grant lifecycle. Reports pull from live, verified data automatically. You select the scope and choose a template. What used to take days of manual work now happens in one session.",
      },
      {
        question: "Can stakeholders verify the data in reports?",
        answer:
          "Yes. Every metric links back to its source data. This includes onchain attestation records. Stakeholders verify any claim independently. Reports become evidence-based documents. They withstand scrutiny from governance bodies and auditors.",
      },
      {
        question: "Can I create custom report templates?",
        answer:
          "Yes. Default templates cover common reporting needs. You customize them for your stakeholder requirements. Templates are reusable across rounds. Share them with other program managers. Consistent quality follows across your portfolio.",
      },
      {
        question: "Does this replace manual reporting entirely?",
        answer:
          "For quantitative metrics, yes. Qualitative narratives still benefit from human input. The data foundation is automated and verified. Staff spend reporting time on insight and analysis. Reports improve in quality while taking far less effort.",
      },
      {
        question: "Can I generate reports for specific subsets of my portfolio?",
        answer:
          "Yes. Filter by program, category, round, or custom tags. Generate focused reports for specific audiences. A donor sees only their funded projects. A governance body sees the full portfolio. You tailor each report to its audience.",
      },
      {
        question: "How does Karma ensure report accuracy?",
        answer:
          "Every data point connects to a verified source record. Onchain attestations prevent tampering. Structured milestone data eliminates manual entry errors. The system flags inconsistencies before report generation. Accuracy is built into the data collection process.",
      },
      {
        question: "Can I schedule recurring reports?",
        answer:
          "Yes. Set up quarterly or monthly report schedules. Karma compiles the data automatically on your timeline. Reports arrive ready for review and distribution. This removes the last-minute scramble before reporting deadlines. Your team stays ahead of stakeholder expectations.",
      },
    ],
    ctaText: "Generate Impact Reports",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Programs required to demonstrate impact to governance bodies",
      "Foundations reporting outcomes to donors and board members",
      "Grant ecosystems adopting CIDS for standardized impact measurement",
      "Teams spending excessive time on manual report compilation",
      "Organizations seeking verifiable impact data for funding renewals",
      "Climate funds reporting measurable outcomes to international oversight bodies",
    ],
    testimonial: {
      quote:
        "Our quarterly impact report used to take two staff members an entire week to compile. With Karma, we generate it in under an hour, and every number links back to a verified onchain record. Our board actually trusts the data now.",
      author: "Thomas Bergmann",
      role: "Impact Measurement Lead",
      organization: "Alpine Grants Initiative",
    },
    secondaryCta: {
      text: "View Sample Impact Report",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Track Milestones with Verification",
        description:
          "Use Karma's milestone tracking to collect structured, verified delivery data throughout the grant lifecycle.",
      },
      {
        title: "Choose a Report Template",
        description:
          "Select from default templates or create custom formats tailored to your stakeholder audience and reporting requirements.",
      },
      {
        title: "Generate from Live Data",
        description:
          "Karma compiles your verified milestone and outcome data into a formatted report with charts, metrics, and verification links.",
      },
      {
        title: "Export and Share",
        description:
          "Export in CIDS-compatible formats, governance presentations, or stakeholder summaries and distribute to your audience.",
      },
    ],
  },
];
