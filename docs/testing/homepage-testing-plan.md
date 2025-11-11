# Homepage Testing Plan - Comprehensive Strategy

## 📋 Overview

This document outlines the comprehensive testing strategy for the Karma GAP homepage (`/app/page.tsx`), following the same high-quality standards established in the navbar testing suite (665 tests, 100% passing).

**Current Status**: 
- ✅ Basic integration tests: 5/5 passing
- 📝 Need: Comprehensive unit, integration, accessibility, and performance tests

**Target**: Production-grade test coverage with 80%+ statement coverage

---

## 🎯 Testing Objectives

1. **User Experience**: Ensure all interactive elements work correctly
2. **Data Integrity**: Validate API integration and data display
3. **Accessibility**: WCAG 2.2 AA compliance
4. **Performance**: Fast load times and smooth interactions
5. **Responsiveness**: Consistent experience across all devices
6. **SEO**: Proper metadata and semantic HTML

---

## 🏗️ Homepage Structure

The homepage consists of 8 main sections:

```
┌─────────────────────────────────────────┐
│ 1. Hero                                 │
│    - Headline + Description             │
│    - CTA: "Create Project"              │
│    - CTA: "Run a funding program"       │
│    - Community logos carousel           │
│    - Hero image                         │
├─────────────────────────────────────────┤
│ 2. Live Funding Opportunities           │
│    - Server Component (async data)      │
│    - Carousel with funding cards        │
│    - "View all" link                    │
├─────────────────────────────────────────┤
│ 3. Platform Features                    │
│    - Feature cards grid                 │
│    - Icons + descriptions               │
├─────────────────────────────────────────┤
│ 4. How It Works                         │
│    - Step-by-step process               │
│    - Visual illustrations               │
├─────────────────────────────────────────┤
│ 5. Join Community                       │
│    - Community engagement CTA           │
│    - Discord/Social links               │
├─────────────────────────────────────────┤
│ 6. FAQ                                  │
│    - Accordion with 8 questions         │
│    - Discord support link               │
├─────────────────────────────────────────┤
│ 7. Where Builders Grow                  │
│    - Success stories/testimonials       │
│    - Social proof                       │
└─────────────────────────────────────────┘
```

---

## 📊 Test Categories & Distribution

Following the testing pyramid approach:

```
                    ╱╲
                   ╱  ╲ 
                  ╱ E2E╲           ~10 tests (5%)
                 ╱──────╲
                ╱        ╲
               ╱ Integration╲      ~50 tests (25%)
              ╱─────────────╲
             ╱               ╲
            ╱  Unit Tests     ╲    ~140 tests (70%)
           ╱___________________╲
```

**Target**: ~200 total tests
- Unit Tests: 140 tests
- Integration Tests: 50 tests
- E2E Tests: 10 tests

---

## 🧪 Test Categories

### **1. UNIT TESTS** (Component-Level)

#### **1.1 Hero Component** (~25 tests)

**File**: `__tests__/homepage/unit/hero.test.tsx`

**Test Scenarios**:

```typescript
describe("Hero Component", () => {
  // Rendering Tests (5)
  - ✓ renders hero section with correct heading
  - ✓ renders description text
  - ✓ renders "Create Project" CTA button
  - ✓ renders "Run a funding program" CTA button
  - ✓ renders user avatars (3 images)
  
  // Interaction Tests (6)
  - ✓ clicking "Create Project" triggers correct action
  - ✓ clicking "Run a funding program" navigates to /funders
  - ✓ hovering over buttons shows visual feedback
  - ✓ community carousel auto-scrolls
  - ✓ carousel pauses on hover
  - ✓ carousel items are clickable
  
  // Responsive Tests (5)
  - ✓ layout adapts to mobile viewport (<768px)
  - ✓ layout adapts to tablet viewport (768px-1024px)
  - ✓ layout adapts to desktop viewport (>1024px)
  - ✓ CTA buttons stack vertically on mobile
  - ✓ hero image scales appropriately
  
  // Accessibility Tests (5)
  - ✓ all interactive elements have proper aria-labels
  - ✓ headings have correct hierarchy (h1)
  - ✓ images have alt text
  - ✓ buttons are keyboard navigable
  - ✓ no axe violations detected
  
  // Edge Cases (4)
  - ✓ handles missing community logos gracefully
  - ✓ handles missing user avatars
  - ✓ renders correctly with long text content
  - ✓ handles rapid carousel interactions
});
```

