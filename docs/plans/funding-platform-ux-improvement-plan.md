# Funding Platform UX Improvement Plan

## Executive Summary

This plan addresses the core usability issues in the Funding Platform admin module. Currently, after creating a program, admins are dropped back into the dashboard with no guidance on what to do next. They must discover configuration options hidden behind a small gear icon, navigate through 6 confusing tabs, and figure out why their program can't be enabled.

**Goal**: Make the funding platform intuitive and self-serve, reducing the need for handholding.

---

## Current Problems

### 1. Post-Creation Black Hole
- After creating a program, user gets a toast message and modal closes
- User is back at dashboard, must manually find their program
- No guidance on next steps

### 2. Incorrect "Manual Approval" Message
- Code bug: duplicate logic shows wrong message to admins
- Location: `CreateProgramModal.tsx:104-124`

### 3. Scattered Configuration (6 Hidden Tabs)
- Build, Settings, Post Approval, AI Config, Reviewers, Program Details
- Users don't know they need to visit all these tabs
- Program can't be enabled without configuring the Build tab

### 4. No Setup Progress Indicator
- Program cards don't show if setup is complete
- Enable toggle is disabled with unclear tooltip
- Users don't know what's missing

### 5. Poor Return Journey
- Only way back to settings is a tiny gear icon
- No distinction between "needs setup" vs "fully configured"
- "Configure Form" label doesn't convey full scope

### 6. Confusing Naming
- "Question Builder" / "Form Builder" doesn't describe what it really is
- It's actually "Program Setup" with form building + settings + reviewers + AI config

---

## Implementation Plan

### Phase 1: Fix Manual Approval Bug (P0 - Immediate)

**File**: `components/FundingPlatform/CreateProgramModal.tsx`

**Problem**: Lines 104-124 have duplicate logic checking `requiresManualApproval`

**Fix**: Remove the duplicate block (lines 117-124) since lines 104-113 already handle it with an early return.

**Before**:
```typescript
if (result.requiresManualApproval) {
  toast.success("Program created successfully. Please approve it manually...");
  reset();
  onSuccess();
  onClose();
  return;  // Early return
}

// This code is unreachable when requiresManualApproval is true
if (result.requiresManualApproval) {  // Duplicate check
  toast.success("Program created successfully. Please approve it manually...");
} else {
  toast.success("Program created and approved successfully!");
}
```

**After**:
```typescript
if (result.requiresManualApproval) {
  toast.success(
    "Program created successfully. Please approve it manually from the manage programs page.",
    { duration: 10000 }
  );
} else {
  toast.success("Program created and approved successfully!");
}

reset();
onSuccess();
onClose();
```

---

### Phase 2: Post-Creation Setup Wizard (P1 - High Priority)

#### 2.1 Create New Setup Wizard Page

**New File**: `app/community/[communityId]/admin/funding-platform/[programId]/setup/page.tsx`

**Purpose**: Guide admins through program setup after creation

**UI Design**:
```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Programs                                              │
│                                                                  │
│  🎉 Program Created: "My Grant Program"                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                  │
│  Complete these steps to start accepting applications:           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ✅ 1. Create Program                              Completed ││
│  │    Program details saved successfully                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○  2. Build Application Form                      Required  ││
│  │    Define the questions applicants will answer              ││
│  │                                          [Start Building →] ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○  3. Add Reviewers                              Recommended ││
│  │    Invite team members to review applications               ││
│  │                                          [Add Reviewers →]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○  4. Configure Settings                          Optional  ││
│  │    Email templates, success page, privacy settings          ││
│  │                                        [Configure →]        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ○  5. Enable Program                              Final Step ││
│  │    Make your program live and start accepting applications  ││
│  │                                        [Enable Program]     ││
│  │    ⚠️ Complete step 2 first                                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ─────────────────────────────────────────────────────────────── │
│  [Skip Setup - Return to Dashboard]                              │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.2 Modify CreateProgramModal to Redirect to Setup Wizard

**File**: `components/FundingPlatform/CreateProgramModal.tsx`

**Change**: After successful creation, redirect to setup wizard instead of just closing modal

```typescript
// After successful creation
const programId = result.programId;
router.push(`/community/${communityId}/admin/funding-platform/${programId}/setup`);
```

#### 2.3 Create Setup Progress Tracking

**New File**: `hooks/useProgramSetupProgress.ts`

**Purpose**: Calculate setup completion status for a program

```typescript
interface SetupProgress {
  steps: {
    id: string;
    title: string;
    description: string;
    status: 'completed' | 'pending' | 'disabled';
    required: boolean;
    href: string;
  }[];
  completedCount: number;
  totalRequired: number;
  isReadyToEnable: boolean;
  missingRequired: string[];
}

