/**
 * Tests for TransferOwnershipDialog component
 *
 * Uses static source-code analysis (same pattern as AddAdminDialog.test.tsx)
 * because the component depends on heavy web3 infrastructure that's
 * impractical to render in jsdom.
 */

import * as fs from "fs";
import * as path from "path";

const componentPath = path.join(process.cwd(), "components/Dialogs/TransferOwnershipDialog.tsx");

describe("TransferOwnershipDialog", () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(componentPath, "utf-8");
  });

  describe("Migration: wallet address → email-based input", () => {
    it("imports communityAdminsService for email resolution", () => {
      expect(source).toContain(
        'import { communityAdminsService } from "@/services/community-admins.service"'
      );
    });

    it("does NOT import isAddress from viem (wallet validation removed)", () => {
      expect(source).not.toContain("isAddress");
    });

    it("does NOT import sanitizeInput (no longer needed)", () => {
      expect(source).not.toContain("sanitizeInput");
    });

    it("uses email state variable instead of wallet address", () => {
      expect(source).toContain("newOwnerEmail");
      expect(source).not.toMatch(/useState\(\s*""\s*\).*newOwner[^E]/);
    });

    it("has an isValidEmail helper function", () => {
      expect(source).toContain("isValidEmail");
    });

    it("renders an email input (type=email)", () => {
      expect(source).toContain('type="email"');
    });

    it("shows 'New Owner Email' label", () => {
      expect(source).toContain("New Owner Email");
    });

    it("has email placeholder", () => {
      expect(source).toContain('placeholder="newowner@example.com"');
    });

    it("calls resolveEmailToWallet before the on-chain transfer", () => {
      expect(source).toContain("communityAdminsService.resolveEmailToWallet(newOwnerEmail)");
    });

    it("passes resolved address (not email) to transferOwnership SDK call", () => {
      expect(source).toContain("transferOwnership(walletSigner, newOwnerAddress");
    });

    it("validates email before proceeding with transfer", () => {
      expect(source).toContain("!isValidEmail(newOwnerEmail)");
    });
  });
});
