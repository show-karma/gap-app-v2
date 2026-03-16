import type { SolutionPage } from "./types";

export const softwareTypeSolutions: SolutionPage[] = [
  {
    slug: "cloud-grant-management-software",
    title: "Cloud-Based Grant Management Software",
    metaDescription:
      "Manage grants from anywhere with Karma cloud-based software. Onchain transparency, milestone tracking, and AI-powered review in one platform.",
    heading: "Cloud-Based Grant Management Software",
    tldr: "Cloud-based grant management software lets funders and grantees collaborate from anywhere without installing desktop tools. Karma delivers a fully cloud-native platform with onchain attestations, milestone tracking, and AI-assisted review so your grant program stays transparent and accessible around the clock.",
    problem: {
      heading: "Legacy Desktop Tools Create Silos and Slow Down Grant Programs",
      description:
        "Traditional grant management relies on locally installed software, spreadsheets shared over email, and siloed databases that only a few team members can access. When program officers travel, change devices, or onboard new reviewers, productivity stalls. Version conflicts, data duplication, and lack of real-time visibility make it difficult to track how funds are being used or whether milestones are on schedule. These friction points erode trust between funders and grantees and make audits unnecessarily painful.",
    },
    solution: {
      heading: "A Cloud-Native Platform Built for Transparency and Collaboration",
      description:
        "Karma is purpose-built as a cloud-first grant management platform. Every action, from application submission to milestone completion, is recorded with onchain attestations that anyone can independently verify. Program managers access real-time portfolio dashboards from any browser, reviewers evaluate proposals with AI-powered scoring assistance, and grantees update progress through a simple web interface. Because Karma is cloud-based, there is nothing to install, no VPN to configure, and no manual backups to worry about. Whitelabel options let foundations deploy their own branded portal while leveraging Karma's infrastructure, and CIDS-aligned reporting ensures your data meets international development standards.",
    },
    capabilities: [
      "Browser-based access from any device with no software installation required",
      "Onchain attestations providing immutable, independently verifiable records of every grant action",
      "AI-powered review that helps evaluators score applications consistently and efficiently",
      "Real-time portfolio dashboards showing fund allocation, milestone progress, and grantee activity",
      "Milestone tracking with structured deliverables and evidence-based completion verification",
      "Whitelabel deployment so foundations can run a branded grant portal on Karma's infrastructure",
      "CIDS-aligned reporting for standardized impact measurement across grant programs",
    ],
    faqs: [
      {
        question: "Do I need to install anything to use Karma?",
        answer:
          "No. Karma runs entirely in the browser, so there is nothing to download, install, or configure on your local machine. Program managers, reviewers, and grantees all access the platform through a standard web URL. No desktop software, browser plugins, VPN connections, or IT provisioning steps are required to get started.",
      },
      {
        question: "How does Karma ensure data integrity in the cloud?",
        answer:
          "Karma records key grant actions as onchain attestations using the Ethereum Attestation Service. These records are immutable and publicly verifiable, providing a significantly stronger integrity guarantee than traditional database backups alone. Even if internal systems experience disruptions or outages, the onchain record remains independently accessible and tamper-proof for auditors, stakeholders, and external reviewers.",
      },
      {
        question: "Can I brand the platform with my foundation's identity?",
        answer:
          "Yes. Karma offers whitelabel deployment that lets you fully customize the portal with your logo, colors, domain name, and overall visual identity. Your grantees and reviewers interact with a seamlessly branded experience that reflects your organization at every touchpoint, while Karma handles all hosting, software updates, and infrastructure management behind the scenes.",
      },
      {
        question: "Is Karma suitable for large grant portfolios?",
        answer:
          "Yes. The platform is specifically designed for programs managing dozens to hundreds of active grants simultaneously without any performance degradation. Portfolio dashboards aggregate milestone progress, disbursement status, and reviewer feedback across your entire program in real time, ensuring you maintain full visibility and operational control regardless of how many grants you currently oversee.",
      },
      {
        question: "How does Karma handle data security in the cloud?",
        answer:
          "Karma uses industry-standard encryption for data in transit and at rest, combined with role-based access controls that limit who can view or modify specific grant information. Onchain attestations add a tamper-proof verification layer, ensuring that critical records remain independently verifiable even outside the platform, which strengthens security beyond what traditional database protections alone can offer.",
      },
    ],
    ctaText: "Launch your cloud-based grant program",
    ctaHref: "/foundations",
    idealFor: [
      "Foundations with distributed teams working across multiple offices or time zones",
      "Grant programs onboarding external reviewers who need quick, frictionless access",
      "Organizations replacing legacy desktop grant management tools",
      "Programs requiring 24/7 access to grant data without VPN or IT dependencies",
      "Funders managing international grantees who need reliable browser-based workflows",
      "Institutions prioritizing transparency through independently verifiable records",
    ],
    testimonial: {
      quote:
        "Switching to Karma eliminated the VPN headaches and version conflicts we dealt with for years. Our reviewers in three different countries now access the same real-time data, and onchain attestations give our board confidence that records have not been tampered with.",
      author: "Elena Vasquez",
      role: "Director of Grant Operations",
      organization: "Meridian Foundation",
    },
    secondaryCta: {
      text: "See how whitelabel deployment works",
      href: "/solutions/whitelabel-grant-management",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Create your grant program",
        description:
          "Set up your program parameters, evaluation criteria, and milestone templates in Karma's cloud dashboard. No installation or server provisioning needed.",
      },
      {
        title: "Invite reviewers and grantees",
        description:
          "Share a link to your branded portal. Reviewers and grantees sign up through the browser with role-based access automatically configured.",
      },
      {
        title: "Manage applications and reviews",
        description:
          "Receive applications, assign reviewers, and use AI-powered scoring assistance to evaluate proposals consistently from any device.",
      },
      {
        title: "Track milestones and generate reports",
        description:
          "Monitor grantee progress through real-time dashboards, verify milestone completions with onchain attestations, and export CIDS-aligned impact reports.",
      },
    ],
  },
  {
    slug: "automated-grant-management-software",
    title: "Automated Grant Management Software",
    metaDescription:
      "Automate grant workflows with Karma. AI-powered review, milestone tracking, and onchain attestations reduce manual work and improve accountability.",
    heading: "Automated Grant Management Software",
    tldr: "Automated grant management software eliminates repetitive manual tasks like application sorting, review assignment, and status reporting. Karma automates key steps in the grant lifecycle with AI-powered proposal review, structured milestone verification, and onchain attestations that create audit trails without extra administrative effort.",
    problem: {
      heading: "Manual Processes Drain Resources and Introduce Errors",
      description:
        "Grant programs that rely on manual workflows spend enormous amounts of staff time on tasks that do not require human judgment: copying data between spreadsheets, chasing grantees for status updates, formatting reports for board presentations, and reconciling disbursement records. Each manual handoff introduces the risk of transcription errors, missed deadlines, and inconsistent evaluation criteria. As programs scale, these inefficiencies compound, forcing teams to choose between thoroughness and speed.",
    },
    solution: {
      heading: "Intelligent Automation That Keeps Humans in Control",
      description:
        "Karma automates the administrative burden of grant management while keeping program officers in the decision seat. AI-powered review assists evaluators by surfacing key proposal details and suggesting consistency scores, but final decisions remain with your team. Milestone tracking automatically prompts grantees to submit evidence of completion and flags overdue deliverables. Every significant action is recorded as an onchain attestation, creating a tamper-proof audit trail without anyone needing to maintain a separate log. Portfolio dashboards aggregate data automatically, so reporting to stakeholders takes minutes instead of days. CIDS-aligned templates standardize impact reporting across your entire program.",
    },
    capabilities: [
      "AI-powered proposal review that highlights key details and flags inconsistencies for evaluators",
      "Automated milestone reminders that prompt grantees to submit progress evidence on schedule",
      "Onchain attestations that generate tamper-proof audit trails without manual record-keeping",
      "Portfolio dashboards with auto-aggregated metrics for instant stakeholder reporting",
      "Structured evaluation workflows that enforce consistent scoring criteria across all reviewers",
      "CIDS-aligned reporting templates that standardize impact measurement automatically",
    ],
    faqs: [
      {
        question: "Does automation mean the AI makes grant decisions?",
        answer:
          "No. Karma's AI assists reviewers by surfacing relevant information and flagging inconsistencies, but all funding decisions are made by your program team. Automation handles administrative tasks like deadline reminders, data aggregation, audit trail creation, and report formatting, freeing your staff to focus on the high-value judgment calls that require human expertise and institutional knowledge.",
      },
      {
        question: "How much time can automation save our grant program?",
        answer:
          "Programs typically reduce administrative overhead significantly by eliminating manual data entry, report compilation, and status chasing. The exact savings depend on your program size and current workflow complexity, but teams managing 50 or more active grants often reclaim several staff hours per week that can be redirected to higher-value activities like grantee support and strategic planning.",
      },
      {
        question: "Can I customize which parts of the workflow are automated?",
        answer:
          "Yes. Karma's automation is modular, so you can enable or disable individual features independently based on your needs. AI-assisted review, automated milestone tracking, onchain attestations, and notification rules can each be configured separately, allowing your team to adopt automation incrementally and at a pace that matches your organization's comfort level with each capability.",
      },
      {
        question: "What happens if an automated check flags something incorrectly?",
        answer:
          "All automated flags are surfaced as suggestions for human review rather than treated as final decisions. Program officers can override any automated assessment and adjust the underlying criteria as needed. The system incorporates these manual corrections over time to improve the relevance, accuracy, and contextual awareness of future suggestions, so false flags decrease with continued use.",
      },
      {
        question: "How does automated reporting work for stakeholder updates?",
        answer:
          "Karma continuously aggregates milestone progress, disbursement data, and reviewer activity into real-time portfolio dashboards. When you need a stakeholder report, the data is already compiled, current, and ready to share. You can export CIDS-aligned reports in minutes instead of spending days manually gathering information from spreadsheets, emails, and multiple disconnected data sources.",
      },
    ],
    ctaText: "Automate your grant workflows today",
    ctaHref: "/foundations",
    idealFor: [
      "Grant programs spending excessive staff time on repetitive administrative tasks",
      "Teams managing 50 or more active grants who need to scale without adding headcount",
      "Organizations seeking consistent evaluation processes across multiple reviewers",
      "Funders who want automatic audit trails without maintaining separate logs",
      "Programs preparing frequent stakeholder reports from aggregated portfolio data",
      "Foundations transitioning from spreadsheet-based workflows to structured automation",
    ],
    testimonial: {
      quote:
        "Before Karma, our team spent two full days every month compiling portfolio reports. Now the dashboards update automatically, and we export stakeholder-ready reports in minutes. We reclaimed nearly 30 hours per month across the grants team.",
      author: "James Okonkwo",
      role: "Grants Program Manager",
      organization: "Catalyst Ventures Fund",
    },
    secondaryCta: {
      text: "Learn how AI-powered review works",
      href: "/solutions/ai-grant-review",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Define your automation rules",
        description:
          "Configure which workflow steps to automate: milestone reminders, review assignments, notification triggers, and reporting schedules.",
      },
      {
        title: "Enable AI-assisted review",
        description:
          "Turn on AI-powered proposal analysis that extracts key details, flags inconsistencies, and suggests preliminary scores for your reviewers to confirm or adjust.",
      },
      {
        title: "Set up milestone automation",
        description:
          "Create milestone templates with deadlines and automated reminders. Grantees receive prompts to submit evidence, and overdue items are flagged automatically.",
      },
      {
        title: "Generate reports on demand",
        description:
          "Access auto-aggregated portfolio dashboards and export CIDS-aligned reports for stakeholders without manual data compilation.",
      },
    ],
  },
  {
    slug: "digital-grant-management-solution",
    title: "Digital Grant Management Solution",
    metaDescription:
      "Replace paper-based grant processes with Karma's digital solution. Milestone tracking, onchain records, and AI review in a single platform.",
    heading: "Digital Grant Management Solution",
    tldr: "A digital grant management solution replaces paper forms, email chains, and disconnected spreadsheets with a unified online platform. Karma provides a complete digital environment where applications, reviews, milestones, disbursements, and impact reports live in one place, backed by onchain attestations for trust and transparency.",
    problem: {
      heading: "Paper-Based and Fragmented Processes Undermine Grant Programs",
      description:
        "Many grant programs still rely on a patchwork of tools: PDF application forms submitted by email, review scores tracked in spreadsheets, milestone updates buried in inboxes, and financial records maintained in separate accounting software. This fragmentation means no single person has a complete picture of program health. Information gets lost between handoffs, grantees submit the same data multiple times in different formats, and leadership lacks the real-time visibility needed to make strategic decisions about fund allocation.",
    },
    solution: {
      heading: "One Digital Platform for the Entire Grant Lifecycle",
      description:
        "Karma replaces fragmented tools with a single digital solution that covers every stage of the grant lifecycle. Grantees submit applications through structured online forms, reviewers evaluate proposals using AI-assisted scoring, and program managers track progress through real-time dashboards. Milestone completion is verified through evidence submission and recorded as onchain attestations, creating a permanent digital record that replaces paper audit trails. Whitelabel options let you present a branded digital experience to your community, and CIDS-aligned reporting ensures your digital records meet international standards for development impact measurement.",
    },
    capabilities: [
      "Structured digital application forms that replace PDF and email-based submission workflows",
      "Centralized document management with all grant materials accessible in one platform",
      "AI-assisted review scoring that brings consistency to proposal evaluation across reviewers",
      "Milestone tracking with digital evidence submission and onchain verification records",
      "Real-time portfolio dashboards replacing manual report compilation",
      "Whitelabel portals for a branded digital experience under your foundation's identity",
      "CIDS-aligned digital reporting for standardized impact data across all grants",
    ],
    faqs: [
      {
        question: "How difficult is it to transition from paper-based processes to Karma?",
        answer:
          "Karma is designed for straightforward adoption with minimal disruption to your existing team and workflows. The platform uses familiar web interfaces that require no specialized training, and most teams complete onboarding within a few days. Existing grant data can be imported to maintain historical continuity, and grantees typically need nothing beyond a brief walkthrough of the digital submission process.",
      },
      {
        question: "Can grantees who are not technical use the platform?",
        answer:
          "Yes. The grantee-facing interface is designed to be intuitive and accessible to users of all technical backgrounds and experience levels. Submitting applications, uploading milestone evidence, and viewing reviewer feedback all work through simple web forms that are accessible from any modern browser on both desktop and mobile devices without requiring any technical knowledge.",
      },
      {
        question: "How does going digital improve accountability?",
        answer:
          "Every action in Karma is timestamped and, for key milestones, recorded as onchain attestations on a public blockchain. This creates an immutable audit trail that is far more reliable and tamper-resistant than paper records. Authorized stakeholders can access this information in real time rather than waiting for periodic reviews, manual report compilation, or scheduled audit cycles.",
      },
      {
        question: "What happens to our existing paper-based grant records?",
        answer:
          "You can import historical grant data into Karma to maintain full continuity with your existing program records and institutional knowledge. Once imported, past grants appear alongside active ones in your portfolio dashboard, giving you a unified digital view of your entire program history that supports both day-to-day management and long-term reporting and trend analysis.",
      },
      {
        question: "Can we run a branded digital portal for our grantees?",
        answer:
          "Yes. Karma's whitelabel deployment lets your foundation present a fully branded digital portal with your own logo, color scheme, custom domain name, and tailored navigation. Grantees and reviewers interact exclusively with your brand identity throughout their entire experience, while Karma handles all hosting, infrastructure, ongoing security updates, and software maintenance behind the scenes.",
      },
    ],
    ctaText: "Digitize your grant program",
    ctaHref: "/foundations",
    idealFor: [
      "Foundations transitioning from paper forms, PDFs, and email-based grant workflows",
      "Grant programs with grantees who need simple, non-technical submission interfaces",
      "Organizations consolidating multiple disconnected tools into a single platform",
      "Programs requiring permanent digital audit trails for compliance and accountability",
      "International development funders needing CIDS-aligned digital impact reporting",
      "Teams that want centralized document management for all grant materials",
    ],
    testimonial: {
      quote:
        "We went from chasing PDF forms through email threads to having every application, review, and milestone in one place. The transition took less than a week, and our grantees in rural areas had no trouble using the web forms.",
      author: "Priya Sharma",
      role: "Program Coordinator",
      organization: "Bridges for Impact",
    },
    secondaryCta: {
      text: "See the full grant lifecycle in action",
      href: "/solutions/grant-lifecycle-management-software",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Import or create your grant program",
        description:
          "Set up your program in Karma and optionally import existing grant records. Historical data integrates into your portfolio dashboard for a complete digital view.",
      },
      {
        title: "Design digital application forms",
        description:
          "Replace PDF forms with structured online applications. Configure required fields, file uploads, and validation rules tailored to your program's needs.",
      },
      {
        title: "Onboard grantees and reviewers",
        description:
          "Invite participants through simple web links. Grantees submit applications and milestone evidence online, while reviewers access AI-assisted evaluation tools.",
      },
      {
        title: "Monitor progress and report digitally",
        description:
          "Track all grants through real-time dashboards, verify milestones with onchain attestations, and generate CIDS-aligned impact reports from your centralized data.",
      },
    ],
  },
  {
    slug: "online-grant-management-system",
    title: "Online Grant Management System",
    metaDescription:
      "Run your entire grant program online with Karma. Manage applications to impact reports through a browser with onchain transparency built in.",
    heading: "Online Grant Management System",
    tldr: "An online grant management system lets distributed teams run every aspect of a grant program through the web. Karma provides a fully online system where funders, reviewers, and grantees collaborate in real time with milestone tracking, AI-powered review, and onchain attestations ensuring transparency at every step.",
    problem: {
      heading: "Distributed Teams Cannot Effectively Manage Grants Through Email and Spreadsheets",
      description:
        "Modern grant programs often involve teams spread across multiple time zones, external reviewers who work part-time, and grantees in dozens of countries. Trying to coordinate this distributed workflow through email threads, shared drives, and offline spreadsheets leads to constant communication breakdowns. Reviewers work from outdated versions of evaluation rubrics, program managers cannot see real-time status across the portfolio, and grantees lack a single place to check their obligations and deadlines. The result is delayed disbursements, missed milestones, and frustrated stakeholders.",
    },
    solution: {
      heading: "A Fully Online System Where Everyone Stays in Sync",
      description:
        "Karma gives every participant in your grant program a single online destination. Grantees submit applications and milestone updates, reviewers access proposals and record evaluations, and program managers monitor the entire portfolio through dashboards, all from any web browser. AI-powered review tools help evaluators work faster without sacrificing thoroughness. Onchain attestations record key decisions and milestone completions as verifiable public records, so trust does not depend on a single institution's database. The system is always online, always current, and accessible to authorized users regardless of location or time zone.",
    },
    capabilities: [
      "Fully browser-based workflows for funders, reviewers, and grantees with no downloads required",
      "Real-time collaboration so distributed teams always work from the latest data",
      "AI-powered review tools that help evaluators assess proposals faster and more consistently",
      "Onchain attestations creating verifiable records accessible to all authorized stakeholders",
      "Milestone tracking with deadline visibility and automated progress notifications",
      "Portfolio dashboards aggregating status across all active grants in real time",
    ],
    faqs: [
      {
        question: "Can external reviewers access the system without a full account?",
        answer:
          "Reviewers can be onboarded with specific roles that limit their access to only the proposals they are assigned to evaluate. The invitation process is straightforward and requires only a web browser with no software installation, lengthy registration forms, or IT provisioning steps. Reviewers can begin evaluating proposals within minutes of receiving their invitation link.",
      },
      {
        question: "How does the system handle different time zones?",
        answer:
          "All deadlines and timestamps are clearly displayed with appropriate timezone context, and notifications are delivered through the platform regardless of location. Because everything runs online in real time, team members in any time zone can pick up exactly where others left off without waiting for file transfers, email replies, or manual synchronization of offline spreadsheets.",
      },
      {
        question: "Is the system available 24/7?",
        answer:
          "Yes. Karma is a cloud-hosted platform engineered for continuous availability around the clock, every day of the year without scheduled downtime. Grantees can submit progress updates, reviewers can complete evaluations, and program managers can check portfolio status at any time without needing to schedule around system maintenance windows, office hours, or regional availability constraints.",
      },
      {
        question: "What internet bandwidth is required?",
        answer:
          "Karma is a lightweight web application that performs well on standard broadband connections and does not require high bandwidth or specialized hardware to operate effectively. This makes the platform accessible to grantees and reviewers in regions with moderate internet infrastructure, ensuring that connectivity limitations do not create barriers to participation in your grant program.",
      },
      {
        question: "How do you ensure data consistency when multiple users work simultaneously?",
        answer:
          "Karma handles concurrent access through real-time data synchronization, so changes made by one user are immediately visible to others working in the same program. Milestone approvals and review submissions are recorded as onchain attestations with authoritative timestamps, which prevents conflicting updates, duplicate actions, or data inconsistencies across distributed teams working in different locations.",
      },
    ],
    ctaText: "Put your grant program online",
    ctaHref: "/foundations",
    idealFor: [
      "Distributed teams coordinating grant programs across multiple time zones",
      "Programs with external part-time reviewers who need lightweight browser access",
      "International funders managing grantees in dozens of countries",
      "Organizations replacing email and shared-drive workflows with a centralized system",
      "Programs needing always-available access without IT infrastructure management",
      "Teams that require real-time portfolio visibility across all active grants",
    ],
    testimonial: {
      quote:
        "Our reviewers are spread across four continents and used to email spreadsheets back and forth. With Karma, everyone logs into the same system, sees the same data, and our turnaround on evaluations dropped from three weeks to five days.",
      author: "Marcus Lindgren",
      role: "Head of Grants",
      organization: "Nordic Impact Alliance",
    },
    secondaryCta: {
      text: "Explore cloud-based deployment options",
      href: "/solutions/cloud-grant-management-software",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Set up your online grant portal",
        description:
          "Configure your program in Karma with custom evaluation criteria, milestone templates, and branding. Your portal is live and accessible from any browser within minutes.",
      },
      {
        title: "Onboard distributed participants",
        description:
          "Invite reviewers, grantees, and team members via email links. Each participant gets role-based access appropriate to their responsibilities without any software installation.",
      },
      {
        title: "Run applications and reviews online",
        description:
          "Grantees submit applications through structured web forms. Reviewers evaluate proposals with AI assistance, and all scores and feedback are captured in the system in real time.",
      },
      {
        title: "Monitor and report from anywhere",
        description:
          "Track milestone progress, verify completions with onchain attestations, and generate portfolio reports from any device at any time, regardless of your location or time zone.",
      },
    ],
  },
  {
    slug: "grant-lifecycle-management-software",
    title: "Grant Lifecycle Management Software",
    metaDescription:
      "Manage every grant lifecycle stage with Karma. From intake to impact reporting, track progress with milestones and onchain attestations.",
    heading: "Full Lifecycle Grant Management Software",
    tldr: "Grant lifecycle management software covers every stage from application intake through final impact reporting. Karma provides end-to-end lifecycle coverage with structured milestones, AI-assisted review, onchain attestations at each phase transition, and portfolio dashboards that give funders a complete view of their program from start to finish.",
    problem: {
      heading: "Disconnected Tools for Different Grant Phases Create Gaps in Oversight",
      description:
        "Most grant programs use one tool for applications, another for financial tracking, a spreadsheet for milestone monitoring, and yet another for final reporting. Each phase transition is a potential point of failure where data is lost, context is dropped, or accountability breaks down. When a program officer needs to understand the full history of a grant, from the original proposal through every milestone to the final impact report, they must piece together information from multiple systems. This fragmentation makes it nearly impossible to learn from past grants or demonstrate cumulative impact to stakeholders.",
    },
    solution: {
      heading: "One Platform That Spans the Entire Grant Lifecycle",
      description:
        "Karma is designed around the grant lifecycle as a continuous process rather than a series of disconnected phases. Applications flow into structured project profiles. Approved grants transition into milestone-tracked active projects where grantees submit evidence of progress. AI-powered review assists evaluators at the intake stage, and the same structured evaluation framework carries through to milestone verification. Every phase transition is recorded as an onchain attestation, creating a verifiable chain of custody from first application to final impact report. CIDS-aligned reporting templates ensure that impact data is captured consistently across the entire lifecycle and across all grants in your portfolio.",
    },
    capabilities: [
      "End-to-end coverage from application intake through milestones to final impact reporting",
      "Structured milestone tracking with evidence-based verification at each lifecycle stage",
      "AI-assisted evaluation that maintains consistent criteria across intake and progress reviews",
      "Onchain attestations recording every major phase transition for verifiable grant history",
      "Portfolio dashboards showing lifecycle stage distribution across all active grants",
      "CIDS-aligned reporting that captures standardized impact data throughout the grant lifecycle",
      "Historical grant data that helps program officers learn from past funding decisions",
    ],
    faqs: [
      {
        question: "What stages of the grant lifecycle does Karma cover?",
        answer:
          "Karma covers application submission and intake, proposal review and evaluation, funding decisions, milestone definition and tracking, progress reporting, impact measurement, and final closeout reporting. Each stage is connected within a single platform so data flows continuously without manual re-entry, giving you a complete and auditable record from the first application to the final outcome report.",
      },
      {
        question: "Can I customize the lifecycle stages for my program?",
        answer:
          "Yes. While Karma provides a standard lifecycle framework out of the box, you can configure milestone structures, review criteria, reporting requirements, and phase transition rules to match your program's specific process. This flexibility ensures the platform adapts to how your team actually works rather than imposing a rigid structure that does not fit your needs.",
      },
      {
        question: "How does lifecycle tracking improve grant outcomes?",
        answer:
          "By maintaining a continuous record from application through to final impact, program officers can identify meaningful patterns across their portfolio. They can see which types of projects consistently hit milestones, where delays typically occur, and what proposal characteristics correlate with successful outcomes. These data-driven insights directly improve future funding decisions, program design, and grantee support strategies.",
      },
      {
        question: "Can I view the complete history of any individual grant?",
        answer:
          "Yes. Every grant in Karma has a full timeline showing its journey from initial application through each milestone, review decision, and phase transition to final closeout. Onchain attestations anchor key events to independently verifiable timestamps, so you can trace the entire history of any grant with complete confidence in the accuracy and integrity of the record.",
      },
      {
        question: "How does Karma handle grants that span multiple funding rounds?",
        answer:
          "Karma fully supports continuation grants and multi-phase funding by linking related grant records across successive funding rounds. Program officers can view the cumulative history of a grantee's work over time, track how outcomes from earlier phases informed subsequent funding decisions, and generate comprehensive reports that span the full duration of long-running, multi-round initiatives.",
      },
    ],
    ctaText: "Manage your full grant lifecycle",
    ctaHref: "/foundations",
    idealFor: [
      "Foundations needing end-to-end visibility from application intake to final impact reporting",
      "Programs using separate tools for different grant phases and losing data between handoffs",
      "Organizations that want to learn from historical grant data to improve future funding decisions",
      "Funders managing multi-phase or continuation grants across multiple funding rounds",
      "Teams requiring verifiable phase transition records for audits and compliance",
      "Programs with complex milestone structures that evolve through the grant lifecycle",
    ],
    testimonial: {
      quote:
        "We used to lose critical context every time a grant moved from intake to active management. Karma keeps the entire history in one place, and the onchain attestations at each phase transition give our auditors exactly what they need without us compiling anything manually.",
      author: "Rachel Nguyen",
      role: "VP of Grants Administration",
      organization: "Horizon Development Trust",
    },
    secondaryCta: {
      text: "Learn about milestone tracking",
      href: "/solutions/grant-tracking-software",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Define your lifecycle stages",
        description:
          "Configure the phases of your grant program in Karma, from application intake through milestones to final reporting. Customize review criteria and transition rules for each stage.",
      },
      {
        title: "Receive and evaluate applications",
        description:
          "Grantees submit proposals through structured forms. AI-assisted review helps evaluators assess applications consistently, and all decisions are recorded as onchain attestations.",
      },
      {
        title: "Track milestones through active grants",
        description:
          "Approved grants transition into milestone tracking with structured deliverables. Grantees submit evidence, reviewers verify progress, and each completion is attested onchain.",
      },
      {
        title: "Measure impact and close out",
        description:
          "Capture final impact data using CIDS-aligned templates, generate lifecycle reports, and archive the complete grant history for institutional learning and future program design.",
      },
    ],
  },
  {
    slug: "grant-tracking-software",
    title: "Grant Tracking Software",
    metaDescription:
      "Track every grant in your portfolio with Karma. Milestone progress, disbursements, and grantee activity in real-time dashboards with onchain records.",
    heading: "Grant Tracking Software",
    tldr: "Grant tracking software gives funders real-time visibility into where every dollar goes and whether grantees are delivering on their commitments. Karma provides milestone-level tracking, portfolio dashboards, and onchain attestations so you always know the status of your grants without chasing updates through email.",
    problem: {
      heading: "Funders Lack Real-Time Visibility Into Grant Progress",
      description:
        "Without dedicated tracking software, program officers rely on periodic email updates from grantees to understand project status. These updates arrive in inconsistent formats, on unpredictable schedules, and with varying levels of detail. When board members or stakeholders ask about the overall health of a grant portfolio, staff scramble to compile data from multiple sources. By the time a report is assembled, the information is already outdated. Worst of all, struggling projects often go unnoticed until it is too late to intervene, because there is no system flagging missed milestones or delayed deliverables.",
    },
    solution: {
      heading: "Real-Time Grant Tracking With Verifiable Milestone Records",
      description:
        "Karma replaces ad hoc status updates with structured milestone tracking. Each grant is broken into specific deliverables with deadlines, and grantees submit evidence of completion through the platform. Program managers see progress across the entire portfolio through real-time dashboards that highlight on-track, at-risk, and overdue grants at a glance. Every milestone completion is recorded as an onchain attestation, providing an independent verification layer that does not depend on self-reporting alone. AI-powered review tools help evaluators assess milestone evidence efficiently, and CIDS-aligned reporting templates ensure tracking data can be aggregated into standardized impact reports.",
    },
    capabilities: [
      "Milestone-level progress tracking with evidence submission for each deliverable",
      "Portfolio dashboards showing on-track, at-risk, and overdue grants at a glance",
      "Onchain attestations for independently verifiable milestone completion records",
      "Automated notifications when milestones are approaching or overdue",
      "AI-assisted milestone evidence review for faster and more consistent evaluation",
      "CIDS-aligned data capture for standardized tracking across your grant portfolio",
    ],
    faqs: [
      {
        question: "How does Karma track milestone progress?",
        answer:
          "Each grant is structured into milestones with clearly defined deliverables and deadlines. Grantees submit evidence such as reports, links, or documents when they complete a milestone. Program managers then review and approve these completions, and each approval is permanently recorded as an onchain attestation that serves as independently verifiable documentation of the deliverable's completion.",
      },
      {
        question: "Can I see the status of all my grants in one view?",
        answer:
          "Yes. Karma's portfolio dashboard provides a consolidated view of all active grants, showing milestone progress, disbursement status, and overall program health at a glance. You can filter the view by grant status, grant type, time period, or custom tags to quickly locate specific information and identify grants that need attention or intervention.",
      },
      {
        question: "What happens when a grantee misses a milestone deadline?",
        answer:
          "The platform flags overdue milestones prominently in the portfolio dashboard and can send automated notifications to both the grantee and the responsible program manager. This early warning system helps your team identify emerging issues quickly and intervene proactively before small delays compound into major problems that could jeopardize overall project outcomes and deliverables.",
      },
      {
        question: "How are the onchain tracking records different from a regular database?",
        answer:
          "Onchain attestations are recorded on a public blockchain, which means they cannot be altered, backdated, or deleted after the fact by anyone. This provides an independent verification layer that stakeholders, external auditors, and the public can check without needing to rely on Karma's internal database alone, adding credibility and tamper-resistance to your tracking records.",
      },
      {
        question: "Can I track both financial disbursements and project deliverables together?",
        answer:
          "Yes. Karma links milestone completion directly to disbursement eligibility, so you can see exactly how fund releases align with actual project progress. Portfolio dashboards display both financial allocation and deliverable status side by side, making it straightforward to verify that payments correspond to verified work and that no disbursements have been made prematurely.",
      },
    ],
    ctaText: "Start tracking your grants",
    ctaHref: "/foundations",
    idealFor: [
      "Program officers who need real-time visibility into grant portfolio health",
      "Funders managing milestone-based disbursements tied to verified deliverables",
      "Organizations replacing email-based status updates with structured tracking",
      "Teams that need early warning systems for at-risk or overdue grants",
      "Boards and stakeholders requiring up-to-date portfolio reports on demand",
      "Programs with complex multi-milestone grants requiring granular progress monitoring",
    ],
    testimonial: {
      quote:
        "We used to find out about stalled projects months after deadlines passed. Karma's dashboard flags overdue milestones immediately, and the onchain records mean we can show our board exactly when each deliverable was verified. Our intervention rate on at-risk grants improved dramatically.",
      author: "David Osei-Mensah",
      role: "Senior Program Officer",
      organization: "West Africa Grants Collective",
    },
    secondaryCta: {
      text: "See how disbursement tracking works",
      href: "/solutions/grant-disbursement-software",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Structure grants into milestones",
        description:
          "Break each funded grant into specific deliverables with deadlines. Define what evidence grantees must submit to demonstrate completion of each milestone.",
      },
      {
        title: "Collect milestone evidence",
        description:
          "Grantees submit reports, documents, or links through Karma when they complete deliverables. Automated reminders ensure submissions stay on schedule.",
      },
      {
        title: "Review and verify completions",
        description:
          "Program managers evaluate submitted evidence with AI-assisted review tools. Approved milestones are recorded as onchain attestations for permanent verification.",
      },
      {
        title: "Monitor portfolio health in real time",
        description:
          "Use portfolio dashboards to see on-track, at-risk, and overdue grants at a glance. Generate CIDS-aligned reports and share tracking data with stakeholders instantly.",
      },
    ],
  },
  {
    slug: "grant-management-platform",
    title: "Complete Grant Management Platform",
    metaDescription:
      "Karma is a complete grant management platform with AI review, milestone tracking, dashboards, onchain attestations, and whitelabel deployment.",
    heading: "Complete Grant Management Platform",
    tldr: "A grant management platform brings together every tool a funder needs into a single unified environment. Karma is a complete platform combining application management, AI-powered review, milestone tracking, disbursement oversight, portfolio analytics, onchain attestations, whitelabel deployment, and CIDS-aligned impact reporting.",
    problem: {
      heading: "Cobbling Together Point Solutions Creates Complexity Without Solving Core Problems",
      description:
        "Many grant programs assemble their technology stack from a collection of point solutions: a form builder for applications, a project management tool for tracking, an accounting system for disbursements, and a business intelligence tool for reporting. Each tool solves one problem but creates integration challenges. Data must be manually transferred between systems, staff need training on multiple platforms, and the total cost of ownership exceeds what a purpose-built solution would require. Despite all this investment, the fundamental problem remains: no single system provides a complete, trustworthy record of the grant program.",
    },
    solution: {
      heading: "A Purpose-Built Platform That Replaces Your Entire Grant Tool Stack",
      description:
        "Karma is not a point solution adapted for grants; it is a platform built specifically for grant management from the ground up. Applications, reviews, milestones, disbursements, and impact reports all live in one system. AI-powered review assists evaluators without replacing their judgment. Onchain attestations provide a trust layer that no amount of database security can replicate, because the records exist independently on a public blockchain. Portfolio dashboards give leadership instant visibility without waiting for manual report compilation. Whitelabel deployment lets foundations present their own brand while leveraging a battle-tested infrastructure. And CIDS-aligned reporting ensures your platform produces data that meets the standards expected by international development stakeholders.",
    },
    capabilities: [
      "Unified application intake, review, and approval workflows in a single platform",
      "AI-powered proposal evaluation with configurable scoring criteria and consistency checks",
      "Milestone tracking with structured deliverables, evidence submission, and verification",
      "Portfolio dashboards providing real-time analytics across all grants and programs",
      "Onchain attestations creating an immutable, publicly verifiable record of grant activity",
      "Whitelabel deployment with custom branding, domain, and portal configuration",
      "CIDS-aligned impact reporting for standardized measurement across your entire portfolio",
    ],
    faqs: [
      {
        question: "Can Karma replace all the separate tools we currently use for grant management?",
        answer:
          "For most grant programs, yes. Karma covers application intake, review and evaluation, milestone tracking, progress reporting, and impact measurement in a single unified platform. Programs with specialized accounting or compliance requirements may still use dedicated financial systems alongside Karma for those specific functions, but the core grant management workflow from application to impact is fully covered.",
      },
      {
        question: "How does the whitelabel option work?",
        answer:
          "Whitelabel deployment lets you run a grant portal under your own brand, including your logo, color scheme, typography, and custom domain. The portal runs entirely on Karma's infrastructure, so your team gets the full platform's functionality without needing to manage servers, apply software updates, or handle security patches. Your grantees see only your brand throughout their entire experience.",
      },
      {
        question:
          "What makes this different from general project management tools adapted for grants?",
        answer:
          "Karma is built specifically for the grant use case from the ground up rather than adapted from another domain. Features like onchain attestations for verifiable trust, AI-powered proposal review, CIDS-aligned impact reporting, and milestone-based fund disbursement tracking are purpose-built for grant management workflows rather than retrofitted from generic project management or CRM concepts.",
      },
      {
        question: "How does Karma handle multiple grant programs within one organization?",
        answer:
          "Program managers can create and manage multiple distinct grant programs within a single Karma account. Each program can have its own review criteria, milestone structures, branding, and reporting templates, while portfolio dashboards aggregate data across all programs simultaneously for organizational-level visibility, cross-program comparison, and consolidated reporting to leadership and board members.",
      },
      {
        question: "Is Karma suitable for both small and large grant programs?",
        answer:
          "Yes. The platform scales smoothly from programs managing a handful of grants to those overseeing hundreds of active projects across multiple funding rounds. The same core features, including AI-powered review, milestone tracking, and onchain attestations, work effectively at any scale, and portfolio dashboards become increasingly valuable as your program size and complexity grow.",
      },
    ],
    ctaText: "Explore the complete platform",
    ctaHref: "/foundations",
    idealFor: [
      "Foundations looking to consolidate multiple point solutions into one grant management platform",
      "Organizations that need whitelabel deployment with their own branding and domain",
      "Programs requiring a unified system for applications, reviews, milestones, and impact reporting",
      "Funders seeking onchain attestations as an independent trust and verification layer",
      "Teams managing multiple grant programs that need organizational-level portfolio analytics",
      "International development organizations requiring CIDS-aligned standardized reporting",
    ],
    testimonial: {
      quote:
        "We replaced four separate tools with Karma and cut our annual software costs by 40 percent. More importantly, we finally have one place where our board can see the full picture: applications, milestones, disbursements, and impact data all in a single dashboard.",
      author: "Catherine Abramov",
      role: "Chief Operating Officer",
      organization: "Global Grants Initiative",
    },
    secondaryCta: {
      text: "Request a whitelabel demo",
      href: "/solutions/whitelabel-grant-management",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Configure your platform",
        description:
          "Set up your grant programs with custom evaluation criteria, milestone templates, and branding. Optionally enable whitelabel deployment for a fully branded portal.",
      },
      {
        title: "Launch applications and reviews",
        description:
          "Open application intake, assign reviewers, and use AI-powered evaluation tools to assess proposals with consistent criteria across your entire team.",
      },
      {
        title: "Track milestones and disbursements",
        description:
          "Monitor grantee progress through structured milestone tracking. Verify deliverables, link approvals to disbursement eligibility, and record everything onchain.",
      },
      {
        title: "Analyze portfolio and report impact",
        description:
          "Use real-time portfolio dashboards to monitor program health. Export CIDS-aligned impact reports and share organizational-level analytics with stakeholders and board members.",
      },
    ],
  },
  {
    slug: "grant-disbursement-software",
    title: "Grant Disbursement & Payment Software",
    metaDescription:
      "Manage grant disbursements with Karma. Tie payments to verified milestones, track fund allocation, and record every disbursement onchain.",
    heading: "Grant Disbursement and Payment Software",
    tldr: "Grant disbursement software helps funders manage when and how funds are released to grantees. Karma ties disbursements to verified milestone completions, records every payment event as an onchain attestation, and provides portfolio-level dashboards showing fund allocation across your entire grant program.",
    problem: {
      heading: "Disconnected Disbursement Processes Lead to Accountability Gaps",
      description:
        "In many grant programs, disbursement decisions happen outside the system that tracks project progress. A program officer checks a spreadsheet, confirms a milestone was met based on an email update, then requests payment through a separate financial system. This disconnection means there is no verifiable link between milestone completion and fund release. When auditors or stakeholders ask why a particular payment was made, reconstructing the justification requires digging through emails, meeting notes, and multiple databases. Overpayments, premature releases, and undocumented advances are common consequences of this fragmented approach.",
    },
    solution: {
      heading: "Milestone-Linked Disbursements With Onchain Payment Records",
      description:
        "Karma connects disbursement decisions directly to verified milestone completions. When a grantee submits evidence that a deliverable is complete and a reviewer approves it, the milestone status updates automatically and the platform can flag the grant as eligible for the next tranche of funding. Every disbursement event is recorded as an onchain attestation, creating an immutable record that links the payment to the specific milestone it was released for. Portfolio dashboards show fund allocation across all active grants, making it straightforward to see how much has been disbursed, how much remains, and whether payments align with actual progress. CIDS-aligned reporting ensures disbursement data feeds into standardized impact reports.",
    },
    capabilities: [
      "Milestone-linked disbursement tracking that ties payments to verified deliverable completion",
      "Onchain attestations recording every disbursement event with linked milestone evidence",
      "Portfolio-level fund allocation dashboards showing disbursed versus remaining amounts",
      "Automated eligibility flagging when milestones are verified and grants qualify for next payment",
      "AI-assisted milestone review to help evaluators verify deliverables before disbursement approval",
      "CIDS-aligned financial reporting that standardizes disbursement data across your program",
    ],
    faqs: [
      {
        question: "Does Karma process the actual payments?",
        answer:
          "Karma tracks disbursement decisions and records them as onchain attestations, but the actual fund transfer is handled through your existing payment infrastructure and banking systems. The platform provides verified milestone data, reviewer approvals, and complete justification records that your finance team uses to release funds through whichever payment channels your organization already has in place.",
      },
      {
        question: "How does milestone-linked disbursement reduce risk?",
        answer:
          "By requiring verified milestone completion before flagging a grant as eligible for payment, you ensure funds are only released when there is documented and reviewed evidence of actual progress. This significantly reduces the risk of paying for incomplete work and creates a clear, auditable trail that directly links every payment to specific verified deliverables and the reviewer approvals that authorized them.",
      },
      {
        question: "Can I set different disbursement schedules for different grants?",
        answer:
          "Yes. Each grant can have its own unique milestone structure and corresponding disbursement schedule tailored to the project's needs. Some grants might release funds quarterly after scheduled progress reviews, while others tie each individual payment to a specific deliverable. Karma's flexible milestone framework supports both approaches as well as hybrid disbursement models.",
      },
      {
        question: "How do stakeholders verify that disbursements were justified?",
        answer:
          "Each disbursement is recorded as an onchain attestation that is permanently linked to the specific milestone evidence and reviewer approval that triggered it. Auditors and external stakeholders can independently verify these records directly on the blockchain without needing access to Karma's internal database, providing a credible and tamper-proof external source of truth for every payment made.",
      },
      {
        question: "Can I track total fund allocation across my entire grant portfolio?",
        answer:
          "Yes. Karma's portfolio dashboards display comprehensive fund allocation data across all active grants, including total amounts disbursed, amounts remaining, and upcoming payment obligations tied to pending milestones. This gives program managers and finance teams a clear, real-time picture of cash flow that helps prevent over-commitment of available funds and supports accurate financial planning.",
      },
    ],
    ctaText: "Manage your grant disbursements",
    ctaHref: "/foundations",
    idealFor: [
      "Funders tying disbursements to verified milestone completions for accountability",
      "Finance teams needing clear audit trails linking payments to specific deliverables",
      "Programs managing complex multi-tranche funding schedules across many grants",
      "Organizations requiring onchain records of disbursement decisions for external verification",
      "Grant managers who need portfolio-level visibility into fund allocation and cash flow",
      "Institutions preparing for audits that demand verifiable payment justification records",
    ],
    testimonial: {
      quote:
        "Before Karma, reconciling disbursements with project milestones took our finance team an entire week each quarter. Now every payment links directly to a verified milestone with an onchain record, and our auditors can verify everything independently without requesting internal documents.",
      author: "Thomas Eriksen",
      role: "Finance Director",
      organization: "Steward Capital Foundation",
    },
    secondaryCta: {
      text: "Learn about milestone-based tracking",
      href: "/solutions/grant-tracking-software",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Define milestone-linked payment schedules",
        description:
          "Set up each grant with a milestone structure that maps specific deliverables to disbursement tranches. Configure payment eligibility rules and approval workflows.",
      },
      {
        title: "Verify milestone completions",
        description:
          "Grantees submit evidence when deliverables are complete. Reviewers assess submissions with AI assistance, and approved milestones are recorded as onchain attestations.",
      },
      {
        title: "Flag grants for disbursement",
        description:
          "When milestones are verified, Karma automatically flags the grant as eligible for the next payment. Your finance team receives the approval records needed to release funds.",
      },
      {
        title: "Monitor fund allocation across the portfolio",
        description:
          "Track disbursed amounts, remaining balances, and upcoming payment obligations across all grants through portfolio dashboards. Export CIDS-aligned financial reports for stakeholders.",
      },
    ],
  },
  {
    slug: "grant-review-software",
    title: "Grant Review & Evaluation Software",
    metaDescription:
      "Streamline grant reviews with Karma's AI-powered evaluation tools. Consistent scoring, structured rubrics, and onchain records for faster reviews.",
    heading: "Grant Review and Evaluation Software",
    tldr: "Grant review and evaluation software helps funders assess proposals consistently, efficiently, and transparently. Karma provides AI-powered review assistance, structured evaluation rubrics, reviewer assignment workflows, and onchain attestations that create a verifiable record of every evaluation decision.",
    problem: {
      heading: "Inconsistent Reviews Undermine Trust in Funding Decisions",
      description:
        "Grant review is one of the most critical and most error-prone parts of the funding process. Reviewers bring different backgrounds, read proposals at different levels of depth, and apply criteria inconsistently. When multiple reviewers evaluate the same proposal, their scores can vary wildly based on interpretation rather than substance. Without structured evaluation tools, bias creeps in, strong proposals get overlooked, and weaker ones advance because they were better formatted. After decisions are made, it is difficult to explain or defend the reasoning to unsuccessful applicants or to stakeholders questioning how funds were allocated.",
    },
    solution: {
      heading: "AI-Assisted Review With Structured Rubrics and Verifiable Records",
      description:
        "Karma brings structure and intelligence to the review process. AI-powered review tools analyze proposals and surface key information, flag potential issues, and suggest preliminary scores based on your configured criteria. Human reviewers then make final assessments using structured rubrics that ensure every proposal is evaluated on the same dimensions. The platform manages reviewer assignment so evaluators only see the proposals assigned to them and conflicts of interest can be managed. Every evaluation is recorded as an onchain attestation, creating a permanent, verifiable record of who reviewed what, what scores were given, and what feedback was provided. This transparency makes it possible to audit the review process and demonstrate fairness to all stakeholders.",
    },
    capabilities: [
      "AI-powered proposal analysis that surfaces key information and flags potential issues for reviewers",
      "Structured evaluation rubrics with configurable scoring criteria for consistent assessment",
      "Reviewer assignment and management with role-based access to proposals",
      "Onchain attestations recording every evaluation decision for transparent, auditable review history",
      "Aggregated reviewer feedback and scoring summaries for efficient decision-making",
      "Portfolio-level review analytics showing evaluation throughput, score distributions, and reviewer activity",
    ],
    faqs: [
      {
        question: "How does AI assist the review process without replacing human judgment?",
        answer:
          "Karma's AI analyzes proposal content to extract key details, check for completeness, and suggest preliminary scores based on your configured evaluation criteria. Reviewers use this analysis as a helpful starting point but retain full authority to make all final scoring decisions themselves. The AI helps your review team work faster and more consistently across large application pools without making any independent funding decisions.",
      },
      {
        question: "Can I configure my own evaluation criteria?",
        answer:
          "Yes. You define the rubric dimensions, scoring scales, weighting, and descriptors for each criterion in your program. Every reviewer sees and applies the same criteria, which is essential for consistent evaluation across your team. You can also update and refine these criteria between funding rounds as your program evolves, your priorities shift, or you incorporate lessons learned.",
      },
      {
        question: "How does Karma help manage reviewer conflicts of interest?",
        answer:
          "Program managers have full control over which proposals are assigned to which reviewers, allowing you to ensure that evaluators never review proposals from organizations they are personally or professionally affiliated with. All assignment records and any conflict declarations are maintained as part of the evaluation audit trail, so conflict of interest management decisions are fully documented and verifiable.",
      },
      {
        question: "Can applicants see reviewer feedback?",
        answer:
          "This is fully configurable based on your program's policies and preferences. You can choose to share anonymized reviewer feedback with applicants, share only aggregate scores without detailed comments, or keep all review details entirely internal. Many programs find that sharing constructive feedback significantly improves the quality and competitiveness of future applications from returning applicants.",
      },
      {
        question: "How do onchain records improve review transparency?",
        answer:
          "By recording evaluations as onchain attestations, Karma creates a permanent record that cannot be altered or backdated after the fact by anyone. This allows stakeholders and auditors to independently verify that reviews were conducted on time, that scores were recorded at specific timestamps, and that final funding decisions followed directly from the documented evaluation process rather than undisclosed factors.",
      },
    ],
    ctaText: "Improve your grant review process",
    ctaHref: "/foundations",
    idealFor: [
      "Foundations seeking consistent, unbiased evaluation processes across multiple reviewers",
      "Programs with external review panels that need structured rubrics and role-based access",
      "Organizations requiring auditable, verifiable records of every evaluation decision",
      "Grant programs receiving high application volumes that need AI-assisted triage and scoring",
      "Funders who want to provide constructive feedback to applicants after review cycles",
      "Teams looking to reduce review cycle time without sacrificing evaluation thoroughness",
    ],
    testimonial: {
      quote:
        "Our review consistency scores improved by over 35 percent after adopting Karma. The AI surfaces exactly what reviewers need to see, the rubrics keep everyone on the same criteria, and the onchain records mean we can defend every funding decision with a verifiable audit trail.",
      author: "Dr. Amina Khalil",
      role: "Head of Research Grants",
      organization: "Eurasia Science Foundation",
    },
    secondaryCta: {
      text: "See how automation speeds up workflows",
      href: "/solutions/automated-grant-management-software",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Define evaluation rubrics",
        description:
          "Set up structured scoring criteria with dimensions, scales, and weighting tailored to your program. All reviewers will use the same rubric for consistent evaluation.",
      },
      {
        title: "Assign proposals to reviewers",
        description:
          "Distribute proposals to qualified reviewers with role-based access controls. Manage conflicts of interest by controlling which proposals each reviewer can see.",
      },
      {
        title: "Evaluate with AI assistance",
        description:
          "Reviewers assess proposals using AI-powered tools that extract key details and suggest preliminary scores. Final decisions remain with your human evaluators.",
      },
      {
        title: "Record decisions and share results",
        description:
          "All evaluations are recorded as onchain attestations. Aggregate scores into funding decisions, optionally share feedback with applicants, and generate review analytics.",
      },
    ],
  },
  {
    slug: "grant-monitoring-evaluation-software",
    title: "Grant Monitoring & Evaluation Software",
    metaDescription:
      "Monitor grant outcomes and evaluate impact with Karma. CIDS-aligned reporting, milestone tracking, and onchain attestations for evidence-based programs.",
    heading: "Grant Monitoring and Evaluation Software",
    tldr: "Grant monitoring and evaluation (M&E) software helps funders track whether grants are achieving their intended outcomes and measure long-term impact. Karma provides structured milestone monitoring, CIDS-aligned evaluation frameworks, onchain attestations for evidence integrity, and portfolio dashboards that aggregate outcome data across your entire program.",
    problem: {
      heading: "Most Grant Programs Cannot Demonstrate Whether Their Funding Creates Impact",
      description:
        "Monitoring and evaluation is often treated as an afterthought in grant management. Programs collect output data, like the number of events held or reports published, but struggle to measure whether those outputs translate into real outcomes. M&E frameworks are defined in proposal documents but rarely enforced consistently during implementation. Grantees submit final reports with self-assessed impact claims that cannot be independently verified. When funders try to aggregate impact data across their portfolio, they find that every grantee has reported in a different format with different indicators. The result is that funders cannot credibly answer the question their stakeholders care most about: is our money making a difference?",
    },
    solution: {
      heading: "Evidence-Based M&E With Standardized Frameworks and Verifiable Records",
      description:
        "Karma integrates monitoring and evaluation into the ongoing grant management process rather than treating it as a separate end-of-project exercise. Milestones are structured with specific, measurable outcomes from the start, and grantees submit evidence of achievement throughout the project lifecycle. AI-powered review helps evaluators assess whether submitted evidence credibly supports claimed outcomes. Every verified outcome is recorded as an onchain attestation, creating a tamper-proof record of what was actually achieved. CIDS-aligned reporting frameworks ensure that impact data is captured using standardized indicators, making it possible to aggregate and compare results across grants, programs, and even organizations. Portfolio dashboards provide real-time M&E analytics, showing which grants are delivering outcomes and where intervention may be needed.",
    },
    capabilities: [
      "Structured milestone monitoring with outcome-focused deliverables defined at grant inception",
      "CIDS-aligned evaluation frameworks for standardized impact measurement across all grants",
      "AI-assisted evidence review to help evaluators assess whether outcomes are credibly demonstrated",
      "Onchain attestations providing tamper-proof records of verified outcomes and impact claims",
      "Portfolio-level M&E dashboards aggregating outcome data across programs and funding rounds",
      "Longitudinal tracking that connects grant outputs to measurable outcomes over time",
      "Whitelabel M&E portals for foundations that want branded impact reporting for stakeholders",
    ],
    faqs: [
      {
        question: "What is CIDS-aligned reporting and why does it matter?",
        answer:
          "CIDS stands for the Centre for International Development Studies framework for standardizing how development impact is measured and reported across organizations. CIDS-aligned reporting means your grant program captures impact data using internationally recognized indicators and formats, making it possible to compare results across programs, demonstrate credible impact to global stakeholders, and contribute to sector-wide knowledge about what interventions work.",
      },
      {
        question: "How does Karma differ from standalone M&E tools?",
        answer:
          "Most standalone M&E tools are disconnected from the grant management process, requiring manual data entry and separate workflows that create additional administrative burden. Karma integrates M&E directly into milestone tracking and ongoing grant oversight, so monitoring data is collected naturally as part of routine project management rather than as an extra reporting obligation layered on top of existing grantee and staff responsibilities.",
      },
      {
        question: "Can I use Karma for both real-time monitoring and post-project evaluation?",
        answer:
          "Yes. The platform supports ongoing milestone monitoring throughout the active grant period and also captures comprehensive final impact data at project completion. Portfolio dashboards let you view both real-time progress on current grants and historical outcomes from completed projects, giving you a complete picture of program effectiveness that spans active and closed initiatives.",
      },
      {
        question: "How do onchain attestations improve M&E credibility?",
        answer:
          "When outcomes are recorded as onchain attestations, they become independently verifiable records that cannot be retroactively modified, backdated, or deleted by any party. This means stakeholders, external auditors, donors, and the public can confirm that specific outcomes were verified at specific times by identified reviewers, adding a layer of institutional credibility that self-reported data alone cannot provide.",
      },
      {
        question: "Can I aggregate impact data across multiple grant programs?",
        answer:
          "Yes. Because Karma uses standardized CIDS-aligned indicators across all programs, impact data from different thematic areas and funding rounds can be aggregated into comprehensive portfolio-level and organization-level reports. This is particularly valuable for foundations running multiple grant programs that need to demonstrate cumulative impact across their entire funding portfolio to donors, boards, and public stakeholders.",
      },
    ],
    ctaText: "Strengthen your M&E process",
    ctaHref: "/foundations",
    idealFor: [
      "Foundations needing to demonstrate measurable impact to boards and external stakeholders",
      "International development funders requiring CIDS-aligned standardized impact reporting",
      "Programs that want to integrate M&E into ongoing grant management rather than treating it as an afterthought",
      "Organizations aggregating outcome data across multiple thematic grant programs",
      "Funders seeking tamper-proof, independently verifiable records of verified outcomes",
      "Teams transitioning from output-based reporting to outcome-focused impact measurement",
    ],
    testimonial: {
      quote:
        "For the first time, we can aggregate impact data across all 12 of our thematic programs using the same CIDS-aligned indicators. The onchain attestations give our donors confidence that outcomes are independently verified, not just self-reported by grantees.",
      author: "Dr. Samuel Mensah",
      role: "Director of Impact Assessment",
      organization: "Pan-African Development Fund",
    },
    secondaryCta: {
      text: "Explore full lifecycle management",
      href: "/solutions/grant-lifecycle-management-software",
    },
    datePublished: "2026-03-15",
    steps: [
      {
        title: "Define outcome-focused milestones",
        description:
          "Structure each grant with measurable outcomes from the start using CIDS-aligned indicators. Define what evidence grantees must submit to demonstrate impact at each stage.",
      },
      {
        title: "Monitor progress continuously",
        description:
          "Track grantee progress through real-time dashboards as they submit milestone evidence. AI-assisted review helps evaluators assess whether outcomes are credibly demonstrated.",
      },
      {
        title: "Verify and attest outcomes",
        description:
          "Approved outcomes are recorded as onchain attestations, creating tamper-proof records of verified impact. Stakeholders can independently verify these records at any time.",
      },
      {
        title: "Aggregate and report impact",
        description:
          "Use portfolio-level M&E dashboards to aggregate outcome data across grants and programs. Generate standardized CIDS-aligned impact reports for donors, boards, and external audiences.",
      },
    ],
  },
];