export function useProgramSetupProgress(programId: string): SetupProgress {
  // Check if form has fields configured
  // Check if reviewers are added
  // Check if email templates are customized
  // etc.
}
```

---

### Phase 3: Improved Program Cards with Status & Actions (P1 - High Priority)

#### 3.1 Update Program Card Component

**File**: `app/community/[communityId]/admin/funding-platform/page.tsx`

**Changes**:

1. **Add setup status indicator** at the top of each card
2. **Add "Settings" button** alongside "View Applications"
3. **Show "Complete Setup"** for incomplete programs
4. **Display what's missing** for incomplete programs

**New Card Design - Incomplete Program**:
```
┌──────────────────────────────────────────────────────────────┐
│ ⚠️ Setup Incomplete        ID 1039              program     │
│                                                              │
│ My New Program                                               │
│ Description of the program...                                │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ⚠️ Missing: Application form                             ││
│ │    Add at least one form field to enable this program    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Deadline: Jan 22, 2026                                       │
│                                                              │
│ ┌────────────────────┐  ┌────────────────────┐              │
│ │  Complete Setup    │  │ View Applications  │    🔗        │
│ │  (2 steps left)    │  │                    │              │
│ └────────────────────┘  └────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

**New Card Design - Complete Program**:
```
┌──────────────────────────────────────────────────────────────┐
│ [Toggle: ✅ Enabled]       ID 992               program     │
│                                                              │
│ ProPGF Batch 2                                               │
│ $4M milestone-based funding program...                       │
│                                                              │
│ ┌─────────────┐  ┌─────────────┐                            │
│ │ Applicants  │  │ Approval %  │                            │
│ │    102      │  │    0%       │                            │
│ └─────────────┘  └─────────────┘                            │
│                                                              │
│ Deadline: Jan 1, 2026                                        │
│                                                              │
│ 0 Approved | 0 Rejected | 89 Pending | 0 Under | 0 Revision │
│                                                              │
│ ┌────────────────────┐  ┌────────────────────┐              │
│ │ View Applications  │  │   ⚙️ Settings      │    🔗        │
│ └────────────────────┘  └────────────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

#### 3.2 Create ProgramCardActions Component

**New File**: `components/FundingPlatform/ProgramCard/ProgramCardActions.tsx`

```typescript
interface ProgramCardActionsProps {
  programId: string;
  communityId: string;
  isSetupComplete: boolean;
  missingSteps: number;
}

