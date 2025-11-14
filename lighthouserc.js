module.exports = {
  ci: {
    collect: {
      startServerCommand: "npm run build && npm run start",
      startServerReadyPattern: "ready on",
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/projects",
        "http://localhost:3000/communities",
        "http://localhost:3000/grants",
      ],
      numberOfRuns: 3,
    },
    assert: {
      preset: "lighthouse:recommended",
      assertions: {
        // Core Web Vitals
        "first-contentful-paint": ["error", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["error", { maxNumericValue: 300 }],
        "speed-index": ["error", { maxNumericValue: 3000 }],

        // Performance Scores
        "categories:performance": ["warn", { minScore: 0.85 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],

        // Resource budgets
        "resource-summary:script:size": ["error", { maxNumericValue: 300000 }],
        "resource-summary:image:size": ["error", { maxNumericValue: 500000 }],
        "resource-summary:total:size": ["error", { maxNumericValue: 1000000 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
}
