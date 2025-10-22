# 🎨 Update Community Stats UI: Project Updates with Breakdown Tooltip

## Overview
This PR updates the community statistics display on the community page to show **"Project Updates"** instead of "Total Milestones", with an interactive tooltip that provides a detailed breakdown of all activity components.

## 🎯 Changes

### UI/UX Improvements
1. **Stat Card Update**: Changed third stat from "Total Milestones" → **"Project Updates"**
2. **Interactive Tooltip**: Added info icon (ⓘ) that displays detailed breakdown on hover
3. **Comprehensive Breakdown**: Shows 6 separate metrics:
   - Project Milestones
   - Project Milestone Completions
   - Project Updates
   - Grant Milestones
   - Grant Milestone Completions
   - Grant Updates

### Visual Design
- Clean, organized tooltip layout with proper spacing
- Two-column format: label on left, formatted number on right
- Section title: "Project Updates Breakdown"
- Separator line for visual hierarchy
- Full dark mode support
- Responsive tooltip positioning

### Technical Updates
1. **TypeScript Types** (`types/community.ts`)
   - Added `ProjectUpdatesBreakdown` interface
   - Updated `CommunityStatsV2` to include `projectUpdates` and `projectUpdatesBreakdown`

2. **Query Utility** (`utilities/queries/getCommunityDataV2.ts`)
   - Updated default return values to match new API structure
   - Added proper fallback values for breakdown

3. **Component** (`components/Pages/Communities/Impact/StatCards.tsx`)
   - Imported `InfoTooltip` component
   - Implemented tooltip with all 6 breakdown items
   - Updated to use `data?.projectUpdates`
   - Added info icon trigger next to title

## 📸 Expected UI

**Before:**
```
┌─────────────────────────────┐
│ Total Milestones            │
│ 1,570                       │
└─────────────────────────────┘
```

**After:**
```
┌─────────────────────────────┐
│ Project Updates      ⓘ      │  ← Hover over ⓘ
│ 3,301                       │
└─────────────────────────────┘

Tooltip on hover:
╔═══════════════════════════════════╗
║ Project Updates Breakdown         ║
║ ───────────────────────────────── ║
║ Project Milestones:           850 ║
║ Project Milestone Completions:620 ║
║ Project Updates:              430 ║
║ Grant Milestones:             720 ║
║ Grant Milestone Completions:  580 ║
║ Grant Updates:                101 ║
╚═══════════════════════════════════╝
```

## 🔧 Implementation Details

### Component Structure
```tsx
{
  title: "Project Updates",
  value: data?.projectUpdates,
  displayValue: formatCurrency(data.projectUpdates),
  tooltip: (
    <ProjectUpdatesBreakdown />  // 6-item list
  )
}
```

### Tooltip Integration
- Uses existing `InfoTooltip` component (Radix UI)
- Positioned at top with start alignment
- Max width for proper text wrapping
- Automatic arrow positioning

### Data Flow
```
Backend API → getCommunityStatsV2() → Component State → Tooltip Display
```

## 📁 Files Modified

### TypeScript Types (1 file)
- `types/community.ts` - Added ProjectUpdatesBreakdown interface

### Utilities (1 file)
- `utilities/queries/getCommunityDataV2.ts` - Updated default values

### Components (1 file)
- `components/Pages/Communities/Impact/StatCards.tsx` - UI implementation

**Total: 3 files modified**

## ✅ Quality Assurance

- [x] No linter errors
- [x] TypeScript compilation successful
- [x] Follows gap-app-v2 component rules
- [x] Uses Tailwind CSS for all styling
- [x] Proper dark mode support
- [x] Responsive design
- [x] Accessibility: ARIA labels and keyboard navigation
- [x] Uses existing utility components
- [x] Proper number formatting
- [x] Clear, descriptive labels

## 🧪 Testing

### Manual Testing Steps
1. Navigate to `/community/celo` (or any community page)
2. Verify third stat card shows "Project Updates" title
3. Hover over the info icon (ⓘ) next to the title
4. Verify tooltip appears with 6-item breakdown
5. Check all numbers are properly formatted
6. Test in dark mode
7. Test on mobile/tablet screen sizes

### Expected Behavior
- Tooltip appears on hover over info icon
- Shows organized 6-item breakdown
- Numbers formatted with commas
- Tooltip disappears when hover ends
- Works in both light and dark themes

## 🔄 Backend Integration

This PR integrates with the backend changes from PR: **"Enhance Community Stats with Comprehensive Project Updates Breakdown"**

### API Endpoint
```
GET /v2/communities/:slug/stats
```

### Response Structure
```json
{
  "projectUpdates": 3301,
  "projectUpdatesBreakdown": {
    "projectMilestones": 850,
    "projectCompletedMilestones": 620,
    "projectUpdates": 430,
    "grantMilestones": 720,
    "grantCompletedMilestones": 580,
    "grantUpdates": 101
  }
}
```

## 📚 Tech Stack

- **React Query**: Data fetching and caching
- **Radix UI**: Tooltip component (via InfoTooltip wrapper)
- **TailwindCSS**: Styling and responsiveness
- **TypeScript**: Type safety
- **Next.js**: App Router framework

## 🎨 Design Decisions

### Why "Project Updates"?
More accurately represents the comprehensive activity metric that includes both project and grant milestones, completions, and updates.

### Why Tooltip Instead of Expanded Card?
- Cleaner, less cluttered UI
- Progressive disclosure - details on demand
- Consistent with other stat cards
- Mobile-friendly (tap to view)

### Why 6 Separate Items?
Provides transparency and allows users to:
- Understand where activity comes from
- Identify most active components
- Verify accuracy of totals
- Analyze project vs grant activity

## 🚀 Deployment Notes

- No environment variables required
- No database changes needed
- Backward compatible with API
- Works with existing API response structure
- Graceful fallback if breakdown data is missing

## 👥 Reviewers

Please verify:
- [ ] Tooltip displays correctly on hover
- [ ] All 6 metrics are shown with proper labels
- [ ] Numbers are formatted correctly
- [ ] Dark mode styling is correct
- [ ] Mobile responsive behavior works
- [ ] Matches design standards

## 📖 Related Documentation

- Backend PR: "Enhance Community Stats with Comprehensive Project Updates Breakdown"
- Component Rules: `.cursor/rules/gap-app-v2/components-rule.mdc`
- Styling Guide: `.cursor/rules/gap-app-v2/styling-rule.mdc`

## 🎯 Benefits

1. **Transparency**: Users see exactly what contributes to project updates
2. **Analytics**: Better understanding of community activity patterns
3. **Validation**: Can verify total = sum of breakdown
4. **Insights**: Identify whether projects or grants are more active
5. **UX**: Clean interface with details on demand

