---
status: pending
priority: p3
issue_id: "007"
tags: [code-review, security, validation]
dependencies: []
---

# Consider Alphanumeric Validation for Access Codes

## Problem Statement

Access codes allow any characters except spaces and have minimum length validation, but special characters could cause edge cases with URL encoding.

**Why it matters**: While `encodeURIComponent` handles encoding, restricting to alphanumeric plus hyphens/underscores is safer and simpler.

## Findings

**Source**: Security Sentinel Agent

**Location**: `gap-app-v2/schemas/settingsConfigSchema.ts` (lines 12-23)

**Current Validation**:
```typescript
accessCode: z
  .string()
  .optional()
  .refine((code) => !code || code.length >= 6, {...})
  .refine((code) => !code || code.length <= 50, {...})
  .refine((code) => !code || !/\s/.test(code), {...})
```

**Missing**: Character set validation

## Proposed Solutions

### Option A: Add alphanumeric validation (Recommended)
Restrict to letters, numbers, hyphens, underscores.

```typescript
.refine((code) => !code || /^[a-zA-Z0-9_-]+$/.test(code), {
  message: "Access code can only contain letters, numbers, hyphens, and underscores",
})
```

**Pros**: Simpler, safer, user-friendly
**Cons**: Restricts valid codes
**Effort**: Very Low (15 minutes)
**Risk**: Low

### Option B: Keep current validation
Trust encodeURIComponent to handle special characters.

**Pros**: More flexible
**Cons**: Potential edge cases
**Effort**: None
**Risk**: Low

## Recommended Action

Option A - Add alphanumeric validation

## Technical Details

**Files to Modify**:
- `schemas/settingsConfigSchema.ts`

## Acceptance Criteria

- [ ] Access code validation includes character set check
- [ ] Error message is clear and helpful
- [ ] Existing valid codes still work
- [ ] Test with various special characters

## Work Log

| Date | Action | Learnings |
|------|--------|-----------|
| 2026-01-19 | Created from code review | Security Sentinel suggested as improvement |

## Resources

- PR Branch: `feat/phase5-ux-improvements-sidebar`
