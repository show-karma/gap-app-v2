import { describe, expect, it } from "vitest";
import { tenantNavigation } from "@/src/infrastructure/config/tenant-navigation-config";
import { EXPLORER_NAV_OVERRIDES, NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { INDEXER } from "@/utilities/indexer";
import { NOTEBOOK_EMBED_ENABLED } from "@/utilities/notebooks-gate";
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
      expect(INDEXER.V2.NOTEBOOK_CONFIGS.LIST("filecoin")).toBe(
        "/v2/communities/filecoin/notebook-configs"
      );
    });

    it("targets the community-scoped page endpoint", () => {
      expect(INDEXER.V2.NOTEBOOK_CONFIGS.GET("filecoin", "grants-overview")).toBe(
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

  describe("embed gate", () => {
    // This assertion is intentionally strict. It is the single line that keeps
    // a live notebook out of every build until WS1 clears the security gate
    // (render fix, opaque-origin pre-flight, vendored Pyodide + tightened
    // connect-src). Flipping it is a deliberate, reviewed change — not a
    // default that can drift open.
    it("keeps the frame withheld until the security gate clears", () => {
      expect(NOTEBOOK_EMBED_ENABLED).toBe(false);
    });
  });
});
