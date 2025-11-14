# Biome Check Results Summary

**Date**: November 14, 2025  
**Project**: gap-app-v2  
**Total Files Checked**: 1,107

## 📊 Overview

| Severity | Count |
|----------|-------|
| **Errors** | 524 |
| **Warnings** | 2,478 |
| **Info** | 94 |
| **Total Issues** | 3,096 |

---

## 🔴 Top Issues by Category

### 1. Type Safety Issues (1,194 issues)

#### `noExplicitAny` - 877 warnings
**Severity**: Warning  
**Category**: Type Safety

Using `any` type defeats TypeScript's type checking.

**Examples**:
- Test files using `any` for mock data
- Event handlers with `any` parameters
- Generic components with untyped props

**Fix Strategy**:
```typescript
// ❌ Bad
const handleClick = (event: any) => {}

// ✅ Good
const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {}
```

---

### 2. Unused Code (921 issues)

#### `noUnusedImports` - 456 warnings
**Severity**: Warning  
**Auto-fixable**: ✅ Yes

Imports that are declared but never used.

**Examples**:
```typescript
import { unused, used } from './module'
// Only 'used' is referenced in the code
```

#### `noUnusedVariables` - 317 warnings
**Severity**: Warning

Variables declared but never used.

#### `noUnusedFunctionParameters` - 148 warnings
**Severity**: Warning

Function parameters that are never referenced.

**Note**: Many are intentional (e.g., placeholder parameters in callbacks)

---

### 3. CSS/Tailwind Issues (276 parse errors)

#### Tailwind `@apply` directives
**Severity**: Error  
**Files Affected**: 
- `styles/globals.css`
- `styles/markdown.module.css`

**Issue**: Biome doesn't recognize Tailwind's `@apply` directive by default.

**Solution Required**:
```json
// biome.json
{
  "css": {
    "parser": {
      "cssModules": true
    }
  }
}
```

**Common Errors**:
- Unknown at-rule: `@tailwind`
- Tailwind-specific syntax disabled
- Unknown type selectors: `h7`, `h8`

---

### 4. Console Usage (200 warnings)

#### `noConsole` - 200 warnings
**Severity**: Warning  
**Auto-fixable**: ✅ Yes (with unsafe flag)

Console statements found in production code.

**Breakdown**:
- Debug logging in utilities
- Development helpers
- Wallet validation logging

**Configuration**: Currently allows `console.warn`, `console.error`, `console.info`

---

### 5. React Dependency Issues (136 warnings)

#### `useExhaustiveDependencies` - 136 warnings
**Severity**: Warning

React hooks missing dependencies in their dependency arrays.

**Common in**:
- `useEffect` hooks
- `useCallback` hooks
- `useMemo` hooks

---

### 6. Array Index as Key (107 warnings)

#### `noArrayIndexKey` - 107 warnings
**Severity**: Warning

Using array index as React key property.

**Why it's problematic**:
- Can cause rendering issues
- Affects component state
- Performance problems with reordering

**Example**:
```typescript
// ❌ Bad
{items.map((item, index) => <div key={index}>{item}</div>)}

// ✅ Good
{items.map((item) => <div key={item.id}>{item}</div>)}
```

---

### 7. Accessibility Issues (81+ warnings)

#### `noImgElement` - 81 warnings
**Severity**: Warning

Using `<img>` instead of Next.js `<Image>` component.

**Fix**:
```typescript
// ❌ Bad
<img src="/path/to/image.jpg" alt="Description" />

// ✅ Good
import Image from 'next/image'
<Image src="/path/to/image.jpg" alt="Description" width={500} height={300} />
```

#### Other A11y Issues:
- `noLabelWithoutControl` - Labels without associated inputs
- `noSvgWithoutTitle` - SVGs missing titles/aria-labels
- `useKeyWithClickEvents` - Click events without keyboard handlers
- `noStaticElementInteractions` - Divs with click handlers
- `useButtonType` - Buttons without explicit type

---

### 8. Code Quality Issues

#### `useOptionalChain` - 29 warnings
**Auto-fixable**: ✅ Yes

```typescript
// ❌ Bad
if (obj && obj.prop) {}

// ✅ Good
if (obj?.prop) {}
```

#### `noUselessFragments` - 23 warnings
**Auto-fixable**: ✅ Yes

React fragments that only contain one child.

#### `noGlobalIsNan` - 22 warnings
**Auto-fixable**: ✅ Yes

```typescript
// ❌ Bad
isNaN(value)

// ✅ Good
Number.isNaN(value)
```

#### `useParseIntRadix` - 20 warnings
**Auto-fixable**: ✅ Yes

```typescript
// ❌ Bad
parseInt(value)

// ✅ Good
parseInt(value, 10)
```

---

## 📁 Most Affected Files