---

#### **1.2 LiveFundingOpportunities Component** (~30 tests)

**Files**: 
- `__tests__/homepage/unit/live-funding-opportunities.test.tsx`
- `__tests__/homepage/unit/funding-opportunity-card.test.tsx`

**Test Scenarios**:

```typescript
describe("LiveFundingOpportunities Component", () => {
  // Loading States (5)
  - ✓ shows skeleton while loading
  - ✓ displays correct number of skeleton cards
  - ✓ skeleton has proper styling
  - ✓ skeleton accessibility (aria-busy)
  - ✓ smooth transition from skeleton to content
  
  // Data Display (8)
  - ✓ renders funding opportunities when data loads
  - ✓ displays correct program count
  - ✓ shows "View all" link
  - ✓ renders empty state when no opportunities
  - ✓ displays program titles correctly
  - ✓ displays program descriptions
  - ✓ shows program funding amounts
  - ✓ displays program deadlines
  
  // Carousel Behavior (7)
  - ✓ carousel initializes correctly
  - ✓ next/prev navigation buttons work
  - ✓ auto-scroll functionality
  - ✓ swipe gesture on mobile
  - ✓ keyboard navigation (arrow keys)
  - ✓ dots/pagination indicators
  - ✓ circular navigation (loops)
  
  // Card Interactions (5)
  - ✓ clicking card navigates to program details
  - ✓ hovering card shows visual feedback
  - ✓ card displays community logo
  - ✓ card shows funding status badge
  - ✓ card displays remaining time
  
  // Error Handling (3)
  - ✓ handles API error gracefully
  - ✓ shows error message to user
  - ✓ provides retry mechanism
  
  // Accessibility (2)
  - ✓ carousel controls have aria-labels
  - ✓ no axe violations
});
```

---

#### **1.3 PlatformFeatures Component** (~15 tests)

**File**: `__tests__/homepage/unit/platform-features.test.tsx`

```typescript
describe("PlatformFeatures Component", () => {
  // Rendering (5)
  - ✓ renders section heading
  - ✓ renders all feature cards (3-6 cards)
  - ✓ each card has icon, title, description
  - ✓ renders in correct grid layout
  - ✓ maintains consistent card heights
  
  // Responsive Behavior (5)
  - ✓ 1 column on mobile
  - ✓ 2 columns on tablet
  - ✓ 3 columns on desktop
  - ✓ cards reflow properly
  - ✓ maintains spacing consistency
  
  // Interactions (3)
  - ✓ cards have hover effects
  - ✓ clicking card may expand details (if applicable)
  - ✓ animations work smoothly
  
  // Accessibility (2)
  - ✓ semantic HTML structure
  - ✓ no axe violations
});
```

---

#### **1.4 FAQ Component** (~25 tests)

**File**: `__tests__/homepage/unit/faq.test.tsx`

```typescript
describe("FAQ Component", () => {
  // Rendering (5)
  - ✓ renders section heading
  - ✓ renders all 8 FAQ items
  - ✓ all items start collapsed
  - ✓ renders Discord support link
  - ✓ proper semantic structure
  
  // Accordion Behavior (8)
  - ✓ clicking question expands answer
  - ✓ clicking again collapses answer
  - ✓ only one item open at a time (single mode)
  - ✓ smooth expand/collapse animation
  - ✓ clicking different item closes previous
  - ✓ maintains state during re-render
  - ✓ remembers last opened item
  - ✓ handles rapid clicks gracefully
  
  // Content (3)
  - ✓ displays all question text
  - ✓ displays answer text when expanded
  - ✓ renders markdown in answers correctly
  
  // Keyboard Navigation (5)
  - ✓ Tab navigates through questions
  - ✓ Enter/Space toggles accordion
  - ✓ Arrow keys navigate items (optional)
  - ✓ Focus visible on keyboard nav
  - ✓ Escape closes expanded item
  
  // Accessibility (4)
  - ✓ proper aria-expanded attributes
  - ✓ aria-controls links button to content
  - ✓ screen reader announcements
  - ✓ no axe violations
});
```

