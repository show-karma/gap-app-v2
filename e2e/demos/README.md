# PR Demo Recordings

Playwright specs in this folder produce short MP4 walkthroughs of the
features added by a PR. The `pr-demo-video` workflow runs them once all
PR checks are green and posts the videos as the final PR comment.

## How it fits together

```text
e2e/demos/
├── playwright.config.ts        # Standalone config — records video, no web server
└── <feature>.demo.ts           # Playwright spec + an exported `demoDescription`
```

Each spec exports a `demoDescription` template literal containing the
markdown that will be posted alongside the video. The workflow extracts
it with a regex — no separate `.md` file to keep in sync.

`.github/workflows/pr-demo-video.yml`:

1. Triggered by `workflow_run` after `E2E Tests` completes successfully on a PR.
2. Polls `gh pr checks` until every other required check is green (skips if any failed).
3. Resolves the Vercel preview URL from the PR's vercel-bot comment.
4. Runs every `*.demo.ts` against that preview URL, capturing video.
5. Converts each `.webm` to `.mp4` (`libx264`, `+faststart`).
6. Pushes the MP4s to an orphan `pr-demo-assets` branch under `demos/pr-<n>/<sha>/`.
7. Posts a single PR comment that concatenates each spec's exported
   `demoDescription` with an inline `<video>` tag pointing at the raw MP4.

## Adding a demo to a PR

1. Drop a new spec at `e2e/demos/<short-name>.demo.ts`. Keep it focused — one
   user-visible flow, ~10–20 seconds. Use `test.step` with descriptive titles;
   step names show up in the recording.
2. At the top of that file, export a markdown string named `demoDescription`
   that explains how the feature works. The workflow wraps each entry in
   `## Feature demo` automatically — start at `### <heading>` or lower.

   ```ts
   export const demoDescription = `
   ### My feature

   How it works...
   `;
   ```
3. Push and let CI do the rest.

If credentials are needed (Privy, etc.), prefer mocking the relevant React
Query cache or HTTP routes in the spec instead of pulling real auth — demos
should be deterministic and not depend on QA accounts.

## Running locally

```bash
DEMO_BASE_URL=http://localhost:3000 \
  pnpm exec playwright test --config=e2e/demos/playwright.config.ts
```

Artifacts land in `e2e-demos-results/`. Open the `.webm` to preview. To
produce an MP4 the same way CI does:

```bash
ffmpeg -y -i <video>.webm -c:v libx264 -pix_fmt yuv420p \
  -movflags +faststart <video>.mp4
```
