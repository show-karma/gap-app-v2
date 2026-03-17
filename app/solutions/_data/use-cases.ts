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
        "Most grant programs collect applications through Google Forms and email. Reviewers juggle multiple tabs to evaluate each proposal. Scoring stays inconsistent across reviewers. No shared rubric exists to guide them. Submissions get lost in overflowing inboxes. Applicants never know where their proposal stands. Program staff waste hours chasing missing documents. These delays push funding timelines back by weeks. Teams lose strong candidates who give up waiting.",
    },
    solution: {
      heading: "How Karma Helps You Streamline Grant Applications End to End",
      description:
        "Karma gives you a structured application flow from start to finish. Grantees submit proposals through a clean interface. AI-powered review helps evaluators score each application. The system flags incomplete submissions early. Reviewers only see complete, valid proposals. Program managers track every application in one dashboard. Real-time status updates keep applicants informed. You cut turnaround time and fund projects faster.",
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
          "Yes. Program managers define required and optional fields. You add custom questions for each grant track. You set validation rules for every field. Every submission meets your criteria first. Reviewers only see complete proposals. You create reusable templates across funding rounds. Templates save hours of setup each cycle. You never rebuild forms from scratch.",
      },
      {
        question: "How does AI-assisted review work?",
        answer:
          "Karma's AI analyzes each application against your rubric. It generates a summary score for every proposal. It highlights strengths and flags gaps. Reviewers use the AI score as a starting point. They override or adjust scores freely. The AI learns as you refine your criteria. It gets more accurate with each round. Your review team saves hours on every batch.",
      },
      {
        question: "Can applicants track their submission status?",
        answer:
          "Yes. Applicants see real-time updates on their submissions. They know if a proposal is received. They see when review starts and ends. Automated notifications go out at each stage. This removes the need for follow-up emails. Applicants stay informed without contacting your team. Your staff spends less time answering status questions.",
      },
      {
        question: "Does this integrate with existing grant platforms?",
        answer:
          "Karma works as a standalone platform. It also imports applications from external sources. Onchain attestations record every decision permanently. You export data in standard formats like CSV. Other systems read this data easily. Karma fits into your workflow without replacing everything. You adopt features at your own pace.",
      },
      {
        question: "How long does it take to set up an application pipeline?",
        answer:
          "Most program managers launch a pipeline within a day. You define form fields in the web interface. You set review criteria and scoring rules. Then you invite reviewers by email. No developer involvement is needed. Starter templates speed up the process. You collect your first submissions the same day.",
      },
      {
        question: "What happens if an applicant submits an incomplete proposal?",
        answer:
          "Karma validates submissions before they enter the review queue. Required fields must be filled first. The applicant cannot submit until everything is complete. The system prompts them to fix missing items. This keeps your reviewers focused on complete proposals. No one wastes time on half-finished applications. Your review queue stays clean and organized.",
      },
      {
        question: "Can I run multiple application rounds at the same time?",
        answer:
          "Yes. Karma supports parallel application rounds within one program. Each round has its own form and criteria. Each round has its own reviewer pool. You manage them all from a single dashboard. Seasonal and rolling cycles work smoothly. You switch between rounds in one click. No data bleeds across separate rounds.",
      },
      {
        question: "How does Karma help reduce bias in the application process?",
        answer:
          "Structured rubrics ensure every reviewer checks the same dimensions. AI scoring provides a consistent baseline. Reviewers see the same data in the same format. Writing style matters less than substance. This levels the playing field for all applicants. Decisions reflect project quality, not proposal polish. The result is fairer evaluations across the board.",
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
        "Review committees spend hours reading proposals one by one. Reviewers apply criteria differently each time. No two reviewers score the same way. Scheduling review meetings becomes a logistical nightmare. Outcomes depend on who reviews which proposal. Programs with hundreds of applicants face backlogs. Staff burn out during peak review periods. These delays push funding decisions back by months. Strong applicants lose patience and move on.",
    },
    solution: {
      heading: "Automate Grant Reviews with AI Scoring and Structured Rubrics",
      description:
        "Karma lets you automate grant reviews with AI. The AI evaluates proposals against your criteria. Each application gets a score with clear reasoning. Structured rubrics guide every reviewer. Everyone evaluates the same dimensions. Automated assignment distributes workload evenly. No reviewer gets overloaded. Human reviewers keep full control over final decisions. They accept or override any AI recommendation.",
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
          "Yes. You set the rubric dimensions and scoring scales. You assign weightings to each dimension. Both AI and human reviewers use your criteria. You create different rubrics for different grant tracks. Each track gets its own scoring approach. This gives you full flexibility over every category. You update rubrics between rounds as priorities shift.",
      },
      {
        question: "How accurate is the AI scoring?",
        answer:
          "The AI serves as a first-pass assistant. It flags incomplete applications right away. It identifies strong candidates quickly. It provides reasoning for every score it gives. Reviewers always have the final say. They adjust scores based on their judgment. The system aligns better with your standards over time. Each round of feedback makes the AI more accurate.",
      },
      {
        question: "Can multiple reviewers score the same application?",
        answer:
          "Yes. Karma supports multi-reviewer workflows. Each reviewer scores independently. They all use the same rubric. The platform aggregates scores automatically. It highlights disagreements between reviewers. This consensus approach reduces individual bias. Borderline applications get attention from multiple people. Fair consideration comes from diverse perspectives.",
      },
      {
        question: "How does automated reviewer assignment work?",
        answer:
          "Karma distributes applications based on workload and expertise. You tag reviewers with their areas of knowledge. You set maximum review loads per person. Assignment rules route applications to the right evaluators. Reviewers get notifications when new work arrives. They track their queue in a personal dashboard. No manual assignment spreadsheets are needed.",
      },
      {
        question: "What happens if a reviewer disagrees with the AI score?",
        answer:
          "Reviewers override any AI score with their own assessment. They write a justification for the change. The platform records both scores side by side. This creates a full audit trail. The process stays transparent at every step. You get AI speed with human oversight built in. No decision goes unchecked.",
      },
      {
        question: "How long does it take to set up automated reviews?",
        answer:
          "Most teams configure their rubric within a few hours. You define scoring dimensions and assign weights. Then you invite reviewers by email. You set assignment rules in the web interface. Karma handles distribution from there. No technical skills are needed to start. Your first automated review can run the same day.",
      },
      {
        question: "Can I track how consistent my reviewers are?",
        answer:
          "Yes. Karma provides calibration reports for every reviewer. You compare scores across the full team. You spot reviewers who score too high or too low. This helps you run targeted calibration sessions. Reviewers align their standards faster. Consistent scoring leads to fairer outcomes. All applicants benefit from balanced evaluations.",
      },
      {
        question: "Does automated review work for non-English applications?",
        answer:
          "Karma's AI supports multiple languages for review. It scores applications written in common languages. Reviewers see translated summaries next to the original text. This makes cross-border grant programs easier to manage. Language barriers do not slow down your review process. Your team evaluates global applicants with confidence. No separate translation step is needed.",
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
        "Funded projects often disappear after the check clears. Milestone updates arrive sporadically via email. Some grantees use Notion docs or Google Sheets instead. No standard format exists for reporting progress. Program managers spend hours chasing grantees for updates. Stakeholders lack a clear picture of project status. Nobody knows which projects are on track. This poor visibility leads to wasted funds. It breaks trust between funders and grantees.",
    },
    solution: {
      heading: "Track Grant Milestones in Real Time with Onchain Verification",
      description:
        "Karma structures post-funding accountability with clear milestones. Programs define deliverables at the grant level. Grantees submit updates through the platform directly. Program managers review and approve each completion. Every approved milestone becomes an onchain attestation. EAS records make each approval permanent. Dashboards show milestone progress across your portfolio. You spot delays before they become problems. You track grant milestones at a glance.",
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
          "Onchain attestations are signed records on a blockchain. They use the Ethereum Attestation Service (EAS). Each record proves a milestone was completed. It also proves who approved that milestone. No one can alter or delete these records. Anyone with the attestation ID can verify it. This creates trust without relying on a single authority.",
      },
      {
        question: "Can grantees submit evidence with their milestone updates?",
        answer:
          "Yes. Grantees attach links, documents, and screenshots. Each update includes supporting evidence. Reviewers see all evidence next to the milestone criteria. This structured collection backs every decision with proof. No claims go unsupported. It improves accountability across your entire portfolio. Auditors can check evidence at any time.",
      },
      {
        question: "How do I see milestone progress across all my grants?",
        answer:
          "Karma provides a portfolio dashboard for this purpose. It shows completion rates and overdue items. You see upcoming deadlines at a glance. You filter by program, status, or date range. The dashboard updates in real time. New submissions and approvals appear instantly. You never work with stale data.",
      },
      {
        question: "Can I set different milestones for different grants?",
        answer:
          "Yes. Each grant has its own milestones and deliverables. No two grants need the same structure. You also create templates for common patterns. Templates save time when onboarding new grantees. You adjust each template per grant as needed. This keeps setup fast without losing flexibility.",
      },
      {
        question: "What happens when a grantee misses a milestone deadline?",
        answer:
          "Karma sends automated reminders before deadlines. It flags overdue milestones in the dashboard. Program managers receive alerts right away. They extend deadlines or request updated timelines. They escalate the issue if needed. The overdue status stays visible in all reports. Nothing slips through the cracks.",
      },
      {
        question: "How do onchain records help with future funding decisions?",
        answer:
          "Every milestone record is portable across programs. Future funders review a grantee's delivery history. Strong track records help grantees win more funding. Poor records signal risk before money goes out. This creates healthy incentives for consistent delivery. Grantees build a reputation that follows them. The whole ecosystem benefits from better data.",
      },
      {
        question: "Can I track milestones for grants funded outside Karma?",
        answer:
          "Yes. You import existing grants and define milestones for them. The tracking features work the same way. Verification applies to imported grants too. This lets you consolidate oversight in one place. You do not need to process applications through Karma first. Any grant from any source works on the platform.",
      },
      {
        question: "Do grantees need blockchain experience to submit updates?",
        answer:
          "No. Grantees submit updates through a simple web form. Karma handles the onchain attestation in the background. Grantees do not need a wallet or blockchain knowledge. The process feels like filling out any online form. They click submit and Karma does the rest. No technical setup is needed on their end.",
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
        "Each grant has its own timeline and milestones. Each grant has different reporting needs. Program managers juggle spreadsheets and chat threads. No single view shows portfolio health at a glance. At-risk projects hide until it is too late. Stakeholders ask questions no one can answer fast. Staff scramble to compile data for every meeting. This approach breaks down as the program grows. Small teams cannot keep up with large portfolios.",
    },
    solution: {
      heading: "One Dashboard to Manage Grant Portfolios Across All Programs",
      description:
        "Karma aggregates all funded projects into one dashboard. You see real-time status for every grant. Milestone completion rates update automatically. You filter by program, status, or funding round. Reports for governance or donors take a few clicks. When a project falls behind, alerts show up right away. You act before small delays become big problems. You manage grant portfolios without switching tools. One view covers your entire program.",
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
          "There is no practical limit on grant count. Karma handles dozens to hundreds of grants at once. The dashboard scales with your portfolio size. Performance stays consistent at any volume. Twenty grants load as fast as five hundred. Your workflow stays smooth as the program grows. You never outgrow the platform.",
      },
      {
        question: "Can I compare performance across different funding rounds?",
        answer:
          "Yes. Karma tracks historical data across all rounds. You compare milestone completion rates easily. You compare delivery timelines side by side. This view reveals trends over time. You spot improving or declining grantees fast. It helps you refine your funding strategy. Real evidence replaces guesswork in every decision.",
      },
      {
        question: "What is CIDS reporting?",
        answer:
          "CIDS stands for Common Impact Data Standard. It provides a shared format for reporting grant outcomes. Karma exports data in CIDS-compatible format. Your data works with other grant systems instantly. Reports use a vocabulary that funders understand. Peers across the ecosystem read your data easily. This saves time when sharing results externally.",
      },
      {
        question: "Can I tag and categorize grants within the portfolio?",
        answer:
          "Yes. Karma supports custom tags and categories. You group projects by theme, technology, or region. Filtered views focus on specific subsets. This makes targeted analysis simple and fast. You assess performance within individual categories. Tags update in bulk so organization stays easy. Your portfolio stays tidy as it grows.",
      },
      {
        question: "How do portfolio health indicators work?",
        answer:
          "Karma calculates health scores based on milestones and deadlines. Grants that fall behind trigger visual alerts. You also get optional email notifications. Program managers intervene early with this data. Problems surface before they grow large. This prevents issues from hiding until quarter end. You protect your portfolio from silent failures.",
      },
      {
        question: "Can I share portfolio dashboards with external stakeholders?",
        answer:
          "Yes. You generate read-only dashboard links for stakeholders. They see project status and milestone progress live. You control which data is visible externally. Sensitive details stay hidden from public view. This cuts the number of status requests your team handles. Stakeholders stay informed without extra effort from you.",
      },
      {
        question: "How does Karma handle grants from multiple programs?",
        answer:
          "Karma supports multiple programs within one organization. Each program has its own criteria and milestones. The portfolio dashboard shows data across all programs. You filter to view one program at a time. You switch between programs in one click. This unified view simplifies oversight for your team. No separate logins or tools are needed.",
      },
      {
        question: "Can I export portfolio data for external analysis?",
        answer:
          "Yes. Karma exports data in CSV and CIDS formats. You feed this into your own analytics tools. Exports include milestone data and performance metrics. Summaries come with every export file. This gives you full flexibility for custom analysis. You run deeper reports outside Karma if needed.",
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
        "Most programs rely on grantees to self-report progress. No independent verification exists for milestone claims. Stakeholders cannot confirm how funds were used. Community members have no way to check delivery records. Trust erodes over time without proof. Donors question whether their money made an impact. Problems only surface when it is too late to act. Programs lose funding support due to doubt alone.",
    },
    solution: {
      heading: "Improve Grant Accountability with Verifiable Onchain Records",
      description:
        "Karma adds a verification layer to your grant program. Grantees submit milestone updates through the platform. Program managers review and approve each one. Every decision becomes an onchain attestation via EAS. These records are publicly verifiable by anyone. Stakeholders confirm delivery on their own. No one needs to take your word for it. This builds lasting trust with your community. You improve grant accountability at every step.",
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
          "Regular reports are documents that can be edited or lost. Onchain attestations are immutable blockchain records. Anyone verifies them independently at any time. They provide cryptographic proof of each approval. They record exactly when each decision happened. These records cannot be altered after the fact. This makes accountability verifiable, not just claimed.",
      },
      {
        question: "Can community members see grant progress?",
        answer:
          "Yes. Karma provides public project profiles for every grantee. Anyone views milestone history and approval records. Community members follow specific projects for updates. They get notified when milestones are completed. This creates oversight beyond the core program team. More eyes on the data means better accountability. Transparency builds trust with your broader community.",
      },
      {
        question: "Does this replace trust in grantees?",
        answer:
          "No. It complements trust with verification. Honest grantees benefit from a verifiable track record. Strong records help them win future funding faster. The system creates accountability without assuming bad faith. High performers build a portable reputation. That reputation follows them across programs. Good work gets recognized and rewarded over time.",
      },
      {
        question: "What happens when a grantee misses a milestone?",
        answer:
          "Missed milestones appear in the dashboard and public profile. Program managers follow up or adjust timelines. The transparency ensures nothing gets overlooked. Grantees have a natural incentive to communicate early. They report delays before deadlines pass. Stakeholders stay informed about delivery risks. This open process keeps everyone aligned.",
      },
      {
        question: "Can accountability data be used across different programs?",
        answer:
          "Yes. Onchain attestations make delivery history portable. Any program manager reviews past performance easily. This rewards consistent delivery across the ecosystem. It also helps funders spot patterns of underdelivery. Cross-program visibility benefits everyone involved. Better data leads to smarter funding decisions.",
      },
      {
        question: "How does accountability affect grantee behavior?",
        answer:
          "Programs using Karma report higher milestone completion rates. Grantees submit updates more consistently than before. They communicate delays before deadlines pass. Public visibility creates positive pressure without punishment. No shaming or penalties are needed. Better behavior leads to stronger outcomes. The entire portfolio benefits from this culture shift.",
      },
      {
        question: "Can I use Karma for accountability without blockchain features?",
        answer:
          "Yes. The dashboards and milestone tracking work without onchain features. You still get structured verification and public profiles. These features alone improve accountability. Onchain attestations add an extra layer of trust. You enable them later when your program is ready. Start simple and grow into advanced features.",
      },
      {
        question: "How do governance bodies use accountability data?",
        answer:
          "Governance bodies access public dashboards and verified reports. They see delivery rates across the full program. Milestone completion data is always current. This data supports funding renewal decisions directly. It replaces anecdotal evidence with verifiable records. Governance votes become more informed and confident. Better data leads to better funding outcomes.",
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
        "Program staff spend most of their time on repetitive tasks. They collect applications and coordinate reviewers. They chase grantees for overdue updates. Compiling reports takes days of manual work. Answering status inquiries eats productive hours. These tasks pull focus from mentoring and strategy. The admin burden grows faster than the team. Small teams burn out under the weight of paperwork.",
    },
    solution: {
      heading: "Reduce Grant Admin Overhead with Automation Across the Lifecycle",
      description:
        "Karma eliminates administrative bottlenecks at every stage. Applications flow through structured intake automatically. Validation catches errors before review begins. AI handles initial screening for your team. Reviewers focus only on borderline cases. Milestone tracking sends reminders on its own. It flags overdue items in the dashboard. Portfolio reports generate from live data in minutes. You free your team for mentoring and strategy.",
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
          "Programs typically cut admin time by 40 to 60 percent. The biggest gains come from automated application intake. Milestone tracking reminders save hours of follow-up. Self-generating reports eliminate manual compilation. Teams often reclaim multiple days per week. Staff redirect that time toward strategy and mentoring. Results show up within the first month of use.",
      },
      {
        question: "Does automation mean less control?",
        answer:
          "No. Karma automates repetitive tasks only. Humans stay in charge of every decision. You set the rules and configure workflows. You approve or override at every stage. Think of it as delegating paperwork to a system. You keep full control over outcomes. Your team focuses on decisions that need human judgment.",
      },
      {
        question: "Can we phase in automation gradually?",
        answer:
          "Yes. Start with milestone tracking alone. Add application management when your team is ready. Layer on AI reviews over time. Each feature works on its own. You do not need to adopt everything at once. Most teams begin with reminders and dashboards. They add more automation as confidence grows.",
      },
      {
        question: "What administrative tasks does Karma automate first?",
        answer:
          "The quickest wins are milestone reminders and validation. Portfolio report generation saves the most staff time. These three features eliminate the most repetitive work. Minimal configuration gets them running fast. Results show up in the first week of use. Your team feels the difference right away. You build momentum for adopting more features later.",
      },
      {
        question: "How does Karma handle duplicate or spam applications?",
        answer:
          "Karma detects duplicates by matching wallet and email addresses. It also flags similar proposal content automatically. Suspected duplicates go to manual review. Legitimate resubmissions are never lost or deleted. Spam stays out of your active reviewer queue. Your reviewers only see real applications. This saves hours of manual sorting each round.",
      },
      {
        question: "Can Karma reduce the number of status inquiry emails?",
        answer:
          "Yes. Applicants and grantees see their status in real time. Automated notifications go out at every stage. This removes the main reason people email for updates. Programs report a sharp drop in status inquiries. The reduction happens within the first few weeks. Your inbox gets lighter and your team stays focused.",
      },
      {
        question: "How does Karma help with audit preparation?",
        answer:
          "Karma keeps structured records of every decision and action. Onchain attestations provide tamper-proof evidence. You export audit-ready reports with a few clicks. This eliminates the scramble before audit season. Your data stays organized and verifiable year-round. Auditors access clean records without extra prep. You save weeks of work each audit cycle.",
      },
      {
        question: "Is training required for staff to use Karma?",
        answer:
          "Minimal training is needed for your team. The interface is built for program managers. Guided setup wizards walk you through each step. Most teams become productive within a day. No technical background is required at all. New staff members learn the system quickly. Onboarding takes hours, not weeks.",
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
        "When a grant program succeeds, demand grows fast. More applicants submit proposals each round. More funded projects need milestone tracking. More reports need generating for stakeholders. Without scalable systems, you must hire more staff. Many programs hit a ceiling they cannot break through. They cannot process more grants with the same team. Quality drops as volume increases. Good programs stall because of process limits.",
    },
    solution: {
      heading: "Scale Grant Programs with Automation and AI-Powered Workflows",
      description:
        "Karma provides the tools to scale grant operations smoothly. AI review handles growing application volumes. You do not need to add more reviewers. Milestone tracking manages hundreds of projects easily. The effort stays the same as managing dozens. Portfolio dashboards give full visibility automatically. Programs that needed ten staff now run with three. You scale grant programs without sacrificing quality. Growth becomes a strength, not a burden.",
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
          "Programs managing over 20 to 30 active grants see clear benefits. Below that, spreadsheets may work fine. Above that, admin burden grows faster than staff can manage. You spend more time on process than on impact. Programs expecting growth should adopt Karma early. This avoids a painful migration later. Starting early builds clean data from day one.",
      },
      {
        question: "Can we run multiple grant programs on one platform?",
        answer:
          "Yes. Karma supports multiple programs within one organization. Each program has its own criteria and rubrics. Each program has its own templates too. Dashboards show data across all programs at once. You filter to one program when needed. You manage everything from a single login. No separate accounts are required.",
      },
      {
        question: "Do we need technical staff to use Karma?",
        answer:
          "No. Karma is built for program managers. Setup and daily operations use the web interface. Guided wizards walk you through each step. Starter templates get you running fast. Your team operates fully within a day. Technical integrations are optional for advanced users. No coding or developer support is needed.",
      },
      {
        question: "How does pricing scale?",
        answer:
          "Costs scale reasonably with program size. Growing your portfolio does not create huge cost jumps. Adding grants and rounds stays affordable. Contact the Karma team for pricing details. The pricing model keeps scaling financially sustainable. You plan your budget with confidence as you grow.",
      },
      {
        question: "Can Karma handle seasonal spikes in application volume?",
        answer:
          "Yes. AI review and automated intake handle volume spikes smoothly. The platform processes fifty or five hundred applications the same way. You do not need temporary staff for busy periods. Review timelines stay on track at any volume. Peak seasons run as smoothly as quiet ones. Your team avoids burnout during application surges.",
      },
      {
        question: "How do I maintain quality as my program grows?",
        answer:
          "Structured rubrics ensure consistent evaluation at any volume. AI scoring provides a baseline for every application. Automated workflows prevent steps from being skipped. Dashboard alerts catch problems early in the process. Quality stays high even as the portfolio expands. More grants do not mean lower standards. Your process scales without cutting corners.",
      },
      {
        question: "Can I add team members with different permission levels?",
        answer:
          "Yes. Karma supports role-based access control. You assign viewer, reviewer, or admin roles. Each role sees only what they need. New team members get the right access instantly. This keeps your growing team organized and secure. Permissions scale with your program automatically.",
      },
      {
        question: "How long does it take to migrate from spreadsheets?",
        answer:
          "Most teams complete migration within a week. Karma supports bulk import for existing grants. You configure templates and workflows during setup. Historical data imports easily for continuity. The Karma team provides onboarding support. They help make the transition smooth and fast. You keep all your existing data intact.",
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
        "Most grant programs operate as black boxes. Community members fund programs through governance votes. They get little visibility into fund allocation. They cannot see how projects are progressing. Token holders cannot verify if milestones were met. This opacity breeds skepticism over time. Participation in governance votes drops. Programs struggle to secure future funding. Even strong programs suffer from lack of proof.",
    },
    solution: {
      heading: "Build Transparent Grant Management with Public Dashboards and Onchain Proof",
      description:
        "Karma builds transparency into every step of the grant lifecycle. Applications and reviews appear on public dashboards. Milestone completions show up in real time. Onchain attestations create records anyone can audit. Community members see which projects got funding. They track progress without asking your team. They verify outcomes on their own. Transparent grant management becomes your default. Trust grows naturally from open data.",
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
          "Milestone progress and completion records are public. Internal review discussions stay private if you prefer. You control visibility settings at the program level. This lets you balance openness with confidentiality. Sensitive applicant information stays protected always. You choose exactly what the public sees. Each program can have different visibility rules.",
      },
      {
        question: "How does transparency help with governance votes?",
        answer:
          "Community members verify program results through public data. Strong delivery records build trust for future funding. Evidence replaces anecdotal claims in governance discussions. Voters see proof before they cast their vote. Participation increases when people trust the data. Funding allocations become more confident and informed. Better data leads to stronger program support.",
      },
      {
        question: "Can we selectively share data?",
        answer:
          "Yes. Karma offers granular visibility controls per program. Make milestone data public while keeping scores private. Or open everything for full transparency. Different tracks use different settings. You match visibility to your stakeholder needs. You adjust settings at any time without downtime. Changes take effect right away.",
      },
      {
        question: "Does this work for non-Web3 grant programs?",
        answer:
          "Yes. Dashboards, milestone tracking, and reporting work for any program. You do not need blockchain experience at all. Onchain attestations are fully optional. Public dashboards alone provide meaningful transparency. You adopt Web3 features when you are ready. Start with dashboards and add attestations later. The platform meets you where you are.",
      },
      {
        question: "How do public dashboards affect grantee behavior?",
        answer:
          "Grantees submit updates more consistently when progress is visible. They communicate delays before deadlines pass. Public visibility creates positive accountability naturally. Completion rates improve across the entire portfolio. No punitive mechanisms are needed at all. Good behavior follows from open tracking. The whole program benefits from this culture.",
      },
      {
        question: "Can stakeholders subscribe to project updates?",
        answer:
          "Yes. Stakeholders follow specific projects on the public dashboard. They receive notifications when milestones move forward. Updates go out when submissions or approvals happen. This keeps interested parties informed automatically. Your team does zero extra work for this. It builds real engagement with your grant program.",
      },
      {
        question: "How does transparency affect applicant trust?",
        answer:
          "Applicants see that the program treats all submissions fairly. Public rubrics and visible processes reduce favoritism concerns. Transparent programs attract more high-quality applicants. Strong teams apply when they trust the process. Trust works both ways in grant management. Open programs build stronger applicant pipelines over time.",
      },
      {
        question: "Can I measure the impact of transparency on governance?",
        answer:
          "Yes. Karma tracks engagement metrics on public dashboards. You compare governance participation before and after launch. Programs typically see higher voter turnout. Approval rates increase with better data access. The data helps you prove the value of transparency. You show stakeholders the real impact of open governance.",
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
        "Most grant decisions rely on a proposal document and a short review. Past performance rarely factors into the decision. Programs fund the best writers, not the best builders. Scattered records make delivery history hard to find. No one checks if a grantee delivered before. Programs cannot learn from past rounds. Funding strategy stays based on gut instinct. Evidence sits in silos that nobody connects.",
    },
    solution: {
      heading: "Make Data-Driven Grant Decisions with Performance Analytics",
      description:
        "Karma collects performance data across the entire grant lifecycle. You see each applicant's past delivery record during review. Portfolio analytics show which categories delivered the most impact. Trends over time help you refine your criteria. You adjust funding amounts based on real results. Past outcomes guide future decisions directly. You make data-driven grant decisions with confidence. Evidence replaces guesswork at every step.",
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
          "Karma tracks applications, review scores, and milestone completions. It records approval timelines for every decision. It tracks grantee delivery rates across rounds. Portfolio-level aggregates are always available. Reviewer consistency metrics help calibrate your team. All data is structured and ready for analysis. You access any metric in a few clicks.",
      },
      {
        question: "Can I see a grantee's performance from other programs?",
        answer:
          "Yes. Onchain attestations make delivery history portable. You view track records from any program using Karma. This helps you identify reliable grantees quickly. It also flags teams with patterns of underdelivery. Cross-program data improves every funding decision. You fund teams with proven results, not just good proposals.",
      },
      {
        question: "How does this improve decision quality?",
        answer:
          "Programs using performance data report better outcomes overall. They identify reliable grantees before funding starts. They spot underperformers early in the process. Criteria adjustments reflect what actually works. Proposal writing quality matters less than delivery history. Resources flow toward teams with proven track records. Every round gets smarter than the last.",
      },
      {
        question: "Is the data exportable for our own analysis?",
        answer:
          "Yes. Karma exports in CSV and CIDS-compatible formats. Feed this data into your own analytics tools easily. Exports include raw milestones and performance metrics. Summaries come with every export file. You run custom analyses beyond Karma's built-in dashboards. Your data belongs to you and goes where you need it.",
      },
      {
        question: "How quickly does useful performance data accumulate?",
        answer:
          "After one complete round with milestone tracking, you have useful data. Within two to three rounds, trend analysis becomes meaningful. You spot patterns in grantee performance clearly. Category effectiveness becomes visible across rounds. Early adopters benefit most from growing data. Each round adds more insight to your decisions. Start tracking now to benefit sooner.",
      },
      {
        question: "Can I use data to justify funding decisions to stakeholders?",
        answer:
          "Yes. Every data point links back to a verified source. You share performance reports with governance bodies easily. Data-backed justifications carry more weight than narratives. Stakeholders gain confidence in your allocation decisions. This strengthens support for future funding rounds. Your program earns trust through evidence, not promises.",
      },
      {
        question: "How does Karma handle grantees who are new to the ecosystem?",
        answer:
          "New grantees start with no track record in Karma. Their first application relies on proposal quality alone. Reviewers evaluate them on criteria fit. As they complete milestones, their delivery record grows. After one round, they have data for future applications. The system rewards follow-through over time. New teams build a reputation from their first grant.",
      },
      {
        question: "Can I compare outcomes across different grant categories?",
        answer:
          "Yes. Karma provides category-level analytics for every program. You see which themes deliver the best results. You see which project types underperform consistently. This informs how you allocate funds across categories. Programs optimize their mix based on evidence. Strategic planning stays grounded in real outcomes.",
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
        "Programs face growing demands to demonstrate impact. Staff spend days compiling data from spreadsheets and emails. The resulting reports rely on self-reported data only. No verification backs up the numbers. Stakeholders question figures they cannot check on their own. Report production costs eat into program budgets. Staff time goes to formatting instead of analysis. This wastes resources that should go toward grantee support.",
    },
    solution: {
      heading: "Automate Grant Impact Reporting with Verified Data",
      description:
        "Karma generates impact reports from your verified program data. Every data point traces back to an onchain attestation. Milestone records back up every claim in the report. CIDS-compatible exports meet emerging impact standards. Program managers generate reports in minutes, not days. Stakeholders trust the numbers they can verify. No one questions data backed by blockchain proof. Grant impact reporting becomes fast and credible.",
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
          "CIDS stands for Common Impact Data Standard. It provides a shared vocabulary for impact reporting. Reports become comparable across programs and funders. Adopting CIDS makes your data work with other organizations. It reduces effort for cross-ecosystem impact assessments. Other funders read your data without translation. This saves time for everyone in the ecosystem.",
      },
      {
        question: "How long does it take to generate a report?",
        answer:
          "Minutes, not days. Karma collects structured data throughout the grant lifecycle. Reports pull from live, verified data automatically. You select the scope and choose a template. The report compiles itself from your existing data. What used to take days now happens in one session. Your team spends time on analysis, not data entry.",
      },
      {
        question: "Can stakeholders verify the data in reports?",
        answer:
          "Yes. Every metric links back to its source data. This includes onchain attestation records. Stakeholders verify any claim on their own. Reports become evidence-based documents with proof. They withstand scrutiny from governance bodies. Auditors trust data backed by blockchain records. No claim goes unsupported in your reports.",
      },
      {
        question: "Can I create custom report templates?",
        answer:
          "Yes. Default templates cover common reporting needs well. You customize them for your stakeholder requirements. Templates are reusable across funding rounds. Share them with other program managers easily. Consistent quality follows across your entire portfolio. You build a library of templates over time.",
      },
      {
        question: "Does this replace manual reporting entirely?",
        answer:
          "For quantitative metrics, yes it does. Qualitative narratives still benefit from human input. The data foundation is automated and verified automatically. Staff spend reporting time on insight and analysis instead. Reports improve in quality while taking far less effort. Your team adds context that numbers alone cannot provide.",
      },
      {
        question: "Can I generate reports for specific subsets of my portfolio?",
        answer:
          "Yes. Filter by program, category, round, or custom tags. Generate focused reports for specific audiences easily. A donor sees only their funded projects. A governance body sees the full portfolio. You tailor each report to its audience. This targeted approach keeps reports relevant and useful.",
      },
      {
        question: "How does Karma ensure report accuracy?",
        answer:
          "Every data point connects to a verified source record. Onchain attestations prevent tampering with any data. Structured milestone data eliminates manual entry errors. The system flags inconsistencies before report generation. Accuracy is built into the data collection process. You catch problems before they reach your final report.",
      },
      {
        question: "Can I schedule recurring reports?",
        answer:
          "Yes. Set up quarterly or monthly report schedules. Karma compiles the data automatically on your timeline. Reports arrive ready for review and distribution. This removes the last-minute scramble before deadlines. Your team stays ahead of stakeholder expectations. Scheduled reports run without any manual effort.",
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