export function ProgramCardActions({
  programId,
  communityId,
  isSetupComplete,
  missingSteps,
}: ProgramCardActionsProps) {
  if (!isSetupComplete) {
    return (
      <div className="flex items-center gap-2">
        <Link href={`/community/${communityId}/admin/funding-platform/${programId}/setup`}>
          <Button variant="primary">
            Complete Setup ({missingSteps} steps left)
          </Button>
        </Link>
        <Link href={`/community/${communityId}/admin/funding-platform/${programId}/applications`}>
          <Button variant="secondary">View Applications</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href={`/community/${communityId}/admin/funding-platform/${programId}/applications`}>
        <Button variant="primary">View Applications</Button>
      </Link>
      <Link href={`/community/${communityId}/admin/funding-platform/${programId}/question-builder`}>
        <Button variant="secondary">
          <Cog6ToothIcon className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </Link>
    </div>
  );
}
```

---

### Phase 4: Rename & Restructure Program Configuration (P2)

#### 4.1 Rename "Question Builder" to "Program Settings"

**Files to Update**:
- `app/community/[communityId]/admin/funding-platform/[programId]/question-builder/page.tsx`
- All references in PAGES utility
- Navigation links

**Consider**: Creating a new route `/program-settings` and redirecting old route for backwards compatibility

#### 4.2 Restructure Tabs into Sidebar Navigation

**Current**: 6 horizontal tabs (Build, Settings, Post Approval, AI Config, Reviewers, Program Details)

**Proposed**: Vertical sidebar with grouped sections

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Back to Programs                                              │
│                                                                  │
│  Program Settings: ProPGF Batch 2                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                  │
│  ┌────────────────┐  ┌──────────────────────────────────────┐  │
│  │                │  │                                      │  │
│  │  SETUP         │  │  [Current Section Content]           │  │
│  │  ─────────     │  │                                      │  │
│  │  ✅ Program    │  │                                      │  │
│  │     Details    │  │                                      │  │
│  │                │  │                                      │  │
│  │  ○  Application│  │                                      │  │
│  │     Form *     │  │                                      │  │
│  │                │  │                                      │  │
│  │  ○  Post-      │  │                                      │  │
│  │     Approval   │  │                                      │  │
│  │     Form       │  │                                      │  │
│  │                │  │                                      │  │
│  │  TEAM          │  │                                      │  │
│  │  ─────────     │  │                                      │  │
│  │  ○  Reviewers  │  │                                      │  │
│  │                │  │                                      │  │
│  │  SETTINGS      │  │                                      │  │
│  │  ─────────     │  │                                      │  │
│  │  ○  Email      │  │                                      │  │
│  │     Templates  │  │                                      │  │
│  │                │  │                                      │  │
│  │  ○  Privacy    │  │                                      │  │
│  │                │  │                                      │  │
│  │  ADVANCED      │  │                                      │  │
│  │  ─────────     │  │                                      │  │
│  │  ○  AI Config  │  │                                      │  │
│  │                │  │                                      │  │
│  └────────────────┘  └──────────────────────────────────────┘  │
│                                                                  │
│  * Required to enable program                                    │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.3 Add Breadcrumb Navigation

**New Component**: `components/FundingPlatform/Breadcrumbs.tsx`

```
Dashboard > ProPGF Batch 2 > Settings > Reviewers
```

This helps users always know where they are and how to get back.

---

### Phase 5: Contextual Help & Tooltips (P3)

#### 5.1 Add Help Tooltips

Add (?) icons with explanatory tooltips throughout:

- **Application Form**: "Define the questions applicants will answer. You need at least one field to enable your program."
- **Reviewers**: "Invite team members to help review applications. They'll be able to view applications and leave comments."
- **Email Templates**: "Customize the emails sent to applicants when their application is approved or rejected."
- **AI Config**: "Configure AI-powered evaluation to automatically score applications based on your criteria."

#### 5.2 Add Inline Examples

For email templates, show example placeholders:
```
Available placeholders:
• {{applicantName}} - The applicant's name
• {{programName}} - Your program name
• {{referenceNumber}} - Application reference (e.g., APP-12345)
• {{reason}} - Your approval/rejection reason
• {{dashboardLink}} - Link to applicant's dashboard
```

#### 5.3 Add Empty State Guidance

When a section is empty, show helpful guidance:

```
┌─────────────────────────────────────────────────────────────┐
│  📝 No Application Form Fields Yet                          │
│                                                              │
│  Build your application form by adding fields from the      │
│  left panel. Common fields include:                         │
│                                                              │
│  • Project Name (text input)                                │
│  • Project Description (textarea)                           │
│  • Requested Amount (number)                                │
│  • Team Information (textarea)                              │
│                                                              │
│  [+ Add Your First Field]                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `app/community/[communityId]/admin/funding-platform/[programId]/setup/page.tsx` | Setup wizard page |
| `components/FundingPlatform/SetupWizard/SetupWizard.tsx` | Setup wizard component |
| `components/FundingPlatform/SetupWizard/SetupStep.tsx` | Individual setup step component |
| `components/FundingPlatform/ProgramCard/ProgramCardActions.tsx` | Card action buttons |
| `components/FundingPlatform/ProgramCard/SetupStatusBadge.tsx` | Setup status indicator |
| `components/FundingPlatform/Breadcrumbs.tsx` | Breadcrumb navigation |
| `components/FundingPlatform/Sidebar/SettingsSidebar.tsx` | Settings sidebar navigation |
| `hooks/useProgramSetupProgress.ts` | Setup progress calculation |

### Files to Modify

| File | Changes |
|------|---------|
| `components/FundingPlatform/CreateProgramModal.tsx` | Fix bug, redirect to setup wizard |
| `app/community/[communityId]/admin/funding-platform/page.tsx` | Update program cards with status & actions |
| `app/community/[communityId]/admin/funding-platform/[programId]/question-builder/page.tsx` | Add sidebar navigation, breadcrumbs |

---

## Implementation Order

```
Week 1: Foundation
├── Phase 1: Fix manual approval bug (1 hour)
├── Phase 2.3: Create useProgramSetupProgress hook (4 hours)
└── Phase 3.1: Add setup status to program cards (4 hours)

Week 2: Setup Wizard
├── Phase 2.1: Create setup wizard page (8 hours)
├── Phase 2.2: Modify CreateProgramModal redirect (2 hours)
└── Phase 3.2: Create ProgramCardActions component (4 hours)

Week 3: Navigation Improvements
├── Phase 4.1: Rename Question Builder (2 hours)
├── Phase 4.2: Create sidebar navigation (8 hours)
└── Phase 4.3: Add breadcrumb navigation (2 hours)

Week 4: Polish
├── Phase 5.1: Add help tooltips (4 hours)
├── Phase 5.2: Add inline examples (2 hours)
├── Phase 5.3: Add empty state guidance (4 hours)
└── Testing & bug fixes (8 hours)
```

---

## Success Metrics

After implementation, we should see:

1. **Reduced support requests** about "how do I set up a program"
2. **Faster time to first enabled program** (measurable via analytics)
3. **Higher completion rate** of program setup (fewer abandoned programs)
4. **Positive user feedback** on the new guided experience

---

## Appendix: User Journey Comparison

### Before (Current)

```
1. Click "Create New Program"
2. Fill form, click "Create"
3. See toast, modal closes
4. ❓ Now what?
5. Scroll through programs to find new one
6. ❓ Click gear icon (if you notice it)
7. Land on "Form Builder" page with 6 tabs
8. ❓ Which tab do I need?
9. Add form fields in "Build" tab
10. ❓ What else do I need?
11. Try to enable program
12. ❓ Why is toggle disabled?
13. Read tiny tooltip: "Program doesn't have configured form"
14. ❓ But I just configured it?!
15. Eventually figure out you need to save
16. Finally enable program
```

### After (Proposed)

```
1. Click "Create New Program"
2. Fill form, click "Create"
3. Automatically taken to Setup Wizard
4. See clear checklist: "Complete these 4 steps"
5. Click "Start Building" → taken to form builder
6. Add form fields, see progress update
7. Return to wizard, see step completed ✅
8. Add reviewers (optional but recommended)
9. Review settings (optional)
10. Click "Enable Program" → Done!
11. Return anytime via "Settings" button on card
```

---

## Questions for Review

1. Should the setup wizard be skippable? (Current plan: Yes, with "Skip Setup" link)
2. Should we send an email reminder if a program is created but not enabled after 24 hours?
3. Should we add a "duplicate program" feature to copy settings from an existing program?
4. Do we want to track setup completion analytics?

---

*Plan created: January 2026*
*Author: Claude Code UX Audit*