---

#### **1.5 HowItWorks, JoinCommunity, WhereBuildersGrow** (~20 tests)

**Files**:
- `__tests__/homepage/unit/how-it-works.test.tsx`
- `__tests__/homepage/unit/join-community.test.tsx`
- `__tests__/homepage/unit/where-builders-grow.test.tsx`

```typescript
// Each component ~6-7 tests

describe("HowItWorks Component", () => {
  - ✓ renders section heading
  - ✓ displays step-by-step process
  - ✓ shows illustrations/images
  - ✓ proper numbering/ordering
  - ✓ responsive layout
  - ✓ no accessibility violations
});

describe("JoinCommunity Component", () => {
  - ✓ renders community CTA
  - ✓ displays Discord button
  - ✓ Discord link opens in new tab
  - ✓ shows social media links
  - ✓ responsive layout
  - ✓ no accessibility violations
});

describe("WhereBuildersGrow Component", () => {
  - ✓ renders testimonials/success stories
  - ✓ displays builder profiles
  - ✓ shows metrics/achievements
  - ✓ responsive grid layout
  - ✓ handles missing data gracefully
  - ✓ no accessibility violations
});
```

---

#### **1.6 Supporting Components** (~15 tests)

**Files**:
- `__tests__/homepage/unit/create-project-button.test.tsx`
- `__tests__/homepage/unit/create-profile-button.test.tsx`
- `__tests__/homepage/unit/join-discord-button.test.tsx`

```typescript
describe("CTA Button Components", () => {
  // Each button ~5 tests
  
  CreateProjectButton:
  - ✓ renders with correct text
  - ✓ handles unauthenticated state
  - ✓ handles authenticated state
  - ✓ click triggers correct action
  - ✓ shows loading state
  
  JoinDiscordButton:
  - ✓ renders Discord icon + text
  - ✓ opens Discord in new tab
  - ✓ has correct rel attributes
  - ✓ tracks analytics event
  - ✓ accessible to screen readers
});
```

---

### **2. INTEGRATION TESTS** (Component Interactions)

#### **2.1 Homepage Layout Integration** (~15 tests)

**File**: `__tests__/homepage/integration/homepage-layout.test.tsx`

```typescript
describe("Homepage Layout Integration", () => {
  // Section Rendering (7)
  - ✓ all sections render in correct order
  - ✓ horizontal dividers between sections
  - ✓ proper spacing between sections
  - ✓ sections maintain alignment
  - ✓ responsive container max-width (1920px)
  - ✓ background colors applied correctly
  - ✓ sections visible in viewport
  
  // Scroll Behavior (4)
  - ✓ smooth scroll between sections
  - ✓ "skip to content" link works
  - ✓ anchor links navigate correctly
  - ✓ scroll position maintained on navigation
  
  // Performance (4)
  - ✓ initial render < 1 second
  - ✓ no layout shifts (CLS < 0.1)
  - ✓ images load progressively
  - ✓ lazy loading works for below-fold content
});
```

---

#### **2.2 Navigation Flow Integration** (~12 tests)

**File**: `__tests__/homepage/integration/navigation-flow.test.tsx`

```typescript
describe("Homepage Navigation Flows", () => {
  // CTA Navigation (6)
  - ✓ "Create Project" button navigates correctly (auth)
  - ✓ "Create Project" shows login modal (unauth)
  - ✓ "Run a funding program" → /funders
  - ✓ "View all opportunities" → /funding-map
  - ✓ Community logos → community pages
  - ✓ Funding card click → program details
  
  // External Links (3)
  - ✓ Discord link opens in new tab
  - ✓ Social links have correct URLs
  - ✓ External links have rel="noopener noreferrer"
  
  // Navigation Context (3)
  - ✓ navbar remains accessible on homepage
  - ✓ footer renders on homepage
  - ✓ breadcrumbs not shown on homepage
});
```

