import { afterEach, describe, expect, it, vi } from "vitest";
import { tenantNavigation } from "@/src/infrastructure/config/tenant-navigation-config";
import { EXPLORER_NAV_OVERRIDES, NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { isNotebookArtifactUrl, notebooksOrigin } from "@/utilities/domains";
import { NOTEBOOK_ENDPOINTS } from "@/utilities/notebooks/endpoints";
import { PAGES } from "@/utilities/pages";

describe("notebook feature wiring", () => {
  describe("flag", () => {
    it("enables notebooks for filecoin only", () => {
      expect([...NOTEBOOKS_ENABLED_COMMUNITIES]).toEqual(["filecoin"]);
    });
  });

  describe("routes", () => {
    // Both path forms come from one constant: on a whitelabel host the
    // `/community/<slug>` prefix is stripped by `Link`, so a literal path
    // anywhere would break exactly one of the two forms.
    it("builds the shared-domain list path", () => {
      expect(PAGES.COMMUNITY.NOTEBOOKS("filecoin")).toBe("/community/filecoin/notebooks");
    });

    it("builds the shared-domain page path", () => {
      expect(PAGES.COMMUNITY.NOTEBOOK_DETAIL("filecoin", "grants-overview")).toBe(
        "/community/filecoin/notebooks/grants-overview"
      );
    });

    // The whitelabel form is the shared form with the community prefix
    // removed — the same transformation `Link` applies at render time.
    it("reduces to the clean whitelabel path when the prefix is stripped", () => {
      const shared = PAGES.COMMUNITY.NOTEBOOK_DETAIL("filecoin", "grants-overview");

      expect(shared.replace("/community/filecoin", "")).toBe("/notebooks/grants-overview");
    });

    it("encodes a slug so a crafted value cannot escape the path", () => {
      expect(PAGES.COMMUNITY.NOTEBOOK_DETAIL("filecoin", "a/../b")).toBe(
        "/community/filecoin/notebooks/a%2F..%2Fb"
      );
    });
  });

  describe("api endpoints", () => {
    it("targets the community-scoped list endpoint", () => {
      expect(NOTEBOOK_ENDPOINTS.LIST("filecoin")).toBe("/v2/communities/filecoin/notebook-configs");
    });

    it("targets the community-scoped page endpoint", () => {
      expect(NOTEBOOK_ENDPOINTS.GET("filecoin", "grants-overview")).toBe(
        "/v2/communities/filecoin/notebook-configs/grants-overview"
      );
    });
  });

  describe("navigation", () => {
    it("names the section once, for the tab and the pages to share", () => {
      expect(COMMUNITY_NAV_LABELS.notebooks).toBe("Notebooks");
    });

    it("adds a Notebooks entry to the filecoin navbar", () => {
      const reports = tenantNavigation.filecoin.items.find((item) => item.label === "Reports");
      const labels = reports?.items?.map((entry) => entry.label);

      expect(labels).toContain("Notebooks");
    });

    // The whitelabel navbar carries the entry, so the explorer tab would be a
    // duplicate there — the same reasoning that hides reports and financials.
    it("hides the explorer tab on the filecoin whitelabel host", () => {
      expect(EXPLORER_NAV_OVERRIDES.filecoin?.hiddenTabs).toContain("notebooks");
    });

    it("uses the clean whitelabel path in the navbar entry", () => {
      const reports = tenantNavigation.filecoin.items.find((item) => item.label === "Reports");
      const notebooks = reports?.items?.find((entry) => entry.label === "Notebooks");

      expect(notebooks?.href).toBe("/notebooks");
    });
  });

  /**
   * The gate that keeps a live notebook out of a build is the notebooks
   * origin: unset, and nothing is framed anywhere. When set, only that exact
   * origin may be framed — the same anchored-match rule the domain module
   * applies everywhere else, because `endsWith()` admits a lookalike and
   * `includes()` admits a host that merely contains ours.
   */
  describe("notebooks origin allowlist", () => {
    const ORIGIN = "https://gap-notebooks.vercel.app";

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("frames nothing when no origin is configured", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", "");

      expect(notebooksOrigin()).toBeNull();
      expect(isNotebookArtifactUrl(`${ORIGIN}/filecoin/grants-overview/`)).toBe(false);
    });

    it("normalises the configured value to a bare origin", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", ` ${ORIGIN}/some/path/ `);

      expect(notebooksOrigin()).toBe(ORIGIN);
    });

    it.each([
      ["a schemeless value", "gap-notebooks.vercel.app"],
      ["an http origin", "http://gap-notebooks.vercel.app"],
      ["garbage", "not a url"],
      ["the canonical app origin", "https://www.karmahq.org"],
      ["the staging app origin", "https://staging.karmahq.org"],
    ])("fails closed on %s", (_label, value) => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", value);

      expect(notebooksOrigin()).toBeNull();
    });

    it("admits an artifact on the exact origin", () => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", ORIGIN);

      expect(isNotebookArtifactUrl(`${ORIGIN}/filecoin/grants-overview/`)).toBe(true);
    });

    it.each([
      ["a lookalike host", "https://fakegap-notebooks.vercel.app/filecoin/grants-overview/"],
      ["our host as a prefix of another", "https://gap-notebooks.vercel.app.evil.com/x/"],
      ["our host in the path", "https://evil.com/gap-notebooks.vercel.app/x/"],
      ["our host as userinfo", "https://gap-notebooks.vercel.app@evil.com/x/"],
      ["credentials on the right host", "https://user:pw@gap-notebooks.vercel.app/x/"],
      ["a non-default port", "https://gap-notebooks.vercel.app:8443/x/"],
      ["http on the right host", "http://gap-notebooks.vercel.app/x/"],
      ["a javascript URL", "javascript:alert(1)"],
      ["a relative path", "/filecoin/grants-overview/"],
    ])("rejects %s", (_label, value) => {
      vi.stubEnv("NEXT_PUBLIC_NOTEBOOKS_ORIGIN", ORIGIN);

      expect(isNotebookArtifactUrl(value)).toBe(false);
    });
  });
});
