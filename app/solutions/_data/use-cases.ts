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
      heading: "Grant Applications Are Slow, Fragmented, and Error-Prone",
      description:
        "Most grant programs rely on Google Forms, email attachments, and spreadsheets to collect applications. Reviewers juggle multiple tabs and threads to evaluate proposals, leading to inconsistent scoring, lost submissions, and weeks of unnecessary delay. Applicants have no visibility into where their proposal stands, resulting in repeated follow-ups that drain program staff time.",
    },
    solution: {
      heading: "A Unified Application Pipeline from Submission to Approval",
      description:
        "Karma provides a structured application flow where grantees submit proposals through a standardized interface. AI-powered review assists evaluators in scoring applications consistently and flagging incomplete submissions. Program managers see every application in a centralized dashboard with real-time status updates, so nothing falls through the cracks. The result is faster turnaround, fewer errors, and a better experience for both applicants and reviewers.",
    },
    capabilities: [
      "Structured proposal submission with required fields and validation",
      "AI-assisted review that scores applications and highlights key details",
      "Centralized application dashboard with filtering and status tracking",
      "Automated notifications for applicants at each stage of review",
      "Configurable review rubrics tailored to your program criteria",
      "Bulk actions for processing multiple applications efficiently",
    ],
    faqs: [
      {
        question: "Can I customize the application form fields?",
        answer:
          "Yes. Program managers can define required and optional fields, add custom questions, and set validation rules to ensure every submission meets your program criteria before it reaches reviewers. You can also create reusable templates across multiple funding rounds so you do not have to rebuild forms from scratch each time.",
      },
      {
        question: "How does AI-assisted review work?",
        answer:
          "Karma's AI review analyzes each application against your program criteria, generates a summary score, and highlights strengths and gaps. Reviewers use this as a starting point and can override or adjust scores based on their own judgment. The AI learns from your rubric configuration, so results improve as you refine your evaluation criteria over successive rounds.",
      },
      {
        question: "Can applicants track their submission status?",
        answer:
          "Yes. Applicants see real-time status updates on their submissions, from received to under review to approved or declined, eliminating the need for follow-up emails. They also receive automated notifications at each stage transition, so they always know exactly where their application stands without needing to contact program staff directly for status updates on their submission.",
      },
      {
        question: "Does this integrate with existing grant platforms?",
        answer:
          "Karma works as a standalone platform but also supports importing applications from external sources and integrating with tools you already use. Onchain attestations provide a permanent, verifiable record of every application decision. You can export data in standard formats for use in other systems, ensuring Karma fits into your existing workflow rather than replacing it entirely.",
      },
      {
        question: "How long does it take to set up an application pipeline?",
        answer:
          "Most program managers have a fully configured application pipeline running within a day. You define your form fields, set review criteria, and invite reviewers through the web interface. No technical setup or developer involvement is required, and Karma provides starter templates for common grant program structures to accelerate the onboarding process significantly.",
      },
    ],
    ctaText: "Streamline Your Applications",
    ctaHref: "/foundations",
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
      href: "/solutions/how-it-works",
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
      heading: "Manual Reviews Are Inconsistent and Painfully Slow",
      description:
        "Grant review committees spend hours reading proposals, often applying criteria inconsistently across reviewers. Scheduling review meetings is a logistical nightmare, and without structured rubrics, decisions depend heavily on who happens to review which application. Programs with hundreds of applicants face review backlogs that delay funding by months.",
    },
    solution: {
      heading: "AI-Powered Reviews with Human Oversight",
      description:
        "Karma automates the initial screening and scoring of grant applications using AI that evaluates proposals against your defined criteria. Each application receives a preliminary score with detailed reasoning, giving reviewers a head start. Structured rubrics ensure every reviewer evaluates the same dimensions, and automated assignment distributes workload evenly. Human reviewers retain full control to accept, adjust, or override AI recommendations.",
    },
    capabilities: [
      "AI scoring engine that evaluates applications against configurable criteria",
      "Automated reviewer assignment with workload balancing",
      "Structured rubrics that enforce consistent evaluation across all reviewers",
      "Side-by-side comparison view for competing applications",
      "Review progress tracking with deadline alerts",
      "Audit trail of all review decisions and score justifications",
      "Batch review tools for processing high-volume programs",
    ],
    faqs: [
      {
        question: "Can I define my own review criteria?",
        answer:
          "Absolutely. You set the rubric dimensions, scoring scales, and weightings. The AI and human reviewers both evaluate against your specific criteria, so the process reflects your program priorities. You can also create different rubrics for different grant categories within the same program, giving you full flexibility over how each track is assessed.",
      },
      {
        question: "How accurate is the AI scoring?",
        answer:
          "The AI scoring is designed as a first-pass assistant, not a replacement for human judgment. It flags incomplete applications, identifies strong candidates, and provides reasoning for its scores. Reviewers always have the final say. Over time, the system becomes more aligned with your standards as you refine rubric weightings and review more applications.",
      },
      {
        question: "Can multiple reviewers score the same application?",
        answer:
          "Yes. Karma supports multi-reviewer workflows where each reviewer independently scores an application against the same rubric. The platform aggregates scores and highlights disagreements for discussion. This consensus-based approach reduces individual bias and ensures that borderline applications receive fair and thorough consideration from multiple independent perspectives before a final funding decision is reached by the committee.",
      },
      {
        question: "How does automated reviewer assignment work?",
        answer:
          "Karma distributes applications across your reviewer pool based on workload balancing and optional expertise tags. You can set maximum review loads per reviewer and define assignment rules so that applications reach evaluators with relevant domain knowledge. Reviewers receive notifications when new applications are assigned to them and can track their queue in a personal dashboard.",
      },
      {
        question: "What happens if a reviewer disagrees with the AI score?",
        answer:
          "Reviewers can override any AI-generated score with their own assessment and provide written justification for the change. The platform records both the AI score and the human override, maintaining a complete audit trail. This approach ensures full transparency in the review process while preserving the significant efficiency benefits of automated initial screening across all submitted applications.",
      },
    ],
    ctaText: "Automate Your Reviews",
    ctaHref: "/foundations",
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
      href: "/solutions/ai-grant-review",
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
      heading: "Funded Projects Disappear After the Check Clears",
      description:
        "Once grants are awarded, many programs lose visibility into what grantees actually deliver. Milestone updates arrive sporadically via email or Notion docs, with no standard format and no way to verify claims. Program managers spend hours chasing grantees for updates, and stakeholders have no clear picture of whether funded projects are on track.",
    },
    solution: {
      heading: "Real-Time Milestone Tracking with Onchain Verification",
      description:
        "Karma structures post-funding accountability by letting programs define clear milestones at the grant level. Grantees submit milestone updates through the platform, and program managers review and approve completions. Every approved milestone is recorded as an onchain attestation using EAS, creating a tamper-proof delivery record. Dashboards show milestone progress across your entire portfolio at a glance.",
    },
    capabilities: [
      "Customizable milestone definitions with deadlines and deliverables",
      "Grantee self-reporting through structured milestone update forms",
      "Program manager review and approval workflow for each milestone",
      "Onchain attestations via EAS for every completed milestone",
      "Portfolio-wide milestone dashboard with progress indicators",
      "Automated reminders for upcoming and overdue milestones",
    ],
    faqs: [
      {
        question: "What are onchain attestations?",
        answer:
          "Onchain attestations are cryptographically signed records stored on a blockchain using the Ethereum Attestation Service (EAS). They create a permanent, verifiable proof that a milestone was completed and approved, which cannot be altered or deleted. Anyone with the attestation ID can independently verify the record, making them far more trustworthy than traditional document-based proof.",
      },
      {
        question: "Can grantees submit evidence with their milestone updates?",
        answer:
          "Yes. Grantees can attach links, documents, screenshots, and detailed descriptions when submitting milestone updates. Reviewers see all supporting evidence alongside the milestone criteria before approving or requesting revisions. This structured evidence collection ensures that every milestone decision is backed by verifiable deliverables rather than vague status claims, improving accountability across your entire portfolio.",
      },
      {
        question: "How do I see milestone progress across all my grants?",
        answer:
          "Karma provides a portfolio dashboard that shows milestone completion rates, overdue items, and upcoming deadlines across all funded projects. You can filter by program, status, or date range. The dashboard updates in real time as grantees submit updates and reviewers approve milestones, so you always have a current view of your portfolio health.",
      },
      {
        question: "Can I set different milestones for different grants?",
        answer:
          "Yes. Each grant can have its own set of milestones with unique deliverables and deadlines. You can also create milestone templates for common grant structures, saving considerable time when onboarding new grantees with similar project types. Templates are fully customizable and can be adjusted per individual grant to match specific deliverable requirements as needed.",
      },
      {
        question: "What happens when a grantee misses a milestone deadline?",
        answer:
          "Karma sends automated reminders before deadlines and flags overdue milestones in the dashboard. Program managers receive alerts when milestones become overdue and can choose to extend deadlines, request updated timelines, or escalate the issue. The overdue status is clearly visible in portfolio reports and public dashboards so stakeholders stay fully informed about potential delivery risks across the program.",
      },
    ],
    ctaText: "Start Tracking Milestones",
    ctaHref: "/foundations",
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
      href: "/solutions/onchain-attestation-grants",
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
      heading: "Managing Dozens of Grants Feels Like Juggling in the Dark",
      description:
        "As grant programs grow, managing a portfolio of funded projects becomes exponentially harder. Each grant has its own timeline, milestones, and reporting requirements. Program managers end up with a patchwork of spreadsheets, project management tools, and communication channels. There is no single view of portfolio health, making it impossible to identify which projects need attention and which are thriving.",
    },
    solution: {
      heading: "One Dashboard for Your Entire Grant Portfolio",
      description:
        "Karma aggregates all your funded projects into a portfolio dashboard that shows real-time status, milestone completion rates, and key metrics across every grant. Filter by program, status, or funding round to zero in on what matters. Generate portfolio-level reports for governance bodies, donors, or internal stakeholders with a few clicks. When a project falls behind, you see it immediately instead of discovering it months later.",
    },
    capabilities: [
      "Portfolio dashboard with real-time status for all funded grants",
      "Filtering and sorting by program, round, status, or custom tags",
      "Aggregated milestone completion metrics across the portfolio",
      "CIDS-compatible reporting for stakeholder communication",
      "Exportable reports for governance bodies and donors",
      "Project health indicators that flag at-risk grants automatically",
      "Historical tracking to compare performance across funding rounds",
    ],
    faqs: [
      {
        question: "How many grants can I manage on Karma?",
        answer:
          "There is no practical limit. Karma is designed for programs managing dozens to hundreds of grants simultaneously. The dashboard scales with your portfolio and provides filtering tools to keep things manageable. Performance remains consistent whether you are tracking twenty grants or five hundred, so your workflow stays smooth as your program grows.",
      },
      {
        question: "Can I compare performance across different funding rounds?",
        answer:
          "Yes. Karma tracks historical data across rounds, so you can compare milestone completion rates, delivery timelines, and grantee performance from one round to the next. This longitudinal view helps you identify trends, spot improving or declining grantees, and refine your overall funding strategy based on concrete evidence drawn from past outcomes and delivery patterns.",
      },
      {
        question: "What is CIDS reporting?",
        answer:
          "CIDS (Common Impact Data Standard) is a standardized format for reporting grant outcomes and impact. Karma supports CIDS-compatible exports so your data is interoperable with other grant management and impact measurement systems. This means your reports follow a shared vocabulary that funders, evaluators, and peer programs can understand without manual translation.",
      },
      {
        question: "Can I tag and categorize grants within the portfolio?",
        answer:
          "Yes. Karma supports custom tags and categories that you can assign to any grant. Use tags to group projects by theme, technology area, geographic region, or any other dimension relevant to your program. Filtered views and reports can then focus on specific subsets of your portfolio for targeted analysis, making it easy to assess performance within individual categories.",
      },
      {
        question: "How do portfolio health indicators work?",
        answer:
          "Karma automatically calculates health scores for each grant based on milestone completion rates, deadline adherence, and responsiveness to update requests. Grants that fall behind trigger visual alerts in the dashboard and optional email notifications, so program managers can intervene early rather than discovering problems during end-of-round reporting cycles when corrective action is more difficult.",
      },
    ],
    ctaText: "Manage Your Portfolio",
    ctaHref: "/foundations",
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
      href: "/solutions/grant-program-dashboard",
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
      heading: "Grant Accountability Depends on Trust Alone",
      description:
        "Most grant programs rely on grantees to self-report progress with no independent verification. Stakeholders and community members have no way to confirm whether milestones were actually completed or funds were used as intended. This trust-based model works for honest grantees but provides no mechanism to catch underperformance, and it erodes confidence in the entire program when problems surface.",
    },
    solution: {
      heading: "Verifiable Accountability Through Onchain Records",
      description:
        "Karma adds a verification layer to grant accountability. Grantees submit milestone updates, program managers review and approve them, and every decision is recorded as an onchain attestation via EAS. These records are publicly verifiable, meaning stakeholders, governance bodies, and community members can independently confirm delivery without relying solely on the program manager's word. This transparency builds trust and creates real consequences for non-delivery.",
    },
    capabilities: [
      "Onchain attestations for every milestone approval and rejection",
      "Public project profiles showing verified delivery history",
      "Reviewer verification workflows with structured evidence requirements",
      "Stakeholder-facing dashboards for independent progress monitoring",
      "Historical accountability records across all funding rounds",
      "Community review integration for broader oversight",
    ],
    faqs: [
      {
        question: "How does onchain accountability differ from regular reporting?",
        answer:
          "Regular reporting relies on documents that can be edited or lost. Onchain attestations are immutable records stored on a blockchain that anyone can verify independently. They provide cryptographic proof of what was approved and when. Unlike traditional reports, these records cannot be retroactively altered, giving stakeholders confidence that the accountability trail is genuine and complete.",
      },
      {
        question: "Can community members see grant progress?",
        answer:
          "Yes. Karma provides public project profiles where anyone can view a grantee's milestone history, approval records, and overall delivery track record. This transparency enables community oversight alongside formal program management. Community members can follow specific projects and receive updates, creating a broader layer of accountability beyond the core program team.",
      },
      {
        question: "Does this replace trust in grantees?",
        answer:
          "No, it complements trust with verification. Honest grantees benefit from a verifiable track record that strengthens future funding applications. The system creates accountability without assuming bad faith. By documenting achievements onchain, high-performing grantees build a portable reputation that makes them more competitive in future rounds across any program using Karma.",
      },
      {
        question: "What happens when a grantee misses a milestone?",
        answer:
          "Missed milestones are visible in the dashboard and reflected in the grantee's public profile. Program managers can follow up, adjust timelines, or flag the project for additional review based on their program's policies. The transparency ensures that missed milestones cannot be quietly overlooked, creating natural incentives for grantees to communicate proactively about delays.",
      },
      {
        question: "Can accountability data be used across different programs?",
        answer:
          "Yes. Because Karma records milestones as onchain attestations, a grantee's delivery history is portable across programs. Any program manager can review a prospective grantee's past performance before making funding decisions. This cross-program visibility rewards consistent delivery and helps the broader ecosystem allocate funds more effectively by surfacing track records that would otherwise remain siloed within individual programs.",
      },
    ],
    ctaText: "Improve Accountability",
    ctaHref: "/foundations",
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
      href: "/solutions/onchain-attestation-grants",
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
      heading: "Admin Work Consumes More Time Than Actual Grant Management",
      description:
        "Grant program staff spend the majority of their time on administrative tasks: collecting applications, coordinating reviewers, chasing grantees for updates, compiling reports, and answering status inquiries. These tasks are necessary but repetitive, and they pull attention away from higher-value work like mentoring grantees, improving program design, and evaluating impact.",
    },
    solution: {
      heading: "Automate the Busywork, Focus on What Matters",
      description:
        "Karma eliminates administrative bottlenecks across the grant lifecycle. Applications flow through structured intake with automatic validation. AI review handles initial screening so human reviewers focus on borderline cases. Milestone tracking sends automated reminders to grantees and flags overdue items for managers. Portfolio dashboards and CIDS-compatible reports generate themselves from live data instead of requiring manual compilation.",
    },
    capabilities: [
      "Automated application intake with validation and duplicate detection",
      "AI-powered initial screening that triages applications by quality",
      "Automated milestone reminders sent directly to grantees",
      "Self-generating portfolio reports from real-time data",
      "Bulk actions for approvals, notifications, and status updates",
      "Configurable notification rules to reduce manual follow-ups",
      "CIDS reporting exports that compile automatically",
    ],
    faqs: [
      {
        question: "How much time can we save with Karma?",
        answer:
          "Programs typically report reducing administrative time by 40-60%, depending on portfolio size and current processes. The biggest gains come from automated application processing, milestone tracking reminders, and self-generating reports. Teams that previously spent three days per week on admin tasks often reclaim that time for strategic work like grantee mentoring and program design improvements.",
      },
      {
        question: "Does automation mean less control?",
        answer:
          "No. Karma automates repetitive tasks but keeps humans in the loop for all decisions. You set the rules, configure the workflows, and approve or override at every stage. Automation handles the logistics while you retain full control. Think of it as delegating paperwork to a system that follows your rules precisely, freeing you to focus on judgment calls that require human expertise.",
      },
      {
        question: "Can we phase in automation gradually?",
        answer:
          "Yes. You can start by using Karma for milestone tracking alone, then add application management and automated reviews as your team gets comfortable with the platform. Each feature works independently, so you adopt at your own pace without disrupting existing workflows. Most teams begin with milestone reminders and portfolio dashboards before layering on AI-assisted review.",
      },
      {
        question: "What administrative tasks does Karma automate first?",
        answer:
          "The quickest wins are automated milestone reminders, application validation, and portfolio report generation. These three features eliminate the most repetitive manual work with minimal configuration. Once running, they immediately reduce the volume of follow-up emails, incomplete submissions, and manual data compilation that consume most program staff time throughout each funding cycle.",
      },
      {
        question: "How does Karma handle duplicate or spam applications?",
        answer:
          "Karma includes automatic duplicate detection that flags applications with matching wallet addresses, email addresses, or substantially similar proposal content. Suspected duplicates are surfaced for manual review rather than automatically rejected, ensuring that legitimate resubmissions are not accidentally lost while keeping spam and clearly duplicate entries out of your active reviewer queue during each application cycle.",
      },
    ],
    ctaText: "Reduce Admin Overhead",
    ctaHref: "/foundations",
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
      href: "/solutions/roi-calculator",
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
      heading: "Growth Means More Headcount, More Complexity, More Chaos",
      description:
        "When a grant program succeeds, demand grows. More applicants, more funded projects, more milestones to track, more reports to generate. Without scalable systems, the only option is to hire more staff or accept longer timelines and lower quality. Many programs hit a ceiling where they simply cannot process more grants without the process breaking down.",
    },
    solution: {
      heading: "Scalable Infrastructure for Growing Programs",
      description:
        "Karma provides the infrastructure to scale grant operations. AI review handles the increased volume of applications without adding reviewers. Structured milestone tracking manages hundreds of projects with the same effort as dozens. Portfolio dashboards give managers visibility into the full portfolio without manually assembling data. Programs that previously needed a team of ten can operate effectively with three or four.",
    },
    capabilities: [
      "AI review that scales with application volume automatically",
      "Portfolio dashboards that handle hundreds of active grants",
      "Templated milestone structures for repeatable grant types",
      "Bulk operations for processing grants at scale",
      "Automated grantee communications and status notifications",
      "Multi-program support for organizations running several grant tracks",
      "Role-based access for expanding teams with clear permissions",
    ],
    faqs: [
      {
        question: "At what size does Karma become necessary?",
        answer:
          "Programs managing more than 20-30 active grants typically start seeing significant benefits. Below that, spreadsheets may suffice. Above that, the administrative burden grows faster than linear and structured tooling becomes essential. Programs that anticipate growth beyond 30 grants should adopt Karma early to avoid the painful migration from spreadsheets once processes are already strained.",
      },
      {
        question: "Can we run multiple grant programs on one platform?",
        answer:
          "Yes. Karma supports multiple programs within a single organization, each with its own application criteria, review rubrics, and milestone templates. Portfolio dashboards can show data across all programs or filter to one. This multi-program architecture means you manage everything from a single login while maintaining clear separation between grant tracks and their individual requirements.",
      },
      {
        question: "Do we need technical staff to use Karma?",
        answer:
          "No. Karma is designed for program managers, not engineers. Setup, configuration, and daily operations are all handled through the web interface without requiring technical expertise. The platform includes guided setup wizards and starter templates, so your team can be fully operational within a day. Technical integrations are available for advanced users but are entirely optional.",
      },
      {
        question: "How does pricing scale?",
        answer:
          "Karma is designed so that costs scale reasonably with program size. Contact the team for pricing details tailored to your program volume. The pricing model ensures that growing your portfolio does not create disproportionate cost increases, so scaling your program remains financially sustainable as you add more grants and funding rounds.",
      },
      {
        question: "Can Karma handle seasonal spikes in application volume?",
        answer:
          "Yes. Karma's AI review and automated intake handle volume spikes without manual intervention. Whether you receive fifty applications or five hundred in a single round, the platform processes them consistently. This elasticity means you do not need to hire temporary staff for high-volume periods or delay review timelines when application counts exceed expectations.",
      },
    ],
    ctaText: "Scale Your Program",
    ctaHref: "/foundations",
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
      href: "/solutions/case-studies",
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
      heading: "Opaque Processes Erode Community Trust",
      description:
        "Most grant programs operate as black boxes. Community members and token holders fund programs through governance votes but have little visibility into how funds are allocated, whether projects deliver, or what impact is achieved. This opacity breeds skepticism, reduces participation in governance, and makes it harder for programs to secure future funding even when they perform well.",
    },
    solution: {
      heading: "Transparency as a Default, Not an Afterthought",
      description:
        "Karma builds transparency into every step of the grant lifecycle. Applications, reviews, milestone completions, and impact data are all visible through public dashboards. Onchain attestations create a verifiable record that anyone can audit independently. Community members can see which projects were funded, track their progress, and verify outcomes without relying on summary reports from the program team.",
    },
    capabilities: [
      "Public-facing dashboards showing funded projects and their status",
      "Onchain attestations providing immutable proof of approvals and completions",
      "Open milestone records visible to all stakeholders",
      "Community review features enabling public feedback on funded projects",
      "Governance-ready reports with verifiable data backing every claim",
      "Grantee profile pages with full delivery history across programs",
    ],
    faqs: [
      {
        question: "Is everything public by default?",
        answer:
          "Milestone progress and completion records are public. Internal review discussions and scores can be configured as private or public depending on your program preferences. You have granular control over what is visible externally, so you can balance transparency with the confidentiality needs of your review process and any sensitive applicant information.",
      },
      {
        question: "How does transparency help with governance votes?",
        answer:
          "When community members can verify grant program results through public dashboards and onchain records, they make more informed governance decisions. Programs with strong delivery records build a track record that supports future funding requests. This evidence-based approach to governance replaces anecdotal advocacy with verifiable data, leading to higher voter participation and more confident funding allocations.",
      },
      {
        question: "Can we selectively share data?",
        answer:
          "Yes. Karma provides granular visibility controls. You can make milestone data public while keeping reviewer identities and scores private, or open everything up for full transparency. The configuration is per-program, so different grant tracks within your organization can have different visibility settings based on their specific stakeholder requirements and confidentiality needs.",
      },
      {
        question: "Does this work for non-Web3 grant programs?",
        answer:
          "Yes. While onchain attestations are a Web3 feature, the dashboards, milestone tracking, and reporting work for any grant program. You can adopt the transparency tools without requiring grantees to interact with blockchain technology. The public dashboards and structured reporting provide meaningful transparency benefits regardless of whether your program uses onchain verification features.",
      },
      {
        question: "How do public dashboards affect grantee behavior?",
        answer:
          "Programs using public dashboards report that grantees submit milestone updates more consistently and communicate proactively about delays. The visibility creates positive accountability pressure without punitive mechanisms. Grantees who know their progress is publicly visible tend to maintain higher delivery standards and engage more actively with program milestones, resulting in measurably better completion rates across the portfolio.",
      },
    ],
    ctaText: "Make Your Program Transparent",
    ctaHref: "/foundations",
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
      href: "/solutions/grant-program-dashboard",
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
      heading: "Grant Decisions Are Based on Proposals, Not Performance",
      description:
        "Most grant decisions are made based on a proposal document and a brief review. Past performance, if considered at all, relies on the program manager's memory or scattered records. Programs fund the best writers, not necessarily the best builders. Without performance data, programs cannot learn from past rounds, identify their best grantees, or make evidence-based improvements to their funding strategy.",
    },
    solution: {
      heading: "Evidence-Based Funding Decisions",
      description:
        "Karma collects performance data across the entire grant lifecycle and makes it available at the point of decision. When reviewing a new application, see the applicant's milestone completion rate from previous grants. When planning a new round, analyze which project categories delivered the most impact. Portfolio analytics show trends over time, helping you refine criteria, adjust funding amounts, and improve program design based on real outcomes.",
    },
    capabilities: [
      "Grantee track record profiles showing historical delivery performance",
      "Portfolio analytics with milestone completion trends across rounds",
      "Comparative analysis tools for evaluating applicants against peers",
      "Funding allocation insights based on historical outcome data",
      "Custom dashboards for tracking metrics that matter to your program",
      "CIDS-compatible impact data exports for cross-program analysis",
    ],
    faqs: [
      {
        question: "What data does Karma track?",
        answer:
          "Karma tracks application submissions, review scores, milestone definitions and completions, approval timelines, grantee delivery rates, and portfolio-level aggregates. All data is structured and queryable for analysis. The platform also tracks reviewer consistency metrics and program-level trends over time, giving you a comprehensive and structured data foundation for evidence-based decision making across all your grant programs.",
      },
      {
        question: "Can I see a grantee's performance from other programs?",
        answer:
          "Yes. Because Karma records milestones as onchain attestations, a grantee's delivery history is portable across programs. You can view their track record from any program that uses Karma. This cross-program visibility helps you identify reliable grantees and avoid funding teams with a pattern of underdelivery, regardless of which program originally funded them.",
      },
      {
        question: "How does this improve decision quality?",
        answer:
          "Programs using performance data report better outcomes because they can identify reliable grantees, spot underperformers early, and adjust funding criteria based on what actually works rather than what looks good on paper. Data-driven decisions reduce the influence of proposal writing quality on funding outcomes and help programs allocate resources toward teams with proven delivery track records.",
      },
      {
        question: "Is the data exportable for our own analysis?",
        answer:
          "Yes. Karma supports data exports in standard formats including CIDS-compatible outputs. You can feed this data into your own analytics tools or governance reporting systems. Exports include raw milestone data, aggregated performance metrics, and portfolio summaries, so you have full flexibility to run custom analyses that go beyond Karma's built-in dashboards.",
      },
      {
        question: "How quickly does useful performance data accumulate?",
        answer:
          "After one complete funding round with milestone tracking, you have enough data to inform decisions for the next round. Within two to three rounds, trend analysis becomes meaningful and you can identify patterns in grantee performance, category effectiveness, and program design. Early adopters benefit most because their historical data grows with every round.",
      },
    ],
    ctaText: "Make Smarter Decisions",
    ctaHref: "/foundations",
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
      href: "/solutions/grant-program-dashboard",
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
      heading: "Impact Reports Are Expensive to Produce and Hard to Trust",
      description:
        "Grant programs are increasingly expected to demonstrate impact, but producing impact reports is a manual, time-consuming process. Staff spend days compiling data from spreadsheets, emails, and project updates into a presentable format. The resulting reports rely on self-reported data with no verification mechanism, making them expensive to produce and easy to question.",
    },
    solution: {
      heading: "Verified Impact Reports Generated from Live Data",
      description:
        "Karma generates impact reports directly from your verified program data. Every data point in the report traces back to an onchain attestation or a structured milestone record, so stakeholders can trust the numbers. CIDS-compatible exports ensure your data meets emerging standards for grant impact measurement. Instead of spending days compiling reports manually, program managers generate them in minutes with data that is already verified.",
    },
    capabilities: [
      "Auto-generated impact reports from verified milestone and outcome data",
      "CIDS-compatible exports for standardized impact measurement",
      "Stakeholder-ready summaries with charts and key metrics",
      "Onchain verification links for every data point in the report",
      "Customizable report templates for different audiences",
      "Historical reporting across multiple funding rounds",
      "Exportable formats for governance presentations and donor updates",
    ],
    faqs: [
      {
        question: "What is the CIDS format?",
        answer:
          "CIDS (Common Impact Data Standard) is an emerging standard for reporting grant outcomes. It provides a shared vocabulary and structure for impact data so that reports are comparable across programs, funders, and ecosystems. Adopting CIDS means your impact data is immediately interoperable with other organizations using the standard, reducing the effort needed to participate in cross-ecosystem impact assessments.",
      },
      {
        question: "How long does it take to generate a report?",
        answer:
          "Minutes, not days. Because Karma collects structured, verified data throughout the grant lifecycle, reports are generated from live data rather than compiled manually. You select the scope, choose a template, and export. What used to take a team several days of data gathering and formatting now happens in a single session with data you can trust.",
      },
      {
        question: "Can stakeholders verify the data in reports?",
        answer:
          "Yes. Every metric in a Karma impact report links back to its source data, including onchain attestation records. Stakeholders can independently verify any claim in the report without relying on the program team. This verification capability transforms impact reports from trust-based documents into evidence-based records that withstand scrutiny from governance bodies and external auditors.",
      },
      {
        question: "Can I create custom report templates?",
        answer:
          "Yes. Karma provides default templates for common reporting needs, and you can customize them to match your stakeholder requirements, governance formats, or donor reporting standards. Templates are reusable across rounds and can be shared with other program managers in your organization, ensuring consistent reporting quality across your entire grant portfolio.",
      },
      {
        question: "Does this replace manual reporting entirely?",
        answer:
          "For quantitative metrics and milestone delivery data, yes. Qualitative narratives and strategic commentary still benefit from human input, but the data foundation is automated and verified. This hybrid approach means program staff spend their reporting time on insight and analysis rather than data gathering and formatting, producing higher-quality reports with significantly less effort.",
      },
    ],
    ctaText: "Generate Impact Reports",
    ctaHref: "/foundations",
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
      href: "/solutions/impact-reporting-demo",
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
