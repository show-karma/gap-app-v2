import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ANONYMOUS_SCOPE,
  clearAllOnboardingState,
  markCompleted,
  markDismissed,
  migrateAnonymousState,
  onboardingKey,
  readOnboardingRecord,
  shouldAutoShow,
  tourSurface,
} from "../storage";

const USER = "did:privy:abc123";
const OTHER_USER = "did:privy:zzz999";
const SURFACE = tourSurface("find-funders", 1);

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("key shape", () => {
  it("namespaces every entry under karma:onboarding", () => {
    expect(onboardingKey(USER, SURFACE)).toBe(`karma:onboarding:${USER}:tour:find-funders:v1`);
  });

  it("versions tour surfaces so an improved tour re-runs", () => {
    expect(tourSurface("find-funders", 1)).not.toBe(tourSurface("find-funders", 2));
  });
});

describe("outcomes", () => {
  it("treats an unseen surface as showable", () => {
    expect(readOnboardingRecord(USER, SURFACE)).toBeNull();
    expect(shouldAutoShow(USER, SURFACE)).toBe(true);
  });

  it("never re-shows a completed surface", () => {
    markCompleted(USER, SURFACE);
    expect(readOnboardingRecord(USER, SURFACE)).toEqual({
      outcome: "completed",
      dismissals: 0,
    });
    expect(shouldAutoShow(USER, SURFACE)).toBe(false);
  });

  it("forgives the first dismissal and stops after the second", () => {
    markDismissed(USER, SURFACE);
    expect(shouldAutoShow(USER, SURFACE)).toBe(true);

    markDismissed(USER, SURFACE);
    expect(readOnboardingRecord(USER, SURFACE)?.dismissals).toBe(2);
    expect(shouldAutoShow(USER, SURFACE)).toBe(false);
  });

  it("keeps state separate per user on a shared browser", () => {
    markCompleted(USER, SURFACE);
    expect(shouldAutoShow(OTHER_USER, SURFACE)).toBe(true);
  });

  it("treats a malformed entry as absent", () => {
    localStorage.setItem(onboardingKey(USER, SURFACE), "{not json");
    expect(readOnboardingRecord(USER, SURFACE)).toBeNull();
    expect(shouldAutoShow(USER, SURFACE)).toBe(true);
  });

  it("rejects an entry with an unrecognised outcome", () => {
    localStorage.setItem(
      onboardingKey(USER, SURFACE),
      JSON.stringify({ outcome: "banana", dismissals: 0 })
    );
    expect(readOnboardingRecord(USER, SURFACE)).toBeNull();
  });
});

describe("anonymous migration", () => {
  it("carries logged-out progress onto the user at login", () => {
    markCompleted(ANONYMOUS_SCOPE, SURFACE);

    migrateAnonymousState(USER);

    expect(readOnboardingRecord(USER, SURFACE)?.outcome).toBe("completed");
    expect(readOnboardingRecord(ANONYMOUS_SCOPE, SURFACE)).toBeNull();
    expect(shouldAutoShow(USER, SURFACE)).toBe(false);
  });

  it("does not let anonymous state overwrite the user's own history", () => {
    markCompleted(USER, SURFACE);
    markDismissed(ANONYMOUS_SCOPE, SURFACE);

    migrateAnonymousState(USER);

    expect(readOnboardingRecord(USER, SURFACE)?.outcome).toBe("completed");
  });

  it("clears the anonymous scope so a later visitor starts fresh", () => {
    markDismissed(ANONYMOUS_SCOPE, SURFACE);

    migrateAnonymousState(USER);

    expect(readOnboardingRecord(ANONYMOUS_SCOPE, SURFACE)).toBeNull();
  });

  it("is a no-op without a user id", () => {
    markCompleted(ANONYMOUS_SCOPE, SURFACE);

    migrateAnonymousState("");

    expect(readOnboardingRecord(ANONYMOUS_SCOPE, SURFACE)?.outcome).toBe("completed");
  });
});

describe("resilience", () => {
  it("survives localStorage being unavailable", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(() => markCompleted(USER, SURFACE)).not.toThrow();
    expect(readOnboardingRecord(USER, SURFACE)).toBeNull();
    expect(shouldAutoShow(USER, SURFACE)).toBe(true);

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("clearAllOnboardingState", () => {
  it("removes onboarding keys and leaves unrelated storage alone", () => {
    markCompleted(USER, SURFACE);
    markDismissed(ANONYMOUS_SCOPE, tourSurface("reviewer-inbox", 1));
    localStorage.setItem("privy:token", "keep-me");

    clearAllOnboardingState();

    expect(readOnboardingRecord(USER, SURFACE)).toBeNull();
    expect(readOnboardingRecord(ANONYMOUS_SCOPE, tourSurface("reviewer-inbox", 1))).toBeNull();
    expect(localStorage.getItem("privy:token")).toBe("keep-me");
  });
});
