# Application Detail Page Redesign - Implementation Plan

## Overview

Redesign the admin application detail page (`/community/[communityId]/admin/funding-platform/[programId]/applications/[applicationId]`) to use a tab-based full-width layout that improves readability and user experience.

**Current Issues:**
1. AI evaluations at bottom of page, only 50% width - hard to read
2. Split-screen layout forces scrolling down to read application, then back up to comment
3. Delete button awkwardly positioned in header
4. No clear separation between public and internal discussions

**Solution:** Tab-based full-width layout with consolidated header actions

---

## Final Design Specification

### Header Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to Applications                                                       │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │                                                                          │ │
│ │  Application Details                                                     │ │
│ │  APP-VXTPOBJS-NNTHLC                                                     │ │
│ │                                                                          │ │
│ │  Submitted by: applicant@email.com                                       │ │
│ │  Submitted: Dec 3, 2025 • Last updated: Dec 5, 2025                      │ │
│ │                                                                          │ │
│ │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│ │  │                                                                     │ │ │
│ │  │  [Approve ✓]  [Request Revision]  [Reject ✗]       [⋮ More Actions] │ │ │
│ │  │                                                                     │ │ │
│ │  └─────────────────────────────────────────────────────────────────────┘ │ │
│ │                                                      ┌──────────────────┐ │ │
│ │                                                      │ ● Under Review   │ │ │
│ │                                                      └──────────────────┘ │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Header Details:**
- Back button top-left
- Title "Application Details" with reference number below
- Metadata: applicant email, submitted date, last updated date
- Status badge positioned on the right side
- Action buttons in a row: Primary actions (Approve, Request Revision, Reject) + More Actions dropdown
- More Actions dropdown contains: Export PDF, Copy Link, Delete Application (red, danger)

### Main Tab Navigation

```
┌─────────────────┬─────────────────┬─────────────────┐
│  📋 Application │  🤖 AI Analysis │  💬 Discussion  │
└─────────────────┴─────────────────┴─────────────────┘
```

### Tab 1: Application (with Sub-tabs)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Sub-tabs: [Application]  [Post Approval]  (only if approved)          │
│                                                                        │
│  Toggle:   [Details]  [Changes]                   Version: v3 (latest) │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Field Label 1                                                    │  │
│  │ Field value rendered based on type (text, markdown, array, etc.) │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Field Label 2                                                    │  │
│  │ Field value...                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Milestones (special rendering)                                   │  │
│  │ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                  │  │
│  │ │ Milestone 1 │ │ Milestone 2 │ │ Milestone 3 │                  │  │
│  │ └─────────────┘ └─────────────┘ └─────────────┘                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ... more fields vertically stacked ...                                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Sub-tab behavior:**
- "Application" sub-tab: Shows applicationData fields
- "Post Approval" sub-tab: Only visible if application is approved AND postApprovalData exists
- "Changes" toggle: Shows version selector and diff viewer (existing functionality)

### Tab 2: AI Analysis (Full Width, Stacked)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🤖 AI Evaluation                                    [⟳ Re-run]   │  │
│  │    Visible to applicant                                          │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │                                                                  │  │
│  │  Score: 78/100                              Recommendation: ●    │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Summary                                                    │  │  │
│  │  │ The application demonstrates strong potential with clear   │  │  │
│  │  │ objectives and a capable team. However, the budget         │  │  │
│  │  │ allocation could benefit from more detailed breakdown...   │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Strengths                                                  │  │  │
│  │  │ • Strong team background with relevant experience          │  │  │
│  │  │ • Clear and measurable milestones                          │  │  │
│  │  │ • Realistic timeline for deliverables                      │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Areas for Improvement                                      │  │  │
│  │  │ • Budget breakdown needs more detail                       │  │  │
│  │  │ • Risk mitigation strategy could be stronger               │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 🔒 Internal AI Evaluation                           [⟳ Re-run]   │  │
│  │    For reviewer use only - not visible to applicants             │  │
│  ├──────────────────────────────────────────────────────────────────┤  │
│  │                                                                  │  │
│  │  Score: 72/100                              Priority: Medium     │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Red Flags                                                  │  │  │
│  │  │ • Budget estimate for milestone 2 appears low              │  │  │
│  │  │ • Limited contingency planning                             │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │ Recommendation                                             │  │  │
│  │  │ Consider requesting a more detailed budget breakdown       │  │  │
│  │  │ before approval. The team's background is solid but        │  │  │
│  │  │ execution risks should be discussed.                       │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ⚠️ AI evaluations are for guidance only and may not be fully accurate │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Conditional rendering:**
- If neither evaluation exists: Show empty state with "Run AI Evaluation" buttons
- If only external exists: Show only external evaluation (full width)
- If only internal exists: Show only internal evaluation (full width)
- If both exist: Stack vertically, external first, then internal

