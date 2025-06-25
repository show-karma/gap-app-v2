# ESLint Custom Rule: No Redirect in Try-Catch

This project includes a custom ESLint rule to prevent Next.js `redirect()` calls inside try-catch blocks, which causes the `NEXT_REDIRECT` error.

## Setup

1. **Install the dependency:**

   ```bash
   npm install --save-dev eslint-plugin-local-rules
   # or
   pnpm add -D eslint-plugin-local-rules
   ```

2. **The rule is already configured in `.eslintrc.json`:**

   ```json
   {
     "plugins": ["local-rules"],
     "rules": {
       "local-rules/no-redirect-in-try-catch": "error"
     }
   }
   ```

3. **The rule definition is in `eslint-local-rules.js`** at the project root.

## What it catches

❌ **Will show ESLint error:**

```javascript
try {
  const data = await someApiCall();
  redirect("/path"); // ❌ ESLint error here
} catch (error) {
  console.error(error);
}
```

✅ **Will pass ESLint:**

```javascript
try {
  const data = await someApiCall();
} catch (error) {
  console.error(error);
}

redirect("/path"); // ✅ OK - outside try-catch
```

## Rule Details

- **Rule ID:** `local-rules/no-redirect-in-try-catch`
- **Type:** Problem
- **Severity:** Error
- **Fixable:** No (manual fix required)

## Why this rule exists

Next.js `redirect()` function works by throwing a special `NEXT_REDIRECT` error that the framework catches and handles internally. When you wrap `redirect()` in a try-catch block, your catch block intercepts this error before Next.js can handle it, breaking the redirect functionality.

## Manual Testing

To test the rule, create a file with the problematic pattern and run ESLint:

```bash
npx eslint your-file.js
```

You should see an error message explaining the issue.
