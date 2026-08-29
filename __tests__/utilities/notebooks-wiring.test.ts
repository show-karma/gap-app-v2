import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { tenantNavigation } from "@/src/infrastructure/config/tenant-navigation-config";
import { EXPLORER_NAV_OVERRIDES, NOTEBOOKS_ENABLED_COMMUNITIES } from "@/utilities/community-flags";
import { COMMUNITY_NAV_LABELS } from "@/utilities/community-nav";
import { INDEXER } from "@/utilities/indexer";
import { notebookAssetPath } from "@/utilities/notebooks/csp";
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
    // Opened 2026-08-29 after WS1 cleared all three conditions at
    // karma-notebooks cbc482b (run 33226521076). The assertion stays — it is
    // now a tripwire in the other direction: the gate must not close by
    // accident while a bundle is shipped, and it must not reopen silently if
    // the bundle is ever removed. Either way the change is deliberate.
    it("is open for the validation preview", () => {
      expect(NOTEBOOK_EMBED_ENABLED).toBe(true);
    });

    // The gate and the bundle travel together: an open gate with no bundle
    // serves a broken frame, and a shipped bundle behind a closed gate is dead
    // weight in the repo.
    it("ships the bundle the open gate points at", () => {
      const entry = path.join(
        process.cwd(),
        "public",
        "notebooks",
        "filecoin",
        "grants-overview",
        "index.html"
      );

      expect(fs.existsSync(entry)).toBe(NOTEBOOK_EMBED_ENABLED);
    });

    it("derives the frame src as the same-origin path of that bundle", () => {
      expect(notebookAssetPath("filecoin", "grants-overview")).toBe(
        "/notebooks/filecoin/grants-overview/index.html"
      );
    });

    // The src is built from route params, so a crafted value must stay inside
    // the prefix the notebook CSP is scoped to.
    it("keeps a crafted slug inside the notebook prefix", () => {
      const src = notebookAssetPath("filecoin", "../../etc/passwd");

      expect(src.startsWith("/notebooks/filecoin/")).toBe(true);
      expect(src).not.toContain("../");
    });
  });
});