---

#### **2.3 Data Flow Integration** (~10 tests)

**File**: `__tests__/homepage/integration/data-flow.test.tsx`

```typescript
describe("Homepage Data Flow", () => {
  // API Integration (5)
  - ✓ fetches live funding opportunities successfully
  - ✓ handles API timeout gracefully
  - ✓ retries failed requests (3 attempts)
  - ✓ caches API responses appropriately
  - ✓ updates data on user action
  
  // Data Display (5)
  - ✓ displays fetched programs correctly
  - ✓ sorts programs by relevance/date
  - ✓ filters expired programs
  - ✓ shows "No opportunities" state
  - ✓ updates UI when data changes
});
```

---

#### **2.4 User Journey Integration** (~13 tests)

**File**: `__tests__/homepage/integration/user-journeys.test.tsx`

```typescript
describe("Homepage User Journeys", () => {
  // First-Time Visitor (5)
  - ✓ visitor sees all sections on load
  - ✓ visitor can scroll through content
  - ✓ visitor can click "Create Project" (leads to signup)
  - ✓ visitor can browse opportunities
  - ✓ visitor can access FAQ for help
  
  // Authenticated Builder (4)
  - ✓ builder sees "Create Project" CTA
  - ✓ builder can start project creation
  - ✓ builder can browse funding opportunities
  - ✓ builder can navigate to their projects
  
  // Funder Journey (4)
  - ✓ funder sees "Run a funding program" CTA
  - ✓ funder can navigate to funders page
  - ✓ funder can see platform benefits
  - ✓ funder can contact team
});
```

---

### **3. END-TO-END TESTS** (Cypress)

#### **3.1 Critical User Paths** (~10 tests)

**File**: `cypress/e2e/homepage/critical-paths.cy.ts`

```typescript
describe("Homepage E2E Critical Paths", () => {
  // Conversion Paths (5)
  - ✓ Complete: Homepage → Create Project → Project Created
  - ✓ Complete: Homepage → Browse Opportunities → Apply
  - ✓ Complete: Homepage → Run Program → Funder Signup
  - ✓ Complete: Homepage → Join Discord → Community
  - ✓ Complete: Homepage → FAQ → Support Contact
  
  // SEO & Performance (3)
  - ✓ Homepage loads in < 2 seconds
  - ✓ Meta tags present and correct
  - ✓ OpenGraph images load
  
  // Mobile E2E (2)
  - ✓ Mobile: Full homepage scroll journey
  - ✓ Mobile: Hamburger menu → navigation
});
```

---

### **4. ACCESSIBILITY TESTS** (WCAG 2.2 AA)

#### **4.1 Automated Accessibility Checks** (~8 tests)

**File**: `__tests__/homepage/accessibility/homepage-a11y.test.tsx`

```typescript
describe("Homepage Accessibility", () => {
  // Automated Checks (jest-axe)
  - ✓ Hero section passes axe
  - ✓ Live Funding section passes axe
  - ✓ Platform Features passes axe
  - ✓ How It Works passes axe
  - ✓ Join Community passes axe
  - ✓ FAQ section passes axe
  - ✓ Where Builders Grow passes axe
  - ✓ Full page passes axe (< 5 violations)
});
```

#### **4.2 Manual Accessibility Tests** (Checklist)

```markdown
- [ ] Keyboard Navigation
  - [ ] All interactive elements reachable via Tab
  - [ ] Tab order is logical
  - [ ] Focus indicators visible
  - [ ] No keyboard traps

- [ ] Screen Reader
  - [ ] Landmarks properly identified
  - [ ] Headings in correct hierarchy
  - [ ] Images have descriptive alt text
  - [ ] Links have descriptive text

- [ ] Color Contrast
  - [ ] Text meets 4.5:1 ratio (WCAG AA)
  - [ ] Large text meets 3:1 ratio
  - [ ] Interactive elements meet contrast requirements

- [ ] Motion & Animation
  - [ ] Respects prefers-reduced-motion
  - [ ] No auto-playing videos
  - [ ] Animations can be paused
```

