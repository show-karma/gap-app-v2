/**
 * The direct-answer Q&A for this article. Rendered as the visible sections
 * below AND emitted as FAQPage JSON-LD from the same array, so the structured
 * data never claims something a reader cannot see.
 *
 * Every claim about Karma's AI evaluation traces to the implementation:
 * evaluations run on submission and edit and can be re-run by reviewers or in
 * bulk by program admins; each program configures its own evaluation prompt
 * and model, and prompts are versioned with recorded authorship; the internal
 * evaluation is stripped from applicant responses server-side; no evaluation
 * code path changes an application's status — approvals and rejections go
 * through a human, permission-gated status endpoint; each stored evaluation
 * records the prompt version that produced it and when it ran; evaluation
 * failures never block a submission.
 */
export const AI_GRANT_EVALUATION_FAQS = [
  {
    question: "Should foundations let AI score grant applications?",
    answer:
      "AI scoring is defensible when it is advisory, consistent, and auditable — and indefensible as a decision-maker. Used as a first pass, it gives every application the same structured read before a human reviews it. On Karma, an AI evaluation can never approve or reject an application: status changes are made only by people with review permission, and the AI output sits in a separate analysis view that reviewers can re-run, weigh, or ignore.",
  },
  {
    question: "What human oversight keeps AI-assisted review defensible?",
    answer:
      "Three controls: decision authority, transparency, and traceability. Decision authority stays human — on Karma no AI output changes an application's status; approving, rejecting, or requesting revisions is a permission-gated human action. Transparency means applicants see only the feedback intended for them, while the internal reviewer evaluation is never shown to applicants. Traceability means every evaluation records which version of the program's evaluation prompt produced it and when it ran, so a program can explain any score after the fact.",
  },
  {
    question: "What does Karma's AI evaluation check on each applicant?",
    answer:
      "Three separate checks. First, optional applicant-facing feedback while the application is being written, labeled as guidance only. Second, an internal reviewer-only evaluation that scores the application against criteria the program itself defines — each program writes its own evaluation prompt and chooses the model, and prompts are versioned. Third, a track-record evaluation that summarizes the applicant's recorded history on the platform — grants and milestones completed, milestones past due — with strengths and red flags grounded only in recorded data. After an award, milestone-completion evidence is also AI-rated with written reasoning.",
  },
  {
    question: "How does AI-assisted scoring help calibrate reviewers?",
    answer:
      "Reviewer calibration is about applying the same criteria the same way across hundreds of applications and several reviewers. A program-defined AI evaluation applies one written set of criteria to every submission, producing a consistent first-pass score reviewers can sort and compare against their own reads. Where a human review diverges sharply from the first pass, that divergence is visible and discussable — the AI score is a shared reference point, not a verdict.",
  },
  {
    question: "How much review time does AI-assisted scoring save?",
    answer:
      "There is no single figure that holds across programs, and Karma does not publish one. What AI assistance removes is the first-pass reading: summarizing long applications, applying the scoring criteria uniformly, and surfacing risk signals before a reviewer opens the file. How much time that frees depends on application volume, review depth, and how a program runs its committee.",
  },
] as const;