Based on the output, the most affected areas are:

1. **QuestionBuilder components** - High concentration of A11y issues
2. **Test files** - Many `any` type usages
3. **CSS files** - Tailwind directive parsing errors
4. **Utility files** - Console.log statements and type issues
5. **Form components** - Label/input association issues

---

## 🎯 Recommended Fix Priority

### Priority 1: Critical (Must Fix)
1. **CSS Parsing Errors** (276 errors)
   - Configure Biome to support Tailwind
   - Update `biome.json` with CSS parser options

### Priority 2: High (Should Fix Soon)
1. **Unused Imports** (456 warnings) - Auto-fixable
2. **Type Safety** (877 `any` usages) - Improve type definitions
3. **Accessibility** (81+ warnings) - Replace `<img>` with `<Image>`

### Priority 3: Medium (Should Fix)
1. **Console Statements** (200 warnings) - Remove or replace with proper logging
2. **React Dependencies** (136 warnings) - Fix hook dependencies
3. **Array Keys** (107 warnings) - Use proper keys

### Priority 4: Low (Nice to Have)
1. **Code simplifications** (optional chains, fragments, etc.)
2. **Unused variables** - Clean up unused code
3. **Function parameters** - Review intentional vs accidental

---

## 🚀 Quick Wins (Auto-fixable)

Run these commands to auto-fix many issues:

```bash
# Fix safe issues
pnpm biome check --write .

# Fix unsafe issues (review changes carefully)
pnpm biome check --write --unsafe .
```

**Estimated auto-fixes**: ~1,500+ issues can be fixed automatically

---

## 🔧 Configuration Updates Needed

### 1. Enable CSS/Tailwind Support

```json
// biome.json
{
  "css": {
    "parser": {
      "cssModules": true
    },
    "linter": {
      "enabled": true
    }
  }
}
```

### 2. Adjust Strictness (Optional)

```json
{
  "linter": {
    "rules": {
      "suspicious": {
        "noExplicitAny": "warn",  // Keep as warning
        "noConsole": {
          "level": "warn",
          "options": { "allow": ["warn", "error", "info"] }
        }
      },
      "correctness": {
        "noUnusedVariables": "warn",  // Some are intentional
        "useExhaustiveDependencies": "warn"
      }
    }
  }
}
```

---

## 📈 Progress Tracking

### Baseline Metrics
- Total Issues: 3,096
- Files with Issues: ~800 (estimated)
- Auto-fixable: ~1,500

### Suggested Milestones

#### Milestone 1: Foundation (Week 1)
- [ ] Configure CSS/Tailwind support
- [ ] Run auto-fixes for safe issues
- [ ] Review and commit auto-fixed changes

#### Milestone 2: Type Safety (Week 2-3)
- [ ] Replace `any` with proper types (top 50 files)
- [ ] Add TypeScript interfaces for common patterns
- [ ] Update test utilities with proper types

#### Milestone 3: Accessibility (Week 4)
- [ ] Replace `<img>` with Next.js `<Image>`
- [ ] Fix label/input associations
- [ ] Add keyboard handlers

#### Milestone 4: React Best Practices (Week 5-6)
- [ ] Fix React hook dependencies
- [ ] Replace array index keys with proper IDs
- [ ] Remove console.log statements

#### Milestone 5: Cleanup (Week 7)
- [ ] Remove unused imports/variables
- [ ] Apply code simplifications
- [ ] Final review and documentation

---

## 💡 Tips for Team

1. **Don't Fix Everything at Once**
   - Focus on one category at a time
   - Create separate PRs for different categories

2. **Leverage Auto-fixes**
   - Start with safe auto-fixes
   - Review unsafe fixes carefully
   - Test after applying fixes

3. **Update Gradually**
   - Fix new code as you work on it
   - Don't break working features for linting

4. **Communication**
   - Share this document with the team
   - Discuss priority and timeline
   - Coordinate to avoid conflicts

5. **VS Code Integration**
   - Install Biome extension
   - Enable format-on-save
   - See issues as you code

---

## 📚 Resources

- **Biome Documentation**: https://biomejs.dev/
- **TypeScript Best Practices**: https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html
- **React Accessibility**: https://react.dev/learn/accessibility
- **Next.js Image Optimization**: https://nextjs.org/docs/pages/building-your-application/optimizing/images

---

## 🎬 Next Steps

1. **Review this document** with the team
2. **Prioritize** which issues to tackle first
3. **Create tracking issues** on GitHub for each milestone
4. **Assign ownership** for different categories
5. **Set up a schedule** for addressing issues
6. **Monitor progress** with periodic Biome checks

---

**Note**: This is a comprehensive baseline. The goal is continuous improvement, not perfection overnight. Focus on high-impact issues first and build momentum! 🚀

