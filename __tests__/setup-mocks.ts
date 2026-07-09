/**
 * Global mock setup for commonly mocked modules.
 *
 * These three modules are mocked identically across 90+ test files.
 * Centralizing them here eliminates boilerplate vi.mock() calls.
 *
 * Individual test files can still override any of these with their own
 * vi.mock() call -- file-level mocks take precedence over setup-file mocks.
 *
 * Modules mocked here:
 *   - next/font/google + next/font/local  (compiler features — see below)
 *   - @/utilities/enviromentVars  (was in 26+ files with identical shape)
 *   - @/components/Utilities/errorManager  (was in 31 files)
 *   - react-hot-toast  (was in 29 files)
 *   - next/navigation  (used by components that call useRouter/usePathname)
 *
 * NOTE: motion/react (Framer Motion) is deliberately NOT mocked globally — a
 * suite-wide stub would mask real animation/exit behavior in non-dashboard
 * tests. The v3 dashboard tests that render motion opt in per-file via
 * `vi.mock("motion/react", () => import("../helpers/motion-mock"))`.
 */

// ---------------------------------------------------------------------------
// next/font/google + next/font/local
// `next/font` is a Next.js *compiler* feature: in a real build the loader
// calls (e.g. `Spectral({ ... })`) are transformed at build time. Under
// vitest's jsdom runtime the real module is never compiled, so calling a font
// loader throws `TypeError: <Font> is not a function`. We replace each loader
// with a stub returning the NextFont shape the codebase reads
// (`className` / `variable` / `style`).
//
// IMPORTANT: the named exports MUST be listed explicitly. A Proxy-based module
// factory does NOT survive vitest's static export enumeration, so any font
// imported by name (`import { Spectral } from "next/font/google"`) would come
// back `undefined`. When the codebase starts using a NEW Google font, add it
// to the `next/font/google` factory below — that is the single place to keep
// in sync, and a missing entry surfaces as a loud, attributable CI failure on
// the PR that introduces the font.
//
// Fonts currently used in source:
//   - Spectral            (app/layout.tsx, donor-research report-brief/fonts.ts)
//   - Bricolage_Grotesque (donor-research report-brief/fonts.ts)
//
// Individual test files may still override these with their own vi.mock().
// ---------------------------------------------------------------------------
const mockFontLoader = () => ({
  className: "mock-font",
  variable: "--mock-font",
  style: { fontFamily: "mock" },
});

vi.mock("next/font/google", () => ({
  Spectral: mockFontLoader,
  Bricolage_Grotesque: mockFontLoader,
}));

vi.mock("next/font/local", () => ({
  __esModule: true,
  default: mockFontLoader,
}));

// ---------------------------------------------------------------------------
// next/navigation
// Provides mock router, pathname, search params for Next.js App Router.
// Individual test files can override with their own vi.mock() call.
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: "/",
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    has: vi.fn(() => false),
    toString: vi.fn(() => ""),
  })),
  useParams: vi.fn(() => ({})),
  useSelectedLayoutSegment: vi.fn(() => null),
  useSelectedLayoutSegments: vi.fn(() => []),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// ---------------------------------------------------------------------------
// @/utilities/enviromentVars
// Most tests only need NEXT_PUBLIC_GAP_INDEXER_URL. Tests that need RPC
// values or other env vars should provide their own vi.mock() override.
// ---------------------------------------------------------------------------
vi.mock("@/utilities/enviromentVars", () => ({
  envVars: {
    NEXT_PUBLIC_GAP_INDEXER_URL: "http://localhost:4000",
    NEXT_PUBLIC_GAP_OAUTH_URL: "https://oauth.test.karmahq.xyz",
    NEXT_PUBLIC_ENV: "development",
    isDev: false,
    NEXT_PUBLIC_KARMA_API: "https://api.karmahq.xyz/api",
    ENV: "development",
    RPC: {},
    PROJECT_ID: "",
    VERCEL_URL: "https://staging.karmahq.xyz",
    OSO_API_KEY: "",
    PRIVY_APP_ID: "",
    ZERODEV_PROJECT_ID: "",
    ALCHEMY_POLICY_ID: "",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
    KARMA_TELEGRAM_BOT_HANDLE: "test_bot",
  },
  // Named re-export — mirror the production module.
  KARMA_TELEGRAM_BOT_HANDLE: "test_bot",
}));

// ---------------------------------------------------------------------------
// @/components/Utilities/errorManager
// Provides a vi.fn() so tests that assert on errorManager calls still work.
// ---------------------------------------------------------------------------
vi.mock("@/components/Utilities/errorManager", () => ({
  errorManager: vi.fn(),
}));

// ---------------------------------------------------------------------------
// react-hot-toast
// Provides vi.fn() methods for success/error/loading so assertion tests work.
// ---------------------------------------------------------------------------
vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    custom: vi.fn(),
    remove: vi.fn(),
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    custom: vi.fn(),
    remove: vi.fn(),
  },
}));