---

### **5. PERFORMANCE TESTS** (~5 tests)

**File**: `__tests__/homepage/performance/homepage-performance.test.tsx`

```typescript
describe("Homepage Performance", () => {
  // Core Web Vitals
  - ✓ Largest Contentful Paint (LCP) < 2.5s
  - ✓ First Input Delay (FID) < 100ms
  - ✓ Cumulative Layout Shift (CLS) < 0.1
  
  // Custom Metrics
  - ✓ Hero section renders < 500ms
  - ✓ All above-fold content < 1s
});
```

---

## 📁 Recommended File Structure

```
__tests__/
└── homepage/
    ├── __infrastructure__/
    │   └── verify-setup.test.tsx
    │
    ├── unit/
    │   ├── hero.test.tsx                    (25 tests)
    │   ├── live-funding-opportunities.test.tsx (20 tests)
    │   ├── funding-opportunity-card.test.tsx   (10 tests)
    │   ├── platform-features.test.tsx          (15 tests)
    │   ├── faq.test.tsx                        (25 tests)
    │   ├── how-it-works.test.tsx               (7 tests)
    │   ├── join-community.test.tsx             (7 tests)
    │   ├── where-builders-grow.test.tsx        (7 tests)
    │   ├── create-project-button.test.tsx      (5 tests)
    │   ├── create-profile-button.test.tsx      (5 tests)
    │   └── join-discord-button.test.tsx        (5 tests)
    │
    ├── integration/
    │   ├── homepage-layout.test.tsx            (15 tests)
    │   ├── navigation-flow.test.tsx            (12 tests)
    │   ├── data-flow.test.tsx                  (10 tests)
    │   └── user-journeys.test.tsx              (13 tests)
    │
    ├── accessibility/
    │   └── homepage-a11y.test.tsx              (8 tests)
    │
    ├── performance/
    │   └── homepage-performance.test.tsx       (5 tests)
    │
    ├── fixtures/
    │   ├── funding-opportunities.ts            (mock data)
    │   ├── communities.ts                      (mock data)
    │   └── faq-items.ts                        (mock data)
    │
    ├── mocks/
    │   ├── handlers.ts                         (MSW handlers)
    │   └── server.ts                           (MSW server)
    │
    └── utils/
        ├── test-helpers.tsx                    (render utils)
        ├── mock-factories.ts                   (data factories)
        └── accessibility-helpers.ts             (a11y utils)
```

**Total Files**: ~25 test files  
**Total Tests**: ~200 tests

---

## 🎯 Test Priorities

### **Phase 1: Foundation** (Week 1)
**Priority: CRITICAL**

```
✅ Setup test infrastructure
✅ Create test helpers and utilities
✅ Write Hero component tests (25)
✅ Write FAQ component tests (25)
✅ Write LiveFundingOpportunities tests (30)

Total: ~80 tests
```

### **Phase 2: Core Components** (Week 2)
**Priority: HIGH**

```
✅ PlatformFeatures tests (15)
✅ HowItWorks tests (7)
✅ JoinCommunity tests (7)
✅ WhereBuildersGrow tests (7)
✅ CTA Button tests (15)

Total: ~51 tests
```

### **Phase 3: Integration** (Week 3)
**Priority: HIGH**

```
✅ Homepage layout integration (15)
✅ Navigation flow integration (12)
✅ Data flow integration (10)
✅ User journey integration (13)

Total: ~50 tests
```

### **Phase 4: Accessibility & Performance** (Week 4)
**Priority: MEDIUM**

```
✅ Accessibility tests (8)
✅ Performance tests (5)
✅ E2E tests with Cypress (10)

Total: ~23 tests
```

---

## ✅ Success Criteria

### **Coverage Targets**

```
Statements:  ≥ 85%  ✓
Branches:    ≥ 80%  ✓
Functions:   ≥ 75%  ✓
Lines:       ≥ 85%  ✓
```

### **Quality Metrics**

