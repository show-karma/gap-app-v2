import { PAGES } from "@/utilities/pages";
import type { SolutionPage } from "./types";

export const featureAdvancedSolutions: SolutionPage[] = [
  {
    slug: "proof-of-work-tracking",
    title: "Proof of Work Tracking for Grant-Funded Projects",
    metaDescription:
      "Track proof of work for grant-funded projects with Karma. Verify deliverables onchain, automate milestone reviews, and build funder trust.",
    heading: "Track Proof of Work for Every Grant-Funded Project",
    tldr: "Karma gives grant programs a transparent, onchain system to track proof of work from grantees. Every milestone, deliverable, and update is verifiable, so funders always know what was accomplished and when.",
    problem: {
      heading: "Why Proof of Work Tracking Fails in Most Grant Programs",
      description:
        "Most grant programs rely on self-reported updates. Nobody can verify the claims grantees make. Grantees submit vague progress reports with little detail. Program managers then spend hours chasing follow-ups. Without structured deliverable verification, high performers look the same as underperformers. This lack of accountability erodes funder confidence over time. Programs lose credibility when they cannot prove results. Funders start asking tough questions that nobody can answer.",
    },
    solution: {
      heading: "Automated Proof of Work Tracking with Karma",
      description:
        "Karma gives grantees a structured framework to log milestones. They attach verifiable evidence to every completed deliverable. Each update creates an onchain attestation as a permanent record. Program managers see real-time dashboards showing every project's status. Reviewers validate deliverables against clear acceptance criteria. This turns proof of work tracking into a verify-based system. Funders trust verified data more than written promises. Teams save hours every week on manual checks.",
    },
    capabilities: [
      "Onchain attestations for every milestone and deliverable submission",
      "Real-time dashboards showing project progress across all grantees",
      "Reviewer workflows for validating deliverables against acceptance criteria",
      "Automated reminders for overdue milestones and missing updates",
      "Public grant profiles showcasing verified accomplishments",
      "Historical audit trail for every project from start to finish",
      "Customizable verification criteria per milestone type",
      "Bulk progress views for portfolio-level oversight",
    ],
    faqs: [
      {
        question: "What counts as proof of work in Karma?",
        answer:
          "Proof of work includes any verifiable evidence attached to a milestone. Examples include links to deployed code and published reports. Transaction hashes and screenshots also qualify. Third-party confirmations count as valid evidence too. Each submission creates an onchain attestation. This makes every claim permanent and publicly auditable. Anyone can verify the evidence at any time.",
      },
      {
        question: "Can reviewers reject incomplete proof of work?",
        answer:
          "Yes. Reviewers can approve, request changes, or reject any submission. They evaluate work against predefined acceptance criteria. All review decisions go onchain for full transparency. Rejected submissions include comments about what is missing. Grantees know exactly what to improve before resubmitting. This feedback loop raises the quality of every deliverable. Reviewers also track their decisions over time.",
      },
      {
        question: "How does onchain tracking differ from traditional reporting?",
        answer:
          "Traditional reporting relies on self-reported documents. Those documents can be edited, fabricated, or lost. Onchain tracking creates immutable, timestamped records instead. Anyone can verify them without a central authority. Nobody can alter historical records after the fact. Funders and auditors get permanent access to original evidence. This removes trust gaps between grantees and funders. Onchain data speaks for itself.",
      },
      {
        question: "Is proof of work tracking available for all grant programs?",
        answer:
          "Yes. Any grant program on Karma can enable this feature. It works for small community micro-grants and large rounds alike. Programs with hundreds of grantees use it every day. Managers tailor requirements to fit their specific needs. You customize verification standards for each deliverable type. Setup takes minutes and needs no technical skills. The feature scales with your program as it grows.",
      },
      {
        question: "How does this improve funder confidence?",
        answer:
          "Funders independently confirm that grantees completed milestones. Verifiable onchain evidence replaces self-reported updates. This transparency closes information gaps between funders and grantees. Trust grows over successive grant rounds. Programs show auditable records instead of narrative reports. Concrete data justifies continued investment in the program. Funders renew commitments when they see real proof. Board members make faster decisions with verified data.",
      },
      {
        question: "What types of evidence can grantees attach to milestones?",
        answer:
          "Grantees can attach many types of evidence. Code repository links and live demo URLs work well. Published articles and blog posts also qualify. They can add financial transaction records and meeting notes. The platform supports file uploads for documents and images. Each piece of evidence links to its milestone attestation. Multiple evidence items can support a single milestone.",
      },
      {
        question: "How quickly can a program start using deliverable verification?",
        answer:
          "Programs enable work verification within minutes. Managers define milestones and set acceptance criteria first. Grantees then start submitting evidence right away. You need no technical setup or coding. The onchain recording happens automatically in the background. Most teams run at full speed on the same day. You do not need any special training to begin. The interface guides you through each step.",
      },
    ],
    ctaText: "Start Tracking Proof of Work",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Research grant administrators at universities",
      "Web3 ecosystem fund managers overseeing developer grants",
      "Government grant compliance officers",
      "Corporate social responsibility program leads",
      "Nonprofit foundation directors managing community funding",
    ],
    testimonial: {
      quote:
        "We went from spending 15 hours a week chasing grantee updates to having everything verified and visible in real time. The onchain proof of work completely changed how our board views grant accountability.",
      author: "Rachel Andersen",
      role: "Grants Program Director",
      organization: "Meridian Foundation",
    },
    secondaryCta: {
      text: "Book a Demo",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Define Milestones and Deliverables",
        description:
          "Set up your grant program with structured milestones and specify what evidence grantees must submit for each deliverable.",
      },
      {
        title: "Grantees Submit Proof of Work",
        description:
          "Grantees attach verifiable evidence to each milestone update, including code links, reports, transaction hashes, and screenshots.",
      },
      {
        title: "Reviewers Validate Submissions",
        description:
          "Assigned reviewers evaluate proof of work against predefined acceptance criteria, approving, requesting changes, or rejecting submissions.",
      },
      {
        title: "Track Progress on a Live Dashboard",
        description:
          "Monitor all grantee progress in real time from a centralized dashboard, with every action recorded as an immutable onchain attestation.",
      },
    ],
  },
  {
    slug: "grant-reviewer-assignment",
    title: "Grant Reviewer Assignment and Management",
    metaDescription:
      "Assign and manage grant reviewers with Karma. Streamline peer review workflows, balance workloads, and ensure fair evaluations for every application.",
    heading: "Assign and Manage Grant Reviewers with Confidence",
    tldr: "Karma streamlines the reviewer assignment process so grant programs can distribute applications fairly, track review progress, and ensure every proposal gets the expert evaluation it deserves.",
    problem: {
      heading: "Why Grant Reviewer Assignment Breaks Down at Scale",
      description:
        "Assigning reviewers manually takes too much time. Program managers juggle spreadsheets to track who reviews what. Conflicts of interest slip through the cracks. Workloads end up uneven across the review panel. Some applications get thorough evaluations. Others barely get a glance. Reviewer fatigue sets in and deadlines slip. This inconsistency hurts the credibility of the selection process. Good proposals lose out when reviewers rush through them.",
    },
    solution: {
      heading: "Streamlined Grant Reviewer Assignment with Karma",
      description:
        "Karma provides a dedicated system for managing reviewer workflows. Program managers invite reviewers and assign applications by expertise. The platform tracks reviewed and pending applications in real time. Reviewers see only their assigned applications in a focused interface. Clear rubrics and deadlines keep evaluations consistent. All review decisions go onchain for full transparency. Managers spot bottlenecks before they slow down the process. Every decision leaves a permanent audit trail.",
    },
    capabilities: [
      "Invite and onboard reviewers with role-based access controls",
      "Assign applications to reviewers based on expertise and workload",
      "Real-time dashboard showing review progress and pending assignments",
      "Structured evaluation rubrics for consistent scoring across reviewers",
      "Conflict of interest detection and disclosure workflows",
      "Onchain recording of all review decisions for auditability",
      "Automated notifications for upcoming deadlines and overdue reviews",
      "Reviewer performance analytics across evaluation cycles",
    ],
    faqs: [
      {
        question: "How are reviewers assigned to applications?",
        answer:
          "Program managers assign reviewers manually or use workload-based distribution. Each reviewer sees only their assigned applications. The system considers reviewer expertise and current capacity. This matches the right evaluators to the right proposals. Balanced distribution leads to higher quality assessments. Managers reassign applications with a single click if needed. The dashboard shows each reviewer's current workload clearly.",
      },
      {
        question: "Can reviewers see each other's evaluations?",
        answer:
          "This is fully configurable per program. Some programs keep reviews blind until all scores arrive. This prevents anchoring bias between reviewers. Others allow open discussion for collaborative assessment. Program managers control visibility settings at any time. They adjust settings between rounds as needed. Blind reviews produce more independent scoring. Open reviews work well for consensus-based programs.",
      },
      {
        question: "How does Karma handle conflicts of interest?",
        answer:
          "Reviewers flag conflicts of interest on any assigned application. Program managers then reassign those applications with one click. The platform tracks all conflict disclosures for audit purposes. This documented trail protects program integrity. It satisfies governance requirements for transparent evaluation. The system logs every conflict disclosure permanently. Programs build trust by handling conflicts openly and quickly.",
      },
      {
        question: "What metrics can program managers track about reviewer performance?",
        answer:
          "Managers monitor completion rates and average review time. The system tracks scoring consistency across reviewers automatically. Pending assignment counts appear on a centralized analytics dashboard. These metrics help identify bottlenecks early. Historical data reveals which reviewers give the most thorough assessments. You spot slow reviewers before they delay your timeline. Reports export for governance meetings and team discussions.",
      },
      {
        question: "How many reviewers can be assigned to a single grant application?",
        answer:
          "There is no hard limit on reviewer assignments per application. Programs commonly assign two to five reviewers for diverse perspectives. The platform aggregates scores across all assigned reviewers automatically. It highlights significant scoring discrepancies right away. Managers then investigate disagreements before making final decisions. More reviewers produce more balanced evaluations for high-value grants. You choose the right number for each program type.",
      },
      {
        question: "Can reviewer assignments change mid-cycle?",
        answer:
          "Yes. Program managers reassign applications at any point during the review cycle. If a reviewer becomes unavailable, their pending work transfers easily. The system preserves any partial evaluations already submitted. This flexibility keeps the review process moving when plans change. All reassignment actions log automatically for audit purposes. No work gets lost during a reassignment. The new reviewer picks up right where things left off.",
      },
      {
        question: "Does the platform support external reviewers outside the organization?",
        answer:
          "Yes. Karma supports inviting external domain experts as reviewers. They receive role-based access limited to their assigned applications. External reviewers use the same rubrics and scoring criteria as internal ones. This makes it easy to bring in specialized knowledge. All external evaluations go onchain alongside internal reviews. External reviewers onboard in minutes with no training needed. You expand your expertise pool without extra overhead.",
      },
    ],
    ctaText: "Streamline Your Review Process",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant program managers coordinating large reviewer panels",
      "DAO governance teams evaluating community proposals",
      "Academic research funding committees",
      "Philanthropic organizations with peer review processes",
      "Government agencies managing competitive grant rounds",
    ],
    testimonial: {
      quote:
        "Managing 40 reviewers across 200 applications used to be chaos. Karma's assignment system cut our review cycle from six weeks to two, and every reviewer knows exactly what they need to do.",
      author: "David Okonkwo",
      role: "Program Operations Lead",
      organization: "Helios Grants Initiative",
    },
    secondaryCta: {
      text: "Watch a Walkthrough",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Invite and Onboard Reviewers",
        description:
          "Add reviewers to your program with role-based access controls and provide them with evaluation rubrics and scoring guidelines.",
      },
      {
        title: "Assign Applications by Expertise",
        description:
          "Distribute applications to reviewers based on their domain expertise and current workload to ensure balanced, high-quality evaluations.",
      },
      {
        title: "Monitor Review Progress in Real Time",
        description:
          "Track which applications have been reviewed, which are pending, and which reviewers need follow-up from a centralized dashboard.",
      },
      {
        title: "Aggregate Scores and Finalize Decisions",
        description:
          "Collect all reviewer evaluations, compare scores, resolve discrepancies, and make funding decisions with full auditability recorded onchain.",
      },
    ],
  },
  {
    slug: "custom-grant-workflows",
    title: "Custom Grant Workflows for Program Managers",
    metaDescription:
      "Build custom grant workflows with Karma. Configure application stages, approval gates, and milestone checkpoints for your program.",
    heading: "Build Custom Workflows That Fit Your Grant Program",
    tldr: "Karma lets program managers design custom workflows with configurable stages, approval gates, and milestone checkpoints. No two grant programs are alike, and your workflow tool should reflect that.",
    problem: {
      heading: "Why Custom Grant Workflows Matter More Than Generic Tools",
      description:
        "Every grant program has unique requirements. Generic project management tools force programs into rigid structures. These tools do not match how grants actually operate. Program managers build workarounds with spreadsheets and email chains. This creates fragmented processes that nobody can track. Important steps fall through the cracks every cycle. Teams waste hours on manual handoffs between stages. The lack of structure leads to missed deadlines and lost applications.",
    },
    solution: {
      heading: "Build Custom Grant Workflows That Match Your Program",
      description:
        "Karma provides a flexible workflow engine built for grant programs. Program managers define custom stages for application review. They set up multi-step approval gates and milestone checkpoints. Each step has its own required actions, reviewers, and deadlines. Automated transitions move applications between stages when conditions pass. The result fits your program's real needs perfectly. You change workflows anytime without losing existing data. Every stage transition records onchain for full transparency.",
    },
    capabilities: [
      "Configurable multi-stage application review pipelines",
      "Custom approval gates with role-based sign-off requirements",
      "Milestone checkpoints with deliverable-specific verification criteria",
      "Automated stage transitions triggered by completion conditions",
      "Template-based workflow creation for recurring grant rounds",
      "Visual workflow builder for non-technical program managers",
      "Conditional branching based on application type or funding tier",
      "Version history for workflow configuration changes",
    ],
    faqs: [
      {
        question: "Can I modify a workflow after a grant round has started?",
        answer:
          "You can add new stages or adjust future milestones during a live round. Changes apply to new applications and upcoming milestones only. Already-completed stages stay untouched. This flexibility lets programs iterate based on lessons learned. You never need to start over when improving your process. The system tracks every workflow change with a timestamp. Your team sees what changed and when it changed.",
      },
      {
        question: "Do custom workflows support multi-party approvals?",
        answer:
          "Yes. Any workflow stage can require sign-off from multiple reviewers. This works well for high-value grants needing governance approval. You configure approval thresholds per stage. Options include unanimous consent or a simple majority. The workflow only advances once the threshold passes. Each approval records onchain with a timestamp. You see exactly who approved and when they approved.",
      },
      {
        question: "Can I reuse workflows across multiple grant rounds?",
        answer:
          "Yes. Save any workflow as a template for future rounds. You clone and modify existing templates for variations too. This standardizes your grant operations across cycles. Each template captures all settings from forms to notifications. Reuse saves hours of configuration work every round. Your team launches new rounds in minutes instead of days. Templates keep your process consistent as staff changes.",
      },
      {
        question: "Are workflow changes tracked?",
        answer:
          "Yes. The system logs all configuration changes with timestamps and user names. This creates a complete audit trail of process evolution. The change history helps with governance and compliance reviews. New team members see why past decisions happened. Every modification stays traceable and transparent. You never lose track of who changed what. This history protects your program during external audits.",
      },
      {
        question: "What is the difference between approval gates and milestone checkpoints?",
        answer:
          "Approval gates are decision points during application review. Designated reviewers must sign off before a grant advances. Milestone checkpoints verify deliverables during the execution phase. Both have their own criteria, required approvers, and deadlines. Together they cover the full grant lifecycle. Gates control who receives funding. Checkpoints verify that funded teams deliver results.",
      },
      {
        question: "Can different application types follow different workflows?",
        answer:
          "Yes. Karma supports conditional branching within workflows. A small community grant follows a simple two-step process. A large institutional grant requires five stages with multiple approvals. The application type or funding tier determines the path. This keeps simple grants fast and complex grants rigorous. You set the branching rules once during setup. The system routes each application automatically after that.",
      },
      {
        question: "How does the visual workflow builder work?",
        answer:
          "The visual builder lets you drag and drop stages into a workflow. You configure each stage's requirements by clicking on it. You need no coding or technical skills at all. The builder shows the full flow at a glance. You test the workflow before activating it for real applications. Changes save instantly as you make them. Any team member can build workflows without developer help.",
      },
    ],
    ctaText: "Design Your Grant Workflow",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Program managers running multi-stage grant evaluation processes",
      "Web3 ecosystem funds with unique governance approval requirements",
      "Corporate grant programs with compliance-driven workflows",
      "Nonprofit organizations managing multiple grant types simultaneously",
      "Research institutions with tiered funding review stages",
    ],
    testimonial: {
      quote:
        "We run three completely different grant programs, each with its own review stages and approval requirements. Karma let us design distinct workflows for each without any workarounds or spreadsheets.",
      author: "Sarah Chen",
      role: "Head of Grants Operations",
      organization: "Nexus Protocol Foundation",
    },
    secondaryCta: {
      text: "Explore Features",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Choose a Starting Template or Build from Scratch",
        description:
          "Select a pre-built workflow template that matches your program type, or create a custom workflow from the ground up using the visual builder.",
      },
      {
        title: "Configure Stages and Approval Gates",
        description:
          "Define each stage of your grant process, set role-based approval requirements, and specify what must be completed before advancing.",
      },
      {
        title: "Set Milestone Checkpoints and Deliverables",
        description:
          "Add milestone checkpoints with specific deliverable requirements and verification criteria for the execution phase of each grant.",
      },
      {
        title: "Launch and Monitor in Real Time",
        description:
          "Activate your workflow and track every application and grantee as they progress through each stage, with full visibility and onchain auditability.",
      },
    ],
  },
  {
    slug: "grant-budget-tracking",
    title: "Grant Budget Tracking in Real Time",
    metaDescription:
      "Track grant budgets in real time with Karma. Monitor fund allocation, disbursements, and spending across all grantees from one dashboard.",
    heading: "Track Grant Budgets in Real Time Across Every Program",
    tldr: "Karma gives grant programs real-time visibility into budget allocation, disbursements, and remaining funds. Know exactly where every dollar goes and how much runway your program has left.",
    problem: {
      heading: "Why Grant Budget Tracking Breaks Down at Scale",
      description:
        "Grant programs often manage millions of dollars across dozens of grantees. Budget tracking usually lives in disconnected spreadsheets. Program managers cannot answer basic questions quickly. How much has the team disbursed so far? How much is committed but unpaid? What is the current burn rate? Manual tracking causes errors that compound over time. Financial oversight stays reactive without real-time visibility. Boards lose confidence when managers cannot provide clear numbers.",
    },
    solution: {
      heading: "Real-Time Grant Budget Tracking in One Dashboard",
      description:
        "Karma provides a unified system for grant budget tracking. Program managers see a live dashboard with total budget and committed funds. Disbursed amounts and remaining balances appear for each grantee. Every payment links to an approved milestone for clear justification. The system supports multiple funding sources and currencies. You get a single source of truth for all financial oversight. Automated alerts warn you before budgets run low. Export reports for your board in one click.",
    },
    capabilities: [
      "Real-time budget dashboards for program-level and grantee-level views",
      "Disbursement tracking linked to approved milestones and deliverables",
      "Multi-currency and multi-source fund tracking",
      "Budget forecasting based on committed allocations and burn rate",
      "Automated alerts for budget thresholds and overspending risks",
      "Exportable financial reports for stakeholder and board presentations",
      "Historical spending analysis across grant rounds",
      "Side-by-side budget comparison between grant cycles",
    ],
    faqs: [
      {
        question: "Can I track budgets across multiple grant rounds?",
        answer:
          "Yes. Karma provides both per-round and aggregate budget views. You track spending within a single round or across your entire history. Cross-round visibility helps you spot spending trends quickly. You compare cost efficiency between rounds in seconds. Historical disbursement patterns inform more accurate future budgets. This long-term view strengthens your financial planning. Boards appreciate seeing data across multiple cycles.",
      },
      {
        question: "Does Karma support crypto and fiat budget tracking?",
        answer:
          "Yes. The platform tracks both cryptocurrency and fiat disbursements. Conversion snapshots capture the value at each transaction time. This dual-currency support works for Web3 programs in both worlds. Your dashboards reflect real values at all times. Token price changes between disbursements do not distort your numbers. You see accurate totals regardless of market volatility. Finance teams get reliable data for their reports.",
      },
      {
        question: "How are disbursements connected to milestones?",
        answer:
          "Each disbursement links to a specific approved milestone. This creates a clear audit trail from verification to fund release. Payments tie to demonstrated progress rather than arbitrary schedules. Managers configure automatic or manual release upon milestone approval. This flexibility fits different program oversight requirements. You always know why each payment went out. Auditors trace every dollar back to a verified deliverable.",
      },
      {
        question: "Can I set budget limits per grantee?",
        answer:
          "Yes. Program managers set maximum allocation limits per grantee. Automated alerts trigger when disbursements approach those limits. This prevents overspending without manual monitoring of every transaction. Limits work at the individual grantee and funding tier levels. You maintain flexible budget governance across the board. The system blocks payments that would exceed a limit. This safeguard catches errors before money goes out.",
      },
      {
        question: "How does Karma handle budget reconciliation across multiple funding sources?",
        answer:
          "Karma tracks each funding source separately with clear labels. It also provides a unified view of total program finances. You see how much the team drew from each source. The dashboard shows which grantees receive funding from which pool. Exportable reconciliation reports align with external accounting systems. Your finance team reconciles in minutes instead of days. Multi-source tracking removes confusion about fund origins.",
      },
      {
        question: "Can I forecast future spending based on current commitments?",
        answer:
          "Yes. Karma calculates projected spending from committed allocations. The forecast uses your current burn rate and pending milestones. You see when your budget will run out at the current pace. This helps you plan additional funding rounds early. Program managers avoid surprises at the end of a grant cycle. Forecasts update automatically as new milestones complete. You always have the latest spending projections available.",
      },
      {
        question: "What financial reports can I export from the platform?",
        answer:
          "You export detailed disbursement histories and budget summaries. Reports cover fund utilization by grantee, source, and time period. Charts and tables come formatted for board presentations. Reports include variance analysis against original allocations too. Everything exports as PDF or spreadsheet format for easy sharing. You generate reports with one click at any time. Custom date ranges let you focus on the period you need.",
      },
    ],
    ctaText: "Get Budget Visibility Now",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Web3 ecosystem fund managers tracking crypto and fiat disbursements",
      "Grant program finance officers at philanthropic foundations",
      "DAO treasury managers overseeing community grant budgets",
      "Government grant administrators managing multi-source funding",
      "Corporate CSR teams tracking grant allocations across business units",
    ],
    testimonial: {
      quote:
        "Before Karma, reconciling our grant budgets across three funding sources took two full days every month. Now the dashboard shows everything in real time, and our board gets accurate numbers instantly.",
      author: "Marcus Reeves",
      role: "Finance Director",
      organization: "Canopy Grants Collective",
    },
    secondaryCta: {
      text: "See Pricing",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Set Up Funding Sources and Budgets",
        description:
          "Configure your grant program budgets, define funding sources, and set allocation limits per grantee or funding tier.",
      },
      {
        title: "Link Disbursements to Milestones",
        description:
          "Connect each payment to an approved milestone so every disbursement has a clear justification tied to verified deliverables.",
      },
      {
        title: "Monitor Spending in Real Time",
        description:
          "Track total budget, committed funds, disbursed amounts, and remaining balance from a centralized dashboard with automated threshold alerts.",
      },
      {
        title: "Generate Financial Reports",
        description:
          "Export stakeholder-ready financial reports showing fund utilization, spending trends, and budget forecasts across all grant rounds.",
      },
    ],
  },
  {
    slug: "grant-impact-measurement",
    title: "Grant Impact Measurement and Reporting",
    metaDescription:
      "Measure and report grant impact with Karma. Collect outcome data, generate impact reports, and demonstrate ROI to stakeholders.",
    heading: "Measure and Report on the Real Impact of Your Grants",
    tldr: "Karma helps grant programs go beyond tracking deliverables to measuring actual outcomes. Collect impact data from grantees, aggregate results across your portfolio, and generate reports that demonstrate real-world results.",
    problem: {
      heading: "Why Grant Impact Measurement Gets Ignored Until It Is Too Late",
      description:
        "Most grant programs know how much money they distributed. They know how many projects they funded. But they cannot answer the harder question: did it work? Impact measurement is usually an afterthought. Programs bolt it on at the end of a cycle with ad-hoc surveys. Without structured outcome data, comparing results across grantees fails. This measurement gap threatens the sustainability of every grant program. Funders demand proof of impact before they renew commitments.",
    },
    solution: {
      heading: "Structured Grant Impact Measurement from Day One",
      description:
        "Karma embeds grant impact measurement into the lifecycle from day one. Programs define outcome metrics during setup. Grantees report against those metrics alongside their milestone updates. The platform aggregates impact data across your entire portfolio automatically. Program managers identify trends and compare outcomes at a glance. All impact data stays verifiable through onchain attestations. Funders see real results instead of vague narratives. Your program proves its value with hard numbers.",
    },
    capabilities: [
      "Customizable impact metrics and key result indicators per program",
      "Grantee self-reporting integrated into milestone update workflows",
      "Portfolio-level impact aggregation and trend analysis",
      "Automated impact report generation for stakeholders and funders",
      "Benchmarking across grantees and grant rounds",
      "Onchain verification of reported impact data",
      "Longitudinal outcome tracking across multiple grant cycles",
      "Visual impact dashboards with exportable charts",
    ],
    faqs: [
      {
        question: "What types of impact metrics can I track?",
        answer:
          "Karma supports both quantitative and qualitative metrics. Quantitative examples include users reached and revenue generated. Transactions processed and downloads completed also count. Qualitative examples include community feedback and case studies. You define the metrics that matter most during setup. You add custom metric types anytime as your needs evolve. The platform adapts to any measurement framework you choose.",
      },
      {
        question: "How do grantees report impact data?",
        answer:
          "Impact reporting lives inside the milestone update workflow. When grantees submit progress updates, they also report against defined metrics. This makes data collection a natural part of regular reporting. Grantees do not face an extra reporting burden at all. Compliance rates increase because impact data flows alongside milestones. The process takes just a few extra minutes per update. Grantees see clear prompts for each required metric.",
      },
      {
        question: "Can I compare impact across different grant rounds?",
        answer:
          "Yes. Karma provides cross-round analytics for comparing outcomes over time. You see which program designs deliver the strongest results. Longitudinal comparisons reveal patterns in project performance. This data informs future funding strategy directly. You make decisions based on evidence rather than assumptions. Side-by-side round comparisons highlight what improved. Your team learns what works and doubles down on it.",
      },
      {
        question: "How does Karma verify that reported impact data is accurate?",
        answer:
          "All impact submissions create onchain attestations instantly. This produces an immutable audit trail that nobody can alter. Reviewers validate reported metrics against supporting evidence. The platform flags significant deviations from expected ranges automatically. This multi-layered approach reduces the risk of inflated claims. Grantees know their data faces scrutiny at every step. Verified impact data builds stronger funder trust over time.",
      },
      {
        question: "Can impact reports be shared directly with external stakeholders?",
        answer:
          "Yes. Karma generates shareable impact reports as polished PDFs. Reports also come as read-only dashboard links. External stakeholders view data without needing a platform account. Board members, donors, and partners all get easy access. You share program outcomes with any audience at any time. Links stay updated as new data flows in. Stakeholders always see the latest impact numbers.",
      },
      {
        question: "How does outcome measurement differ from milestone tracking?",
        answer:
          "Milestone tracking confirms that grantees completed specific deliverables. Outcome measurement captures the real-world results of that work. For example, a milestone might be launching a product. The impact metric tracks how many people adopted it afterward. Both work together for a complete picture of grantee performance. Milestones answer the question of what got done. Outcomes answer the question of what changed because of it.",
      },
      {
        question: "Can I benchmark impact across different grantee cohorts?",
        answer:
          "Yes. Karma lets you compare impact data across grantee groups. You segment by grant round, project type, or funding tier. This benchmarking reveals which cohorts deliver the strongest outcomes. It highlights which program designs produce the best results too. These insights guide smarter funding decisions going forward. You spot top-performing segments and invest more in them. Data replaces guesswork in your funding strategy.",
      },
    ],
    ctaText: "Start Measuring Impact",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Foundation program directors reporting to boards of trustees",
      "Web3 ecosystem funds demonstrating ROI to token holders",
      "Government grant agencies tracking public investment outcomes",
      "Impact investors measuring social return on capital",
      "Nonprofit organizations justifying donor contributions with data",
    ],
    testimonial: {
      quote:
        "Our donors always asked us to prove our grants were making a difference. With Karma, we now show them verified impact data across 150 grantees, and donor retention has increased significantly.",
      author: "Priya Nair",
      role: "Impact and Evaluation Manager",
      organization: "Elevate Global Fund",
    },
    secondaryCta: {
      text: "Schedule a Call",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Define Impact Metrics During Program Setup",
        description:
          "Establish the quantitative and qualitative metrics that matter most to your program and stakeholders before the first grant is awarded.",
      },
      {
        title: "Grantees Report Impact Alongside Milestones",
        description:
          "Impact data collection is embedded into regular milestone updates, so grantees report outcomes as a natural part of their progress reporting.",
      },
      {
        title: "Aggregate and Analyze Across Your Portfolio",
        description:
          "The platform automatically aggregates impact data across all grantees, enabling trend analysis, benchmarking, and cross-round comparisons.",
      },
      {
        title: "Generate Stakeholder-Ready Impact Reports",
        description:
          "Create polished impact reports backed by verified onchain data that demonstrate program ROI to boards, donors, and partner organizations.",
      },
    ],
  },
  {
    slug: "grantee-performance-scoring",
    title: "Grantee Performance Scoring and Ranking",
    metaDescription:
      "Score and rank grantee performance with Karma. Use data-driven evaluations to identify top performers and make better funding decisions.",
    heading: "Score and Rank Grantee Performance with Data",
    tldr: "Karma turns grant program data into actionable performance scores. Identify your top-performing grantees, flag those who need support, and make future funding decisions based on evidence rather than intuition.",
    problem: {
      heading: "Why Grantee Performance Scoring Stays Subjective and Broken",
      description:
        "Most programs evaluate grantees based on subjective impressions. Program managers remember some projects better than others. No consistent scoring framework exists to compare grantees fairly. High performers do not get the recognition they deserve. Underperformers slip through unnoticed every cycle. Future funding decisions rely on incomplete information instead of real data. This wastes money on teams that do not deliver results. Top grantees leave for programs that value their work.",
    },
    solution: {
      heading: "Data-Driven Grantee Performance Scoring at Scale",
      description:
        "Karma generates performance scores for every grantee automatically. Scores use objective criteria like milestone completion and timeliness. Reviewer ratings and impact metrics also factor in. Program managers customize scoring weights to match their priorities. The ranking system rewards high performers and flags those needing support. Scores carry across grant rounds to build lasting reputation profiles. Top grantees stand out clearly in your portfolio view. You invest follow-on funding where it matters most.",
    },
    capabilities: [
      "Automated performance scoring based on milestone completion and timeliness",
      "Customizable scoring weights aligned to program priorities",
      "Grantee ranking dashboards for portfolio-level comparison",
      "Historical performance tracking across multiple grant rounds",
      "Reviewer rating integration for qualitative assessment",
      "Performance-based flags and alerts for at-risk grantees",
      "Exportable performance reports for governance and funding decisions",
      "Reputation profiles that carry across programs and rounds",
    ],
    faqs: [
      {
        question: "What factors contribute to a grantee's performance score?",
        answer:
          "Scores come from milestone completion rates and update timeliness. Reviewer ratings and impact metric achievement also play a role. Program managers adjust the weight of each factor freely. This ensures scoring reflects what matters most to each program. Weights change between rounds without losing historical data. You see exactly how each factor affects the final score. The breakdown stays transparent for grantees and managers alike.",
      },
      {
        question: "Can performance scores influence future grant applications?",
        answer:
          "Yes. Performance history shows up during application review. Reviewers see a summary of past scores and completion rates. This creates a reputation system that rewards consistent performers. Strong track records strengthen future funding decisions. New applications show past feedback alongside current proposals. High scorers stand out immediately in the review queue. This motivates grantees to deliver quality work every round.",
      },
      {
        question: "How do you prevent gaming of the performance scoring system?",
        answer:
          "Scores rely on verified onchain data rather than self-reported metrics. Reviewer validations and milestone approvals feed the scoring algorithm. Every data point stays independently verifiable through attestations. Grantees cannot inflate scores without completing real deliverables. The system resists manipulation by design. Multiple data sources cross-check each other automatically. No single input can skew the overall score significantly.",
      },
      {
        question: "Can I see performance trends over time?",
        answer:
          "Yes. Karma provides historical charts showing score evolution across rounds. You spot improving or declining performers quickly. Trend data helps inform follow-on funding decisions directly. Charts export for board reports and presentations in one click. Pattern recognition across cohorts becomes straightforward. You see which grantees improve steadily over time. Declining trends trigger early support conversations.",
      },
      {
        question: "How does performance scoring work for first-time grantees with no history?",
        answer:
          "First-time grantees start with a neutral baseline score. They build their performance profile through completed milestones and reviews. The system clearly distinguishes new grantees from established ones. First-time applicants face no penalty for lacking history. They receive fair evaluation based solely on their current work. Their scores grow naturally as they complete deliverables. New grantees build reputation from their very first milestone.",
      },
      {
        question: "Can scoring criteria differ between grant programs?",
        answer:
          "Yes. Each program defines its own scoring criteria and weights. A research grant might prioritize publication outcomes heavily. A developer grant might weight code delivery more. This customization ensures scores stay meaningful for each context. Programs share the same scoring engine with different configurations. You tailor scoring to match each program's unique goals. Changes to criteria take effect immediately for new evaluations.",
      },
      {
        question: "How do performance scores support portfolio management?",
        answer:
          "Scores give program managers a clear view of portfolio health. They sort grantees by performance to find top contributors quickly. At-risk grantees surface through automated flags and alerts. This data drives decisions about where to invest more support. Portfolio-level trends reveal the effectiveness of each grant round. You allocate resources based on real performance data. Strong portfolios attract more funding from stakeholders and donors.",
      },
    ],
    ctaText: "Enable Performance Scoring",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant program managers making repeat funding decisions",
      "DAO governance participants evaluating community contributors",
      "Venture philanthropy teams tracking portfolio performance",
      "Ecosystem fund operators building grantee reputation systems",
      "Research funding bodies comparing outcomes across institutions",
    ],
    testimonial: {
      quote:
        "Performance scoring transformed how we allocate follow-on funding. Instead of relying on gut feelings, we now have objective data on every grantee, and our top performers are getting recognized faster.",
      author: "James Whitfield",
      role: "Portfolio Manager",
      organization: "Arcadia Ecosystem Fund",
    },
    secondaryCta: {
      text: "Book a Demo",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Configure Scoring Criteria and Weights",
        description:
          "Define which factors contribute to grantee scores and set custom weights to reflect your program's priorities and evaluation philosophy.",
      },
      {
        title: "Scores Generate Automatically from Program Data",
        description:
          "As grantees complete milestones, submit updates, and receive reviewer evaluations, Karma calculates and updates performance scores in real time.",
      },
      {
        title: "Review Rankings and Identify Patterns",
        description:
          "Use the ranking dashboard to compare grantee performance across your portfolio and spot top performers, at-risk grantees, and emerging trends.",
      },
      {
        title: "Use Scores to Inform Funding Decisions",
        description:
          "Leverage historical performance data during application review to make evidence-based decisions about repeat funding and grantee support.",
      },
    ],
  },
  {
    slug: "grant-board-reporting",
    title: "Grant Board Reporting and Stakeholder Dashboards",
    metaDescription:
      "Generate board-ready grant reports with Karma. Create dashboards showing program health, grantee progress, and fund utilization.",
    heading: "Generate Board-Ready Reports for Your Grant Program",
    tldr: "Karma transforms your grant program data into polished, board-ready reports. Show stakeholders exactly how funds are being used, which projects are delivering, and what impact the program is having, all without hours of manual report assembly.",
    problem: {
      heading: "Why Grant Board Reporting Takes Too Long and Misses the Mark",
      description:
        "Every quarter, program managers spend days assembling board reports. They pull data from scattered spreadsheets and chase grantees for updates. Formatting slides takes hours of tedious work. The result is often a stale snapshot outdated by presentation day. Board members want clear answers about fund use and project progress. Manual grant board reporting fails to deliver timely results at scale. Teams dread reporting season because of the manual workload. Cluttered slide decks hide important insights from view.",
    },
    solution: {
      heading: "Automated Grant Board Reporting Powered by Live Data",
      description:
        "Karma generates board-ready reports directly from your live program data. All milestones, reviews, and disbursements feed into reports automatically. Program managers customize templates for the metrics their board cares about. Fund utilization, completion rates, and impact summaries show current numbers. Reports export as PDFs or share as live dashboards. This eliminates manual assembly entirely. Your board gets accurate data every time they ask. Reporting takes minutes instead of days.",
    },
    capabilities: [
      "One-click report generation from live program data",
      "Customizable report templates for different stakeholder audiences",
      "Fund utilization summaries with allocation and disbursement breakdowns",
      "Grantee progress overviews with milestone completion status",
      "Impact metric dashboards with trend visualization",
      "PDF export and shareable live dashboard links",
      "Executive summary sections with key highlights and risks",
      "Scheduled report delivery to stakeholder email lists",
    ],
    faqs: [
      {
        question: "How often can I generate board reports?",
        answer:
          "Reports pull from live data at any time you need them. Many programs create monthly summaries and quarterly deep dives. You produce them as frequently as needed with no extra preparation. Stakeholders always see current numbers in every report. There is no waiting for scheduled reporting cycles. You generate a fresh report in under five minutes. Ad-hoc requests from board members take seconds to fulfill.",
      },
      {
        question: "Can I customize what appears in a board report?",
        answer:
          "Yes. You configure report templates to include or exclude specific sections. Budget summaries, grantee rankings, and impact metrics stay fully optional. Different templates work for different audiences easily. Your board sees portfolio health while staff access operational details. Templates stay reusable across reporting periods. You build templates once and use them for every cycle. Each audience gets exactly the information they need.",
      },
      {
        question: "Can board members access dashboards directly?",
        answer:
          "Yes. Karma supports shareable dashboard links with read-only access. Board members view program health data anytime without a full account. These live dashboards update automatically as new data arrives. This gives board members self-service access between meetings. You need no training or special setup at all. Board members bookmark the link and check it anytime. They get answers without waiting for the next report.",
      },
      {
        question: "What formats are supported for export?",
        answer:
          "Reports export as polished PDF documents for formal presentations. They also share as live web dashboards that update in real time. PDFs include charts, tables, and executive summaries. The format fits professional distribution to any stakeholder group. You choose the right format for each audience and context. PDFs work great for email distribution and archiving. Live dashboards work best for ongoing monitoring.",
      },
      {
        question: "How does automated reporting save time compared to manual report assembly?",
        answer:
          "Manual reports require days of data collection from scattered sources. Karma eliminates this by generating reports from live data with one click. Program managers save ten or more hours per cycle. That time goes back to program strategy and grantee support. Data wrangling becomes a thing of the past entirely. You stop copying numbers between spreadsheets and slides. The platform does the heavy lifting for you automatically.",
      },
      {
        question: "Can I add executive commentary to generated reports?",
        answer:
          "Yes. After Karma generates a report, you add your own commentary. Highlight key wins, flag concerns, or add strategic context freely. This combines automated data with human insight perfectly. Board members get both accurate numbers and expert interpretation. The final report reflects your program knowledge alongside live data. Your voice adds meaning that raw data alone cannot provide. Commentary sections appear clearly alongside the automated charts.",
      },
      {
        question: "Does the platform support scheduled report delivery?",
        answer:
          "Yes. You schedule reports to generate and send automatically. Set a monthly or quarterly cadence for board distribution. Recipients receive the report by email on your schedule. This ensures stakeholders always get updates on time. You need no manual work once you set the schedule. You add or remove recipients at any time. Scheduled reports always use the latest program data.",
      },
    ],
    ctaText: "Create Your First Board Report",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Foundation program directors preparing quarterly board presentations",
      "DAO operations leads reporting to governance councils",
      "Grant program managers presenting to institutional funders",
      "Nonprofit executive directors updating donor committees",
      "Corporate philanthropy managers reporting to CSR leadership",
    ],
    testimonial: {
      quote:
        "Our quarterly board report used to take three days to assemble. Now I generate it in five minutes, and the data is always current. Board members actually look forward to reviewing program updates.",
      author: "Linda Torres",
      role: "Senior Program Manager",
      organization: "Vanguard Community Foundation",
    },
    secondaryCta: {
      text: "Watch a Walkthrough",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Configure Report Templates",
        description:
          "Choose which metrics, sections, and visualizations to include in your board reports, and create templates tailored to different stakeholder audiences.",
      },
      {
        title: "Reports Generate from Live Data",
        description:
          "Karma pulls real-time data from milestones, reviews, disbursements, and impact metrics to assemble reports automatically with current numbers.",
      },
      {
        title: "Review and Customize Before Sharing",
        description:
          "Preview generated reports, add executive commentary or context where needed, and finalize the report for distribution.",
      },
      {
        title: "Share as PDF or Live Dashboard",
        description:
          "Export polished reports as PDFs for formal presentations or share live dashboard links that board members can access anytime.",
      },
    ],
  },
  {
    slug: "grant-program-templates",
    title: "Pre-Built Grant Program Templates",
    metaDescription:
      "Launch grant programs faster with Karma pre-built templates. Choose proven structures, customize them, and start accepting applications in minutes.",
    heading: "Launch Grant Programs Faster with Pre-Built Templates",
    tldr: "Karma offers pre-built grant program templates based on proven structures from successful programs. Pick a template, customize it to your needs, and go from zero to accepting applications in minutes instead of weeks.",
    problem: {
      heading: "Why Launching Without Grant Program Templates Wastes Weeks",
      description:
        "Launching a new grant program involves dozens of decisions. Application form design, review criteria, and milestone structures all need attention. Most program managers reinvent the wheel every time. They spend weeks on setup before receiving a single application. New programs often miss critical elements that surface mid-cycle. The setup burden discourages organizations from trying new program types. Teams burn out before the first application even arrives. Mistakes in the initial setup create problems throughout the entire cycle.",
    },
    solution: {
      heading: "Pre-Built Grant Program Templates That Get You Running Fast",
      description:
        "Karma provides a library of grant program templates from successful programs. Each template includes pre-configured forms, review rubrics, and milestone structures. Program managers select a template and customize the details. Templates cover ecosystem grants, retroactive funding, bounties, and fellowships. You combine the speed of a pre-built solution with full flexibility. Launch your program in minutes instead of weeks. Every template comes from a proven, real-world program. You start with best practices built right in.",
    },
    capabilities: [
      "Template library covering ecosystem grants, retroactive funding, bounties, and fellowships",
      "Pre-configured application forms with field-level customization",
      "Built-in review rubrics and scoring criteria for each template type",
      "Milestone structures with suggested deliverable categories",
      "Customizable reporting cadences and update requirements",
      "Clone and modify templates to create program variations",
      "Community-contributed templates from successful grant programs",
      "Version-controlled templates that evolve with best practices",
    ],
    faqs: [
      {
        question: "What types of grant program templates are available?",
        answer:
          "Karma offers templates for ecosystem development grants and retroactive funding. Project bounties, developer fellowships, and community grants also exist. Each template comes from proven structures that successful programs use. Templates include pre-configured forms, rubrics, and milestone structures. The library keeps growing as new program models emerge. You browse templates by category to find the best fit. New templates arrive regularly based on community contributions.",
      },
      {
        question: "Can I modify a template after selecting it?",
        answer:
          "Yes. Templates serve as starting points, not rigid structures. You add, remove, or modify any element freely. Application fields, review criteria, and milestones stay fully editable. You get the speed of a pre-built foundation with full control. Changes happen before or after program launch at any time. Nothing locks you into the original template design. Your program evolves as you learn what works best.",
      },
      {
        question: "Can I create my own templates?",
        answer:
          "Yes. Save any grant program configuration as a custom template. This works great for recurring rounds with consistent structures. Custom templates capture all settings including forms and rubrics. Notification preferences and milestone definitions carry over too. Your team standardizes processes across cycles effortlessly. You build a library of templates that match your needs. New team members launch programs using your proven designs.",
      },
      {
        question: "How quickly can I launch a program using a template?",
        answer:
          "Most programs go from template selection to accepting applications in under an hour. The template handles structural decisions around forms and rubrics. You fill in program-specific details like budget and timeline. You need no technical knowledge at all. This dramatically cuts setup time compared to building from scratch. Some teams launch in as little as thirty minutes. You spend your time on strategy instead of configuration.",
      },
      {
        question: "Are templates updated based on community feedback?",
        answer:
          "Yes. Karma refines templates based on program manager feedback continuously. New templates appear as new program models prove successful. Existing templates use versioning so current programs stay unaffected. New programs always start with the latest recommended configurations. The community drives template improvement over time. You benefit from lessons that other programs already learned. Each update makes the templates more effective.",
      },
      {
        question: "Can I share my custom templates with other organizations?",
        answer:
          "Yes. The platform supports community-contributed templates fully. If your program design works well, you share it with the broader ecosystem. Other organizations clone and customize your template freely. This collaborative approach spreads best practices across the grant community. Shared templates include attribution to the original creator always. You help other programs avoid the mistakes you already solved. The grant ecosystem grows stronger through shared knowledge.",
      },
      {
        question: "Do templates include sample content or just structure?",
        answer:
          "Templates include both structure and sample content together. Application questions, scoring rubrics, and milestone descriptions come pre-filled. Sample content gives you a clear starting point to customize. You keep, modify, or replace any pre-filled text freely. This saves time on writing while keeping full editorial control. The sample content comes from real, successful grant programs. You learn best practices just by reading the template examples.",
      },
    ],
    ctaText: "Browse Program Templates",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "First-time grant program managers launching their inaugural round",
      "Web3 protocols setting up ecosystem development funds",
      "Nonprofit organizations starting new thematic grant programs",
      "DAOs launching retroactive public goods funding rounds",
      "Corporate innovation teams piloting grant-based R&D programs",
      "University departments establishing research grant processes",
    ],
    testimonial: {
      quote:
        "We launched our first ecosystem grants program in under two hours using a Karma template. It would have taken us weeks to design the application forms, rubrics, and milestone structures from scratch.",
      author: "Alex Petrov",
      role: "Ecosystem Development Lead",
      organization: "Luminar Protocol",
    },
    secondaryCta: {
      text: "Explore Features",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Browse the Template Library",
        description:
          "Explore pre-built templates for ecosystem grants, retroactive funding, bounties, fellowships, and community grants to find the best fit for your program.",
      },
      {
        title: "Customize to Your Needs",
        description:
          "Modify application fields, review rubrics, milestone structures, and reporting cadences to match your organization's specific requirements.",
      },
      {
        title: "Add Program-Specific Details",
        description:
          "Fill in budget, timeline, eligibility criteria, and any other program-specific information to complete your grant program configuration.",
      },
      {
        title: "Launch and Start Accepting Applications",
        description:
          "Publish your program and begin receiving applications immediately, with all workflows, review processes, and milestone tracking ready to go.",
      },
    ],
  },
  {
    slug: "grant-compliance-monitoring",
    title: "Grant Compliance Monitoring and Tracking",
    metaDescription:
      "Monitor grant compliance with Karma. Track reporting deadlines, verify deliverables, and ensure grantees meet obligations automatically.",
    heading: "Monitor Grant Compliance Requirements Automatically",
    tldr: "Karma automates compliance monitoring so program managers spend less time chasing grantees and more time driving impact. Track reporting deadlines, verify deliverable submissions, and flag non-compliance before it becomes a problem.",
    problem: {
      heading: "Why Grant Compliance Monitoring Fails Without Automation",
      description:
        "Grant compliance usually means one person manually checking each grantee's work. With dozens or hundreds of grantees, this overwhelms any team. Teams miss deadlines without anyone noticing for weeks. Follow-ups happen inconsistently across the portfolio. By the time someone flags a compliance issue, the program loses leverage. Manual grant compliance monitoring simply does not scale. Small problems grow into big ones without early detection. Teams spend more time chasing grantees than supporting them.",
    },
    solution: {
      heading: "Automated Grant Compliance Monitoring with Early Warnings",
      description:
        "Karma monitors compliance requirements automatically across your entire portfolio. The platform tracks reporting deadlines and milestone submissions in real time. Automated reminders go out to grantees before deadlines arrive. Program managers receive alerts the moment a deadline passes. A compliance dashboard shows on-track, at-risk, and overdue grantees clearly. All compliance data records onchain for full auditability. You catch problems early before they affect project outcomes. Your team focuses on support instead of manual follow-up.",
    },
    capabilities: [
      "Automated deadline tracking for all reporting and milestone requirements",
      "Proactive grantee reminders before deadlines approach",
      "Instant alerts for program managers when compliance issues arise",
      "Portfolio-level compliance dashboard with status indicators",
      "Configurable compliance rules per grant program or funding tier",
      "Onchain audit trail of all compliance events and resolutions",
      "Escalation workflows for repeated non-compliance",
      "Compliance trend analytics across grantee cohorts",
    ],
    faqs: [
      {
        question: "What compliance requirements can Karma track?",
        answer:
          "Karma tracks any time-bound requirement you define. This includes milestone submissions, progress reports, and financial disclosures. Deliverable verifications and custom conditions also work well. Each requirement has its own deadline cadence and verification criteria. The system handles both simple deadlines and complex multi-step workflows. You add new requirements at any point during a grant cycle. The platform adapts to your compliance needs as they change.",
      },
      {
        question: "How are grantees notified about upcoming deadlines?",
        answer:
          "Grantees receive automated reminders at configurable intervals before deadlines. Common settings include 14 days, 7 days, and 1 day before a due date. Notification channels and timing stay fully customizable per program. This proactive system reduces missed deadlines significantly. Program managers spend less time on manual follow-up as a result. Grantees appreciate the heads-up before deadlines arrive. Reminder frequency adjusts based on the importance of each requirement.",
      },
      {
        question: "What happens when a grantee misses a compliance deadline?",
        answer:
          "Program managers receive an immediate alert when a deadline passes. The grantee's status updates on the portfolio dashboard right away. You configure escalation workflows for repeated non-compliance easily. Actions include funding holds, formal warnings, or mandatory check-ins. The system documents all escalation events onchain for audit purposes. You respond to missed deadlines within minutes, not weeks. Early intervention keeps projects from going off track.",
      },
      {
        question: "Can compliance requirements differ between grantees in the same program?",
        answer:
          "Yes. You set requirements at the program level with per-grantee overrides. Larger grants might need more frequent reporting schedules. Smaller grants can have lighter requirements instead. This tiered approach keeps monitoring proportional to grant size. It avoids creating unnecessary burden for lower-risk grantees. You adjust individual requirements at any point during the cycle. Each grantee sees only the requirements that apply to them.",
      },
      {
        question: "How does automated compliance monitoring reduce program risk?",
        answer:
          "Early detection stops small delays from becoming major problems. Proactive alerts let programs intervene before project outcomes suffer. The onchain audit trail documents consistent oversight for governance reviews. This protects programs during audits and stakeholder inquiries effectively. Reliable monitoring builds funder confidence in program management. You demonstrate accountability to every stakeholder who asks. Risk drops when your team catches issues on day one.",
      },
      {
        question: "Can I see compliance trends across my entire portfolio?",
        answer:
          "Yes. Karma provides compliance analytics across your grantee portfolio. You see which programs or cohorts have the highest compliance rates. Trends over time reveal whether compliance improves or declines. This data helps you refine your reporting requirements over time. You identify systemic issues that affect multiple grantees quickly. Charts and dashboards make patterns easy to spot at a glance. You use this data to improve your program design each round.",
      },
      {
        question: "Does the system support custom escalation paths?",
        answer:
          "Yes. You define escalation steps based on the severity of non-compliance. First offenses might trigger a gentle reminder email to the grantee. Repeated missed deadlines escalate to funding holds or formal review. Each step in the escalation path stays configurable per program. The system records all actions and outcomes onchain for transparency. You protect your program while giving grantees fair chances to improve. Escalation paths keep your response consistent across all grantees.",
      },
    ],
    ctaText: "Automate Compliance Monitoring",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant program compliance officers at government agencies",
      "Web3 foundation operations teams managing large grantee portfolios",
      "Nonprofit program managers with regulatory reporting obligations",
      "Corporate grant administrators tracking vendor deliverables",
      "DAO governance teams monitoring community contributor commitments",
    ],
    testimonial: {
      quote:
        "We used to discover missed deliverables weeks after the deadline. Now Karma alerts us instantly when a grantee falls behind, and the automated reminders have cut our non-compliance rate by over 60 percent.",
      author: "Karen Liu",
      role: "Compliance and Operations Manager",
      organization: "OpenBridge Grant Network",
    },
    secondaryCta: {
      text: "Schedule a Call",
      href: PAGES.FOUNDATIONS,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Define Compliance Requirements",
        description:
          "Set up reporting deadlines, milestone submission requirements, and deliverable verification criteria for your grant program or individual funding tiers.",
      },
      {
        title: "Automated Reminders Go Out to Grantees",
        description:
          "Grantees receive proactive reminders at configurable intervals before each deadline, reducing the burden of manual follow-up.",
      },
      {
        title: "Monitor Compliance from a Portfolio Dashboard",
        description:
          "View real-time compliance status for every grantee in your portfolio, with clear indicators showing who is on track, at risk, or overdue.",
      },
      {
        title: "Escalate and Resolve Non-Compliance",
        description:
          "Trigger escalation workflows for missed deadlines, including funding holds, formal warnings, and documented resolution steps recorded onchain.",
      },
    ],
  },
  {
    slug: "grant-document-signing",
    title: "Digital Document Signing for Grant Agreements",
    metaDescription:
      "Streamline grant agreements with digital document signing on Karma. Send, sign, and track contracts without leaving the platform.",
    heading: "Digital Document Signing for Grant Agreements",
    tldr: "Karma integrates digital document signing directly into the grant workflow. Send grant agreements, collect signatures, and track signing status without switching between tools or chasing grantees over email.",
    problem: {
      heading: "Why Grant Document Signing Creates Unnecessary Delays",
      description:
        "Most grant programs require signed agreements before disbursing funds. The signing process involves emailing PDFs back and forth. Tracking who signed and who did not takes constant effort. Following up with late signers wastes valuable time every week. Executed documents end up scattered across multiple systems. For programs with many grantees, document signing becomes a serious bottleneck. Projects stall while agreements sit unsigned in email inboxes. Every delay pushes back the entire grant timeline.",
    },
    solution: {
      heading: "In-Platform Grant Document Signing That Eliminates Delays",
      description:
        "Karma integrates document signing directly into the grant management workflow. Approved grantees receive auto-generated agreements from your templates. They sign digitally without leaving the platform at all. Program managers see real-time signing status on a single dashboard. Signed agreements store alongside the grant record automatically. The signing event records onchain as a permanent attestation. Projects move forward the moment signatures are complete. You eliminate email chains and manual tracking entirely.",
    },
    capabilities: [
      "Template-based grant agreement generation for approved grantees",
      "In-platform digital signature collection with legally binding workflows",
      "Real-time signing status dashboard for all outstanding agreements",
      "Automated reminders for unsigned agreements",
      "Secure document storage linked to grant records",
      "Onchain attestation of signing events for auditability",
      "Multi-party signing with configurable approval order",
      "Dynamic field population from grantee and program data",
    ],
    faqs: [
      {
        question: "Are digital signatures through Karma legally binding?",
        answer:
          "Yes. Karma's signing workflows comply with ESIGN and eIDAS standards. Each signature includes a timestamp and signer identity verification. This creates a legally enforceable agreement in most jurisdictions. The onchain attestation adds tamper-proof evidence of execution. Your legal team relies on these signatures with full confidence. The platform meets the same standards as major e-signature providers. You get legal validity and blockchain verification in one step.",
      },
      {
        question: "Can I use my own agreement templates?",
        answer:
          "Yes. Upload your organization's existing grant agreement templates directly. Dynamic fields auto-populate with grantee details and grant amounts. Milestone schedules and program-specific information fill in automatically. Your legal team keeps their preferred language fully intact. Automated generation eliminates manual document preparation for each grantee. You upload once and generate agreements for every new grantee. Template updates apply to all future agreements immediately.",
      },
      {
        question: "What happens after both parties sign?",
        answer:
          "The executed agreement stores securely in the grant record right away. The signing event creates an onchain attestation as an immutable record. The grantee's project status advances to the next workflow stage automatically. This seamless transition eliminates administrative gaps completely. Projects kick off faster without manual status updates needed. The grantee receives a confirmation with next steps immediately. Everything moves forward without any manual intervention.",
      },
      {
        question: "Can agreements require signatures from multiple parties?",
        answer:
          "Yes. Karma supports multi-party signing workflows fully. Agreements require signatures from grantees, managers, and legal counsel. You define sequential or parallel signing flows as needed. Each party receives notifications when it is their turn to sign. The workflow tracks completion status for every required signer. You see who signed and who still needs to act. The process handles any number of signers without extra setup.",
      },
      {
        question: "How are signed documents stored and accessed?",
        answer:
          "Signed agreements store securely within Karma at all times. They link directly to the corresponding grant record. Authorized team members access any agreement from the grant detail page. No searching through external file storage is ever needed. Onchain attestation records verify document integrity over time. You find any agreement in seconds using the search feature. Documents stay organized and accessible throughout the grant lifecycle.",
      },
      {
        question: "Can I track which agreements are still awaiting signatures?",
        answer:
          "Yes. The signing status dashboard shows every outstanding agreement at a glance. You see which grantees signed and which still need to act. Automated reminders go out to anyone with pending signatures regularly. The dashboard filters by program, date, and signing status easily. This gives you full visibility without manual tracking at all. You never lose track of unsigned agreements again. One dashboard replaces dozens of email follow-up threads.",
      },
      {
        question: "Does the platform support agreement amendments or addendums?",
        answer:
          "Yes. You create amendments linked to the original agreement directly. The amendment follows the same signing workflow as the original document. Both documents store together in the grant record automatically. Version history shows every change to the agreement over time. This keeps your documentation complete and audit-ready always. You track how agreements evolve throughout the grant lifecycle. Auditors see the full history of every document in one place.",
      },
    ],
    ctaText: "Simplify Grant Agreements",
    ctaHref: PAGES.FOUNDATIONS,
    idealFor: [
      "Grant program administrators managing high-volume agreement workflows",
      "Legal and compliance teams at philanthropic foundations",
      "Web3 protocol teams formalizing contributor agreements",
      "Government grant officers requiring documented consent records",
      "Corporate social responsibility managers with vendor agreement processes",
    ],
    testimonial: {
      quote:
        "We used to spend two weeks collecting signatures from 30 grantees via email. With Karma, every agreement was signed within three days, and we never had to send a single follow-up manually.",
      author: "Thomas Eriksen",
      role: "Grants Administrator",
      organization: "Nordic Impact Trust",
    },
    secondaryCta: {
      text: "See Pricing",
      href: PAGES.SOLUTIONS.ROOT,
    },
    datePublished: "2026-03-16",
    steps: [
      {
        title: "Upload or Configure Agreement Templates",
        description:
          "Set up your grant agreement templates with dynamic fields that auto-populate with grantee details, grant amounts, and milestone schedules.",
      },
      {
        title: "Agreements Auto-Generate on Approval",
        description:
          "When a grantee is approved, their grant agreement is automatically generated from the template and sent for digital signature.",
      },
      {
        title: "Grantees Sign Without Leaving the Platform",
        description:
          "Grantees receive signing requests and complete their signatures digitally within Karma, with automated reminders for outstanding agreements.",
      },
      {
        title: "Signed Agreements Are Stored and Attested Onchain",
        description:
          "Executed agreements are securely stored alongside grant records, signing events are recorded onchain, and the grantee's project advances automatically.",
      },
    ],
  },
];
