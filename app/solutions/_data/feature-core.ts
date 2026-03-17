import { PAGES } from "@/utilities/pages";
import type { SolutionPage } from "./types";

export const featureCoreSolutions: SolutionPage[] = [
  {
    slug: "ai-grant-review",
    title: "AI Grant Review: Faster Application Evaluation",
    metaDescription:
      "Speed up your AI grant review process with Karma. Automate application scoring, flag risks instantly, and help reviewers make better funding decisions.",
    heading: "Scale Your Program With AI Grant Review",
    tldr: "AI grant review helps your team evaluate applications faster and more consistently. Karma reduces review time by up to 80% while improving decision quality across your entire portfolio.",
    problem: {
      heading: "Why AI Grant Review Beats Manual Evaluation",
      description:
        "Most grant programs still review applications by hand. Reviewers read hundreds of proposals each round. They burn out fast under this heavy load. However, scoring criteria drift as fatigue grows. Top evaluators quit because the workload crushes them. In addition, delayed decisions frustrate applicants for weeks. Programs also miss high-impact projects buried in the pile. Furthermore, manual review blocks fast funding cycles. As a result, each round takes longer than the last. Meanwhile, better tools sit unused on the shelf.",
    },
    solution: {
      heading: "Smarter AI Grant Review for Every Funding Round",
      description:
        "Karma brings ai grant review to your entire workflow. The system pre-screens applications in seconds. Specifically, it checks each one against your criteria. It then builds clear summaries and flags risks. Moreover, reviewers focus only on shortlisted proposals. Every AI score stays transparent and auditable. Therefore, your funding decisions stay credible at any scale. You keep full control over the final call. In addition, the AI handles the heavy lifting for you.",
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
          "No. Karma's AI helps reviewers by pre-screening and scoring. It also summarizes each application clearly. However, human reviewers always make the final call. The AI boosts your team's output significantly. It does not remove human judgment from the process. Therefore, this keeps accountability intact at every stage. In addition, it cuts the time reviewers spend on triage. Your team stays in charge of every decision. As a result, you get speed without losing control.",
      },
      {
        question: "How does AI grant review handle bias in evaluations?",
        answer:
          "The AI applies your scoring rubric the same way every time. This removes the drift that tired reviewers cause. Moreover, you can audit AI scores at any point. You can also adjust rubric weights easily. Fair scoring matters most with large applicant pools. Furthermore, the AI never gets tired or distracted. It treats the first application like the last one. As a result, every applicant gets a consistent evaluation.",
      },
      {
        question: "Can I customize the review criteria for different grant programs?",
        answer:
          "Yes. Each grant program on Karma gets its own rubric. It also gets its own review workflow. The AI adapts to your specific needs quickly. Moreover, you weight criteria differently per program. You add custom evaluation dimensions too. Furthermore, you adjust thresholds to match your goals. Changes take effect right away for new reviews. As a result, every program runs by its own rules.",
      },
      {
        question: "How much faster is AI-assisted review compared to manual review?",
        answer:
          "Programs using Karma see a 60-80% drop in review time. Reviewers focus on the 20-30% that need deep evaluation. Meanwhile, the AI screens and scores the rest automatically. This gain grows as your program scales up. Specifically, larger rounds benefit the most from automation. A 500-application round takes days, not weeks. Therefore, your team handles more volume with less effort. In addition, reviewer satisfaction improves across the board.",
      },
      {
        question: "What is the ROI of using AI for grant review?",
        answer:
          "Most groups save major reviewer hours in round one. Programs with 200+ applications often recover costs fast. Specifically, labor savings alone cover the platform fee. You also get faster decisions and steady scores. Moreover, reviewers stay longer because burnout drops significantly. The ROI grows with each funding cycle you run. Furthermore, teams report more output with fewer resources. As a result, your program capacity expands without extra hires.",
      },
      {
        question: "How does Karma protect the privacy of grant applications?",
        answer:
          "Karma stores application data with strict access controls. Only assigned reviewers see their queued applications. Moreover, the AI processes data within your program only. No application content trains outside models at all. You control who sees what at every stage. Furthermore, data stays private throughout the entire review. Your applicants' details never leave the platform. As a result, privacy stays protected from start to finish.",
      },
      {
        question: "Can I use AI grant review for retroactive funding rounds?",
        answer:
          "Yes. Karma supports retroactive funding rounds too. You define a scoring rubric for past work. The AI screens those submissions against your criteria. Moreover, reviewers then evaluate the shortlist efficiently. This works well for ecosystem reward programs. It also fits retroactive public goods funding perfectly. Furthermore, you use the same tools for both round types. As a result, one platform covers all your needs.",
      },
      {
        question: "What happens if a reviewer disagrees with the AI score?",
        answer:
          "Reviewers can override any AI score with one click. The system logs every override with a clear reason. Moreover, this feedback helps improve future scoring accuracy. Reviewer disagreements also get flagged for discussion. The final call always stays with your human team. Furthermore, overrides do not break the audit trail. The full history stays visible for program managers. As a result, transparency and flexibility work together.",
      },
      {
        question: "How does AI grant review integrate with existing workflows?",
        answer:
          "Karma fits into your current review process smoothly. You keep your existing reviewer committees and stages. The AI adds a pre-screening layer before human review. Moreover, you control how much the AI handles directly. Integration takes minutes, not weeks of setup. Furthermore, your team uses familiar tools alongside the AI. No workflow disruption happens during the transition. As a result, adoption stays fast and painless for everyone.",
      },
      {
        question: "Can the AI handle applications in multiple languages?",
        answer:
          "Yes. Karma's AI processes applications in many languages. It scores and summarizes content regardless of language. Moreover, reviewers see summaries in their preferred language. This helps global programs accept diverse applicants. Furthermore, language barriers no longer slow down your review. The AI treats every language with equal accuracy. As a result, your program reaches a wider pool of talent.",
      },
      {
        question: "How does AI grant review handle reviewer disagreements?",
        answer:
          "Karma flags applications where AI scores differ from reviewer opinions. The system highlights specific criteria that caused the disagreement. Moreover, reviewers see the AI reasoning alongside their own notes. This transparency helps teams discuss differences with clear evidence. Furthermore, program managers configure thresholds for automatic escalation easily. A second reviewer can step in when scores diverge significantly. In addition, all disagreement records stay logged for future reference. As a result, your team resolves conflicts faster and more fairly.",
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
    title: "Grant Milestone Tracking: Onchain Verification",
    metaDescription:
      "Simplify grant milestone tracking with Karma. Verify deliverables onchain, get tamper-proof attestations, and keep grant programs of any size on schedule.",
    heading: "Transparent Grant Milestone Tracking With Onchain Proof",
    tldr: "Grant milestone tracking on Karma stays transparent and verifiable. Every milestone completion records as an onchain attestation, giving funders confidence that their capital drives real results.",
    problem: {
      heading: "Why Grant Milestone Tracking Breaks Down",
      description:
        "Most programs lack a good way to verify grantee progress. Updates arrive through scattered emails and documents. However, program managers chase grantees for reports each week. Grantees submit vague updates with no real proof. Furthermore, funders cannot see if their capital drives results. This erodes trust between all parties over time. In addition, it makes future funding hard to justify. Teams spend more time tracking than helping grantees succeed. As a result, the whole program suffers from poor visibility. Meanwhile, good work goes unrecognized and unrewarded.",
    },
    solution: {
      heading: "Better Grant Milestone Tracking With Onchain Records",
      description:
        "Karma makes grant milestone tracking transparent and verifiable. Every grant gets clear milestones with firm deadlines. Grantees submit evidence right through the platform. Moreover, reviewers verify work and record decisions onchain. The entire history stays publicly auditable for anyone. Therefore, you stop chasing updates or trusting vague claims. The onchain record proves every completion permanently. In addition, funders see real proof of progress at any time. As a result, trust grows with every verified milestone.",
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
          "Karma creates an attestation on EAS when a reviewer verifies work. This produces a cryptographic record on the blockchain. Specifically, it proves the milestone finished at a set time. No one can alter or delete this record afterward. Moreover, anyone can verify it using the public blockchain. The record stays permanent and tamper-proof forever. Therefore, funders get hard evidence of grantee progress. In addition, this builds trust across your entire program.",
      },
      {
        question: "Do grantees need crypto wallets to use milestone tracking?",
        answer:
          "Grantees need a wallet for onchain features to work. However, Karma supports many popular wallet providers. The setup process stays simple and very fast. Moreover, the blockchain parts work behind the scenes quietly. Grantees focus on their deliverables, not on crypto. Specifically, wallet setup takes under two minutes total. A guided flow walks them through each step clearly. As a result, even non-technical grantees get started quickly.",
      },
      {
        question: "Can milestone payments be automated based on completion?",
        answer:
          "Yes. Karma releases funds once a reviewer verifies a milestone. This creates a clear push for timely delivery. Moreover, it removes manual payment delays entirely. Grantees get paid fast when they deliver good work. Furthermore, the payment record stays onchain for full auditing. No one needs to chase finance teams for approvals. The whole process runs hands-free after initial setup. As a result, everyone saves time and stays motivated.",
      },
      {
        question: "How do reviewers verify milestone completions?",
        answer:
          "Reviewers get submissions with evidence attached directly. This includes documents, demos, and relevant links. They approve, request changes, or reject the work. Moreover, Karma records the decision onchain for transparency. Reviewers also add comments to help grantees improve. Furthermore, the full history stays open to program managers. Every action creates a clear and complete audit trail. As a result, accountability stays strong throughout the process.",
      },
      {
        question: "Can I track milestones across multiple grant programs?",
        answer:
          "Yes. Karma shows all milestones across your programs together. You see which grantees stay on track at a glance. Moreover, you spot who falls behind very fast. Cross-program data helps you find important patterns. Furthermore, this helps you improve future program design. You never lose sight of any active grant anywhere. As a result, portfolio management becomes much simpler overall.",
      },
      {
        question: "What evidence can grantees submit for milestone verification?",
        answer:
          "Grantees upload documents, screenshots, and demo links easily. They also share code repos and written descriptions. Moreover, the platform stores all evidence with the milestone record. Reviewers see everything in one organized place. Therefore, checking work stays fast and very thorough. No evidence gets lost in email threads anymore. Furthermore, all files stay linked to the right milestone. As a result, verification runs smoothly every single time.",
      },
      {
        question: "How does grant milestone tracking help with funder reporting?",
        answer:
          "Every verified milestone adds a data point to your reports. Funders see real progress, not self-reported stories. Moreover, the onchain record adds proof to every claim. You generate milestone reports with just one click. Therefore, this saves hours of manual work each quarter. Your reports tell a story backed by hard data. Furthermore, stakeholders trust numbers they can verify themselves. As a result, funder confidence grows with every report.",
      },
      {
        question: "Can grantees update milestones after the initial plan is set?",
        answer:
          "Yes. Program managers approve milestone changes when scope shifts. The system logs every change with a clear timestamp. Moreover, original milestones and updates both stay visible. This helps programs adapt without losing any accountability. Furthermore, reviewers see the full change history before deciding. No edits happen in secret or without a record. The audit trail covers every update completely. As a result, flexibility and accountability work hand in hand.",
      },
      {
        question: "How does grant milestone tracking handle delayed projects?",
        answer:
          "Karma flags milestones that pass their deadlines automatically. Program managers see overdue items in their dashboard right away. Moreover, the system sends reminders to grantees before deadlines arrive. You set escalation rules for repeated delays too. Furthermore, the full delay history stays visible for reviews. This helps you act early before small issues grow. As a result, fewer projects fall behind schedule overall.",
      },
      {
        question: "Can external stakeholders view milestone progress?",
        answer:
          "Yes. Karma offers public milestone dashboards for transparency. Funders and community members browse progress openly. Moreover, you control exactly what each audience can see. The onchain records provide independent verification too. Furthermore, stakeholders check progress without asking your team. This self-service access saves everyone valuable time. As a result, trust builds naturally through open visibility.",
      },
      {
        question: "Can grant milestone tracking work for multi-year programs?",
        answer:
          "Yes. Karma handles milestones that span months or even years. You break long projects into phases with clear checkpoints. Moreover, the system tracks progress across multiple funding cycles seamlessly. Annual reviews link back to original milestone definitions automatically. Furthermore, grantees update their status at intervals you define. Historical data remains accessible throughout the entire program duration. In addition, multi-year trends appear in your reporting dashboards clearly. As a result, long-term programs stay organized from start to finish.",
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
    title: "Grant Portfolio Dashboard: Real-Time Monitoring",
    metaDescription:
      "Use Karma's grant portfolio dashboard to monitor funding allocation, grantee progress, and program outcomes in real time from a single view.",
    heading: "Monitor Everything With a Grant Portfolio Dashboard",
    tldr: "A grant portfolio dashboard from Karma gives program managers one live view of every grant, milestone, and payment. You get real-time data instead of stale quarterly reports.",
    problem: {
      heading: "Why Most Teams Need a Grant Portfolio Dashboard",
      description:
        "Program managers juggle spreadsheets and loose tools daily. They piece together grant data from emails and drives. However, funders wait months for stale reports to arrive. No one can act fast when grantees fall behind schedule. Furthermore, funding choices turn into guesswork without live data. Stakeholder reports take days to build each quarter. In addition, this wastes skilled staff time on data entry. Key insights stay buried in scattered files everywhere. As a result, programs run blind and miss critical signals. Meanwhile, opportunities to improve pass by unnoticed.",
    },
    solution: {
      heading: "A Grant Portfolio Dashboard With Live Data",
      description:
        "Karma gives you a grant portfolio dashboard with live data. You see which grantees stay on track at a glance. Moreover, funding, milestones, and payments appear in one view. Funders check performance without waiting for reports. Furthermore, every data point links to onchain attestations directly. The numbers you share stay verifiable at all times. Therefore, you spot problems early and act fast. No more guessing about program health or status. In addition, your team saves hours every single week.",
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
          "The grant portfolio dashboard shows funding, milestones, and progress. You see spent, committed, and remaining capital at once. Moreover, you drill down from portfolio level to single grants. All data updates live as activity happens on the platform. Therefore, you always see the current state of things. Custom filters let you focus on what matters most. Furthermore, every metric links back to verifiable onchain data. As a result, your dashboard stays trustworthy and current.",
      },
      {
        question: "Can funders and stakeholders access the dashboard?",
        answer:
          "Yes. Karma supports role-based access for outside parties. You give funders and board members read-only views easily. Moreover, you control what each group can see precisely. They bookmark views and get email summaries on schedule. Furthermore, they never need to ask you for updates again. This saves your team hours of back-and-forth each month. As a result, stakeholder communication runs on autopilot effectively.",
      },
      {
        question: "How is the dashboard data different from a spreadsheet report?",
        answer:
          "Spreadsheet reports go stale right after you build them. However, Karma's dashboard updates live as activity happens. The data comes from onchain attestations for accuracy. Moreover, that makes it verifiable by anyone at any time. This removes manual report building from your workflow entirely. Furthermore, stakeholders always see current, trustworthy numbers. You stop spending days on data that ages fast. As a result, your reporting becomes effortless and reliable.",
      },
      {
        question: "Can I export data from the dashboard?",
        answer:
          "Yes. You export portfolio data in many useful formats. Moreover, exports include onchain proof for outside verification checks. You schedule recurring exports or build them on demand. Furthermore, saved templates speed up regular reporting cycles significantly. Your team spends minutes, not hours, building reports. Every export links data to its onchain source directly. As a result, exported data stays as trustworthy as the dashboard.",
      },
      {
        question: "Is the portfolio dashboard suitable for small grant programs?",
        answer:
          "Yes. The dashboard works well for ten to twenty grants. Moreover, live data saves time at any portfolio size effectively. Small programs often gain the most from structured reports. Furthermore, you only pay for what you actually use. The platform grows with your program over time naturally. Therefore, setup takes minutes, not weeks of configuration. Small teams see big improvements from day one. As a result, even modest programs benefit right away.",
      },
      {
        question: "How does the dashboard handle multiple funding rounds?",
        answer:
          "Karma tracks each funding round in the same dashboard. You compare rounds side by side with clear metrics. Moreover, past data stays ready for trend checks at all times. This helps you spot patterns and improve next time around. Furthermore, you keep full sight of every past round easily. Therefore, lessons from old rounds shape better future programs. Historical data never expires or gets archived away. As a result, your program improves with every round you run.",
      },
      {
        question: "Can I set alerts for underperforming grants?",
        answer:
          "Yes. You set alert rules for delays and low activity. Karma tells you when grants fall behind their schedule. Moreover, you act early before small issues grow into large ones. Alerts reach you by email or right in the platform. Furthermore, this saves time over manual check-in processes completely. You catch risks before they hurt your program outcomes. As a result, proactive management replaces reactive firefighting every time.",
      },
      {
        question: "Does the dashboard support custom KPIs?",
        answer:
          "Yes. You define custom metrics that matter to your goals. Karma tracks them next to standard numbers like completion rates. Moreover, custom KPIs show on your dashboard and in all exports. This lets you measure what stakeholders care about most. Furthermore, setup takes just a few minutes per metric definition. You adjust KPIs as your goals change over time easily. As a result, your dashboard always reflects current priorities.",
      },
      {
        question: "Can I share dashboard views with my board?",
        answer:
          "Yes. Karma lets you create shareable dashboard links easily. Board members access their own tailored view directly. Moreover, they see only the data you choose to share. No technical setup falls on the board members themselves. Furthermore, views update live so they always see fresh data. This replaces static slide decks with interactive dashboards. As a result, board meetings run on better information every time.",
      },
      {
        question: "How does a grant portfolio dashboard support strategic planning?",
        answer:
          "Karma surfaces trends that inform your next funding decisions clearly. You compare program outcomes side by side across multiple rounds. Moreover, allocation data shows where funds create the most impact. Underperforming areas become visible before annual planning begins. Furthermore, historical patterns help you forecast future resource needs accurately. Your leadership team builds strategy from real data, not guesses. In addition, custom reports highlight gaps and opportunities across your portfolio. As a result, every planning cycle starts with a strong evidence base.",
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
    title: "Automated Grant Intake: Streamline Processing",
    metaDescription:
      "Streamline automated grant intake with Karma. Eliminate manual data entry, validate submissions instantly, and route applications to the right reviewers.",
    heading: "Streamline Your Automated Grant Intake Process",
    tldr: "Automated grant intake from Karma handles everything from submission and validation to reviewer assignment. You eliminate hours of manual data entry and routing for every funding round.",
    problem: {
      heading: "Why Automated Grant Intake Beats Manual Processing",
      description:
        "Every funding round starts the exact same painful way. Applications flood in from forms, emails, and portals. However, someone checks each one by hand for completeness. Data entry errors creep into tracking systems regularly. Furthermore, staff burn out on tasks they could easily automate. The whole funding cycle slows because intake blocks everything. In addition, this delay pushes back review timelines for everyone. Good projects wait longer to get funded as a result. Meanwhile, your team wastes hours on repetitive busywork daily. Therefore, manual intake holds your entire program back.",
    },
    solution: {
      heading: "Automated Grant Intake From Submission to Review",
      description:
        "Karma handles automated grant intake from the moment someone applies. The platform checks each submission against your rules instantly. Moreover, it flags gaps and asks for missing details right away. Complete applications route to the right reviewers automatically. Furthermore, the whole intake pipeline runs without any manual work. You keep full control and can override any step easily. Therefore, applications move faster from inbox to review queue. Your team focuses on decisions, not data entry tasks. In addition, every round launches smoother than the last.",
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
          "Yes. Each program gets its own form with custom fields. You add conditional logic to show the right questions. Moreover, Karma handles checks, routing, and alerts on its own. You copy forms across programs to save setup time. Furthermore, this cuts the effort to launch new rounds significantly. You can edit forms any time without starting over completely. As a result, form management stays fast and flexible always.",
      },
      {
        question: "What happens when an application is incomplete?",
        answer:
          "Karma spots missing details and alerts the applicant fast. The application stays pending until all fields get filled. Moreover, bad submissions never reach your reviewers at all. Applicants see exactly what they need to fix right away. Furthermore, this auto follow-up raises completion rates significantly. You stop wasting reviewer time on half-done forms entirely. As a result, applicants fix issues in minutes, not days.",
      },
      {
        question: "How does automated routing work?",
        answer:
          "You set rules based on grant type, amount, or region. Karma then sends valid applications to the right reviewer pool. Moreover, you can override any assignment by hand if needed. The system learns and improves routing over time automatically. Furthermore, rules scale from simple to complex as you need. This keeps applications moving without manual sorting efforts. As a result, reviewers get the right proposals without delays. Your intake pipeline runs smoothly around the clock.",
      },
      {
        question: "Can I import applications from other platforms?",
        answer:
          "Yes. Karma supports batch import from spreadsheets and other tools. The import checks each application against your rules automatically. Moreover, it flags issues that need a human look right away. You keep all your data during the switch safely. Furthermore, merging applications from many sources stays simple and fast. No data gets lost in the move to Karma. As a result, migration happens without disrupting your current round.",
      },
      {
        question: "How much does automated grant intake cost?",
        answer:
          "Automated grant intake comes with all Karma plans included. There are no per-application fees at any level. Moreover, the system works the same for fifty or five thousand entries. Pricing scales with your broader program needs only. Furthermore, you pay for the platform, not per submission processed. This keeps costs steady as your volume grows over time. As a result, budgeting stays predictable for your team always.",
      },
      {
        question: "How does automated intake handle duplicate applications?",
        answer:
          "Karma checks every submission against your current applicant pool. It flags likely copies based on identity and content patterns. Moreover, program managers review flagged entries and decide next steps. This stops one project from taking multiple review slots unfairly. Furthermore, the check runs on every new submission automatically. You catch repeats before reviewers waste time on them. As a result, your review queue stays clean and efficient always.",
      },
      {
        question: "Can applicants save and resume their application later?",
        answer:
          "Yes. Applicants save their progress and come back anytime. Karma stores partial submissions safely and securely for them. Moreover, they pick up right where they left off easily. This cuts drop-off rates for longer application forms significantly. Furthermore, the platform sends reminders about unfinished drafts automatically. More applicants complete their forms as a direct result. Therefore, your program captures more quality applications every round.",
      },
      {
        question: "Does automated intake work for rolling admissions?",
        answer:
          "Yes. The intake system handles applications in real time always. It works for both round-based and rolling programs smoothly. Moreover, each submission gets checked and routed on arrival instantly. There is no batch delay in the processing at all. Furthermore, applicants get instant proof that their form went through. This keeps your pipeline moving around the clock continuously. As a result, rolling programs run just as smoothly as batched ones.",
      },
      {
        question: "How does automated grant intake improve applicant experience?",
        answer:
          "Applicants get instant feedback on their submission status. They see clear instructions for any missing information needed. Moreover, auto-save protects their work from accidental loss completely. The process feels guided and professional from start to finish. Furthermore, status updates arrive without applicants chasing your team. This builds trust and respect for your grant program. As a result, more qualified candidates choose to apply.",
      },
      {
        question: "How does automated grant intake reduce applicant drop-off?",
        answer:
          "Karma saves application progress automatically at every step. Applicants return and resume exactly where they left off easily. Moreover, clear progress indicators show how much work remains ahead. Short sections prevent the overwhelm that causes people to quit. Furthermore, inline validation catches errors before applicants move forward. Helpful tooltips guide users through complex questions smoothly. In addition, mobile-friendly forms let applicants work from any device. As a result, completion rates increase significantly across all program types.",
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
    title: "Grant Eligibility Screening: Auto Qualification",
    metaDescription:
      "Automate grant eligibility screening with Karma. Filter unqualified applications against your criteria before they reach reviewers, saving hours each round.",
    heading: "Automate Grant Eligibility Screening Before Review",
    tldr: "Grant eligibility screening on Karma checks every application against your criteria automatically. Reviewers only spend time on qualified applicants while others get clear feedback.",
    problem: {
      heading: "Without Grant Eligibility Screening, Reviewers Waste Hours",
      description:
        "About 30-50% of applications fail basic rules in most programs. However, reviewers still open, read, and reject them by hand. This wastes hours of skilled evaluator time each round. Moreover, applicants wait weeks for rejections that could come in seconds. The whole funding cycle slows down for no good reason. Furthermore, everyone gets frustrated by this preventable waste. That time could go toward reviewing strong proposals instead. In addition, manual screening introduces human error and inconsistency. As a result, both reviewers and applicants suffer needlessly.",
    },
    solution: {
      heading: "Instant Grant Eligibility Screening That Works",
      description:
        "Karma handles grant eligibility screening on every submission instantly. You set rules for org type, location, and funding caps. Moreover, the platform checks each application right away automatically. Eligible ones move to review in just seconds. Furthermore, others get clear feedback on what they missed exactly. Your reviewers never waste time on bad fits again. Therefore, this frees them to focus on strong proposals only. The whole review cycle speeds up as a direct result. In addition, applicants feel respected by the fast response.",
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
          "Karma supports rules for org type, location, funding, and history. You add technical needs and custom fields too easily. Moreover, rules combine with AND/OR logic for complex setups. You set different rules per funding track in one program. Furthermore, this keeps each track focused on the right applicants. You update rules any time without breaking past checks. As a result, your screening stays flexible and precise always.",
      },
      {
        question: "Can applicants see why they were screened out?",
        answer:
          "Yes. Applicants get specific feedback on what they missed. This helps them fix future submissions effectively. Moreover, it cuts support questions to your team significantly. You control how much detail they see in the response. Furthermore, clear feedback builds trust in your program overall. Applicants feel respected even when they do not qualify. As a result, your program reputation stays positive always.",
      },
      {
        question: "What if an applicant is borderline eligible?",
        answer:
          "Program managers can override any screening decision easily. The system logs every override for audit records completely. Moreover, borderline applications get flagged for manual review directly. They do not face auto-rejection from the system at all. Furthermore, you also set soft rules that warn instead of reject. This gives you room to flex while keeping accountability intact. As a result, edge cases get the human attention they truly need.",
      },
      {
        question: "Does eligibility screening work for rolling applications or just rounds?",
        answer:
          "It works for both program types smoothly. The engine checks submissions in real time without delays. Moreover, applicants get instant feedback no matter when they apply. Eligible ones route to review right away automatically. Furthermore, there is no batch delay in the processing at all. Round-based, rolling, and hybrid programs all work the same. As a result, you never need to wait for a batch run.",
      },
      {
        question: "Can I update eligibility criteria mid-round?",
        answer:
          "Yes. Changes apply to new submissions right away instantly. You can also re-screen old applications against new rules. Moreover, the system tracks which version applied to each submission. This versioning supports full audit trails for compliance needs. Furthermore, you can always explain why a decision happened clearly. No changes apply retroactively unless you actively choose so. As a result, mid-round updates stay transparent and accountable.",
      },
      {
        question: "How does eligibility screening reduce reviewer workload?",
        answer:
          "The system filters out bad fits before reviewers see them. Programs typically remove 30-50% of submissions this way automatically. Moreover, reviewers spend time only on proposals that pass your bar. This cuts review cycles by weeks in many programs. Furthermore, your evaluation team focuses on quality, not volume. Fewer applications per reviewer means better decisions overall. As a result, reviewer satisfaction and output both improve together.",
      },
      {
        question: "Can I screen for past grant performance?",
        answer:
          "Yes. Karma checks applicant history across your programs completely. You see if they completed past milestones or missed deadlines. Moreover, this track record shapes eligibility checks on its own. Strong repeat applicants get a positive flag automatically. Furthermore, this rewards reliable grantees with faster processing. It also protects your funding from repeat poor performers. As a result, past performance informs future funding decisions wisely.",
      },
      {
        question: "Does screening work for programs with multiple funding tracks?",
        answer:
          "Yes. Each funding track gets its own eligibility rules independently. An applicant might qualify for one track but not another. Moreover, Karma screens against the specific track they picked directly. You manage all tracks from one clean interface easily. Furthermore, this keeps multi-track programs organized and fair always. One dashboard shows status across every track at once. As a result, complex programs stay simple to manage effectively.",
      },
      {
        question: "How does grant eligibility screening handle international applicants?",
        answer:
          "Karma supports location-based rules for global programs easily. You set country or region requirements per funding track. Moreover, the system checks geography during submission automatically. International applicants get clear feedback about regional rules. Furthermore, you handle multiple jurisdictions from one interface. This simplifies compliance for global grant programs greatly. As a result, your program reaches qualified applicants worldwide.",
      },
      {
        question: "How does grant eligibility screening save reviewer time?",
        answer:
          "Karma filters out unqualified applications before reviewers see them. Reviewers only receive submissions that meet every stated criterion. Moreover, this removes hours spent reading proposals that never qualified. Each reviewer handles a smaller, higher-quality application pool instead. Furthermore, screening results include clear reasons for each decision made. Managers audit the process without adding work to reviewer plates. In addition, saved time lets reviewers provide deeper feedback on strong proposals. As a result, review quality and speed both improve at the same time.",
      },
      {
        question: "Can grant eligibility screening adapt to changing program rules?",
        answer:
          "Yes. Program managers update eligibility criteria at any time easily. New rules apply to incoming applications immediately after activation. Moreover, Karma keeps a version history of every rule change made. You compare old and new criteria side by side for clarity. Furthermore, pending applications get rescreened when rules change if needed. The system notifies affected applicants about updated requirements promptly. In addition, audit logs track who changed which rules and when exactly. As a result, your screening stays current as program needs evolve.",
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
    title: "Grant Reporting Analytics: Data-Driven Insights",
    metaDescription:
      "Power your grant reporting analytics with Karma. Turn program data into actionable insights using real-time dashboards and exportable reports for stakeholders.",
    heading: "Get Clear Grant Reporting Analytics for Your Program",
    tldr: "Grant reporting analytics from Karma turn raw program data into clear reports. Program managers get the insights they need to optimize funding and satisfy stakeholders.",
    problem: {
      heading: "Why Grant Reporting Analytics Fall Short Today",
      description:
        "Program managers spend days building reports from scattered sources. However, quarterly updates go stale before anyone reads them fully. Boards ask questions the data simply cannot answer at all. Moreover, programs lack the structure needed for real analysis. Teams cannot act during a round without live data available. Furthermore, impact stays a story instead of hard verifiable numbers. This gap hurts trust with funders and stakeholders alike. In addition, the same data gets re-entered across multiple tools. As a result, reporting becomes everyone's least favorite task.",
    },
    solution: {
      heading: "Grant Reporting Analytics That Run on Autopilot",
      description:
        "Karma structures your grant reporting analytics from day one. Reports build themselves as your team works through milestones. Moreover, program managers open live dashboards that answer questions fast. They create formatted reports in just a few clicks. Furthermore, onchain attestations back every single data point shown. Your reports stay verifiable without any extra work needed. Therefore, stakeholders get numbers they can truly trust. You spend minutes on tasks that once took full days. In addition, trend analysis reveals patterns across all your rounds.",
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
          "Karma tracks funding, milestone rates, and grantee activity closely. It also monitors reviewer speed and application volume automatically. Moreover, you define custom KPIs that match your specific goals. All metrics update live as activity happens on the platform. Therefore, you get a living view of program health always. No more stale snapshots cluttering your reports anymore. Furthermore, the data stays current around the clock reliably. As a result, decisions rest on fresh information every time.",
      },
      {
        question: "Can I create custom reports for different stakeholders?",
        answer:
          "Yes. You set up report templates for each audience easily. Board members get high-level summaries that highlight key trends. Moreover, program managers get detailed operational views of every metric. Community reports show public data for transparency purposes. Furthermore, templates work across all reporting periods seamlessly. You set them up once and reuse them each quarter efficiently. As a result, hours of formatting vanish from every reporting cycle.",
      },
      {
        question: "How does onchain data improve reporting accuracy?",
        answer:
          "Milestone completions live as onchain attestations permanently. This makes every data point verifiable by anyone anywhere. Moreover, stakeholders trust the numbers because no one can change them. Any metric traces back to its onchain source directly. Furthermore, this audit trail meets strict compliance needs completely. Your reports carry built-in proof of total accuracy. As a result, no one questions the validity of your data.",
      },
      {
        question: "Can I compare performance across multiple grant programs?",
        answer:
          "Yes. Karma compares programs side by side right away easily. You rank programs by completion rate and funding speed. Moreover, these metrics help leaders split resources wisely across programs. You spot best practices from top programs very fast. Furthermore, custom KPIs work across comparisons too for consistency. This helps you double down on what works best overall. As a result, every program benefits from shared learnings.",
      },
      {
        question: "What is the ROI of switching to automated grant reporting?",
        answer:
          "Most groups save several full days per quarter on reports. Moreover, live data helps you make better choices during rounds. Compliance docs stay audit-ready at all times without extra effort. Furthermore, stakeholders stay informed without chasing your team constantly. Better decisions over time add up to major savings overall. Therefore, the ROI grows with each funding cycle you run. Teams redirect saved hours toward actual program improvement. As a result, the whole organization benefits from better data.",
      },
      {
        question: "How quickly can I generate a stakeholder report?",
        answer:
          "You build a full report in under one minute flat. Pick a template, choose the date range, and export instantly. Moreover, Karma pulls all data from your live dashboard automatically. You skip manual data collection entirely from your workflow. Furthermore, scheduled reports also land in stakeholder inboxes on time. One click replaces hours of tedious manual work completely. As a result, reporting becomes the easiest part of your job.",
      },
      {
        question: "Does Karma support impact measurement beyond financial metrics?",
        answer:
          "Yes. You track custom outcomes next to standard financial data. This covers developer activity, community growth, or any KPI. Moreover, grantees report outcomes through the same milestone flow easily. Impact data flows into your reports on its own automatically. Furthermore, this helps you tell a full story to funders and boards. Numbers and narrative come together in one clear place. As a result, your impact story stays compelling and credible.",
      },
      {
        question: "Can I visualize trends across multiple funding rounds?",
        answer:
          "Yes. Karma shows trend charts across weeks, months, and rounds. You see how completion rates and speed change over time. Moreover, patterns help you improve future program design significantly. Past data stays ready for as long as you need it. Furthermore, you export trend views for outside meetings and presentations. Visual charts make complex data easy to grasp quickly. As a result, everyone understands program trends at a glance.",
      },
      {
        question: "How do grant reporting analytics handle data privacy?",
        answer:
          "Karma controls data access through role-based permissions strictly. You choose what each audience sees in their reports. Moreover, sensitive grantee data stays hidden from public views completely. Onchain data only includes verified milestone completions safely. Furthermore, export controls prevent unauthorized data sharing effectively. Your reporting stays transparent without compromising any private data. As a result, privacy and transparency work together seamlessly.",
      },
      {
        question: "How does grant reporting analytics support funder communications?",
        answer:
          "Karma generates funder-ready reports with just a few clicks. Each report shows outcomes tied to specific funding allocations clearly. Moreover, visual charts make complex data accessible to any audience. Funders see exactly how their capital created measurable impact. Furthermore, scheduled reports reach funders on a cadence you define. Onchain verification adds credibility to every number you share. In addition, custom branding makes reports look professional and polished always. As a result, funder relationships strengthen through consistent transparent communication.",
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
    title: "Grant Payment Tracking: Monitor Disbursements",
    metaDescription:
      "Simplify grant payment tracking with Karma. Get full visibility into disbursements, milestone-linked payments, and onchain fund flow records in real time.",
    heading: "Full Visibility With Grant Payment Tracking",
    tldr: "Grant payment tracking on Karma gives programs full visibility into fund flow. You link disbursements to verified milestones so funders know exactly where capital goes.",
    problem: {
      heading: "Why Grant Payment Tracking Fails Without Tools",
      description:
        "Programs struggle to track where funds go after allocation. Payments flow through many channels with no central record. Moreover, teams match payments to work by hand in spreadsheets. There is no clear link between money and actual results. Furthermore, grantees face delays with no clue when funds arrive. Funders lose trust when they cannot trace their capital. In addition, this lack of clarity slows down the whole funding cycle. Compliance teams scramble to piece together audit trails manually. As a result, payment chaos undermines otherwise strong programs.",
    },
    solution: {
      heading: "Grant Payment Tracking Linked to Verified Work",
      description:
        "Karma ties every grant payment tracking record to a milestone. Each payout links directly to the work it funds. Moreover, program managers see live payment status across all grants. Grantees know exactly when to expect their money. Furthermore, funders trace capital from start to delivered results easily. Onchain records make every transaction auditable forever. Therefore, no payment happens without proof of work behind it. Your finance team stays confident about every disbursement. In addition, compliance preparation takes minutes instead of days.",
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
          "You assign a funding amount to each milestone at setup. Karma queues the payment when a reviewer verifies the work. Moreover, funds flow only to verified milestones automatically. The payment record stays onchain forever for full transparency. Furthermore, this creates permanent proof of every single payout. No money moves without a verified deliverable behind it. Therefore, accountability stays built into every disbursement decision. As a result, funders trust the process completely.",
      },
      {
        question: "Can grantees see when they will be paid?",
        answer:
          "Yes. Grantees open a payment portal with all due dates. They see the status of each milestone check in real time. Moreover, this helps them plan their budgets with real confidence. Clear timelines cut support requests by a large amount. Furthermore, grantees always know where things stand exactly. They stop asking your team when money will arrive finally. As a result, both sides save time and reduce friction.",
      },
      {
        question: "Does Karma support both crypto and fiat payments?",
        answer:
          "Karma supports onchain payments on Ethereum, Optimism, and Arbitrum. You also track fiat payouts next to onchain ones easily. Moreover, this gives you one complete view of all fund flows. Your tracking stays complete no matter the payment method used. Furthermore, the hybrid setup works for programs with mixed channels. You see every payment in one unified dashboard always. As a result, multi-currency programs stay organized and transparent.",
      },
      {
        question: "How does payment tracking help with compliance?",
        answer:
          "Every payment links to a verified milestone with full records. You show auditors that funds went to real verified work. Moreover, onchain records serve as tamper-proof evidence permanently. Compliance prep time drops by a very large margin. Furthermore, your docs stay audit-ready at all times without extra effort. You answer auditor questions in minutes, not in days. As a result, compliance becomes routine instead of stressful.",
      },
      {
        question: "Can I set spending limits or payment caps per grant?",
        answer:
          "Yes. You set funding caps and per-milestone amounts for each. Karma enforces limits and alerts you before any overpayment. Moreover, budget controls also work at the program level effectively. This stops accidental overspending across your whole portfolio. Furthermore, you keep financial discipline without manual checks needed. Alerts fire before any limit gets crossed at all. As a result, your treasury stays protected and well managed.",
      },
      {
        question: "How does Karma handle payment delays or disputes?",
        answer:
          "The platform flags delayed payments in your dashboard right away. You see which payouts run late and exactly why. Moreover, grantees raise payment questions through the platform directly. Managers resolve disputes with full history visible to them. Furthermore, every action and fix gets logged for accountability always. Nothing falls through the cracks in the process at all. As a result, payment issues get resolved fast and transparently.",
      },
      {
        question: "Can I track payments across multiple blockchain networks?",
        answer:
          "Yes. Karma tracks payments across many chains out of the box. You monitor payouts on Ethereum, Optimism, Arbitrum, and more. Moreover, all transactions show in one unified dashboard together. Cross-chain reports build on their own automatically for you. Furthermore, this makes treasury work simple for multi-chain programs. You stop switching between different block explorers constantly. As a result, multi-chain payment management becomes truly effortless.",
      },
      {
        question: "What reports can I generate from payment data?",
        answer:
          "You build summaries, payout timelines, and burn rate reports. Reports link every payment to its verified milestone directly. Moreover, you export data for auditors or board meetings quickly. Scheduled reports reach stakeholders on their own automatically. Furthermore, all numbers stay backed by onchain proof permanently. You create a full financial picture in just minutes. As a result, payment reporting stays fast, accurate, and trustworthy.",
      },
      {
        question: "How does grant payment tracking improve grantee retention?",
        answer:
          "Grantees stay engaged when payments arrive on time consistently. Clear timelines and transparent tracking build trust with your team. Moreover, fast disbursements show grantees that you value their work. Fewer payment issues mean happier and more productive grantees overall. Furthermore, the self-service portal reduces frustration with the process. Grantees focus on their projects, not chasing payments anymore. As a result, strong grantees return for future funding rounds eagerly.",
      },
      {
        question: "How does grant payment tracking prevent duplicate payments?",
        answer:
          "Karma links every payment to a specific verified milestone uniquely. The system blocks a second payment against the same milestone automatically. Moreover, finance teams see warnings before any duplicate gets processed. Each transaction carries a unique reference tied to onchain records. Furthermore, reconciliation tools flag discrepancies between expected and actual amounts. Approval workflows require sign-off before any disbursement goes through. In addition, audit logs capture every payment attempt for full traceability. As a result, duplicate payments become virtually impossible across your program.",
      },
      {
        question: "Can grant payment tracking handle partial disbursements?",
        answer:
          "Yes. Karma supports splitting milestone payments into multiple installments. You define the disbursement schedule when setting up each grant. Moreover, partial payments link back to the same milestone for tracking. The system shows remaining balances for every active milestone clearly. Furthermore, grantees see exactly how much they received and what remains. Finance teams track partial payments alongside full disbursements seamlessly. In addition, reports break down totals by paid and outstanding amounts accurately. As a result, flexible payment structures work smoothly within your program.",
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
    title: "Multi Program Grant Management: One Platform",
    metaDescription:
      "Centralize multi program grant management with Karma. Unify applications, reviews, milestones, and payments across all your funding initiatives in one place.",
    heading: "Simplify Multi Program Grant Management Today",
    tldr: "Multi program grant management on Karma lets you run all programs from one platform. You share tools and data while keeping each program independent.",
    problem: {
      heading: "Multi Program Grant Management Fails With Scattered Tools",
      description:
        "Groups running several grant programs use a different tool for each. Reviewers switch between systems all day long without stopping. However, program managers cannot compare results across their efforts. Teams maintain duplicate workflows for the exact same tasks daily. Moreover, data stays siloed and knowledge splits apart across tools. Starting a new program means building from scratch each time. Furthermore, this wastes time and money at every level of the org. Coordination between programs becomes nearly impossible to achieve. As a result, the whole portfolio underperforms its true potential.",
    },
    solution: {
      heading: "Unified Multi Program Grant Management Platform",
      description:
        "Karma runs all your multi-program grant management from one place. Every program keeps its own setup and independent workflows. Moreover, they share tools for applications, milestones, and payments. Program managers run their own efforts freely and independently. Furthermore, leaders see across all programs at once on one dashboard. Starting a new program takes minutes with ready templates. Therefore, you stop rebuilding the same tools for each new effort. Your entire portfolio benefits from shared data and infrastructure. In addition, cross-program insights improve every program together.",
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
          "Yes. Every program gets its own full setup independently. This covers application forms, eligibility rules, and review rubrics. Moreover, programs share the platform but run on their own. You clone setups from existing programs as ready templates. Furthermore, this saves big setup time for every new launch. Each program stays separate while sharing one home platform. As a result, independence and efficiency work together perfectly.",
      },
      {
        question: "Can reviewers work across multiple programs?",
        answer:
          "Yes. You assign reviewers to many programs with different roles. A reviewer can lead one program and assist in another. Moreover, access adjusts per program on its own automatically. Reviewers see all their tasks in one unified dashboard. Furthermore, this stretches your evaluator pool without extra accounts. You get more coverage with the exact same team size. As a result, reviewer capacity scales with your program portfolio.",
      },
      {
        question: "How does cross-program reporting work?",
        answer:
          "Karma pulls data from all programs into one view for leaders. You compare funding and completion rates at the org level. Moreover, you drill into single programs for detailed operational numbers. Cross-program reports export fast for stakeholder presentations. Furthermore, this helps you find best practices and spend wisely. You see the big picture and the details in one place. As a result, leadership makes better decisions across all programs.",
      },
      {
        question: "How quickly can I launch a new grant program?",
        answer:
          "You launch a new program in minutes with a template. Adjust the setup, add reviewers, and open applications right away. Moreover, no technical deployment or overhead stands in the way. Groups that spent weeks on setup now finish in an hour. Furthermore, the platform handles everything behind the scenes automatically. You go from idea to live program the same day easily. As a result, new funding initiatives start faster than ever before.",
      },
      {
        question: "Is multi-program management suitable for small organizations?",
        answer:
          "Yes. Even two or three programs gain from shared tools. You cut duplicate work and processes right away effectively. Moreover, cross-program sight starts from day one of using Karma. The platform grows with your goals over time naturally. Furthermore, you dodge painful tool migrations as your portfolio expands. Starting small costs nothing extra beyond the base plan. As a result, small organizations benefit just as much as large ones.",
      },
      {
        question: "How does Karma handle programs with different funding currencies?",
        answer:
          "Each program can use its own currency or token freely. Karma tracks payments across many chains and currencies together. Moreover, portfolio reports adjust amounts for easy comparison across programs. This works for groups funding across blockchain ecosystems widely. Furthermore, treasury managers see one clean view of all payments. Mixed currencies never block your reporting or analysis work. As a result, multi-currency programs stay organized and clear.",
      },
      {
        question: "Can I move grantees between programs?",
        answer:
          "Yes. Grantee profiles live across your whole organization centrally. You invite existing grantees to new programs with no re-onboarding. Moreover, their past track record stays visible to all reviewers. This helps you reward reliable grantees with new funding chances. Furthermore, cross-program history leads to better funding choices overall. Good grantees stand out across all your programs naturally. As a result, talent retention improves across your whole portfolio.",
      },
      {
        question: "How do permissions work across multiple programs?",
        answer:
          "Karma controls access at both org and program levels strictly. Org admins see everything across all programs at once. Moreover, program managers control only their own efforts independently. Reviewers see only their queued applications per program assignment. Furthermore, this layered model scales well as your portfolio grows. You add programs without reworking access rules at all. As a result, security and flexibility scale together seamlessly.",
      },
      {
        question: "How does multi-program grant management improve portfolio performance?",
        answer:
          "Shared data reveals which programs perform best and why. You apply winning strategies from top programs across others. Moreover, cross-program analytics highlight areas that need improvement. Resource sharing reduces costs across your entire portfolio significantly. Furthermore, templates let you replicate success quickly and reliably. Teams learn from each other through shared platform insights. As a result, your whole portfolio improves faster than isolated programs.",
      },
      {
        question: "Can I run programs with different review timelines?",
        answer:
          "Yes. Each program sets its own review schedule independently. Some programs run quarterly rounds while others accept rolling applications. Moreover, Karma handles both models on the same platform smoothly. Timeline differences never create conflicts between programs at all. Furthermore, you see all programs on one dashboard regardless of schedule. This flexibility supports diverse funding strategies from one place. In addition, calendar views show all deadlines across programs together. As a result, each program runs at its own natural pace.",
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
    title: "Automated Grantee Reminders: Stay on Track",
    metaDescription:
      "Set up automated grantee reminders with Karma. Send milestone update and deadline notifications that keep projects on track without manual follow-up.",
    heading: "Keep Projects Moving With Automated Grantee Reminders",
    tldr: "Automated grantee reminders from Karma notify grantees about upcoming milestones, overdue updates, and pending actions. Program managers stop spending hours chasing people for status reports.",
    problem: {
      heading: "Without Automated Grantee Reminders, Teams Burn Out",
      description:
        "Chasing grantees for updates eats the most staff time in grants. Program managers send dozens of follow-ups each single week. However, they track replies in spreadsheets that go stale fast. Silent grantees force issues up to leadership for intervention. Moreover, this work grows with your portfolio size steadily. It turns into the biggest bottleneck as programs scale up. Furthermore, your best staff spend their time on emails, not strategy. This drains morale across the entire operations team. As a result, the whole program suffers from poor communication.",
    },
    solution: {
      heading: "Smart Automated Grantee Reminders That Escalate",
      description:
        "Karma sends automated grantee reminders based on milestones and responses. Reminders grow from friendly nudges to formal notices naturally. Moreover, the system adapts to each grantee's reply habits over time. Managers see who replied and who needs a personal touch. Furthermore, your team focuses only on cases that need direct contact. Everyone else stays on track on their own without intervention. Therefore, this frees up hours every single week for your team. The whole follow-up process runs smarter, not harder. In addition, grantee communication stays consistent across your portfolio.",
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
          "Karma sends reminders for deadlines and overdue items automatically. It also covers pending requests and custom events you define. Moreover, each type has its own schedule and escalation rules set. You preview the full sequence for any grantee at any time. Furthermore, the right message reaches them at the right moment. You never send a reminder too early or too late again. As a result, every grantee gets timely and relevant notifications.",
      },
      {
        question: "Can I customize the reminder messages?",
        answer:
          "Yes. Each program gets its own message templates and tone. You set different templates for each escalation level easily. Moreover, templates use dynamic fields like name and deadline automatically. You preview how messages look before turning them on live. Furthermore, this keeps your words professional and on point always. You adjust wording any time without rebuilding any flows. As a result, your communication stays polished and consistent throughout.",
      },
      {
        question: "Will grantees get overwhelmed with too many reminders?",
        answer:
          "No. Karma includes frequency caps and quiet hours built in. You set the max reminders per week and sending windows. Moreover, the sequence stops when a grantee responds promptly. It starts again only when the next task comes due naturally. Furthermore, grantees also pick their own alert settings directly. No one gets buried in repeat messages from your program. As a result, reminders feel helpful instead of annoying to grantees.",
      },
      {
        question: "How do I know which grantees need personal follow-up?",
        answer:
          "The dashboard flags grantees who skipped multiple reminders clearly. You focus personal outreach on the few who truly need it. Moreover, response history and escalation status give you full context. You stop chasing grantees who already stay on track independently. Furthermore, this targeted approach saves hours every single week. Your energy goes where it matters most for your program. As a result, follow-up becomes strategic instead of exhausting.",
      },
      {
        question: "Can reminders be sent through channels other than email?",
        answer:
          "Karma supports in-app alerts alongside email notifications today. Moreover, grantees pick their preferred channel in their settings. The system tracks delivery and clicks across all channels automatically. Furthermore, managers see which channels get the best reply rates. This data helps you improve how you reach grantees effectively. You learn what works and do more of it over time. As a result, your reminders reach grantees through their best channel.",
      },
      {
        question: "How do automated reminders improve milestone completion rates?",
        answer:
          "Programs using Karma's reminders see 20-30% higher completion rates. Grantees get timely nudges before their deadlines pass by. Moreover, early reminders stop overdue items from stacking up together. The step-by-step escalation catches stragglers in time effectively. Furthermore, this keeps your whole portfolio moving forward at a steady pace. Better follow-up leads to better outcomes for everyone involved. As a result, your program delivers more impact with less manual effort.",
      },
      {
        question: "Can I pause reminders for specific grantees?",
        answer:
          "Yes. You pause reminders for any grantee at any time. This helps when a project faces real delays or challenges. Moreover, the pause logs the reason for audit records completely. You restart the sequence when the grantee is ready again. Furthermore, this respects real-world project challenges and setbacks. You stay flexible without losing any accountability at all. As a result, your reminder system adapts to real situations.",
      },
      {
        question: "Do reminders work for programs with irregular milestone schedules?",
        answer:
          "Yes. Karma sends reminders based on each milestone's own deadline. Odd schedules work the same as regular ones perfectly. Moreover, the system adapts to each grantee's unique timeline individually. You do not need even intervals across your portfolio at all. Furthermore, this supports many project types in one single program. Every grantee gets reminders that match their specific plan. As a result, irregular schedules never cause reminder problems.",
      },
      {
        question: "How do automated grantee reminders reduce program manager burnout?",
        answer:
          "Automation handles the repetitive follow-up work entirely for you. Program managers stop writing the same emails over and over. Moreover, they focus on strategic work instead of chasing updates. The dashboard shows exactly where human attention adds real value. Furthermore, workload drops significantly as the system handles routine tasks. Your team stays energized and focused on high-impact activities. As a result, staff retention improves across your operations team.",
      },
      {
        question: "Can I track reminder effectiveness over time?",
        answer:
          "Yes. Karma shows analytics on open rates and response rates. You see which reminder types get the best grantee engagement. Moreover, trend data reveals how effectiveness changes over time clearly. You adjust templates and timing based on real performance data. Furthermore, A/B insights help you optimize your messaging continuously. This data-driven approach keeps improving your communication. As a result, your reminders get more effective with every round.",
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
    title: "Grant Application Management: Full Workflow",
    metaDescription:
      "Streamline grant application management with Karma. Handle the full workflow from submission to decision, including intake, review, and approval tracking.",
    heading: "End-to-End Grant Application Management in One Place",
    tldr: "Grant application management on Karma takes applications from submission through review, approval, and onboarding. You replace the patchwork of forms, spreadsheets, and email threads.",
    problem: {
      heading: "Grant Application Management Falls Apart With Bad Tools",
      description:
        "Most programs patch workflows from Google Forms and spreadsheets. Applications fall through cracks between these disconnected systems regularly. However, applicants get mixed updates about their current status. Managers have no single view of where things actually stand. Moreover, tracking breaks down quickly as application volume grows. You cannot scale this patchwork approach at all effectively. Furthermore, each new round adds more confusion and lost submissions. Staff frustration grows with every poorly managed funding cycle. As a result, strong applicants lose faith in your program entirely.",
    },
    solution: {
      heading: "Complete Grant Application Management From Start to Finish",
      description:
        "Karma manages grant application management from submission to funding decision. Applicants use structured forms with built-in validation checks. Moreover, applications flow through review stages on their own automatically. Reviewers evaluate proposals in a focused, purpose-built interface. Furthermore, every status change gets logged and sent to applicants. Approved ones turn into active grants with milestones already set. Therefore, the whole pipeline lives in one place from start to finish. No data gets typed twice or lost between tools. In addition, your team handles more applications with less effort.",
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
          "As many as your program needs for effective evaluation. Common setups include submission, screening, expert review, and decision. Moreover, you add, remove, or rename stages freely at any time. Each stage gets its own reviewers and specific rules configured. Furthermore, branches route applications by category or score automatically. You design the exact flow your team requires for success. As a result, your workflow matches your process perfectly every time.",
      },
      {
        question: "Can applicants check the status of their application?",
        answer:
          "Yes. Applicants log in to see their current stage clearly. They see if any action falls on them right away. Moreover, auto emails notify them at each stage change immediately. This self-service view cuts status inquiry emails significantly. Furthermore, your team stops answering the same questions over and over. Applicants feel informed throughout the whole application process. As a result, satisfaction improves for both applicants and staff alike.",
      },
      {
        question: "How does Karma handle rejected applications?",
        answer:
          "Rejected applicants get auto alerts with optional detailed feedback. You choose to share detailed comments or a short note. Moreover, you can invite rejected applicants to try again next round. This keeps promising candidates engaged with your program actively. Furthermore, it gives them clear tips for stronger future proposals. No applicant leaves without knowing where they stand exactly. As a result, your program maintains a positive reputation always.",
      },
      {
        question: "What happens after an application is approved?",
        answer:
          "Approved applications turn into active grants right away automatically. Milestones and payment schedules carry over from the proposal. Moreover, grantees start milestone tracking with no manual data re-entry. They get guidance on how to submit updates properly. Furthermore, this smooth handoff saves hours of admin work per grant. No data gets typed twice during the transition process. As a result, grantees start productive work immediately after approval.",
      },
      {
        question: "Can I reopen or reconsider a declined application?",
        answer:
          "Yes. Program managers move applications between stages at any time. You reopen declined applications for a thorough second look. Moreover, all transitions get logged for audit records completely. This helps when new funding opens up later in the cycle. Furthermore, the full decision history stays visible throughout the process. No past action gets hidden or lost from the record. As a result, your process stays flexible and fully accountable.",
      },
      {
        question: "How does the pipeline view help program managers?",
        answer:
          "The pipeline view shows every application by its current status. You spot bottlenecks at a single glance very easily. Moreover, bulk actions let you move groups of applications at once. Filters narrow the view by topic, score, or reviewer assignment. Furthermore, this visual layout replaces spreadsheet tracking completely. You manage hundreds of applications from one clear screen. As a result, program management becomes visual and intuitive finally.",
      },
      {
        question: "Can I customize applicant communications at each stage?",
        answer:
          "Yes. Each stage change sends an auto message using your templates. You control the content, tone, and branding of every message. Moreover, dynamic fields add applicant details on their own automatically. This keeps messages steady across hundreds of individual applications. Furthermore, applicants feel informed without your team writing custom emails. You set it up once and it runs every round smoothly. As a result, communication quality stays high without manual effort.",
      },
      {
        question: "How does reviewer workload balancing work?",
        answer:
          "Karma spreads applications across reviewers by their current load. No single reviewer gets buried while others sit idle at all. Moreover, you set max assignments per reviewer per round easily. The system tracks review progress live on the dashboard always. Furthermore, managers step in only when loads tilt out of balance. Every reviewer gets a fair share of the work assigned. As a result, reviews finish faster and reviewer morale stays high.",
      },
      {
        question: "How does grant application management handle large volumes?",
        answer:
          "Karma scales smoothly from dozens to thousands of applications. Bulk actions let you process groups of applications at once. Moreover, automated routing sends applications to reviewers without manual work. The pipeline view stays clear even with very high volumes. Furthermore, search and filters help you find any application instantly. Performance stays fast regardless of how many applications arrive. As a result, large programs run just as smoothly as small ones.",
      },
      {
        question: "Can I track application metrics and conversion rates?",
        answer:
          "Yes. Karma shows analytics for each stage of your pipeline. You see how many applications move through each stage clearly. Moreover, conversion rates highlight where applicants drop off most. This data helps you improve your process for future rounds. Furthermore, you compare metrics across different funding programs easily. Trend views reveal how your pipeline performs over time. As a result, your application process improves with every cycle.",
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