```
✓ All tests passing (100%)
✓ No flaky tests (0%)
✓ Fast execution (< 30 seconds total)
✓ Clear test descriptions
✓ Comprehensive error messages
✓ Proper mocking strategy
✓ No test pollution
```

### **Accessibility Compliance**

```
✓ WCAG 2.2 AA compliant
✓ Zero critical axe violations
✓ Keyboard navigation functional
✓ Screen reader compatible
✓ Color contrast meets standards
```

### **Performance Benchmarks**

```
✓ LCP < 2.5 seconds
✓ FID < 100 milliseconds
✓ CLS < 0.1
✓ Hero render < 500ms
✓ Full page interactive < 2s
```

---

## 🛠️ Testing Tools & Setup

### **Required Dependencies**

```json
{
  "devDependencies": {
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-axe": "^9.0.0",
    "msw": "^2.0.0",
    "cypress": "^13.0.0"
  }
}
```

### **Configuration Files**

```
jest.config.ts              (Jest configuration)
cypress.config.ts           (Cypress configuration)
__tests__/homepage/setup.ts (Global test setup)
```

---

## 📝 Test Writing Guidelines

### **1. Test Naming Convention**

```typescript
// ✅ Good
it("renders hero section with heading and CTA buttons", () => {});
it("should display loading skeleton while fetching funding opportunities", () => {});

// ❌ Bad
it("test 1", () => {});
it("works", () => {});
```

### **2. Test Structure (AAA Pattern)**

```typescript
it("should expand FAQ item when clicked", async () => {
  // Arrange
  const user = userEvent.setup();
  render(<FAQ />);
  
  // Act
  const firstQuestion = screen.getByText("What is Karma?");
  await user.click(firstQuestion);
  
  // Assert
  const answer = screen.getByText(/Karma is a modular funding/);
  expect(answer).toBeVisible();
});
```

### **3. Use Custom Render Utilities**

```typescript
// From navbar testing suite pattern
import { renderWithProviders } from "@/__tests__/homepage/utils/test-helpers";

renderWithProviders(<Hero />, {
  mockUseAuth: createMockAuth({ authenticated: true }),
  mockRouter: createMockRouter({ pathname: "/" }),
});
```

### **4. Mock External Dependencies**

```typescript
// Mock API calls
jest.mock("@/src/services/funding/getLiveFundingOpportunities", () => ({
  getLiveFundingOpportunities: jest.fn(),
}));

// Mock Next.js components
jest.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));
```

### **5. Test User Interactions**

```typescript
// Use userEvent for realistic interactions
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();
await user.click(button);
await user.type(input, "test query");
await user.keyboard("{Enter}");
```

---

## 🐛 Common Pitfalls to Avoid

### **1. Testing Implementation Details**

```typescript
// ❌ Bad - testing internal state
expect(component.state.isExpanded).toBe(true);

// ✅ Good - testing user-visible behavior
expect(screen.getByText("Answer text")).toBeVisible();
```

### **2. Not Waiting for Async Updates**

```typescript
// ❌ Bad
render(<AsyncComponent />);
expect(screen.getByText("Loaded data")).toBeInTheDocument();

// ✅ Good
render(<AsyncComponent />);
await waitFor(() => {
  expect(screen.getByText("Loaded data")).toBeInTheDocument();
});
```

### **3. Over-Mocking**

```typescript
// ❌ Bad - mocking everything
jest.mock("@/components/ui/button", () => jest.fn());
jest.mock("next/link", () => jest.fn());

// ✅ Good - mock only external dependencies
jest.mock("@/src/services/funding/getLiveFundingOpportunities");
// Use real Button and Link components
```

### **4. Flaky Tests**

```typescript
// ❌ Bad - timing-dependent
await new Promise(resolve => setTimeout(resolve, 1000));

// ✅ Good - use waitFor
await waitFor(() => {
  expect(screen.getByText("Loaded")).toBeInTheDocument();
}, { timeout: 3000 });
```

---

## 📚 Resources

