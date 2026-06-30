/**
 * MSW handlers for the donor-research handle + persona endpoints (DEV-431,
 * U6). Mirrors the PRD §1 wire shapes so hook/service tests exercise the
 * real request/response contract. Responses use the app's own types so they
 * stay in lockstep with `types/donor-research.ts`.
 */

import { HttpResponse, http } from "msw";
import type {
  DonorHandle,
  DonorPersona,
  PersonaStructured,
  RefinementResult,
} from "@/types/donor-research";
import { BASE } from "./base-url";

const DEFAULT_HANDLE_ID = "handle-001";

export function emptyPersonaStructured(): PersonaStructured {
  return {
    orgMaturity: { value: null, source: null },
    geoRadius: { value: null, source: null },
    faithStance: { value: null, source: null },
    giftSizeBand: { value: null, source: null },
    advocacyStance: { value: null, source: null },
  };
}

export function makeDonorHandle(overrides?: Partial<DonorHandle>): DonorHandle {
  return {
    id: DEFAULT_HANDLE_ID,
    advisorId: "advisor-001",
    opaqueLabel: "Riverside Family Foundation",
    notes: "Met at the spring gala; warm intro via board chair.",
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-18T10:00:00.000Z",
    ...overrides,
  };
}

export function makeDonorPersona(overrides?: Partial<DonorPersona>): DonorPersona {
  return {
    id: "persona-001",
    donorHandleId: DEFAULT_HANDLE_ID,
    sourceText: "Longtime family foundation focused on local education and youth programs.",
    narrative: "An established local funder with a multi-decade focus on education access.",
    structured: {
      orgMaturity: { value: "established", source: "extracted" },
      geoRadius: { value: "local", source: "extracted" },
      faithStance: { value: null, source: null },
      giftSizeBand: { value: "mid", source: "manual" },
      advocacyStance: { value: null, source: null },
    },
    computedWeights: {
      onlinePresence: 2000,
      socialPresence: 1000,
      impactRecency: 3000,
      donorMatch: 3000,
      compliance: 1000,
    },
    refinedAt: "2026-06-20T10:00:00.000Z",
    createdAt: "2026-06-15T10:00:00.000Z",
    updatedAt: "2026-06-20T10:00:00.000Z",
    ...overrides,
  };
}

export function makeRefinementResult(overrides?: Partial<RefinementResult>): RefinementResult {
  return {
    narrative: "An established local funder with a multi-decade focus on education access.",
    structured: {
      orgMaturity: { value: "established", source: "extracted" },
      geoRadius: { value: "local", source: "extracted" },
      faithStance: { value: null, source: null },
      giftSizeBand: { value: null, source: null },
      advocacyStance: { value: null, source: null },
    },
    ...overrides,
  };
}

interface PersonaPutBody {
  sourceText?: string | null;
  narrative?: string | null;
  structured?: Partial<Record<keyof PersonaStructured, { value: string | null; source?: string }>>;
}

/** Applies a PUT body to a base persona the way the backend would echo it. */
function applyPersonaPut(base: DonorPersona, body: PersonaPutBody): DonorPersona {
  const structured: PersonaStructured = { ...base.structured };
  if (body.structured) {
    for (const [key, chip] of Object.entries(body.structured)) {
      if (!chip) continue;
      structured[key as keyof PersonaStructured] =
        chip.value === null
          ? { value: null, source: null }
          : { value: chip.value as never, source: (chip.source as never) ?? "manual" };
    }
  }
  return {
    ...base,
    sourceText: body.sourceText !== undefined ? body.sourceText : base.sourceText,
    narrative: body.narrative !== undefined ? body.narrative : base.narrative,
    structured,
    updatedAt: "2026-06-29T12:00:00.000Z",
  };
}

export interface DonorResearchHandlerOptions {
  handle?: DonorHandle;
  /** Pass `null` to make GET /persona return 404 (the no-persona empty state). */
  persona?: DonorPersona | null;
  refinement?: RefinementResult;
}

export function donorResearchHandlers(options: DonorResearchHandlerOptions = {}) {
  const handle = options.handle ?? makeDonorHandle();
  const persona = options.persona === undefined ? makeDonorPersona() : options.persona;
  const refinement = options.refinement ?? makeRefinementResult();
  const base = persona ?? makeDonorPersona();

  return [
    // Persona routes registered first (more specific paths).
    http.get(`${BASE}/v2/donor-research/handles/:handleId/persona`, () =>
      persona === null
        ? HttpResponse.json({ message: "No persona for handle" }, { status: 404 })
        : HttpResponse.json(persona)
    ),
    http.put(`${BASE}/v2/donor-research/handles/:handleId/persona`, async ({ request }) => {
      const body = (await request.json()) as PersonaPutBody;
      return HttpResponse.json(applyPersonaPut(base, body));
    }),
    http.post(`${BASE}/v2/donor-research/handles/:handleId/persona/refine`, () =>
      HttpResponse.json(refinement)
    ),

    // Single-handle routes.
    http.get(`${BASE}/v2/donor-research/handles/:handleId`, () => HttpResponse.json(handle)),
    http.patch(`${BASE}/v2/donor-research/handles/:handleId`, async ({ request }) => {
      const body = (await request.json()) as Partial<DonorHandle>;
      return HttpResponse.json({ ...handle, ...body, updatedAt: "2026-06-29T12:00:00.000Z" });
    }),
  ];
}

/** 429 on the persona write + refine channels — for rate-limit tests. */
export function donorResearchRateLimitHandlers() {
  return [
    http.put(`${BASE}/v2/donor-research/handles/:handleId/persona`, () =>
      HttpResponse.json({ message: "Rate limited", retryAfter: 1200 }, { status: 429 })
    ),
    http.post(`${BASE}/v2/donor-research/handles/:handleId/persona/refine`, () =>
      HttpResponse.json({ message: "Rate limited", retryAfter: 1200 }, { status: 429 })
    ),
  ];
}
