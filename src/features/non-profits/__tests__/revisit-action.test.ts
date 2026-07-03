import { describe, expect, it } from "vitest";
import type { AppError } from "../lib/errors";
import { decideRevisitAction } from "../lib/revisit-action";

const apiError = (status: number): AppError => ({
  type: "ApiError",
  status,
  message: `err ${status}`,
});

describe("decideRevisitAction", () => {
  describe("getById succeeded", () => {
    it("hydrates when the entry has turns", () => {
      const action = decideRevisitAction({
        result: { ok: true, turnCount: 3, remoteQuery: "q" },
        localQuery: null,
        hasSession: false,
      });
      expect(action).toEqual({ kind: "hydrate" });
    });

    it("renders empty (never re-runs) when the entry has no turns, prefilling the saved query", () => {
      const action = decideRevisitAction({
        result: { ok: true, turnCount: 0, remoteQuery: "saved query" },
        localQuery: "saved query",
        hasSession: true,
      });
      // The load worked — re-running would overwrite a real conversation.
      expect(action).toEqual({ kind: "render-empty", prefill: "saved query" });
    });

    it("renders empty with no prefill when the entry has neither turns nor a query", () => {
      const action = decideRevisitAction({
        result: { ok: true, turnCount: 0, remoteQuery: null },
        localQuery: null,
        hasSession: true,
      });
      expect(action).toEqual({ kind: "render-empty", prefill: null });
    });
  });

  describe("getById failed", () => {
    it("treats 403 as not-found and never reconstructs another account's chat", () => {
      const action = decideRevisitAction({
        result: { ok: false, error: apiError(403) },
        // even with a local query, a 403 must not re-run under an id we don't own
        localQuery: "some query",
        hasSession: true,
      });
      expect(action).toEqual({ kind: "not-found" });
    });

    it("reconstructs from the local query on 404 (our own unpersisted chat)", () => {
      const action = decideRevisitAction({
        result: { ok: false, error: apiError(404) },
        localQuery: "rebuild me",
        hasSession: true,
      });
      expect(action).toEqual({ kind: "reconstruct", query: "rebuild me" });
    });

    it("reconstructs on 401 (anonymous user cannot read history) when a local query exists", () => {
      const action = decideRevisitAction({
        result: { ok: false, error: apiError(401) },
        localQuery: "anon query",
        hasSession: true,
      });
      expect(action).toEqual({ kind: "reconstruct", query: "anon query" });
    });

    it("reconstructs on a network error when a local query exists", () => {
      const action = decideRevisitAction({
        result: { ok: false, error: { type: "NetworkError", message: "offline" } },
        localQuery: "still mine",
        hasSession: true,
      });
      expect(action).toEqual({ kind: "reconstruct", query: "still mine" });
    });

    it("renders empty when the load failed but a local session exists with no query (fresh chat)", () => {
      const action = decideRevisitAction({
        result: { ok: false, error: apiError(404) },
        localQuery: null,
        hasSession: true,
      });
      expect(action).toEqual({ kind: "render-empty", prefill: null });
    });

    it("is not-found when the load failed and there is no local session at all", () => {
      const action = decideRevisitAction({
        result: { ok: false, error: apiError(404) },
        localQuery: null,
        hasSession: false,
      });
      expect(action).toEqual({ kind: "not-found" });
    });
  });
});