### **Documentation**
- [React Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

### **Internal References**
- Navbar Testing Plan: `/docs/testing/navbar-testing-plan.md`
- Navbar Test Suite: `/__tests__/navbar/` (665 tests, 100% passing)
- Testing Strategy: `/docs/testing/testing-strategy.md`

---

## 🚀 Getting Started

### **Step 1: Setup**

```bash
# Install dependencies
pnpm install

# Run existing homepage test
pnpm test __tests__/integration/pages/home.test.tsx

# Verify setup
pnpm test __tests__/homepage/__infrastructure__/verify-setup.test.tsx
```

### **Step 2: Create Test Infrastructure**

```bash
# Create directory structure
mkdir -p __tests__/homepage/{unit,integration,accessibility,performance,fixtures,mocks,utils}

# Copy helpers from navbar suite (as reference)
# Adapt to homepage needs
```

### **Step 3: Start with High-Priority Tests**

```bash
# Phase 1: Hero component
touch __tests__/homepage/unit/hero.test.tsx

# Write 5 basic tests first
# Run: pnpm test __tests__/homepage/unit/hero.test.tsx

# Iterate and expand
```

---

## 📊 Progress Tracking

Use this checklist to track implementation:

```markdown
### Phase 1: Foundation (Week 1)
- [ ] Test infrastructure setup
- [ ] Test helpers created
- [ ] Hero component tests (25)
- [ ] FAQ component tests (25)
- [ ] LiveFundingOpportunities tests (30)

### Phase 2: Core Components (Week 2)
- [ ] PlatformFeatures tests (15)
- [ ] HowItWorks tests (7)
- [ ] JoinCommunity tests (7)
- [ ] WhereBuildersGrow tests (7)
- [ ] CTA Button tests (15)

### Phase 3: Integration (Week 3)
- [ ] Homepage layout integration (15)
- [ ] Navigation flow integration (12)
- [ ] Data flow integration (10)
- [ ] User journey integration (13)

### Phase 4: Accessibility & Performance (Week 4)
- [ ] Accessibility tests (8)
- [ ] Performance tests (5)
- [ ] E2E tests (10)
```

---

## 🎓 Lessons from Navbar Testing Suite

**What Worked Well**:
1. ✅ Comprehensive test helpers (`renderWithProviders`, mock factories)
2. ✅ Global mock state management (`mockAuthState`, `mockThemeState`)
3. ✅ Direct SDK mocking when MSW fails
4. ✅ Using `fireEvent` for mobile drawer interactions
5. ✅ Organized fixture data
6. ✅ Clear test descriptions
7. ✅ Proper cleanup between tests

**Apply to Homepage Tests**:
- Reuse test helper patterns
- Create homepage-specific mock state
- Mock `getLiveFundingOpportunities` directly
- Handle carousel/slider interactions carefully
- Organize FAQ and funding data as fixtures
- Maintain clear AAA test structure

---

## 🤝 Contributing

When adding new homepage tests:

1. **Follow Existing Patterns**: Reference navbar test suite
2. **Write Clear Descriptions**: Explain what is being tested
3. **Test User Behavior**: Not implementation details
4. **Add Fixtures**: For reusable test data
5. **Update This Plan**: When adding new test categories
6. **Run Full Suite**: Ensure no regressions

---

## 📈 Expected Timeline

```
Week 1: Foundation          →  80 tests (40%)
Week 2: Core Components     → 131 tests (65%)
Week 3: Integration         → 181 tests (90%)
Week 4: A11y & Performance  → 204 tests (100%)
```

**Total Effort**: ~4 weeks for full implementation  
**Maintenance**: ~2-4 hours per sprint for updates

---

## ✨ Final Notes

This testing plan is designed to:
- ✅ Match the quality of the navbar test suite (665 tests, 100% passing)
- ✅ Ensure homepage reliability and user experience
- ✅ Enable confident refactoring and feature additions
- ✅ Catch regressions before they reach production
- ✅ Document expected homepage behavior

**The homepage is the first impression for users** - comprehensive testing is essential!

---

**Last Updated**: 2025-01-11  
**Plan Version**: 1.0  
**Status**: Ready for Implementation

