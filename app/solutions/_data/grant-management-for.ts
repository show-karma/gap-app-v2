import { PAGES } from "@/utilities/pages";
import type { SolutionPage } from "./types";

export const grantManagementForSolutions: SolutionPage[] = [
  {
    slug: "grant-management-for-nonprofits",
    title: "Grant Management for Nonprofits",
    metaDescription:
      "Streamline nonprofit grant management with AI-powered reviews, milestone tracking, and transparent reporting. Reduce admin overhead and focus on your mission.",
    heading: "Grant Management Built for Nonprofits",
    tldr: "Karma helps nonprofits manage grants end-to-end with AI-assisted application review, milestone-based fund disbursement, and onchain transparency that builds donor trust.",
    datePublished: "2026-03-16",
    idealFor: [
      "Community foundations managing local grant portfolios",
      "Family foundations with small program teams",
      "Regranting organizations distributing funds to sub-grantees",
      "Nonprofits with 5+ active grants running simultaneously",
      "Fiscal sponsors managing grants on behalf of projects",
    ],
    testimonial: {
      quote:
        "Before Karma, our three-person grants team spent entire weeks reconciling spreadsheets. Now milestone tracking is automatic, our donors get real-time dashboards, and we redirected 15 hours a week back to community programming.",
      author: "Rebecca Thornton",
      role: "Director of Grants",
      organization: "Evergreen Community Foundation",
    },
    secondaryCta: {
      text: "See how nonprofit organizations use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Set up your grant program",
        description:
          "Define your application criteria, review rubrics, and milestone templates tailored to your nonprofit's funding priorities.",
      },
      {
        title: "Collect and review applications",
        description:
          "Receive proposals through customizable forms and use AI-assisted scoring to surface the strongest candidates for your review committee.",
      },
      {
        title: "Track milestones and release funds",
        description:
          "Monitor grantee progress through structured milestone submissions and disburse funds automatically when deliverables are verified.",
      },
      {
        title: "Report impact to donors and boards",
        description:
          "Generate board-ready impact reports from verified milestone data and share onchain records with donors for full transparency.",
      },
    ],
    problem: {
      heading: "Nonprofits Struggle with Grant Administration Overhead",
      description:
        "Nonprofit teams spend up to 40% of their time on grant administration instead of advancing their mission. Tracking deliverables across dozens of grantees, compiling impact reports for boards and donors, and reconciling fund disbursements with outdated spreadsheets drains limited staff capacity. When accountability gaps emerge, donor confidence erodes and future funding is at risk.",
    },
    solution: {
      heading: "A Transparent Grant Platform That Frees Your Team to Focus on Impact",
      description:
        "Karma gives nonprofit program officers a single dashboard to manage applications, track milestones, and verify deliverables. AI-powered review surfaces the strongest proposals faster, milestone-based disbursement ties funding to verified outcomes, and onchain records give donors an immutable audit trail. The result: less admin work, stronger accountability, and more time dedicated to the communities you serve.",
    },
    capabilities: [
      "AI-assisted application screening that ranks proposals by alignment with your nonprofit's criteria",
      "Milestone-based fund disbursement ensuring grants are released only when deliverables are verified",
      "Onchain transparency providing donors and boards with tamper-proof records of fund allocation",
      "Portfolio dashboards giving program officers a real-time view of all active grants and their status",
      "Automated progress reporting that compiles grantee updates into board-ready impact summaries",
      "Customizable review workflows supporting peer review, committee scoring, and external evaluations",
    ],
    faqs: [
      {
        question: "How does Karma reduce administrative burden for nonprofit grant managers?",
        answer:
          "Karma automates repetitive tasks like application sorting, milestone verification, and report generation. AI-powered review scores proposals against your criteria, and milestone tracking replaces manual check-ins with verified deliverable submissions. Most nonprofit teams report saving 10-15 hours per week on grant administration, freeing program officers to focus on relationship building and strategic planning rather than data entry.",
      },
      {
        question: "Can we use Karma to manage grants from multiple funding sources?",
        answer:
          "Yes. Karma supports multiple grant programs under a single organization. You can configure separate review criteria, milestone templates, and disbursement schedules for each funding source while maintaining a unified view across all programs. This centralized approach eliminates the need for separate tracking systems and gives leadership a complete picture of organizational grant activity.",
      },
      {
        question: "How does onchain transparency help with donor relations?",
        answer:
          "Every milestone completion, fund disbursement, and review decision is recorded onchain, creating an immutable audit trail. You can share these records directly with donors and board members, providing verifiable proof that funds were used as intended without compiling manual reports. This level of transparency strengthens donor confidence and can be a differentiator when competing for future funding opportunities.",
      },
      {
        question: "Is Karma suitable for small nonprofits with limited technical staff?",
        answer:
          "Absolutely. Karma is designed with a straightforward interface that requires no blockchain expertise to operate. Grantees submit updates through a simple form, reviewers use a guided scoring interface, and all onchain operations happen behind the scenes. Small teams can get started within a day, and the platform scales as your grant portfolio grows without adding technical overhead.",
      },
      {
        question: "How long does it take to set up a grant program on Karma?",
        answer:
          "Most nonprofit teams launch their first grant program within one to two days. Setup involves defining application questions, configuring review criteria and scoring rubrics, and creating milestone templates. Karma provides starter templates based on common nonprofit grant structures, so you can customize rather than build from scratch, significantly reducing the time from setup to accepting applications.",
      },
    ],
    ctaText: "Start Managing Nonprofit Grants with Karma",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-daos",
    title: "Grant Management for DAOs",
    metaDescription:
      "Manage DAO grants with onchain milestone tracking, AI-powered proposal review, and transparent fund disbursement. Built for decentralized governance workflows.",
    heading: "Grant Management Designed for DAOs",
    tldr: "Karma provides DAOs with a structured grants framework that combines community-driven review, milestone-based payouts, and full onchain accountability to maximize the impact of treasury allocations.",
    datePublished: "2026-03-16",
    idealFor: [
      "Protocol DAOs allocating treasury funds to ecosystem development",
      "Grants committees managing community funding rounds",
      "Investment DAOs tracking portfolio grant performance",
      "Public goods funding organizations running retroactive grants",
      "DAO ecosystems coordinating grants across multiple sub-DAOs",
    ],
    testimonial: {
      quote:
        "Our grants committee used to lose track of funded projects within weeks of approval. With Karma, every milestone is verified onchain and token holders can see exactly where treasury funds go. Accountability went from aspirational to automatic.",
      author: "Marcus Wei",
      role: "Grants Lead",
      organization: "Meridian DAO",
    },
    secondaryCta: {
      text: "See how DAO organizations use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Configure your grants framework",
        description:
          "Define proposal requirements, evaluation criteria, and milestone structures that align with your DAO's governance process and treasury policies.",
      },
      {
        title: "Collect and evaluate proposals",
        description:
          "Receive community proposals and combine AI-assisted scoring with committee or community review to identify the highest-impact projects.",
      },
      {
        title: "Disburse funds at verified milestones",
        description:
          "Release treasury funds through milestone-gated smart contracts that pay grantees only when deliverables are verified by reviewers.",
      },
      {
        title: "Report outcomes to token holders",
        description:
          "Give token holders real-time visibility into grant performance through public dashboards and onchain attestation records.",
      },
    ],
    problem: {
      heading: "DAOs Lack Structure to Manage Grants at Scale",
      description:
        "Most DAOs allocate treasury funds through governance votes but have no standardized process to track what happens after approval. Grantees disappear after receiving funds, milestones go unverified, and token holders have no visibility into whether grants delivered value. Without structured oversight, treasury resources are wasted and community trust deteriorates.",
    },
    solution: {
      heading: "Structured Grants Infrastructure for Decentralized Organizations",
      description:
        "Karma brings accountability to DAO grants without sacrificing decentralization. Proposals are evaluated with AI-assisted scoring alongside community review, funds are released through milestone-based smart contract disbursement, and every action is recorded onchain for full token-holder visibility. Grant committees get the tools they need to run professional programs while maintaining the transparency DAOs demand.",
    },
    capabilities: [
      "AI-assisted proposal evaluation that supplements community review with objective scoring criteria",
      "Milestone-gated fund releases ensuring treasury funds flow only when deliverables are verified",
      "Onchain attestation records providing token holders with verifiable proof of grant outcomes",
      "Multi-sig and Safe wallet integration for secure treasury disbursement workflows",
      "Portfolio dashboards tracking all active grants across multiple funding rounds",
      "Reviewer assignment and scoring workflows supporting both committee and community review models",
      "Cross-chain support for DAOs operating across multiple blockchain networks",
    ],
    faqs: [
      {
        question: "How does Karma integrate with existing DAO governance processes?",
        answer:
          "Karma operates as the execution layer after governance approval. Once a proposal passes your governance vote, it enters Karma for structured milestone tracking and fund disbursement. The platform integrates with Safe wallets for multi-sig treasury management and records all actions onchain, creating a seamless bridge between governance decisions and grant execution workflows.",
      },
      {
        question: "Can grant reviewers remain pseudonymous?",
        answer:
          "Yes. Karma works with wallet addresses and does not require real-world identity verification for reviewers or grantees. DAO contributors can participate in the review process using their existing wallet identity, maintaining the pseudonymous culture that most DAOs value while still providing verifiable, wallet-linked accountability for every review decision and score submitted throughout the grant lifecycle.",
      },
      {
        question: "How do token holders track grant performance?",
        answer:
          "All milestone submissions, review decisions, and fund disbursements are recorded as onchain attestations visible to anyone. Token holders can view real-time grant status through the public portfolio dashboard without needing special access or permissions, ensuring full transparency of treasury spend and enabling community oversight of funded projects at every stage.",
      },
      {
        question: "Does Karma support retroactive public goods funding?",
        answer:
          "Yes. Karma supports both prospective grants with forward-looking milestones and retroactive funding programs where completed work is evaluated after the fact. You can configure custom review criteria and evaluation rubrics for each funding model, allowing your grants committee to assess past contributions with the same structured rigor and onchain accountability applied to forward-looking proposals.",
      },
      {
        question: "What blockchains does Karma support for DAO grant programs?",
        answer:
          "Karma supports multiple EVM-compatible chains including Ethereum, Optimism, Arbitrum, Base, and several others commonly used by DAOs. Grant programs can run on the chain where your treasury resides while grantees report progress through the same unified interface, eliminating the need for separate tools when your community operates across multiple blockchain networks.",
      },
    ],
    ctaText: "Launch Your DAO Grants Program on Karma",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-universities",
    title: "Grant Management for Universities",
    metaDescription:
      "Simplify university grant management with AI-powered reviews, milestone tracking, and transparent fund allocation for research offices.",
    heading: "Grant Management for Universities and Research Institutions",
    tldr: "Karma helps university research offices and academic programs manage grant cycles from application to final reporting with AI-assisted review, milestone verification, and audit-ready transparency.",
    datePublished: "2026-03-16",
    idealFor: [
      "University research offices managing internal seed funding",
      "Academic departments running faculty grant competitions",
      "Graduate student research fellowship programs",
      "University-industry partnership grant programs",
      "Multi-campus research consortia coordinating shared funding",
    ],
    testimonial: {
      quote:
        "Managing 200+ faculty proposals each cycle was drowning our research office in paperwork. Karma's AI screening cut our initial review time by half, and the milestone tracking gives our provost real-time visibility into how seed funding translates to published research.",
      author: "Dr. Priya Mehta",
      role: "Associate Vice Provost for Research",
      organization: "Pacific Ridge University",
    },
    secondaryCta: {
      text: "See how university research offices use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Define your grant program structure",
        description:
          "Configure application forms, multi-level review stages, and milestone templates aligned with your academic calendar and sponsor requirements.",
      },
      {
        title: "Manage multi-level proposal review",
        description:
          "Route proposals through department chairs, committee panels, and external evaluators with independent scoring at each stage.",
      },
      {
        title: "Track research milestones and disbursements",
        description:
          "Monitor faculty and research team progress against defined milestones and release funds when deliverables are verified by reviewers.",
      },
      {
        title: "Generate compliance and impact reports",
        description:
          "Compile audit-ready reports from verified milestone data that satisfy sponsor compliance requirements and institutional reporting needs.",
      },
    ],
    problem: {
      heading: "Universities Face Complex Multi-Stakeholder Grant Workflows",
      description:
        "University research offices juggle hundreds of internal and external grant applications each cycle. Faculty proposals require multi-level review across departments, compliance checks against sponsor requirements, and detailed financial tracking. When milestone reporting relies on email chains and shared drives, research offices lose visibility into project progress and struggle to produce the compliance documentation sponsors demand.",
    },
    solution: {
      heading: "A Unified Platform for Academic Grant Lifecycle Management",
      description:
        "Karma centralizes the academic grant workflow from proposal intake through final reporting. AI-powered screening helps research offices prioritize high-potential applications, structured milestone tracking ensures funded projects stay on schedule, and onchain records create an immutable audit trail that satisfies sponsor compliance requirements. Faculty and research teams submit updates through a simple interface while administrators maintain oversight across the entire portfolio.",
    },
    capabilities: [
      "AI-assisted proposal ranking that scores applications against department and sponsor criteria",
      "Multi-level review workflows supporting department chairs, committee panels, and external evaluators",
      "Milestone-based tracking aligned with academic calendar milestones and sponsor reporting deadlines",
      "Portfolio dashboards giving research offices visibility across all funded projects by department or sponsor",
      "Automated progress report compilation for sponsor submissions and institutional reporting",
      "Audit-ready onchain records satisfying compliance requirements from federal and private sponsors",
    ],
    faqs: [
      {
        question: "Can Karma handle the multi-level review process universities require?",
        answer:
          "Yes. Karma supports configurable review stages including departmental pre-screening, committee scoring, and external peer review. Each stage has its own criteria and scoring rubrics, and applications advance through stages based on rules you define. Administrators can monitor review progress across all stages from a single dashboard, ensuring bottlenecks are identified and resolved quickly.",
      },
      {
        question: "How does Karma help with sponsor compliance reporting?",
        answer:
          "Every milestone submission, review action, and fund disbursement is timestamped and recorded with full audit detail. Research offices can generate compliance reports that show exactly when deliverables were completed and funds were released, meeting the documentation standards required by federal agencies, private foundations, and institutional oversight bodies without manual data gathering.",
      },
      {
        question: "Can faculty members easily submit milestone updates?",
        answer:
          "Faculty and research teams submit updates through a straightforward web interface that requires no technical expertise or software installation. They upload deliverables, describe progress against objectives, and submit for review. The system handles routing to the appropriate reviewer automatically, sending reminders when deadlines approach so research teams stay on track.",
      },
      {
        question: "Does Karma integrate with existing university systems?",
        answer:
          "Karma operates as a standalone grant management platform with comprehensive API access for integration with existing research administration systems. Grant data can be exported in standard formats compatible with financial, HR, or institutional reporting systems, enabling seamless data flow between Karma and your university's established infrastructure without requiring changes to existing workflows.",
      },
      {
        question: "How does Karma handle grants that span multiple academic departments?",
        answer:
          "Karma supports cross-departmental grant programs with shared review panels and split milestone tracking across organizational units. Principal investigators from different departments can collaborate on joint proposals, while each department chair retains visibility into their faculty's contributions. Budget allocation and milestone responsibilities can be divided across departments within a single grant record for unified institutional oversight.",
      },
    ],
    ctaText: "Modernize University Grant Management with Karma",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-government",
    title: "Grant Management for Government Agencies",
    metaDescription:
      "Manage government grants with AI-powered reviews, milestone-based disbursement, and onchain audit trails for transparent compliance.",
    heading: "Grant Management for Government Agencies",
    tldr: "Karma provides government agencies with a structured grant management platform that ensures public accountability through AI-assisted review, milestone-based disbursement, and immutable audit records.",
    datePublished: "2026-03-16",
    idealFor: [
      "Federal agencies managing competitive grant programs",
      "State and local governments distributing community development funds",
      "Regulatory bodies overseeing grantee compliance",
      "Inter-agency programs coordinating cross-departmental funding",
      "Public innovation labs funding civic technology projects",
    ],
    testimonial: {
      quote:
        "Legislative auditors used to spend weeks tracing grant fund flows through our legacy system. Now every disbursement is recorded with an immutable timestamp, and compliance reports that took days generate in minutes. It transformed how we demonstrate public accountability.",
      author: "James Calloway",
      role: "Deputy Director, Office of Grants Management",
      organization: "State Department of Economic Development",
    },
    secondaryCta: {
      text: "See how government agencies use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Establish program rules and compliance checkpoints",
        description:
          "Configure application criteria, compliance requirements, and milestone-gated disbursement rules that align with your agency's regulatory framework.",
      },
      {
        title: "Run defensible, criteria-based reviews",
        description:
          "Evaluate proposals using AI-assisted scoring with documented reasoning at every step, ensuring review decisions are auditable and defensible.",
      },
      {
        title: "Enforce compliance at each disbursement stage",
        description:
          "Release funds only when all required documentation is submitted, reviewed, and approved at each milestone compliance checkpoint.",
      },
      {
        title: "Generate audit-ready accountability records",
        description:
          "Produce comprehensive audit trails and compliance reports from immutable onchain records for legislative oversight and auditor review.",
      },
    ],
    problem: {
      heading: "Government Grant Programs Demand Rigorous Accountability",
      description:
        "Government agencies manage large volumes of grant applications under strict regulatory requirements. The review process must be defensible and well-documented, fund disbursement must follow precise compliance rules, and every dollar must be traceable through audit. Legacy systems and manual processes create bottlenecks that slow program delivery while increasing the risk of compliance failures and public scrutiny.",
    },
    solution: {
      heading: "Auditable Grant Management That Meets Public Sector Standards",
      description:
        "Karma delivers the structure and transparency government grant programs require. AI-assisted review ensures consistent, criteria-based evaluation of every application. Milestone-gated disbursement enforces compliance rules before funds are released. Onchain attestations create tamper-proof records of every decision, disbursement, and deliverable, providing the audit trail that public agencies need to maintain public trust and satisfy oversight bodies.",
    },
    capabilities: [
      "AI-powered application scoring with documented criteria ensuring defensible review decisions",
      "Milestone-gated fund disbursement enforcing compliance checkpoints before each payment",
      "Immutable onchain audit trails satisfying government accountability and oversight requirements",
      "Configurable review panels supporting blind review, committee scoring, and inter-agency coordination",
      "Real-time portfolio dashboards tracking fund allocation and program outcomes across all grantees",
      "Automated compliance reporting generating documentation for legislative oversight and auditors",
      "Role-based access controls ensuring appropriate separation of duties across program staff",
    ],
    faqs: [
      {
        question: "How does Karma meet government audit requirements?",
        answer:
          "Every action in Karma, from application review scores to fund disbursements, is recorded as an onchain attestation with timestamps and actor identification. These immutable records provide auditors with a complete, tamper-proof trail of program decisions and fund flows that meets federal and state audit standards, eliminating the need to reconstruct paper trails during audit cycles.",
      },
      {
        question: "Can Karma enforce regulatory compliance rules for fund disbursement?",
        answer:
          "Yes. Karma supports configurable compliance checkpoints at each milestone stage with granular control over required documentation. Funds are released only when all required documentation is submitted, reviewed, and approved by authorized personnel. Disbursement rules can be customized to match the specific regulatory requirements of each grant program and funding source.",
      },
      {
        question: "How does the AI review process maintain fairness and defensibility?",
        answer:
          "The AI scoring system evaluates proposals against predefined, published criteria and produces documented reasoning for every score. Each score includes a transparent rationale that can be reviewed and audited by oversight bodies. AI recommendations augment human reviewers rather than replacing them, ensuring final decisions remain with qualified program officers who bear accountability.",
      },
      {
        question: "Does Karma support inter-agency grant coordination?",
        answer:
          "Karma supports multiple organizations and review teams within a single platform with sophisticated, granular access controls. Agencies can configure shared programs with role-based permissions at every level, allowing inter-agency collaboration on joint funding initiatives while maintaining appropriate data separation and authorization boundaries that satisfy each participating agency's security and compliance requirements.",
      },
      {
        question: "How does Karma handle Freedom of Information and public records requests?",
        answer:
          "Because Karma records all grant actions as immutable onchain attestations, responding to public records and Freedom of Information requests is straightforward. Agencies can generate comprehensive, timestamped reports of any grant program's complete history, including review decisions, disbursements, and milestone verifications, providing the thorough documentation transparency that public accountability and legislative oversight demand.",
      },
    ],
    ctaText: "Bring Accountability to Government Grant Programs",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-healthcare",
    title: "Grant Management for Healthcare Organizations",
    metaDescription:
      "Manage healthcare grants with milestone tracking, AI-powered reviews, and transparent fund allocation for health systems and foundations.",
    heading: "Grant Management for Healthcare Organizations",
    tldr: "Karma helps healthcare organizations manage research and community health grants with structured milestone tracking, AI-assisted proposal review, and transparent reporting that satisfies compliance and funding bodies.",
    datePublished: "2026-03-16",
    idealFor: [
      "Hospital systems funding clinical research initiatives",
      "Healthcare foundations managing community health grants",
      "Medical research institutes running investigator awards",
      "Public health departments distributing prevention program funds",
      "Health equity organizations funding underserved community programs",
    ],
    testimonial: {
      quote:
        "Coordinating IRB timelines with grant milestones used to be our biggest headache. Karma lets us configure review stages that mirror our clinical approval process, and the compliance reports satisfy both our board and NIH reporting requirements without duplicate data entry.",
      author: "Dr. Sandra Liu",
      role: "Vice President of Research Administration",
      organization: "Lakewood Health System",
    },
    secondaryCta: {
      text: "See how healthcare organizations use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Configure healthcare-specific review workflows",
        description:
          "Set up review stages for scientific merit, clinical feasibility, IRB coordination, and budget review with independent scoring at each step.",
      },
      {
        title: "Evaluate proposals against clinical criteria",
        description:
          "Use AI-assisted scoring to rank proposals on clinical relevance, scientific rigor, and feasibility while routing to specialized reviewers.",
      },
      {
        title: "Track research and program milestones",
        description:
          "Monitor grant progress with milestone checkpoints tied to clinical outcomes, research deliverables, and regulatory compliance requirements.",
      },
      {
        title: "Generate compliance-ready reports",
        description:
          "Compile verified milestone data into structured reports that satisfy healthcare compliance officers, institutional boards, and external funding agencies.",
      },
    ],
    problem: {
      heading: "Healthcare Grant Programs Face Unique Compliance and Reporting Demands",
      description:
        "Healthcare organizations run grant programs that fund clinical research, community health initiatives, and medical innovation. These programs require rigorous compliance documentation, IRB coordination, and outcome tracking that goes beyond simple financial reporting. When grant management relies on disconnected systems, program officers lose visibility into research progress, compliance gaps emerge, and reporting to boards and federal agencies becomes a manual, error-prone process.",
    },
    solution: {
      heading: "Structured Grant Oversight for Healthcare Research and Community Programs",
      description:
        "Karma provides healthcare grant managers with a centralized platform to track every stage of the grant lifecycle. AI-powered review helps evaluate proposals against clinical relevance and feasibility criteria. Milestone-based tracking ties fund releases to verified research and program outcomes. Onchain records create an audit trail that satisfies healthcare compliance requirements and gives leadership clear visibility into how grant funds drive health outcomes.",
    },
    capabilities: [
      "AI-assisted proposal evaluation scoring applications against clinical relevance and feasibility criteria",
      "Milestone-based disbursement tied to verified research outcomes and program deliverables",
      "Compliance-ready audit trails with onchain records of all review decisions and fund movements",
      "Portfolio dashboards tracking grants across research programs, community health initiatives, and innovation funds",
      "Automated reporting that compiles grant progress for boards, sponsors, and regulatory bodies",
      "Configurable review workflows supporting IRB coordination, peer review, and committee evaluation",
    ],
    faqs: [
      {
        question: "How does Karma handle the specialized review requirements of healthcare grants?",
        answer:
          "Karma supports fully configurable review workflows with multiple sequential or parallel stages. You can set up stages for scientific merit review, clinical feasibility assessment, IRB coordination, and budget review. Each stage has independent scoring criteria and reviewer assignments, ensuring proposals are evaluated by the appropriate domain experts at each step of the process.",
      },
      {
        question: "Can Karma track both research grants and community health program grants?",
        answer:
          "Yes. Karma supports multiple grant programs with distinct configurations under a single organization, each managed independently. You can run clinical research grants, community health initiatives, and innovation funding programs side by side, each with their own application criteria, milestone structures, and reporting requirements while maintaining a unified portfolio view that gives institutional leadership a complete picture.",
      },
      {
        question: "How does milestone tracking work for multi-year research projects?",
        answer:
          "Milestones can be configured for any timeframe to match your research timelines. For multi-year research projects, you can set annual or semi-annual milestone checkpoints with specific deliverables at each stage. Fund disbursements are tied to milestone verification, ensuring continued funding is linked to demonstrated research progress and keeping long-duration projects accountable throughout their lifecycle.",
      },
      {
        question: "Does Karma generate reports suitable for healthcare compliance requirements?",
        answer:
          "Karma compiles all milestone submissions, review decisions, and disbursement records into structured, export-ready reports designed for regulatory scrutiny. These reports include precise timestamps, reviewer identities, and verified deliverables with supporting documentation, providing the complete audit trail that healthcare compliance officers, institutional review boards, and external auditors require for regulatory and accreditation purposes.",
      },
      {
        question: "Can Karma support grants that require patient data protections?",
        answer:
          "Karma does not store patient health information directly. Instead, grantees submit milestone evidence and outcome summaries through the platform while maintaining patient data in their own compliant systems. This architecture allows healthcare organizations to track grant progress and verify research milestones without introducing patient data into the grant management workflow.",
      },
    ],
    ctaText: "Streamline Healthcare Grant Management with Karma",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-education",
    title: "Grant Management for Education",
    metaDescription:
      "Manage education grants with AI-powered application review, milestone tracking, and transparent fund allocation for schools and foundations.",
    heading: "Grant Management for the Education Sector",
    tldr: "Karma helps education organizations manage grant programs from application through impact reporting with AI-assisted review, milestone-based funding, and transparent accountability that builds stakeholder trust.",
    datePublished: "2026-03-16",
    idealFor: [
      "Education foundations funding teacher innovation grants",
      "School districts managing Title I and federal program funds",
      "Ed-tech accelerators funding classroom technology pilots",
      "State education agencies distributing competitive grants",
      "Community organizations supporting after-school programs",
    ],
    testimonial: {
      quote:
        "We fund 80 teacher innovation grants each year across 12 districts. Before Karma, tracking classroom implementation was nearly impossible at that scale. Now every teacher submits milestone evidence through one platform, and our board sees exactly how grants translate to student outcomes.",
      author: "Catherine Park",
      role: "Executive Director",
      organization: "Bright Futures Education Foundation",
    },
    secondaryCta: {
      text: "See how education organizations use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Design your education grant program",
        description:
          "Create application forms and review rubrics tailored to your education priorities, whether teacher innovation, technology pilots, or community programs.",
      },
      {
        title: "Screen and select the strongest proposals",
        description:
          "Use AI-assisted review to rank applications against educational impact criteria and program alignment, helping staff focus on the most promising candidates.",
      },
      {
        title: "Monitor classroom and program implementation",
        description:
          "Track grantee progress through milestone submissions with evidence of implementation, tying fund releases to verified progress in schools and classrooms.",
      },
      {
        title: "Demonstrate impact to stakeholders",
        description:
          "Generate impact reports from verified milestone data that connect grant investments to educational outcomes for boards, donors, and regulatory bodies.",
      },
    ],
    problem: {
      heading: "Education Grant Programs Struggle with Fragmented Tracking and Reporting",
      description:
        "Education foundations, school districts, and ed-tech funders manage grant programs that support teachers, schools, and innovative learning initiatives. Tracking grantee progress across dozens of funded projects, ensuring funds reach classrooms as intended, and compiling impact data for stakeholders is overwhelming when done through spreadsheets and email. Grantees miss reporting deadlines, outcomes go unmeasured, and the connection between funding and student impact remains unclear.",
    },
    solution: {
      heading: "End-to-End Grant Management That Connects Funding to Educational Outcomes",
      description:
        "Karma gives education program managers a structured platform to evaluate proposals, track implementation milestones, and measure impact. AI-assisted review helps surface the most promising applications from large applicant pools. Milestone-based disbursement ensures funds flow to projects that demonstrate progress. Portfolio dashboards and automated reporting connect grant investments directly to educational outcomes, giving boards and donors the evidence they need.",
    },
    capabilities: [
      "AI-powered application review scoring proposals against educational impact criteria and program alignment",
      "Milestone-based fund releases tied to verified implementation progress in classrooms and schools",
      "Portfolio dashboards providing a real-time view of all funded projects by region, school, or program area",
      "Automated impact reporting that compiles grantee updates into stakeholder-ready summaries",
      "Onchain transparency giving boards and donors verifiable records of fund allocation and outcomes",
      "Customizable application forms and review rubrics tailored to different education grant programs",
    ],
    faqs: [
      {
        question: "How does Karma help manage large volumes of education grant applications?",
        answer:
          "Karma's AI-assisted review scores every application against your published criteria, helping program staff quickly identify the strongest proposals from large applicant pools. Reviewers see ranked applications with AI-generated summaries highlighting key strengths and gaps, reducing the time spent on initial screening by up to 60% and allowing your team to focus on finalist evaluation.",
      },
      {
        question: "Can we track grants at the school or district level?",
        answer:
          "Yes. Karma's portfolio dashboards support filtering and grouping grants by any dimension you configure, including individual school, district, region, or program area. This gives program officers granular visibility into how funds are distributed and performing across your entire education ecosystem, making it easy to identify high-performing programs and areas needing support.",
      },
      {
        question: "How do grantees report on their progress?",
        answer:
          "Grantees submit milestone updates through a simple web interface where they describe their progress, upload evidence of classroom implementation, and report on outcome metrics you define. Updates are routed to assigned reviewers automatically, and approved milestones trigger the next round of funding. Automated reminders help ensure grantees submit updates on time without manual follow-up.",
      },
      {
        question: "Can Karma generate impact reports for our board and donors?",
        answer:
          "Karma automatically compiles milestone data, outcome metrics, and fund disbursement records into structured, presentation-ready reports with minimal manual effort. These can be customized for different audiences including board presentations with aggregate outcomes, individual donor updates showing exactly how their contributions were used, and regulatory filings meeting federal and state reporting requirements.",
      },
      {
        question:
          "Does Karma support grants for both individual teachers and school-wide programs?",
        answer:
          "Yes. Karma allows you to configure separate application tracks within the same grant program for individual teacher innovation grants and broader school-wide or district-wide initiatives. Each track can have its own application criteria, milestone structures, and funding amounts while sharing a unified portfolio view that enables program-level reporting, comparative analysis, and resource allocation decisions.",
      },
    ],
    ctaText: "Transform Education Grant Management with Karma",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-arts-culture",
    title: "Grant Management for Arts & Culture",
    metaDescription:
      "Manage arts and culture grants with AI-powered reviews, milestone tracking, and transparent reporting for arts councils and foundations.",
    heading: "Grant Management for Arts and Culture Organizations",
    tldr: "Karma empowers arts councils, cultural foundations, and creative funds to manage grants with AI-assisted review, milestone-based funding, and transparent accountability that demonstrates the impact of arts investment.",
    datePublished: "2026-03-16",
    idealFor: [
      "State and municipal arts councils running annual grant cycles",
      "Cultural foundations supporting community arts programming",
      "Creative industry funds backing independent artists and collectives",
      "Museum and heritage organizations funding preservation projects",
      "Film and media commissions managing production grants",
    ],
    testimonial: {
      quote:
        "Arts grants do not follow linear timelines, and most grant tools punish that flexibility. Karma lets our panelists evaluate creative merit on its own terms, and artists submit progress updates with images and documentation that capture the creative process rather than just checking boxes.",
      author: "Elena Vasquez",
      role: "Program Director",
      organization: "Metro Arts Council",
    },
    secondaryCta: {
      text: "See how arts and culture organizations use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Set up your arts grant program",
        description:
          "Configure applications and panel review criteria around artistic merit, community engagement, and organizational capacity for your specific disciplines.",
      },
      {
        title: "Run panel-based proposal review",
        description:
          "Assign panelists to independently score applications with AI-assisted summaries, manage conflict-of-interest recusals, and aggregate scores transparently.",
      },
      {
        title: "Track creative milestones flexibly",
        description:
          "Monitor project progress with flexible milestone structures that accommodate the nonlinear timelines and qualitative deliverables of creative work.",
      },
      {
        title: "Communicate arts impact to stakeholders",
        description:
          "Compile audience metrics, community engagement data, and verified milestone outcomes into impact narratives for boards, donors, and government sponsors.",
      },
    ],
    problem: {
      heading: "Arts Funders Need Better Tools to Demonstrate Cultural Impact",
      description:
        "Arts and culture grant programs fund diverse projects from community murals to theater productions to digital media initiatives. Evaluating creative proposals requires nuanced review that generic grant tools handle poorly. Tracking progress on artistic projects that do not follow linear deliverable timelines is challenging, and demonstrating the cultural and community impact of arts funding to boards and government sponsors remains one of the sector's persistent struggles.",
    },
    solution: {
      heading: "Flexible Grant Management That Respects the Creative Process",
      description:
        "Karma provides arts funders with the structure needed for accountability while accommodating the nonlinear nature of creative work. AI-assisted review helps panels evaluate proposals consistently against artistic merit and community impact criteria. Milestone tracking can be configured for the flexible timelines creative projects require. Portfolio dashboards and transparent reporting connect arts funding to measurable community outcomes, strengthening the case for continued investment in culture.",
    },
    capabilities: [
      "AI-assisted panel review scoring proposals on artistic merit, community impact, and organizational capacity",
      "Flexible milestone tracking accommodating the nonlinear timelines of creative projects",
      "Portfolio dashboards showing funded projects across disciplines, regions, and funding categories",
      "Onchain transparency providing funders and government sponsors with verifiable records of arts investment",
      "Automated impact reporting compiling grantee updates into narratives that communicate cultural outcomes",
      "Customizable application forms supporting diverse artistic disciplines and project types",
    ],
    faqs: [
      {
        question: "Can Karma handle the panel review process arts councils use?",
        answer:
          "Yes. Karma supports multi-reviewer panel workflows where each panelist scores applications independently against configurable criteria such as artistic merit, community engagement, and organizational capacity. Scores are aggregated automatically with full transparency into the weighting process, and the platform manages conflict-of-interest recusals and panel assignments to ensure fair, consistent, and defensible evaluation across all submissions.",
      },
      {
        question: "How does milestone tracking work for creative projects with flexible timelines?",
        answer:
          "Milestones in Karma can be configured with flexible deadlines and qualitative deliverables rather than rigid binary timelines. Artists submit progress updates that include descriptions, images, video, and documentation of their creative process. Reviewers evaluate progress holistically rather than checking off binary completion criteria, respecting the iterative and nonlinear nature of artistic work.",
      },
      {
        question: "How can we demonstrate the impact of arts funding to our stakeholders?",
        answer:
          "Karma compiles grantee milestone updates, audience metrics, and community engagement data into structured impact reports with verifiable onchain records. Combined with transparent fund allocation records, these reports provide evidence connecting arts investment to cultural and community outcomes that resonate with boards, donors, and government sponsors seeking accountability for public arts funding.",
      },
      {
        question: "Does Karma support grants for individual artists as well as organizations?",
        answer:
          "Yes. Karma supports applications from both individual artists and arts organizations within the same grant program seamlessly. You can configure separate application tracks with criteria tailored to each applicant type, allowing solo practitioners and established cultural institutions to apply through the same program with appropriately different evaluation rubrics, milestone expectations, and reporting requirements.",
      },
      {
        question: "Can we manage grants across multiple artistic disciplines in one program?",
        answer:
          "Absolutely. Karma allows you to configure a single grant program with discipline-specific application tracks for visual arts, performing arts, literary arts, digital media, and more. Each track can have tailored review criteria and milestone structures while sharing a unified portfolio dashboard that gives program directors visibility across all funded disciplines.",
      },
    ],
    ctaText: "Elevate Arts Grant Management with Karma",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-environmental",
    title: "Grant Management for Environmental Organizations",
    metaDescription:
      "Manage environmental grants with milestone tracking, AI-powered reviews, and onchain transparency for conservation and climate programs.",
    heading: "Grant Management for Environmental Organizations",
    tldr: "Karma helps environmental organizations manage conservation, climate, and sustainability grants with milestone-based funding, AI-assisted proposal review, and transparent accountability that demonstrates measurable environmental outcomes.",
    datePublished: "2026-03-16",
    idealFor: [
      "Conservation land trusts funding habitat restoration projects",
      "Climate funds financing emissions reduction initiatives",
      "Biodiversity organizations supporting species protection programs",
      "Water stewardship groups managing watershed health grants",
      "Sustainable agriculture funds backing regenerative farming projects",
    ],
    testimonial: {
      quote:
        "Greenwashing concerns were eroding donor confidence in our reforestation grants. With Karma, every hectare restored is verified by field reviewers and recorded onchain. Our donors now see tamper-proof evidence of environmental impact, and contributions have increased 30% since we adopted the platform.",
      author: "Thomas Alder",
      role: "Director of Conservation Programs",
      organization: "Green Canopy Alliance",
    },
    secondaryCta: {
      text: "See how environmental organizations use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Design your environmental grant program",
        description:
          "Configure application criteria around environmental impact, scientific methodology, and feasibility for your specific conservation or sustainability focus area.",
      },
      {
        title: "Evaluate proposals with scientific rigor",
        description:
          "Use AI-assisted scoring alongside peer review to assess proposals on environmental impact potential, methodology quality, and organizational capacity.",
      },
      {
        title: "Verify environmental outcomes at each milestone",
        description:
          "Require grantees to submit verified outcome data such as acres restored, emissions reduced, or species counts at each milestone checkpoint.",
      },
      {
        title: "Build a verifiable environmental impact record",
        description:
          "Create tamper-proof onchain records of verified environmental outcomes that address greenwashing concerns and demonstrate real impact to donors and the public.",
      },
    ],
    problem: {
      heading: "Environmental Funders Need Verifiable Proof of Impact",
      description:
        "Environmental grant programs fund projects with long timelines and outcomes that are difficult to measure, from reforestation efforts spanning decades to climate adaptation projects across multiple regions. Funders struggle to track whether grants produce genuine environmental outcomes or just activity reports. Without verifiable proof of impact, greenwashing concerns undermine stakeholder confidence and make it harder to mobilize continued funding for critical environmental work.",
    },
    solution: {
      heading: "Transparent Grant Management with Verifiable Environmental Outcomes",
      description:
        "Karma provides environmental funders with the tools to connect grant investments to verified outcomes. AI-assisted review evaluates proposals against environmental impact criteria and scientific rigor. Milestone-based disbursement ties funding to demonstrated environmental results. Onchain attestations create tamper-proof records of every outcome reported and verified, giving donors, partners, and the public confidence that environmental grants deliver real results.",
    },
    capabilities: [
      "AI-powered proposal review scoring applications on environmental impact, scientific methodology, and feasibility",
      "Milestone-based funding tied to verified environmental outcomes such as acres restored or emissions reduced",
      "Onchain attestations providing tamper-proof records of environmental deliverables and verified impact data",
      "Portfolio dashboards tracking grants across conservation, climate, biodiversity, and sustainability programs",
      "Automated environmental impact reporting compiling verified outcomes for donors and regulatory bodies",
      "Multi-stakeholder review workflows supporting scientific peer review, community input, and funder evaluation",
      "Long-term project tracking supporting multi-year environmental initiatives with phased milestones",
    ],
    faqs: [
      {
        question: "How does Karma help verify environmental outcomes rather than just activity?",
        answer:
          "Karma's milestone system requires grantees to submit evidence of outcomes, not just activities. For environmental grants, this means verified data such as hectares restored, species counts, emissions measurements, or water quality readings. Reviewers evaluate this evidence before milestones are approved and funds released, ensuring accountability extends beyond self-reported narratives to measurable environmental results.",
      },
      {
        question: "Can Karma handle long-term environmental projects that span multiple years?",
        answer:
          "Yes. Karma supports multi-year grant programs with phased milestone schedules specifically designed for long-duration environmental projects. You can set annual or seasonal checkpoints with specific environmental deliverables at each phase, tracking cumulative impact over the full project duration while maintaining regular accountability touchpoints that keep grantees engaged and funders informed of progress throughout.",
      },
      {
        question: "How does onchain transparency help with environmental accountability?",
        answer:
          "Every verified milestone, disbursement, and impact measurement is recorded as an onchain attestation that cannot be altered or deleted. This creates a public, tamper-proof record that directly addresses greenwashing concerns and provides verifiable proof of environmental impact. Donors and the public can independently verify that grants delivered the specific environmental outcomes they funded.",
      },
      {
        question: "Does Karma support grants across different environmental focus areas?",
        answer:
          "Yes. You can configure separate grant programs for conservation, climate mitigation, biodiversity, water stewardship, sustainable agriculture, and other environmental focus areas within one account. Each program has its own application criteria, review panels, and milestone requirements while sharing a unified portfolio view that enables cross-program analysis, aggregated environmental impact reporting, and strategic resource allocation.",
      },
      {
        question:
          "How does Karma handle environmental grants with seasonal or weather-dependent milestones?",
        answer:
          "Karma allows milestone deadlines to be adjusted for seasonal dependencies common in environmental work, such as planting windows or migration monitoring periods. Program officers can modify milestone timelines without disrupting the overall grant structure, and the system tracks revised schedules alongside original targets to maintain full accountability while accommodating ecological realities.",
      },
    ],
    ctaText: "Power Environmental Grant Programs with Karma",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-social-impact",
    title: "Grant Management for Social Impact Organizations",
    metaDescription:
      "Manage social impact grants with AI-powered reviews, milestone tracking, and onchain transparency. Prove outcomes with verifiable data.",
    heading: "Grant Management for Social Impact Organizations",
    tldr: "Karma helps social impact organizations manage grants with outcome-focused milestone tracking, AI-assisted review, and onchain transparency that provides funders with verifiable proof that investments create real social change.",
    datePublished: "2026-03-16",
    idealFor: [
      "Community development financial institutions funding local enterprises",
      "Workforce development organizations managing training program grants",
      "Health equity funders supporting underserved community programs",
      "Poverty alleviation foundations tracking household outcome metrics",
      "Social enterprise accelerators funding scalable impact models",
      "Collective impact coalitions coordinating cross-sector grants",
    ],
    testimonial: {
      quote:
        "Our funders wanted proof that grants created lasting change, not just activity reports. Karma lets us track employment rates six months after workforce training, not just how many people attended. That outcome-level accountability helped us secure three new major philanthropic partnerships.",
      author: "David Okonkwo",
      role: "Chief Impact Officer",
      organization: "Pathways Social Impact Fund",
    },
    secondaryCta: {
      text: "See how social impact organizations use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Define your outcome framework",
        description:
          "Configure milestone structures around verified social outcomes rather than activities, aligning with your theory of change and impact measurement methodology.",
      },
      {
        title: "Evaluate proposals on impact potential",
        description:
          "Use AI-assisted scoring to rank proposals on theory of change strength, outcome measurement capability, and organizational capacity to deliver lasting change.",
      },
      {
        title: "Verify social outcomes at each milestone",
        description:
          "Require grantees to submit outcome evidence such as employment rates, health metrics, or household income data at each milestone before funds are released.",
      },
      {
        title: "Aggregate and communicate portfolio impact",
        description:
          "Compile individual grantee outcomes into portfolio-level impact metrics that demonstrate your collective social change to funders, boards, and partners.",
      },
    ],
    problem: {
      heading: "Social Impact Funders Struggle to Prove Outcomes Beyond Outputs",
      description:
        "Social impact organizations fund programs addressing poverty, health equity, workforce development, and community resilience. The persistent challenge is proving that grants create lasting change rather than just short-term outputs. When impact measurement relies on self-reported narratives without verification, funders cannot distinguish between programs that genuinely transform communities and those that simply check boxes. This accountability gap makes it harder to attract philanthropic capital to the organizations that need it most.",
    },
    solution: {
      heading: "Outcome-Focused Grant Management with Verifiable Social Impact",
      description:
        "Karma shifts social impact grant management from output tracking to outcome verification. AI-assisted review evaluates proposals on their theory of change and potential for measurable impact. Milestone-based disbursement ties funding to verified social outcomes rather than activity completion. Onchain records create an immutable evidence base that demonstrates real community impact, helping social impact funders attract more capital and directing it toward programs that work.",
    },
    capabilities: [
      "AI-assisted proposal evaluation scoring applications on theory of change, outcome potential, and organizational capacity",
      "Outcome-focused milestone tracking tying fund releases to verified social impact indicators",
      "Onchain impact attestations providing funders with tamper-proof evidence of social outcomes",
      "Portfolio dashboards tracking grants across multiple social impact focus areas and geographies",
      "Impact aggregation compiling individual grantee outcomes into portfolio-level social impact metrics",
      "Customizable outcome frameworks supporting diverse impact measurement methodologies",
    ],
    faqs: [
      {
        question: "How does Karma help measure social impact beyond simple output counting?",
        answer:
          "Karma's milestone system is configured around outcomes rather than activities. Instead of tracking that a workshop was held, you track verified results like employment rates among participants six months later. Grantees submit outcome evidence at each milestone, and reviewers verify the data before funds are released, creating a verified chain of impact evidence tied to real community change.",
      },
      {
        question: "Can we aggregate impact data across multiple grantees?",
        answer:
          "Yes. Karma's portfolio dashboards aggregate outcome metrics across your entire grant portfolio with flexible filtering options. You can see total impact across all grantees broken down by focus area, geography, or program type, making it straightforward to compile portfolio-level impact reports for your board, major funders, and annual impact publications.",
      },
      {
        question: "How does onchain transparency build funder trust?",
        answer:
          "Every verified outcome, review decision, and fund disbursement is recorded as an immutable onchain attestation that funders can independently verify. Funders can confirm that their contributions led to documented, reviewer-verified social outcomes without relying solely on self-reported data. This verifiable accountability helps social impact organizations attract and retain philanthropic partners over the long term.",
      },
      {
        question: "Does Karma work with different impact measurement frameworks?",
        answer:
          "Karma supports customizable milestone and outcome definitions, so you can align with any impact measurement framework your organization uses. Whether you follow logic models, theory of change, IRIS+ metrics, or custom indicators, the platform adapts to your methodology rather than imposing a rigid structure, ensuring consistency with your existing reporting practices.",
      },
      {
        question: "Can grantees from underserved communities easily use the platform?",
        answer:
          "Karma is designed with accessibility as a priority. Grantees interact through a simple, intuitive web interface that requires no specialized software or technical expertise. The milestone submission process is straightforward and guided with clear instructions at each step, reducing barriers for organizations with limited administrative capacity or staff who are less experienced with digital tools.",
      },
    ],
    ctaText: "Prove Social Impact with Karma Grant Management",
    ctaHref: PAGES.FOUNDATIONS,
  },
  {
    slug: "grant-management-for-international-development",
    title: "Grant Management for International Development",
    metaDescription:
      "Manage international development grants with milestone tracking, AI-powered reviews, and onchain transparency for NGOs and agencies.",
    heading: "Grant Management for International Development",
    tldr: "Karma provides international development organizations with a grant management platform that delivers cross-border accountability through AI-assisted review, milestone-based disbursement, and onchain transparency across diverse implementing partners and geographies.",
    datePublished: "2026-03-16",
    idealFor: [
      "Bilateral development agencies funding country-level programs",
      "International NGOs managing multi-country grant portfolios",
      "Multilateral development funds coordinating regional initiatives",
      "Private foundations funding global health and education programs",
      "South-South cooperation agencies supporting peer learning grants",
    ],
    testimonial: {
      quote:
        "We manage grants across 14 countries with implementing partners ranging from government ministries to grassroots organizations. Karma gave us a single accountability layer that works across every context, and our donor governments now get verified outcome reports instead of narrative summaries they cannot independently validate.",
      author: "Amara Diallo",
      role: "Head of Grants and Partnerships",
      organization: "Global Horizons Development Trust",
    },
    secondaryCta: {
      text: "See how international development organizations use Karma",
      href: PAGES.FOUNDATIONS,
    },
    steps: [
      {
        title: "Configure your multi-country grants framework",
        description:
          "Set up organizational hierarchies, role-based access for headquarters and regional offices, and program structures that span multiple countries and implementing partners.",
      },
      {
        title: "Evaluate proposals across standardized criteria",
        description:
          "Use AI-assisted scoring to assess proposals from diverse geographies against consistent development impact criteria while accounting for regional context.",
      },
      {
        title: "Track milestones across implementing partners",
        description:
          "Monitor deliverables from implementing partners worldwide through lightweight web forms optimized for varying connectivity conditions and mobile devices.",
      },
      {
        title: "Report verified outcomes to donor governments",
        description:
          "Compile verified milestone data into donor-specific report formats required by bilateral agencies, multilateral bodies, and private foundation partners.",
      },
    ],
    problem: {
      heading: "International Development Grants Span Complex Multi-Country Operations",
      description:
        "International development organizations manage grants across dozens of countries with diverse implementing partners, regulatory environments, and reporting requirements. Tracking deliverables from a rural health clinic in sub-Saharan Africa alongside an education program in Southeast Asia through the same spreadsheet-based system is unmanageable. Currency complexities, language barriers, and limited connectivity compound the challenge. When accountability breaks down across these distances, donor governments and multilateral funders question whether aid reaches intended beneficiaries.",
    },
    solution: {
      heading: "Global Grant Management with Local Accountability",
      description:
        "Karma brings structure to international development grant management without imposing rigid workflows that do not fit diverse operating contexts. AI-assisted review evaluates proposals across standardized criteria while accounting for regional context. Milestone-based disbursement ensures funds flow to implementing partners who demonstrate verified progress. Onchain records create a universal, tamper-proof accountability layer that works across borders, languages, and political environments, giving donor governments and multilateral funders confidence in development outcomes.",
    },
    capabilities: [
      "AI-powered proposal evaluation scoring applications across standardized development impact criteria",
      "Milestone-based disbursement ensuring fund releases are tied to verified on-the-ground deliverables",
      "Onchain transparency providing donor governments and multilateral bodies with tamper-proof accountability records",
      "Multi-country portfolio dashboards tracking grants across regions, sectors, and implementing partners",
      "Automated donor reporting compiling verified outcomes into formats required by bilateral and multilateral funders",
      "Configurable review workflows supporting headquarters-led, regional, and in-country evaluation models",
      "Role-based access supporting complex organizational hierarchies with headquarters, regional offices, and local partners",
    ],
    faqs: [
      {
        question:
          "How does Karma handle grant management across multiple countries and implementing partners?",
        answer:
          "Karma supports multi-level organizational structures with role-based access for headquarters staff, regional coordinators, and local implementing partners. Each level has appropriate visibility and permissions tailored to their responsibilities. Portfolio dashboards aggregate data across all countries and partners while allowing drill-down to individual project performance, giving every stakeholder the view they need.",
      },
      {
        question: "Can implementing partners in low-connectivity environments use Karma?",
        answer:
          "Karma is a web-based platform optimized for performance in varying connectivity conditions common across developing regions. Implementing partners submit milestone updates through lightweight web forms that work on mobile devices and low-bandwidth connections. The platform does not require specialized software installation or persistent high-bandwidth connections, making it accessible to partners in remote areas.",
      },
      {
        question: "How does onchain transparency improve development accountability?",
        answer:
          "Onchain attestations create an immutable record of every milestone verification, fund disbursement, and review decision that exists independently of any single government or organization. This provides a neutral accountability layer that donor governments, multilateral bodies, and civil society organizations can verify independently, addressing trust deficits that often undermine confidence in international aid effectiveness.",
      },
      {
        question: "Does Karma meet the reporting requirements of major development funders?",
        answer:
          "Karma compiles verified milestone data, disbursement records, and impact metrics into structured reports that can be configured to match specific formats and timelines. The platform supports the reporting requirements of bilateral donors, multilateral development banks, UN agencies, and private foundations, reducing the manual effort of reformatting data for each funder's unique reporting template.",
      },
      {
        question: "Can Karma track development grants across different sectors?",
        answer:
          "Yes. You can configure separate grant programs for health, education, governance, infrastructure, climate adaptation, and other development sectors within the same organizational account. Each program has sector-specific application criteria, milestone definitions, and review panels while sharing a unified portfolio view that enables cross-sector analysis and helps identify synergies and coordination opportunities between programs.",
      },
    ],
    ctaText: "Scale International Development Grants with Karma",
    ctaHref: PAGES.FOUNDATIONS,
  },
];
