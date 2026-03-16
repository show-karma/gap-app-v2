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
      heading: "Grant Programs Struggle to Verify Actual Work",
      description:
        "Most grant programs rely on self-reported updates with no way to verify claims. Grantees submit vague progress reports, and program managers spend hours chasing follow-ups. Without a structured proof-of-work system, it is impossible to distinguish high-performing grantees from those who underdeliver. This lack of accountability erodes funder confidence and makes it harder to justify continued investment in grant programs.",
    },
    solution: {
      heading: "Onchain Proof of Work That Speaks for Itself",
      description:
        "Karma provides a structured framework where grantees log milestones and attach verifiable evidence of completed work. Each update is recorded as an onchain attestation, creating an immutable record of progress. Program managers get a real-time dashboard showing exactly where every project stands. Reviewers can validate deliverables against predefined criteria, and the entire history is publicly auditable. This transforms grant accountability from a trust-based system into a verify-based system.",
    },
    capabilities: [
      "Onchain attestations for every milestone and deliverable submission",
      "Real-time dashboards showing project progress across all grantees",
      "Reviewer workflows for validating proof of work against acceptance criteria",
      "Automated reminders for overdue milestones and missing updates",
      "Public grant profiles showcasing verified accomplishments",
      "Historical audit trail for every project from start to finish",
    ],
    faqs: [
      {
        question: "What counts as proof of work in Karma?",
        answer:
          "Proof of work includes any verifiable evidence attached to a milestone update, such as links to deployed code, published reports, transaction hashes, screenshots, or third-party confirmations. Each submission is recorded onchain as an attestation, creating a permanent and publicly auditable record. This ensures that every claim of progress is backed by concrete, independently verifiable documentation.",
      },
      {
        question: "Can reviewers reject incomplete proof of work?",
        answer:
          "Yes. Reviewers can approve, request changes, or reject milestone submissions based on predefined acceptance criteria. All review decisions are recorded onchain, creating a transparent feedback loop between grantees and program managers. Rejected submissions include reviewer comments explaining what is missing, so grantees know exactly what to improve before resubmitting their proof of work.",
      },
      {
        question: "How does onchain tracking differ from traditional reporting?",
        answer:
          "Traditional reporting relies on self-reported documents that can be edited, fabricated, or lost over time. Onchain tracking creates immutable, timestamped records that anyone can verify independently without relying on a central authority. This provides a significantly higher standard of accountability because historical records cannot be altered after the fact, giving funders and auditors permanent access to the original evidence.",
      },
      {
        question: "Is proof of work tracking available for all grant programs?",
        answer:
          "Yes. Any grant program on Karma can enable proof-of-work tracking regardless of size or funding type. The system is flexible enough to support programs ranging from small community micro-grants to large institutional funding rounds with hundreds of grantees. Configuration options let program managers tailor the tracking requirements to match their specific deliverable types and verification standards.",
      },
      {
        question: "How does proof of work tracking improve funder confidence in grant programs?",
        answer:
          "By replacing self-reported updates with verifiable onchain evidence, funders can independently confirm that milestones were completed as claimed. This transparency reduces information asymmetry between funders and grantees, builds trust over successive grant rounds, and provides concrete data that justifies continued investment. Programs using onchain proof of work can demonstrate accountability to stakeholders with auditable records rather than relying solely on narrative reports.",
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
      heading: "Reviewer Management Is a Bottleneck for Grant Programs",
      description:
        "Assigning reviewers manually is time-consuming and error-prone. Program managers juggle spreadsheets to track who is reviewing what, miss conflicts of interest, and struggle to balance workloads evenly. Some applications get thorough reviews while others are barely glanced at. Without a structured system, reviewer fatigue sets in, deadlines slip, and the quality of evaluations suffers. This inconsistency undermines the credibility of the entire grant selection process.",
    },
    solution: {
      heading: "Structured Reviewer Workflows That Scale",
      description:
        "Karma provides a dedicated reviewer management system where program managers can invite reviewers, assign applications based on expertise and availability, and monitor review progress in real time. The platform automatically tracks which applications have been reviewed and which are pending. Reviewers get a focused interface showing only their assigned applications, with clear rubrics and deadlines. All reviews are recorded onchain, ensuring transparency and accountability throughout the evaluation process.",
    },
    capabilities: [
      "Invite and onboard reviewers with role-based access controls",
      "Assign applications to reviewers based on expertise and workload",
      "Real-time dashboard showing review progress and pending assignments",
      "Structured evaluation rubrics for consistent scoring across reviewers",
      "Conflict of interest detection and disclosure workflows",
      "Onchain recording of all review decisions for auditability",
      "Automated notifications for upcoming deadlines and overdue reviews",
    ],
    faqs: [
      {
        question: "How are reviewers assigned to applications?",
        answer:
          "Program managers can manually assign reviewers or use workload-based distribution to ensure applications are spread evenly across the review panel. Each reviewer sees only their assigned applications in a dedicated review interface with clear rubrics and scoring criteria. The assignment system also considers reviewer expertise and availability, helping programs match the right evaluators to the right proposals for higher quality assessments.",
      },
      {
        question: "Can reviewers see each other's evaluations?",
        answer:
          "This is fully configurable per program. Some programs keep reviews blind until all evaluations are submitted to prevent anchoring bias, while others allow open discussion among reviewers for collaborative assessment. Program managers control visibility settings based on their evaluation methodology, and these settings can be adjusted between grant rounds as the program refines its review process over time.",
      },
      {
        question: "How does Karma handle conflicts of interest?",
        answer:
          "Reviewers can flag conflicts of interest on any assigned application, and program managers can reassign those applications to other qualified reviewers with a single click. The platform tracks all conflict disclosures for compliance and audit purposes throughout the review cycle. This documented trail of conflict management protects program integrity and satisfies governance requirements for transparent evaluation processes.",
      },
      {
        question: "What metrics can program managers track about reviewer performance?",
        answer:
          "Program managers can monitor review completion rates, average time to review, scoring consistency across reviewers, and pending assignment counts from a centralized analytics dashboard. These metrics help identify bottlenecks early, ensure workloads remain balanced across the panel, and maintain high evaluation quality. Historical data across grant rounds also reveals which reviewers consistently deliver thorough, timely assessments.",
      },
      {
        question: "How many reviewers can be assigned to a single grant application?",
        answer:
          "There is no hard limit on reviewer assignments per application. Programs commonly assign two to five reviewers per application to ensure diverse perspectives and reduce individual bias. The platform automatically aggregates scores across all assigned reviewers and highlights significant scoring discrepancies, so program managers can investigate disagreements and facilitate calibration discussions before making final funding decisions.",
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
      heading: "One-Size-Fits-All Workflows Do Not Work for Grants",
      description:
        "Every grant program has unique requirements, from application review stages to milestone verification processes. Generic project management tools force programs into rigid workflows that do not match how grants actually operate. Program managers end up building workarounds with spreadsheets and email chains, creating fragmented processes that are hard to track and impossible to scale. When workflows do not match reality, things fall through the cracks.",
    },
    solution: {
      heading: "Configurable Workflows Built for Grant Operations",
      description:
        "Karma provides a flexible workflow engine designed specifically for grant programs. Program managers can define custom stages for application review, set up multi-step approval gates, configure milestone checkpoints with specific deliverable requirements, and automate transitions between stages. Each workflow step can have its own set of required actions, reviewers, and deadlines. The result is a grant management process that matches your program's actual needs while maintaining full transparency through onchain attestations.",
    },
    capabilities: [
      "Configurable multi-stage application review pipelines",
      "Custom approval gates with role-based sign-off requirements",
      "Milestone checkpoints with deliverable-specific verification criteria",
      "Automated stage transitions triggered by completion conditions",
      "Template-based workflow creation for recurring grant rounds",
      "Visual workflow builder for non-technical program managers",
    ],
    faqs: [
      {
        question: "Can I modify a workflow after a grant round has started?",
        answer:
          "You can add new stages or adjust future milestones for active grant rounds without disrupting work already in progress. Changes apply to new applications and upcoming milestones without affecting already-completed stages, ensuring consistency for in-progress grantees. This flexibility lets programs iterate on their processes based on lessons learned during a live round without starting over.",
      },
      {
        question: "Do custom workflows support multi-party approvals?",
        answer:
          "Yes. You can configure any workflow stage to require sign-off from multiple reviewers or administrators before an application or milestone advances to the next stage. This is particularly useful for high-value grants requiring governance approval from multiple stakeholders. Approval thresholds are configurable, so you can require unanimous consent or a majority before the workflow progresses.",
      },
      {
        question: "Can I reuse workflows across multiple grant rounds?",
        answer:
          "Absolutely. Save any workflow as a template and apply it to future grant rounds with a single click. You can also clone and modify existing templates to create variations for different program types without rebuilding from scratch. This template-based approach standardizes your grant operations while still allowing customization for each round's unique requirements and goals.",
      },
      {
        question: "Are workflow changes tracked?",
        answer:
          "Yes. All workflow configuration changes are logged with timestamps and the identity of who made each change, providing a complete audit trail showing how your grant process has evolved over time. This change history is essential for governance and compliance reviews, and it helps new team members understand why certain workflow decisions were made in previous rounds.",
      },
      {
        question: "What is the difference between approval gates and milestone checkpoints?",
        answer:
          "Approval gates are decision points where designated reviewers must sign off before a grant advances to the next stage, typically used during application review and funding decisions. Milestone checkpoints verify that specific deliverables have been completed during the execution phase after funding is awarded. Both can be customized with their own criteria, required approvers, and deadline requirements to match your program structure.",
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
      heading: "Grant Budgets Are Hard to Track at Scale",
      description:
        "Grant programs often manage millions of dollars across dozens of grantees, but budget tracking is typically done in disconnected spreadsheets. Program managers struggle to answer basic questions: How much has been disbursed? How much is committed but not yet paid? What is the burn rate? When funds are tracked manually, errors compound, reconciliation becomes a nightmare, and programs risk overcommitting or underutilizing their budgets. Without real-time visibility, financial oversight is always reactive rather than proactive.",
    },
    solution: {
      heading: "Centralized Budget Visibility for Every Grant Dollar",
      description:
        "Karma provides a unified budget tracking system that connects fund allocation to milestones and disbursements. Program managers see a live dashboard showing total budget, committed funds, disbursed amounts, and remaining balance for each grantee and the program as a whole. Disbursements are linked to approved milestones, so every payment has a clear justification. The system supports multiple funding sources and currencies, giving programs a single source of truth for financial oversight.",
    },
    capabilities: [
      "Real-time budget dashboards for program-level and grantee-level views",
      "Disbursement tracking linked to approved milestones and deliverables",
      "Multi-currency and multi-source fund tracking",
      "Budget forecasting based on committed allocations and burn rate",
      "Automated alerts for budget thresholds and overspending risks",
      "Exportable financial reports for stakeholder and board presentations",
      "Historical spending analysis across grant rounds",
    ],
    faqs: [
      {
        question: "Can I track budgets across multiple grant rounds?",
        answer:
          "Yes. Karma provides both per-round and aggregate budget views, so you can track spending within a single round or across your entire program history. This cross-round visibility helps you identify spending trends, compare cost efficiency between rounds, and plan future budgets more accurately based on historical disbursement patterns and grantee utilization rates across your portfolio.",
      },
      {
        question: "Does Karma support crypto and fiat budget tracking?",
        answer:
          "Yes. The platform supports tracking both cryptocurrency and fiat disbursements, with conversion snapshots captured at the time of each transaction for accurate financial reporting. This dual-currency support is essential for Web3 programs that operate across both crypto and traditional finance, ensuring your budget dashboards reflect real values regardless of token price volatility between disbursement events.",
      },
      {
        question: "How are disbursements connected to milestones?",
        answer:
          "Each disbursement can be linked to a specific approved milestone, creating a clear audit trail from deliverable verification to fund release. This ensures payments are always tied to demonstrated progress rather than arbitrary schedules. Program managers can configure whether disbursements are released automatically upon milestone approval or require a separate manual authorization step for additional oversight.",
      },
      {
        question: "Can I set budget limits per grantee?",
        answer:
          "Yes. Program managers can set maximum allocation limits per grantee and receive automated alerts when disbursements approach or exceed those limits. This prevents overspending and ensures funds are distributed according to program guidelines without requiring manual monitoring of every transaction. Limits can be configured at both the individual grantee level and the funding tier level for flexible budget governance.",
      },
      {
        question: "How does Karma handle budget reconciliation across multiple funding sources?",
        answer:
          "Karma tracks each funding source separately while providing a unified view of total program finances. You can see how much has been drawn from each source, which grantees are funded by which source, and how remaining balances compare across all funding pools. Exportable reconciliation reports make it straightforward to align platform data with external accounting systems even for complex multi-source programs.",
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
      heading: "Grant Programs Cannot Prove Their Impact",
      description:
        "Most grant programs can say how much money they distributed and how many projects they funded, but they cannot answer the harder question: did it work? Impact measurement is typically an afterthought, bolted on at the end of a grant cycle with ad-hoc surveys and anecdotal evidence. Without structured impact data, programs cannot compare outcomes across grantees, identify what interventions work best, or justify continued funding to stakeholders. This measurement gap threatens the sustainability of grant programs everywhere.",
    },
    solution: {
      heading: "Structured Impact Data from Day One",
      description:
        "Karma embeds impact measurement into the grant lifecycle from the start. Programs define impact metrics and key results during program setup, and grantees report against those metrics alongside their milestone updates. The platform aggregates impact data across your entire portfolio, enabling program managers to identify trends, compare outcomes, and generate stakeholder-ready impact reports. All impact data is verifiable through onchain attestations, giving funders confidence that reported outcomes are real.",
    },
    capabilities: [
      "Customizable impact metrics and key result indicators per program",
      "Grantee self-reporting integrated into milestone update workflows",
      "Portfolio-level impact aggregation and trend analysis",
      "Automated impact report generation for stakeholders and funders",
      "Benchmarking across grantees and grant rounds",
      "Onchain verification of reported impact data",
    ],
    faqs: [
      {
        question: "What types of impact metrics can I track?",
        answer:
          "Karma supports both quantitative metrics such as users reached, revenue generated, and transactions processed, as well as qualitative outcomes like community feedback and case studies. You define the metrics that matter most to your program during setup, and grantees report against them throughout the grant lifecycle. Custom metric types can be added at any time as your program's measurement needs evolve.",
      },
      {
        question: "How do grantees report impact data?",
        answer:
          "Impact reporting is integrated directly into the milestone update workflow. When grantees submit progress updates, they also report against the impact metrics defined for their grant, making data collection a natural part of the reporting cadence rather than an additional burden. This embedded approach significantly increases reporting compliance because grantees complete impact reporting alongside their regular milestone submissions.",
      },
      {
        question: "Can I compare impact across different grant rounds?",
        answer:
          "Yes. Karma provides cross-round analytics that let you compare impact outcomes over time, helping you understand which program designs and grantee profiles deliver the strongest results. These longitudinal comparisons inform future funding strategy by revealing patterns in what types of projects generate the most measurable impact, enabling data-driven decisions about program design and grantee selection criteria.",
      },
      {
        question: "How does Karma verify that reported impact data is accurate?",
        answer:
          "All impact data submissions are recorded as onchain attestations, creating an immutable audit trail that cannot be altered after submission. Reviewers can validate reported metrics against supporting evidence provided by grantees, and the platform automatically flags significant deviations from expected ranges. This multi-layered verification approach reduces the risk of inflated or inaccurate impact claims while maintaining a trustworthy data foundation.",
      },
      {
        question: "Can impact reports be shared directly with external stakeholders?",
        answer:
          "Yes. Karma generates shareable impact reports that can be exported as polished PDFs or accessed via read-only dashboard links with no login required. External stakeholders including board members, donors, and partner organizations can view aggregated impact data without needing a full platform account. This makes it easy to communicate program outcomes to diverse audiences at any time.",
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
      heading: "Evaluating Grantee Performance Is Subjective and Inconsistent",
      description:
        "When it comes time to evaluate grantee performance, most programs rely on subjective impressions from program managers who remember some projects better than others. There is no consistent scoring framework, so comparing grantees is more art than science. High performers do not get the recognition they deserve, underperformers slip through unnoticed, and future funding decisions are based on incomplete information. This inconsistency makes it impossible to build a meritocratic grant ecosystem.",
    },
    solution: {
      heading: "Data-Driven Performance Evaluation at Scale",
      description:
        "Karma automatically generates performance scores for every grantee based on objective criteria: milestone completion rates, timeliness of updates, reviewer ratings, and impact metric achievement. Program managers can customize scoring weights to reflect their program's priorities. The result is a transparent, data-driven ranking system that rewards high performers and identifies grantees who may need additional support. Performance scores carry over across grant rounds, building a reputation system that benefits the entire ecosystem.",
    },
    capabilities: [
      "Automated performance scoring based on milestone completion and timeliness",
      "Customizable scoring weights aligned to program priorities",
      "Grantee ranking dashboards for portfolio-level comparison",
      "Historical performance tracking across multiple grant rounds",
      "Reviewer rating integration for qualitative assessment",
      "Performance-based flags and alerts for at-risk grantees",
      "Exportable performance reports for governance and funding decisions",
    ],
    faqs: [
      {
        question: "What factors contribute to a grantee's performance score?",
        answer:
          "Performance scores are calculated from milestone completion rates, update timeliness, reviewer ratings, and impact metric achievement. Program managers can adjust the weight of each factor to match their priorities, ensuring the scoring system reflects what matters most to their specific program. Weights can be recalibrated between grant rounds as program goals evolve without losing historical scoring data.",
      },
      {
        question: "Can performance scores influence future grant applications?",
        answer:
          "Yes. Performance history is available during application review, allowing reviewers to factor in a grantee's track record when evaluating new proposals. This creates a reputation system that rewards consistent performers with stronger consideration for future funding. Reviewers see a summary of past scores, completion rates, and reviewer feedback alongside the new application for informed decision-making.",
      },
      {
        question: "How do you prevent gaming of the performance scoring system?",
        answer:
          "Scores are based on verified onchain data, not self-reported metrics. Reviewer validations, milestone approvals, and attestation records all feed into the scoring algorithm, making it highly resistant to manipulation. Because every data point is independently verifiable through onchain attestations, grantees cannot inflate their scores without actually completing verified deliverables and receiving genuine reviewer endorsements.",
      },
      {
        question: "Can I see performance trends over time?",
        answer:
          "Yes. Karma provides historical performance charts showing how each grantee's scores have evolved across multiple grant rounds. These trend visualizations help you identify improving or declining performers, spot patterns in grantee behavior, and make informed decisions about follow-on funding. Trend data can also be exported for inclusion in board reports and stakeholder presentations about portfolio health.",
      },
      {
        question: "How does performance scoring work for first-time grantees with no history?",
        answer:
          "First-time grantees start with a neutral baseline score and build their performance profile as they complete milestones and receive reviewer evaluations throughout their first grant. The system clearly distinguishes between new grantees and those with established track records, so first-time applicants are not penalized for lacking historical data during the review process and are evaluated fairly on their current work.",
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
      heading: "Board Reporting Takes Too Long and Says Too Little",
      description:
        "Every quarter, program managers spend days assembling board reports from scattered sources: pulling data from spreadsheets, chasing grantees for updates, formatting slides, and trying to tell a coherent story about program health. The result is often a stale snapshot that is outdated by the time it is presented. Board members and stakeholders want clear answers about fund utilization, project progress, and program impact, but the manual reporting process makes it nearly impossible to deliver timely, comprehensive reports at the frequency stakeholders need.",
    },
    solution: {
      heading: "Automated Reports Powered by Real-Time Data",
      description:
        "Karma generates board-ready reports directly from your live program data. Because all milestones, reviews, and disbursements are tracked in the platform, reports are assembled automatically with current numbers. Program managers can customize report templates to include the metrics their board cares about most: fund utilization, milestone completion rates, grantee performance rankings, and impact summaries. Reports can be exported as PDFs or shared as live dashboards, eliminating the manual assembly process entirely.",
    },
    capabilities: [
      "One-click report generation from live program data",
      "Customizable report templates for different stakeholder audiences",
      "Fund utilization summaries with allocation and disbursement breakdowns",
      "Grantee progress overviews with milestone completion status",
      "Impact metric dashboards with trend visualization",
      "PDF export and shareable live dashboard links",
    ],
    faqs: [
      {
        question: "How often can I generate board reports?",
        answer:
          "Reports can be generated at any time since they pull from live program data. Many programs generate monthly summaries and quarterly comprehensive reports, but you can create them as frequently as needed with no additional effort or data preparation. The on-demand nature of report generation means stakeholders always have access to current numbers rather than waiting for scheduled reporting cycles.",
      },
      {
        question: "Can I customize what appears in a board report?",
        answer:
          "Yes. You can configure report templates to include or exclude specific sections such as budget summaries, grantee rankings, milestone progress, and impact metrics. Different templates can be created for different audiences, so your board sees high-level portfolio health while program staff access detailed operational breakdowns. Templates are reusable across reporting periods for consistent formatting.",
      },
      {
        question: "Can board members access dashboards directly?",
        answer:
          "Yes. Karma supports shareable dashboard links with read-only access, so board members and stakeholders can view program health data at any time without needing a full platform account or training. These live dashboards update automatically as new program data comes in, giving board members self-service access to current information between scheduled reporting periods.",
      },
      {
        question: "What formats are supported for export?",
        answer:
          "Reports can be exported as polished PDF documents for formal board presentations or shared as live web dashboards that update in real time as program data changes. This gives you flexibility to choose the right format for each audience and context. PDF exports include charts, tables, and executive summaries formatted for professional distribution to stakeholders who prefer static documents.",
      },
      {
        question: "How does automated reporting save time compared to manual report assembly?",
        answer:
          "Manual board reports typically require days of data collection from spreadsheets, emails, and project management tools before any analysis can begin. Karma eliminates this entirely by generating reports directly from live program data with one click. Program managers report saving ten or more hours per reporting cycle, freeing them to focus on program strategy, grantee support, and stakeholder engagement instead of data wrangling.",
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
      heading: "Starting a Grant Program from Scratch Takes Too Long",
      description:
        "Launching a new grant program involves dozens of decisions: application form design, review criteria, milestone structures, reporting cadences, and evaluation rubrics. Most program managers reinvent the wheel every time, spending weeks on setup before a single application is received. Without a reference point, new programs often miss critical elements that only become apparent mid-cycle, leading to awkward process changes and frustrated grantees. The setup burden discourages organizations from experimenting with new program types.",
    },
    solution: {
      heading: "Battle-Tested Templates for Every Program Type",
      description:
        "Karma provides a library of grant program templates built from the patterns of successful programs across the ecosystem. Each template includes pre-configured application forms, review rubrics, milestone structures, and reporting workflows. Program managers simply select a template, customize the details for their specific needs, and launch. Templates cover common program types including ecosystem grants, retroactive funding, bounties, and fellowship programs. This approach combines the speed of a pre-built solution with the flexibility to make it your own.",
    },
    capabilities: [
      "Template library covering ecosystem grants, retroactive funding, bounties, and fellowships",
      "Pre-configured application forms with field-level customization",
      "Built-in review rubrics and scoring criteria for each template type",
      "Milestone structures with suggested deliverable categories",
      "Customizable reporting cadences and update requirements",
      "Clone and modify templates to create program variations",
    ],
    faqs: [
      {
        question: "What types of grant program templates are available?",
        answer:
          "Karma offers templates for ecosystem development grants, retroactive public goods funding, project bounties, developer fellowships, and community grants. Each template is based on proven structures used by successful programs in the ecosystem and includes pre-configured application forms, review rubrics, milestone structures, and reporting workflows. The template library continues to expand as new program models emerge.",
      },
      {
        question: "Can I modify a template after selecting it?",
        answer:
          "Yes. Templates are starting points, not rigid structures. You can add, remove, or modify any element including application fields, review criteria, milestone structures, and reporting requirements before or after launching your program. This means you get the speed benefit of a pre-built foundation while retaining full control over every detail of your grant process.",
      },
      {
        question: "Can I create my own templates?",
        answer:
          "Yes. Any grant program configuration can be saved as a custom template for reuse across future rounds. This is especially useful for organizations that run recurring grant rounds with consistent structures, allowing you to standardize your process across cycles. Custom templates capture all settings including application forms, review rubrics, milestone definitions, and notification preferences.",
      },
      {
        question: "How quickly can I launch a program using a template?",
        answer:
          "Most programs can go from template selection to accepting applications in under an hour. The template handles the structural decisions around application forms, review rubrics, and milestone frameworks, so you only need to fill in program-specific details like budget, timeline, and eligibility criteria. This dramatically reduces the setup time compared to building a program from scratch.",
      },
      {
        question: "Are templates updated based on community feedback?",
        answer:
          "Yes. Karma continuously refines templates based on feedback from program managers and best practices emerging from the grant ecosystem. New templates are added as new program models prove successful across the community. Existing templates are versioned, so programs already using a template are not affected by updates, while new programs always start with the latest recommended configurations.",
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
      heading: "Compliance Monitoring Is Manual and Reactive",
      description:
        "Grant compliance typically means a program manager manually checking whether each grantee has submitted their required updates, reports, and deliverables on time. With dozens or hundreds of grantees, this becomes an overwhelming task. Deadlines are missed, follow-ups are inconsistent, and non-compliance is often discovered weeks after the fact. By the time a compliance issue is flagged, the program has already lost leverage to course-correct. Manual compliance monitoring does not scale, and the consequences of missed oversight can be severe for program credibility.",
    },
    solution: {
      heading: "Automated Compliance Tracking with Early Warnings",
      description:
        "Karma monitors compliance requirements automatically across your entire grantee portfolio. The platform tracks reporting deadlines, milestone submission requirements, and deliverable verification status for every grantee in real time. When a deadline is approaching, automated reminders go out to grantees. When a deadline is missed, program managers are alerted immediately. A compliance dashboard provides a portfolio-level view of which grantees are on track, which are at risk, and which require intervention. All compliance data is recorded onchain for auditability.",
    },
    capabilities: [
      "Automated deadline tracking for all reporting and milestone requirements",
      "Proactive grantee reminders before deadlines approach",
      "Instant alerts for program managers when compliance issues arise",
      "Portfolio-level compliance dashboard with status indicators",
      "Configurable compliance rules per grant program or funding tier",
      "Onchain audit trail of all compliance events and resolutions",
      "Escalation workflows for repeated non-compliance",
    ],
    faqs: [
      {
        question: "What compliance requirements can Karma track?",
        answer:
          "Karma can track any time-bound requirement including milestone submissions, progress reports, financial disclosures, deliverable verifications, and custom compliance conditions defined by your program. Each requirement can have its own deadline cadence, verification criteria, and escalation rules. The system is flexible enough to handle both simple reporting deadlines and complex multi-step compliance workflows with conditional triggers.",
      },
      {
        question: "How are grantees notified about upcoming deadlines?",
        answer:
          "Grantees receive automated reminders at configurable intervals before deadlines, such as 14 days, 7 days, and 1 day before a submission is due. The notification channels and timing are fully customizable per program. This proactive reminder system significantly reduces missed deadlines by keeping compliance obligations visible to grantees without requiring manual follow-up from program managers.",
      },
      {
        question: "What happens when a grantee misses a compliance deadline?",
        answer:
          "Program managers are alerted immediately when a deadline passes without a submission, and the grantee's compliance status is updated on the portfolio dashboard. You can configure escalation workflows that trigger additional actions for repeated non-compliance, such as funding holds, formal warnings, or mandatory check-in meetings. All escalation events are documented onchain for audit purposes.",
      },
      {
        question: "Can compliance requirements differ between grantees in the same program?",
        answer:
          "Yes. Requirements can be configured at the program level with overrides for individual grantees or funding tiers. For example, larger grants might have more frequent reporting requirements and stricter deliverable verification criteria than smaller ones. This tiered approach ensures compliance monitoring is proportional to grant size and risk level without creating unnecessary burden for smaller grantees.",
      },
      {
        question: "How does automated compliance monitoring reduce program risk?",
        answer:
          "By catching compliance issues early through proactive alerts and deadline tracking, programs can intervene before small delays become major problems that threaten project outcomes. The onchain audit trail also provides documented evidence of consistent oversight, which protects programs during governance reviews and demonstrates accountability to funders, regulators, and other stakeholders who depend on reliable program management.",
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
      heading: "Grant Agreements Are a Workflow Bottleneck",
      description:
        "Before any funds are disbursed, most grant programs require signed agreements. But the signing process typically involves emailing PDFs back and forth, tracking who has signed and who has not, following up with delinquent signers, and storing executed documents in yet another system. This disjointed process creates delays between grant approval and project kickoff. For programs with dozens of grantees, agreement management becomes a significant administrative burden that slows down the entire grant lifecycle.",
    },
    solution: {
      heading: "Signing Built into the Grant Lifecycle",
      description:
        "Karma integrates document signing directly into the grant management workflow. When a grantee is approved, the grant agreement is automatically generated from a template and sent for signature. Grantees sign digitally without leaving the platform. Program managers see real-time signing status for all grantees on a single dashboard. Once signed, agreements are stored alongside the grant record, and the signing event is recorded onchain as an attestation. This eliminates the back-and-forth of email-based signing and keeps the entire agreement lifecycle in one place.",
    },
    capabilities: [
      "Template-based grant agreement generation for approved grantees",
      "In-platform digital signature collection with legally binding workflows",
      "Real-time signing status dashboard for all outstanding agreements",
      "Automated reminders for unsigned agreements",
      "Secure document storage linked to grant records",
      "Onchain attestation of signing events for auditability",
    ],
    faqs: [
      {
        question: "Are digital signatures through Karma legally binding?",
        answer:
          "Yes. Karma's digital signing workflows comply with widely recognized electronic signature standards including ESIGN and eIDAS. Each signature is timestamped and recorded with signer identity verification, creating a legally enforceable agreement that meets regulatory requirements in most jurisdictions. The onchain attestation provides an additional layer of tamper-proof evidence that the agreement was executed at a specific time.",
      },
      {
        question: "Can I use my own agreement templates?",
        answer:
          "Yes. You can upload your organization's existing grant agreement templates with dynamic fields that auto-populate with grantee details, grant amounts, milestone schedules, and other program-specific information. This means your legal team can maintain their preferred agreement language while benefiting from automated generation and digital signing workflows that eliminate manual document preparation for each grantee.",
      },
      {
        question: "What happens after both parties sign?",
        answer:
          "Once all required signatures are collected, the executed agreement is securely stored in the grant record, the signing event is attested onchain as an immutable record, and the grantee's project status automatically advances to the next workflow stage. This seamless transition eliminates the administrative gap between agreement execution and project kickoff that typically delays grant programs.",
      },
      {
        question: "Can agreements require signatures from multiple parties?",
        answer:
          "Yes. Karma supports multi-party signing workflows where agreements can require signatures from the grantee, program manager, legal counsel, or any other designated parties in a configurable signing order. You can define sequential or parallel signing flows depending on your organization's approval process, and each party receives automated notifications when it is their turn to sign.",
      },
      {
        question: "How are signed documents stored and accessed?",
        answer:
          "Signed agreements are securely stored within Karma and linked directly to the corresponding grant record for easy retrieval. Authorized program members can access any agreement at any time from the grant detail page without searching through external file storage systems. All documents are additionally backed up with tamper-proof onchain attestation records that verify document integrity over time.",
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
