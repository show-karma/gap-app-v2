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
        "Most grant programs still review applications by hand. Reviewers read hundreds of proposals each round. They burn out fast. Scoring criteria drift as fatigue grows. Top evaluators quit because the workload crushes them. Delayed decisions frustrate applicants for weeks. Programs miss high-impact projects buried in the pile. Manual review also blocks fast funding cycles. Each round takes longer than the last.",
    },
    solution: {
      heading: "Smarter AI Grant Review That Scales With Your Program",
      description:
        "Karma brings AI grant review to your workflow. The system pre-screens applications in seconds. It checks each one against your criteria. It then builds clear summaries and flags risks. Reviewers focus only on shortlisted proposals. Every AI score stays transparent and auditable. Your funding decisions stay credible at any scale. You keep full control over the final call. The AI handles the heavy lifting for you.",
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
          "No. Karma's AI helps reviewers by pre-screening and scoring. It also summarizes each application. Human reviewers always make the final call. The AI boosts your team's output. It does not remove human judgment. This keeps accountability intact. It also cuts the time reviewers spend on triage. Your team stays in charge of every decision.",
      },
      {
        question: "How does AI grant review handle bias in evaluations?",
        answer:
          "The AI applies your scoring rubric the same way every time. This removes the drift that tired reviewers cause. You can audit AI scores at any time. You can also adjust rubric weights easily. Fair scoring matters most with large pools. The AI never gets tired or distracted. It treats the first application like the last.",
      },
      {
        question: "Can I customize the review criteria for different grant programs?",
        answer:
          "Yes. Each grant program on Karma gets its own rubric. It also gets its own review workflow. The AI adapts to your needs. You weight criteria differently per program. You add custom evaluation dimensions too. You also adjust thresholds to match your goals. Changes take effect right away for new reviews.",
      },
      {
        question: "How much faster is AI-assisted review compared to manual review?",
        answer:
          "Programs using Karma see a 60-80% drop in review time. Reviewers focus on the 20-30% that need deep evaluation. The AI screens and scores the rest. This gain grows as your program scales. Larger rounds benefit the most from automation. A 500-application round takes days, not weeks. Your team handles more volume with less effort.",
      },
      {
        question: "What is the ROI of using AI for grant review?",
        answer:
          "Most groups save major reviewer hours in round one. Programs with 200+ applications often recover costs fast. Labor savings alone cover the platform fee. You also get faster decisions and steady scores. Reviewers stay longer because burnout drops. The ROI grows with each funding cycle. Teams report more output with fewer resources.",
      },
      {
        question: "How does Karma protect the privacy of grant applications?",
        answer:
          "Karma stores application data with strict access controls. Only assigned reviewers see their queued applications. The AI processes data within your program only. No application content trains outside models. You control who sees what at every stage. Data stays private throughout the review. Your applicants' details never leave the platform.",
      },
      {
        question: "Can I use AI grant review for retroactive funding rounds?",
        answer:
          "Yes. Karma supports retroactive funding rounds too. You define a scoring rubric for past work. The AI screens those submissions against your criteria. Reviewers then evaluate the shortlist. This works well for ecosystem reward programs. It also fits retroactive public goods funding. You use the same tools for both types of rounds.",
      },
      {
        question: "What happens if a reviewer disagrees with the AI score?",
        answer:
          "Reviewers can override any AI score. The system logs every override with a reason. This feedback helps improve future scoring. Reviewer disagreements also get flagged for discussion. The final call always stays with your human team. Overrides do not break the audit trail. The full history stays visible for program managers.",
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
        "Most programs lack a good way to verify grantee progress. Updates arrive through scattered emails and docs. Program managers chase grantees for reports each week. Grantees submit vague updates with no proof. Funders cannot see if their capital drives results. This erodes trust over time. It makes future funding hard to justify. Teams spend more time tracking than helping grantees succeed.",
    },
    solution: {
      heading: "Smarter Grant Milestone Tracking With Onchain Proof",
      description:
        "Karma makes milestone tracking transparent and verifiable. Every grant gets clear milestones with deadlines. Grantees submit evidence right through the platform. Reviewers verify work and record decisions onchain. The entire history stays publicly auditable. You stop chasing updates or trusting vague claims. The onchain record proves every completion. Funders see real proof of progress at any time.",
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
          "Karma creates an attestation on EAS when a reviewer verifies a milestone. This creates a cryptographic record on the blockchain. It proves the milestone finished at a set time. No one can alter or delete this record. Anyone can verify it using the public blockchain. The record stays permanent and tamper-proof. This gives funders hard evidence of grantee progress.",
      },
      {
        question: "Do grantees need crypto wallets to use milestone tracking?",
        answer:
          "Grantees need a wallet for onchain features. Karma supports many wallet providers. The setup process stays simple and fast. The blockchain parts work behind the scenes. Grantees focus on their deliverables, not crypto. Wallet setup takes under two minutes. A guided flow walks them through each step.",
      },
      {
        question: "Can milestone payments be automated based on completion?",
        answer:
          "Yes. Karma releases funds once a reviewer verifies a milestone. This creates a clear push for timely delivery. It removes manual payment delays. Grantees get paid fast when they deliver. The payment record stays onchain for full auditing. No one needs to chase finance for approvals. The whole process runs hands-free after setup.",
      },
      {
        question: "How do reviewers verify milestone completions?",
        answer:
          "Reviewers get submissions with evidence attached. This includes documents, demos, and links. They approve, request changes, or reject the work. Karma records the decision onchain for transparency. Reviewers add comments to help grantees improve. The full history stays open to program managers. Every action creates a clear audit trail.",
      },
      {
        question: "Can I track milestones across multiple grant programs?",
        answer:
          "Yes. Karma shows all milestones across your programs in one view. You see which grantees stay on track at a glance. You also spot who falls behind fast. Cross-program data helps you find patterns. This helps you improve future program design. You never lose sight of any active grant.",
      },
      {
        question: "What evidence can grantees submit for milestone verification?",
        answer:
          "Grantees upload documents, screenshots, and demo links. They also share code repos and written descriptions. The platform stores all evidence with the milestone record. Reviewers see everything in one place. This makes checking work fast and thorough. No evidence gets lost in email threads. All files stay linked to the right milestone.",
      },
      {
        question: "How does grant milestone tracking help with funder reporting?",
        answer:
          "Every verified milestone adds a data point to your reports. Funders see real progress, not self-reported stories. The onchain record adds proof to every claim. You generate milestone reports with one click. This saves hours of manual work each quarter. Your reports tell a story backed by hard data. Stakeholders trust numbers they can verify themselves.",
      },
      {
        question: "Can grantees update milestones after the initial plan is set?",
        answer:
          "Yes. Program managers approve milestone changes when scope shifts. The system logs every change with a timestamp. Original milestones and updates both stay visible. This helps programs adapt without losing accountability. Reviewers see the full change history before deciding. No edits happen in secret. The audit trail covers every update.",
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
        "Program managers juggle spreadsheets and loose tools daily. They piece together grant data from emails and drives. Funders wait months for stale reports. No one can act fast when grantees fall behind. Funding choices turn into guesswork without live data. Stakeholder reports take days to build each quarter. This wastes skilled staff time on data entry. Key insights stay buried in scattered files.",
    },
    solution: {
      heading: "A Grant Portfolio Dashboard That Updates in Real Time",
      description:
        "Karma gives you a portfolio dashboard with live data. You see which grantees stay on track at a glance. Funding, milestones, and payments appear in one view. Funders check performance without waiting for reports. Every data point links to onchain attestations. The numbers you share stay verifiable at all times. You spot problems early and act fast. No more guessing about program health.",
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
          "The dashboard shows funding, milestones, and grantee progress. You see spent, committed, and remaining capital at once. You drill down from portfolio level to single grants. All data updates live as activity happens. You always see the current state of things. Custom filters let you focus on what matters most. Every metric links back to verifiable onchain data.",
      },
      {
        question: "Can funders and stakeholders access the dashboard?",
        answer:
          "Yes. Karma supports role-based access for outsiders. You give funders and board members read-only views. You control what each group can see. They bookmark views and get email summaries on schedule. They never need to ask you for updates again. This saves your team hours of back-and-forth each month.",
      },
      {
        question: "How is the dashboard data different from a spreadsheet report?",
        answer:
          "Spreadsheet reports go stale right away. Karma's dashboard updates live as activity happens. The data comes from onchain attestations. That makes it verifiable by anyone. This removes manual report building. Stakeholders always see current, trustworthy numbers. You stop spending days on data that ages fast.",
      },
      {
        question: "Can I export data from the dashboard?",
        answer:
          "Yes. You export portfolio data in many formats. Exports include onchain proof for outside checks. You schedule recurring exports or build them on demand. Saved templates speed up regular reporting. Your team spends minutes, not hours, on reports. Every export links data to its onchain source.",
      },
      {
        question: "Is the portfolio dashboard suitable for small grant programs?",
        answer:
          "Yes. The dashboard works well for ten to twenty grants. Live data saves time at any portfolio size. Small programs often gain the most from structured reports. You only pay for what you use. The platform grows with your program over time. Setup takes minutes, not weeks.",
      },
      {
        question: "How does the dashboard handle multiple funding rounds?",
        answer:
          "Karma tracks each funding round in the same dashboard. You compare rounds side by side with clear metrics. Past data stays ready for trend checks. This helps you spot patterns and improve next time. You keep full sight of every past round. Lessons from old rounds shape better future programs.",
      },
      {
        question: "Can I set alerts for underperforming grants?",
        answer:
          "Yes. You set alert rules for delays and low activity. Karma tells you when grants fall behind. You act early before small issues grow large. Alerts reach you by email or in the platform. This saves time over manual check-ins. You catch risks before they hurt your program.",
      },
      {
        question: "Does the dashboard support custom KPIs?",
        answer:
          "Yes. You define custom metrics that matter to you. Karma tracks them next to standard numbers like completion rates. Custom KPIs show on your dashboard and in exports. This lets you measure what stakeholders care about. Setup takes just a few minutes per metric. You adjust KPIs as your goals change over time.",
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
        "Every funding round starts the same way. Applications flood in from forms, emails, and portals. Someone checks each one by hand for completeness. Data entry errors creep into tracking systems. Staff burn out on tasks they could automate. The whole funding cycle slows because intake blocks it. This delay pushes back review timelines for everyone. Good projects wait longer to get funded.",
    },
    solution: {
      heading: "Automated Grant Intake From Submission to Reviewer Queue",
      description:
        "Karma automates grant intake from the moment someone applies. The platform checks each submission against your rules. It flags gaps and asks for missing details. Complete applications route to the right reviewers. The whole intake pipeline runs without manual work. You keep full control and can override any step. Applications move faster from inbox to review queue. Your team focuses on decisions, not data entry.",
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
          "Yes. Each program gets its own form with custom fields. You add conditional logic to show the right questions. Build it once and Karma handles the rest. Checks, routing, and alerts all run on their own. You copy forms across programs to save setup time. This cuts the effort to launch new rounds. You can edit forms any time without starting over.",
      },
      {
        question: "What happens when an application is incomplete?",
        answer:
          "Karma spots missing details and alerts the applicant fast. The application stays pending until all fields get filled. Bad submissions never reach your reviewers. Applicants see exactly what to fix. This auto follow-up raises completion rates. You stop wasting reviewer time on half-done forms. Applicants fix issues in minutes, not days.",
      },
      {
        question: "How does automated routing work?",
        answer:
          "You set rules based on grant type, amount, or region. Karma sends valid applications to the right reviewer pool. You can override any assignment by hand. The system learns and improves routing over time. Rules scale from simple to complex as you need. This keeps applications moving without manual sorting.",
      },
      {
        question: "Can I import applications from other platforms?",
        answer:
          "Yes. Karma supports batch import from spreadsheets and other tools. The import checks each application against your rules. It flags issues that need a human look. You keep all your data during the switch. Merging applications from many sources stays simple. No data gets lost in the move.",
      },
      {
        question: "How much does automated grant intake cost?",
        answer:
          "Automated intake comes with all Karma plans. There are no per-application fees. The system works the same for fifty or five thousand entries. Pricing scales with your broader program needs. Contact our team for a custom quote. You pay for the platform, not per submission. This keeps costs steady as your volume grows.",
      },
      {
        question: "How does automated intake handle duplicate applications?",
        answer:
          "Karma checks every submission against your current pool. It flags likely copies based on identity and content. Program managers review flagged entries and decide next steps. This stops one project from taking multiple review slots. The check runs on every new submission. You catch repeats before reviewers waste time on them.",
      },
      {
        question: "Can applicants save and resume their application later?",
        answer:
          "Yes. Applicants save their progress and come back later. Karma stores partial submissions safely. They pick up right where they left off. This cuts drop-off rates for longer forms. The platform sends reminders about unfinished drafts. More applicants complete their forms as a result.",
      },
      {
        question: "Does automated intake work for rolling admissions?",
        answer:
          "Yes. The intake system handles applications in real time. It works for both round-based and rolling programs. Each submission gets checked and routed on arrival. There is no batch delay. Applicants get instant proof that their form went through. This keeps your pipeline moving around the clock.",
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
        "About 30-50% of applications fail basic rules in most programs. Reviewers still open, read, and reject them by hand. This wastes hours of skilled evaluator time each round. Applicants wait weeks for rejections that could come in seconds. The whole funding cycle slows down for no reason. Everyone gets frustrated by this waste. That time could go toward reviewing strong proposals instead.",
    },
    solution: {
      heading: "Grant Eligibility Screening That Works Instantly",
      description:
        "Karma screens every submission for eligibility on arrival. You set rules for org type, location, and funding caps. The platform checks each application right away. Eligible ones move to review in seconds. Others get clear feedback on what they missed. Your reviewers never waste time on bad fits. This frees them to focus on strong proposals. The whole review cycle speeds up as a result.",
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
          "Karma supports rules for org type, location, funding, and history. You add technical needs and custom fields too. Rules combine with AND/OR logic for complex setups. You set different rules per funding track in one program. This keeps each track focused on the right applicants. You update rules any time without breaking past checks.",
      },
      {
        question: "Can applicants see why they were screened out?",
        answer:
          "Yes. Applicants get specific feedback on what they missed. This helps them fix future submissions. It also cuts support questions to your team. You control how much detail they see. Clear feedback builds trust in your program. Applicants feel respected even when they do not qualify.",
      },
      {
        question: "What if an applicant is borderline eligible?",
        answer:
          "Program managers can override any screening decision. The system logs every override for audit records. Borderline applications get flagged for manual review. They do not face auto-rejection. You also set soft rules that warn instead of reject. This gives you room to flex while keeping accountability. Edge cases get the human attention they need.",
      },
      {
        question: "Does eligibility screening work for rolling applications or just rounds?",
        answer:
          "It works for both. The engine checks submissions in real time. Applicants get instant feedback no matter when they apply. Eligible ones route to review right away. There is no batch delay. Round-based, rolling, and hybrid programs all work the same. You never need to wait for a batch run to finish.",
      },
      {
        question: "Can I update eligibility criteria mid-round?",
        answer:
          "Yes. Changes apply to new submissions right away. You can also re-screen old applications against new rules. The system tracks which version applied to each one. This versioning supports full audit trails. You can always explain why a decision happened. No changes apply retroactively unless you choose so.",
      },
      {
        question: "How does eligibility screening reduce reviewer workload?",
        answer:
          "The system filters out bad fits before reviewers see them. Programs typically remove 30-50% of submissions this way. Reviewers spend time only on proposals that pass your bar. This cuts review cycles by weeks. Your evaluation team focuses on quality, not volume. Fewer applications per reviewer means better decisions overall.",
      },
      {
        question: "Can I screen for past grant performance?",
        answer:
          "Yes. Karma checks applicant history across your programs. You see if they completed past milestones or missed deadlines. This track record shapes eligibility checks on its own. Strong repeat applicants get a positive flag. This rewards reliable grantees. It also protects your funding from repeat poor performers.",
      },
      {
        question: "Does screening work for programs with multiple funding tracks?",
        answer:
          "Yes. Each funding track gets its own eligibility rules. An applicant might qualify for one track but not another. Karma screens against the specific track they picked. You manage all tracks from one interface. This keeps multi-track programs organized and fair. One dashboard shows status across every track.",
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
        "Program managers spend days building reports from scattered sources. Quarterly updates go stale before anyone reads them. Boards ask questions the data cannot answer. Programs lack the structure for real analysis. Teams cannot act during a round without live data. Impact stays a story instead of hard numbers. This gap hurts trust with funders and stakeholders alike.",
    },
    solution: {
      heading: "Grant Reporting Analytics That Run on Autopilot",
      description:
        "Karma structures your reporting from day one. Reports build themselves as your team works. Program managers open live dashboards that answer questions fast. They create formatted reports in a few clicks. Onchain attestations back every data point. Your reports stay verifiable without extra work. Stakeholders get numbers they can trust. You spend minutes on tasks that once took days.",
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
          "Karma tracks funding, milestone rates, and grantee activity. It also monitors reviewer speed and application volume. You define custom KPIs that match your goals. All metrics update live as activity happens. You get a living view of program health. No more stale snapshots. The data stays current around the clock.",
      },
      {
        question: "Can I create custom reports for different stakeholders?",
        answer:
          "Yes. You set up report templates for each audience. Board members get high-level summaries. Program managers get detailed views. Community reports show public data. Templates work across all reporting periods. You set them up once and reuse them each quarter. This saves hours of formatting every cycle.",
      },
      {
        question: "How does onchain data improve reporting accuracy?",
        answer:
          "Milestone completions live as onchain attestations. This makes every data point verifiable by anyone. Stakeholders trust the numbers because no one can change them. Any metric traces back to its onchain source. This audit trail meets strict compliance needs. Your reports carry built-in proof of accuracy.",
      },
      {
        question: "Can I compare performance across multiple grant programs?",
        answer:
          "Yes. Karma compares programs side by side right away. You rank programs by completion rate and funding speed. These metrics help leaders split resources wisely. You spot best practices from top programs fast. Custom KPIs work across comparisons too. This helps you double down on what works best.",
      },
      {
        question: "What is the ROI of switching to automated grant reporting?",
        answer:
          "Most groups save several days per quarter on reports. Live data helps you make better choices during rounds. Compliance docs stay audit-ready at all times. Stakeholders stay informed without chasing your team. Better decisions over time add up to major savings. The ROI grows with each funding cycle you run.",
      },
      {
        question: "How quickly can I generate a stakeholder report?",
        answer:
          "You build a full report in under a minute. Pick a template, choose the date range, and export. Karma pulls all data from your live dashboard. You skip manual data collection entirely. Scheduled reports also land in stakeholder inboxes on time. One click replaces hours of manual work.",
      },
      {
        question: "Does Karma support impact measurement beyond financial metrics?",
        answer:
          "Yes. You track custom outcomes next to standard money data. This covers developer activity, community growth, or any KPI. Grantees report outcomes through the same milestone flow. Impact data flows into your reports on its own. This helps you tell a full story to funders and boards. Numbers and narrative come together in one place.",
      },
      {
        question: "Can I visualize trends across multiple funding rounds?",
        answer:
          "Yes. Karma shows trend charts across weeks, months, and rounds. You see how completion rates and speed change over time. Patterns help you improve future program design. Past data stays ready for as long as you need it. You export trend views for outside meetings. Visual charts make complex data easy to grasp.",
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
        "Programs struggle to track where funds go after allocation. Payments flow through many channels with no central record. Teams match payments to work by hand in spreadsheets. There is no clear link between money and results. Grantees face delays with no clue when funds arrive. Funders lose trust when they cannot trace capital. This lack of clarity slows down the whole funding cycle.",
    },
    solution: {
      heading: "Grant Payment Tracking Linked to Verified Milestones",
      description:
        "Karma ties every payment to a verified milestone. Each payout links to the work it funds. Program managers see live payment status across all grants. Grantees know exactly when to expect money. Funders trace capital from start to delivered results. Onchain records make every transaction auditable forever. No payment happens without proof of work behind it.",
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
          "You assign a funding amount to each milestone at setup. Karma queues the payment when a reviewer verifies work. Funds flow only to verified milestones. The payment record stays onchain forever. This creates permanent proof of every payout. No money moves without a verified deliverable behind it.",
      },
      {
        question: "Can grantees see when they will be paid?",
        answer:
          "Yes. Grantees open a payment portal with all due dates. They see the status of each milestone check. This helps them plan budgets with confidence. Clear timelines cut support requests by a lot. Grantees always know where things stand. They stop asking your team when money will arrive.",
      },
      {
        question: "Does Karma support both crypto and fiat payments?",
        answer:
          "Karma supports onchain payments on Ethereum, Optimism, Arbitrum, and more. You also track fiat payouts next to onchain ones. This gives you one view of all fund flows. Your tracking stays complete no matter the method. The hybrid setup works for programs with mixed channels. You see every payment in one dashboard.",
      },
      {
        question: "How does payment tracking help with compliance?",
        answer:
          "Every payment links to a verified milestone with full records. You show auditors that funds went to real work. Onchain records serve as tamper-proof evidence. Compliance prep time drops by a large margin. Your docs stay audit-ready at all times. You answer auditor questions in minutes, not days.",
      },
      {
        question: "Can I set spending limits or payment caps per grant?",
        answer:
          "Yes. You set funding caps and per-milestone amounts for each grant. Karma enforces limits and alerts you before overpaying. Budget controls also work at the program level. This stops accidental overspending across your portfolio. You keep financial discipline without manual checks. Alerts fire before any limit gets crossed.",
      },
      {
        question: "How does Karma handle payment delays or disputes?",
        answer:
          "The platform flags delayed payments in your dashboard right away. You see which payouts run late and why. Grantees raise payment questions through the platform. Managers resolve disputes with full history visible. Every action and fix gets logged for accountability. Nothing falls through the cracks.",
      },
      {
        question: "Can I track payments across multiple blockchain networks?",
        answer:
          "Yes. Karma tracks payments across chains out of the box. You monitor payouts on Ethereum, Optimism, Arbitrum, and more. All transactions show in one dashboard. Cross-chain reports build on their own. This makes treasury work simple for multi-chain programs. You stop switching between block explorers.",
      },
      {
        question: "What reports can I generate from payment data?",
        answer:
          "You build summaries, payout timelines, and burn rate reports. Reports link every payment to its verified milestone. You export data for auditors or board meetings. Scheduled reports reach stakeholders on their own. All numbers stay backed by onchain proof. You create a full financial picture in minutes.",
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
        "Groups running several grant programs use a different tool for each. Reviewers switch between systems all day long. Program managers cannot compare results across efforts. Teams maintain duplicate workflows for the same tasks. Data stays siloed and knowledge splits apart. Starting a new program means building from scratch each time. This wastes time and money at every level.",
    },
    solution: {
      heading: "Multi-Program Grant Management on One Unified Platform",
      description:
        "Karma runs all your grant programs on one platform. Every program keeps its own setup and workflows. They share tools for applications, milestones, and payments. Program managers run their own efforts freely. Leaders see across all programs at once. Starting a new program takes minutes with templates. You stop rebuilding the same tools for each effort.",
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
          "Yes. Every program gets its own full setup. This covers application forms, rules, and review rubrics. Programs share the platform but run on their own. You clone setups from existing programs as templates. This saves big setup time for new launches. Each program stays separate while sharing one home.",
      },
      {
        question: "Can reviewers work across multiple programs?",
        answer:
          "Yes. You assign reviewers to many programs with different roles. A reviewer can lead one program and assist in another. Access adjusts per program on its own. Reviewers see all tasks in one dashboard. This stretches your evaluator pool without extra accounts. You get more coverage with the same team.",
      },
      {
        question: "How does cross-program reporting work?",
        answer:
          "Karma pulls data from all programs into one view for leaders. You compare funding and completion rates at the org level. Drill into single programs for detailed numbers. Cross-program reports export fast for stakeholders. This helps you find best practices and spend wisely. You see the big picture and the details in one place.",
      },
      {
        question: "How quickly can I launch a new grant program?",
        answer:
          "You launch a new program in minutes with a template. Adjust the setup, add reviewers, and open applications. No technical deployment or overhead stands in the way. Groups that spent weeks on setup now finish in an hour. The platform handles everything behind the scenes. You go from idea to live program the same day.",
      },
      {
        question: "Is multi-program management suitable for small organizations?",
        answer:
          "Yes. Even two or three programs gain from shared tools. You cut duplicate work and processes right away. Cross-program sight starts from day one. The platform grows with your goals. You dodge painful moves as your portfolio gets bigger. Starting small costs nothing extra.",
      },
      {
        question: "How does Karma handle programs with different funding currencies?",
        answer:
          "Each program can use its own currency or token. Karma tracks payments across many chains and currencies. Portfolio reports adjust amounts for easy comparison. This works for groups funding across blockchain ecosystems. Treasury managers see one clean view of all payments. Mixed currencies never block your reporting.",
      },
      {
        question: "Can I move grantees between programs?",
        answer:
          "Yes. Grantee profiles live across your whole org. You invite existing grantees to new programs with no re-onboarding. Their past track record stays visible to reviewers. This helps you reward reliable grantees with new chances. Cross-program history leads to better funding choices. Good grantees stand out across all your programs.",
      },
      {
        question: "How do permissions work across multiple programs?",
        answer:
          "Karma controls access at both org and program levels. Org admins see everything across all programs. Program managers control only their own efforts. Reviewers see only their queued applications. This layered model scales well as your portfolio grows. You add programs without reworking access rules.",
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
        "Chasing grantees for updates eats the most time in grants. Program managers send dozens of follow-ups each week. They track replies in spreadsheets that go stale fast. Silent grantees force issues up to leadership. This work grows with your portfolio size. It turns into the biggest bottleneck as programs scale. Your best staff spend their time on emails, not strategy.",
    },
    solution: {
      heading: "Automated Grantee Reminders That Escalate Smartly",
      description:
        "Karma sends reminders based on milestones and response history. Reminders grow from friendly nudges to formal notices over time. The system adapts to each grantee's reply habits. Managers see who replied and who needs a personal touch. Your team focuses only on cases that need direct contact. Everyone else stays on track on their own. This frees up hours every single week.",
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
          "Karma sends reminders for deadlines and overdue items. It also covers pending requests and custom events you set. Each type has its own schedule and escalation rules. You preview the full sequence for any grantee. The right message reaches them at the right time. You never send a reminder too early or too late.",
      },
      {
        question: "Can I customize the reminder messages?",
        answer:
          "Yes. Each program gets its own message templates and tone. You set different templates for each escalation level. Templates use dynamic fields like name and deadline. You preview how messages look before turning them on. This keeps your words professional and on point. You adjust wording any time without rebuilding flows.",
      },
      {
        question: "Will grantees get overwhelmed with too many reminders?",
        answer:
          "No. Karma includes frequency caps and quiet hours. You set the max reminders per week and sending windows. The sequence stops when a grantee responds. It starts again only when the next task comes due. Grantees also pick their own alert settings. No one gets buried in repeat messages.",
      },
      {
        question: "How do I know which grantees need personal follow-up?",
        answer:
          "The dashboard flags grantees who skipped multiple reminders. You focus personal outreach on the few who truly need it. Response history and escalation status give you full context. You stop chasing grantees who already stay on track. This targeted approach saves hours every week. Your energy goes where it matters most.",
      },
      {
        question: "Can reminders be sent through channels other than email?",
        answer:
          "Karma supports in-app alerts alongside email. Grantees pick their preferred channel in settings. The system tracks delivery and clicks across all channels. Managers see which channels get the best replies. This data helps you improve how you reach grantees. You learn what works and do more of it.",
      },
      {
        question: "How do automated reminders improve milestone completion rates?",
        answer:
          "Programs using Karma's reminders see 20-30% higher completion rates. Grantees get timely nudges before deadlines pass. Early reminders stop overdue items from stacking up. The step-by-step escalation catches stragglers in time. This keeps your whole portfolio moving forward steadily. Better follow-up leads to better outcomes for everyone.",
      },
      {
        question: "Can I pause reminders for specific grantees?",
        answer:
          "Yes. You pause reminders for any grantee at any time. This helps when a project faces real delays. The pause logs the reason for audit records. You restart the sequence when the grantee is ready. This respects real-world project challenges. You stay flexible without losing accountability.",
      },
      {
        question: "Do reminders work for programs with irregular milestone schedules?",
        answer:
          "Yes. Karma sends reminders based on each milestone's own deadline. Odd schedules work the same as regular ones. The system adapts to each grantee's unique timeline. You do not need even intervals across your portfolio. This supports many project types in one program. Every grantee gets reminders that match their plan.",
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
        "Most programs patch workflows from Google Forms, spreadsheets, and email. Applications fall through cracks between these systems. Applicants get mixed updates about their status. Managers have no single view of where things stand. Tracking breaks down as volume grows. You cannot scale this patchwork approach. Each new round adds more confusion and lost submissions.",
    },
    solution: {
      heading: "Complete Grant Application Management in One Platform",
      description:
        "Karma manages applications from submission to funding decision. Applicants use structured forms with built-in checks. Applications flow through review stages on their own. Reviewers evaluate proposals in a focused interface. Every status change gets logged and sent to applicants. Approved ones turn into active grants with milestones set. The whole pipeline lives in one place from start to finish.",
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
          "As many as your program needs. Common setups include submission, screening, expert review, and final decision. You add, remove, or rename stages freely. Each stage gets its own reviewers and rules. Branches route applications by category or score. You design the exact flow your team requires.",
      },
      {
        question: "Can applicants check the status of their application?",
        answer:
          "Yes. Applicants log in to see their current stage. They see if any action falls on them. Auto emails notify them at each stage change. This self-service view cuts status inquiry emails by a lot. Your team stops answering the same questions over and over. Applicants feel informed throughout the whole process.",
      },
      {
        question: "How does Karma handle rejected applications?",
        answer:
          "Rejected applicants get auto alerts with optional feedback. You choose to share detailed comments or a short note. You can invite rejected applicants to try again next round. This keeps promising candidates engaged with your program. It also gives them clear tips for stronger future proposals. No applicant leaves without knowing where they stand.",
      },
      {
        question: "What happens after an application is approved?",
        answer:
          "Approved applications turn into active grants right away. Milestones and payment schedules carry over from the proposal. Grantees start milestone tracking with no manual re-entry. They get guidance on how to submit updates. This smooth handoff saves hours of admin work per grant. No data gets typed twice.",
      },
      {
        question: "Can I reopen or reconsider a declined application?",
        answer:
          "Yes. Program managers move applications between stages any time. You reopen declined applications for a second look. All transitions get logged for audit records. This helps when new funding opens up later. The full decision history stays visible throughout. No past action gets hidden or lost.",
      },
      {
        question: "How does the pipeline view help program managers?",
        answer:
          "The pipeline view shows every application by status. You spot bottlenecks at a glance. Bulk actions let you move groups of applications at once. Filters narrow the view by topic, score, or reviewer. This visual layout replaces spreadsheet tracking completely. You manage hundreds of applications from one screen.",
      },
      {
        question: "Can I customize applicant communications at each stage?",
        answer:
          "Yes. Each stage change sends an auto message using your templates. You control the content, tone, and branding. Dynamic fields add applicant details on their own. This keeps messages steady across hundreds of applications. Applicants feel informed without your team writing emails. You set it up once and it runs every round.",
      },
      {
        question: "How does reviewer workload balancing work?",
        answer:
          "Karma spreads applications across reviewers by current load. No single reviewer gets buried while others sit idle. You set max assignments per reviewer per round. The system tracks review progress live. Managers step in only when loads tilt out of balance. Every reviewer gets a fair share of the work.",
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