### Tab 3: Discussion (with Sticky Input)

```
┌────────────────────────────────────────────────────────────────────────┐
│                                                                        │
│  Activity Timeline                   Filter: [All ▾]                   │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📝 Status changed to "Under Review"                              │  │
│  │    by Admin User • Dec 5, 2025 at 2:30 PM                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 💬 Jane Doe (Admin)                          Dec 5, 2025 3:15 PM │  │
│  │                                                         [Edit ✏️] │  │
│  │                                                                  │  │
│  │ Thank you for your application. We have a few questions about    │  │
│  │ your proposed timeline for milestone 2. Could you provide more   │  │
│  │ details on the technical approach?                               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📄 Version 2 submitted                                           │  │
│  │    3 fields changed • Dec 4, 2025 at 1:00 PM                     │  │
│  │    [View Changes]                                                │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 📝 Application submitted                                         │  │
│  │    Dec 3, 2025 at 10:00 AM                                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ STICKY INPUT (position: sticky, bottom: 0)                             │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │                                                                  │  │
│ │ Add a comment...                                                 │  │
│ │                                                                  │  │
│ │                                                                  │  │
│ │                                         [B] [I] [📎]    [Send →] │  │
│ └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

**Sticky input behavior:**
- Comment input stays at bottom of tab content area
- Timeline scrolls independently above the input
- User can always see and access comment input without scrolling

---

## Implementation Phases

### Phase 1: Foundation & Header Restructure
**Goal:** Set up the new layout structure and redesign the header

**Files to modify:**
- `app/community/[communityId]/admin/funding-platform/[programId]/applications/[applicationId]/page.tsx`

**Files to create:**
- `components/FundingPlatform/ApplicationView/ApplicationHeader.tsx`
- `components/FundingPlatform/ApplicationView/HeaderActions.tsx`
- `components/FundingPlatform/ApplicationView/MoreActionsDropdown.tsx`

**Tasks:**

1.1 Create `ApplicationHeader` component
   - Extract header content from page.tsx
   - Display: title, reference number, applicant email, dates
   - Include status badge (positioned on right)
   - Responsive layout (stack on mobile)

1.2 Create `HeaderActions` component
   - Row of primary action buttons: Approve, Request Revision, Reject
   - Buttons disabled based on current status (terminal states)
   - Consistent button styling with icons

1.3 Create `MoreActionsDropdown` component
   - Dropdown menu using Headless UI
   - Items: Copy Link, Export PDF (future), Delete Application
   - Delete styled as danger action (red text)
   - Delete triggers existing DeleteApplicationModal

1.4 Update main page layout
   - Remove old header structure
   - Integrate new header components
   - Remove 2-column grid layout
   - Prepare for tab structure (full-width container)

**Acceptance Criteria:**
- [ ] Header displays all application metadata
- [ ] Status badge shows correctly with proper colors
- [ ] Action buttons work and respect status transitions
- [ ] More Actions dropdown opens/closes correctly
- [ ] Delete action opens modal and works as before
- [ ] Layout is responsive (mobile-friendly)

---

### Phase 2: Tab Navigation System
**Goal:** Implement the main tab navigation structure

**Files to create:**
- `components/FundingPlatform/ApplicationView/ApplicationTabs.tsx`
- `components/FundingPlatform/ApplicationView/TabPanel.tsx`

**Files to modify:**
- `app/community/[communityId]/admin/funding-platform/[programId]/applications/[applicationId]/page.tsx`

**Tasks:**

2.1 Create `ApplicationTabs` component
   - Tab navigation using Headless UI TabGroup
   - Three tabs: Application, AI Analysis, Discussion
   - Tab icons: 📋, 🤖, 💬
   - Active tab indicator styling
   - URL hash sync for tab state (optional but nice to have)

2.2 Create `TabPanel` wrapper component
   - Consistent padding and styling for tab content
   - Full-width container
   - Handles loading states

2.3 Integrate tabs into main page
   - Replace 2-column layout with tab structure
   - Move existing components into appropriate tabs
   - Maintain all existing functionality

**Acceptance Criteria:**
- [ ] Three tabs render correctly
- [ ] Tab switching works smoothly
- [ ] Active tab is visually distinct
- [ ] Tab content area is full-width
- [ ] Existing functionality preserved in each tab

---

### Phase 3: Application Tab with Sub-tabs
**Goal:** Redesign the Application tab with sub-tabs for Application/Post Approval

**Files to create:**
- `components/FundingPlatform/ApplicationView/ApplicationTab/index.tsx`
- `components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationSubTabs.tsx`
- `components/FundingPlatform/ApplicationView/ApplicationTab/ApplicationDataView.tsx`
- `components/FundingPlatform/ApplicationView/ApplicationTab/PostApprovalDataView.tsx`

**Files to modify:**
- `components/FundingPlatform/ApplicationView/ApplicationContent.tsx` (refactor/split)

**Tasks:**

3.1 Create `ApplicationTab` container component
   - Manages sub-tab state
   - Contains Details/Changes toggle
   - Contains version selector (when in Changes mode)

3.2 Create `ApplicationSubTabs` component
   - Sub-tabs: "Application" and "Post Approval"
   - "Post Approval" tab only visible when:
     - application.status === "approved" AND
     - application.postApprovalData exists
   - Smaller styling than main tabs (secondary navigation)

3.3 Create `ApplicationDataView` component
   - Renders applicationData fields vertically
   - Full-width field cards
   - Reuse existing field rendering logic from ApplicationContent
   - Handle all field types: text, markdown, arrays, milestones, etc.

3.4 Create `PostApprovalDataView` component
   - Renders postApprovalData fields
   - Uses post-approval form schema for labels
   - Same vertical layout as ApplicationDataView

3.5 Refactor `ApplicationContent` component
   - Extract field rendering logic into reusable utilities
   - Remove AI evaluation sections (moved to AI Analysis tab)
   - Remove post-approval section (moved to sub-tab)
   - Keep version comparison functionality

**Acceptance Criteria:**
- [ ] Sub-tabs render correctly
- [ ] Post Approval sub-tab only shows when appropriate
- [ ] Application data renders vertically (full-width cards)
- [ ] All field types render correctly
- [ ] Details/Changes toggle works
- [ ] Version comparison works in Changes mode
- [ ] Revision reason displays when status is revision_requested

---

### Phase 4: AI Analysis Tab
**Goal:** Create dedicated full-width AI Analysis tab

**Files to create:**
- `components/FundingPlatform/ApplicationView/AIAnalysisTab/index.tsx`
- `components/FundingPlatform/ApplicationView/AIAnalysisTab/AIEvaluationCard.tsx`
- `components/FundingPlatform/ApplicationView/AIAnalysisTab/EmptyEvaluationState.tsx`

**Files to modify:**
- `components/FundingPlatform/ApplicationView/AIEvaluation.tsx` (refactor for full-width)
- `components/FundingPlatform/ApplicationView/InternalAIEvaluation.tsx` (refactor for full-width)

**Tasks:**

4.1 Create `AIAnalysisTab` container component
   - Handles conditional rendering based on which evaluations exist
   - Shows empty state when no evaluations
   - Stacks evaluations vertically when multiple exist

4.2 Create `AIEvaluationCard` component
   - Reusable card wrapper for both evaluation types
   - Props: title, subtitle, icon, isInternal, children
   - Full-width card with consistent styling
   - Re-run button in card header

4.3 Refactor `AIEvaluationDisplay` for full-width
   - Remove half-width constraints
   - Better use of horizontal space for sections
   - Consider 2-column grid for Strengths/Weaknesses on large screens

4.4 Refactor `InternalAIEvaluationDisplay` for full-width
   - Same treatment as external evaluation
   - Keep purple/lock theme for internal indicator
   - Keep "reviewer only" disclaimer prominent

4.5 Create `EmptyEvaluationState` component
   - Shown when no evaluations exist
   - Buttons to run external/internal evaluations
   - Helpful messaging about what evaluations do

**Acceptance Criteria:**
- [ ] Empty state shows when no evaluations
- [ ] External evaluation renders full-width
- [ ] Internal evaluation renders full-width (below external)
- [ ] Re-run buttons work
- [ ] Internal evaluation shows "reviewer only" indicator
- [ ] Disclaimer shows at bottom
- [ ] Evaluations stack vertically (not side-by-side)

---

### Phase 5: Discussion Tab with Sticky Input
**Goal:** Redesign Discussion tab with sticky comment input

**Files to create:**
- `components/FundingPlatform/ApplicationView/DiscussionTab/index.tsx`
- `components/FundingPlatform/ApplicationView/DiscussionTab/TimelineContainer.tsx`
- `components/FundingPlatform/ApplicationView/DiscussionTab/StickyCommentInput.tsx`

**Files to modify:**
- `components/FundingPlatform/ApplicationView/CommentsSection.tsx` (refactor)
- `components/FundingPlatform/ApplicationView/CommentsTimeline.tsx` (refactor)

**Tasks:**

5.1 Create `DiscussionTab` container component
   - Layout: scrollable timeline area + sticky input at bottom
   - Uses CSS: display: flex; flex-direction: column; height: calc(100vh - header)
   - Timeline area: flex: 1; overflow-y: auto
   - Input area: flex-shrink: 0; position: sticky; bottom: 0

5.2 Create `TimelineContainer` component
   - Wraps existing CommentsTimeline
   - Scrollable container
   - Filter dropdown for timeline items (All, Comments Only, Status Changes Only)

5.3 Create `StickyCommentInput` component
   - Sticky positioning at bottom of tab
   - Background with border-top to separate from timeline
   - Shadow effect to indicate it's floating
   - Reuse existing MarkdownEditor and submit logic

5.4 Refactor `CommentsTimeline` for new layout
   - Remove built-in CommentInput
   - Timeline items only
   - Ensure "View Changes" links work (switch to Application tab + Changes mode)

5.5 Update timeline item click behavior
   - When clicking "View Changes" on a version item:
     - Switch to Application tab
     - Switch to Changes mode
     - Select the appropriate version

**Acceptance Criteria:**
- [ ] Timeline scrolls independently
- [ ] Comment input is sticky at bottom
- [ ] Comment input has visual separation (shadow/border)
- [ ] Adding comment works and updates timeline
- [ ] Edit/delete comments work
- [ ] Status history items display correctly
- [ ] Version history items with "View Changes" link work
- [ ] Filter dropdown works (if implemented)

---

### Phase 6: Polish & Responsiveness
**Goal:** Final polish, responsive design, and edge cases

**Tasks:**

6.1 Mobile responsiveness
   - Stack header elements vertically on mobile
   - Full-width action buttons on mobile
   - Tab labels may need to be icon-only on very small screens
   - Ensure sticky input works well on mobile

6.2 Loading states
   - Skeleton loaders for each tab
   - Loading indicator for AI evaluation generation
   - Loading state for comment submission

6.3 Error states
   - Error boundaries for each tab
   - Graceful fallbacks for failed data fetching
   - Error messages for failed actions

6.4 Accessibility
   - Proper ARIA labels for tabs
   - Keyboard navigation for tabs
   - Focus management when switching tabs
   - Screen reader announcements for status changes

6.5 Animation and transitions
   - Smooth tab transitions
   - Comment add/edit/delete animations
   - Status change animations

6.6 Edge cases
   - Very long application data
   - Very long AI evaluation text
   - Many comments (performance)
   - Deep linking to specific tab

**Acceptance Criteria:**
- [ ] Works well on mobile devices
- [ ] Loading states are smooth
- [ ] Errors are handled gracefully
- [ ] Keyboard navigation works
- [ ] Transitions are smooth
- [ ] Performance is acceptable with large data

---

## File Structure After Implementation

```
components/FundingPlatform/ApplicationView/
├── ApplicationHeader.tsx           # NEW - Header with metadata
├── HeaderActions.tsx               # NEW - Action buttons row
├── MoreActionsDropdown.tsx         # NEW - Dropdown with delete, etc.
├── ApplicationTabs.tsx             # NEW - Main tab navigation
├── TabPanel.tsx                    # NEW - Tab content wrapper
│
├── ApplicationTab/                 # NEW - Application tab components
│   ├── index.tsx                   # Container with sub-tabs
│   ├── ApplicationSubTabs.tsx      # Application / Post Approval sub-tabs
│   ├── ApplicationDataView.tsx     # Renders application fields
│   └── PostApprovalDataView.tsx    # Renders post-approval fields
│
├── AIAnalysisTab/                  # NEW - AI Analysis tab components
│   ├── index.tsx                   # Container with conditional rendering
│   ├── AIEvaluationCard.tsx        # Reusable card wrapper
│   └── EmptyEvaluationState.tsx    # Empty state with run buttons
│
├── DiscussionTab/                  # NEW - Discussion tab components
│   ├── index.tsx                   # Container with sticky layout
│   ├── TimelineContainer.tsx       # Scrollable timeline wrapper
│   └── StickyCommentInput.tsx      # Sticky comment input
│
├── ApplicationContent.tsx          # MODIFIED - Refactored, less responsibility
├── CommentsSection.tsx             # MODIFIED - Simplified
├── CommentsTimeline.tsx            # MODIFIED - Timeline items only
├── CommentItem.tsx                 # UNCHANGED
├── CommentInput.tsx                # UNCHANGED - Reused in StickyCommentInput
├── AIEvaluation.tsx                # MODIFIED - Full-width layout
├── InternalAIEvaluation.tsx        # MODIFIED - Full-width layout
├── AIEvaluationButton.tsx          # UNCHANGED
├── DeleteApplicationModal.tsx      # UNCHANGED
├── StatusChangeModal.tsx           # UNCHANGED
└── ... other existing files
```

---

## Dependencies & Considerations

### External Dependencies
- Headless UI (already used) - for tabs and dropdown
- Tailwind CSS (already used) - for styling
- No new dependencies required

### Breaking Changes
- None expected - all changes are internal restructuring
- URL structure remains the same
- API calls remain the same

### Testing Considerations
- Update any existing tests for ApplicationContent
- Add tests for new tab navigation
- Test sticky input behavior
- Test responsive layouts
- Test tab state persistence (if URL hash is used)

### Performance Considerations
- Lazy load tab content to reduce initial render
- Memoize expensive field rendering
- Virtual scrolling for very long timelines (if needed)

---

## Estimated Effort

| Phase | Components | Complexity |
|-------|------------|------------|
| Phase 1 | 3 new, 1 modify | Medium |
| Phase 2 | 2 new, 1 modify | Low |
| Phase 3 | 4 new, 1 modify | High |
| Phase 4 | 3 new, 2 modify | Medium |
| Phase 5 | 3 new, 2 modify | Medium |
| Phase 6 | Polish only | Medium |

---

## Future Enhancements (Out of Scope)

These are not part of the current implementation but noted for future consideration:

1. **Internal Notes Tab** - Private reviewer discussion (Tab 4 from original design)
2. **Export PDF** - Export application as PDF document
3. **Applicant View Preview** - See what applicant sees
4. **Bulk Actions** - Select multiple applications for batch operations
5. **Keyboard Shortcuts** - Quick actions via keyboard
6. **Real-time Updates** - WebSocket for live comment updates
