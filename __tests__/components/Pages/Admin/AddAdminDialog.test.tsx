/**
 * Tests for AddAdminDialog component
 *
 * This component is deeply integrated with web3 wallet infrastructure
 * (useSetupChainAndWallet → useZeroDevSigner → wagmi → GAP SDK), making
 * RTL render tests fragile. We use static source-code analysis instead,
 * a pattern established elsewhere in the codebase (see MilestoneDelete.test.tsx),
 * supplemented by isolated Zod schema unit tests for validation logic.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

const componentPath = path.join(process.cwd(), "components/Pages/Admin/AddAdminDialog.tsx");

describe("AddAdminDialog", () => {
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

    it("schema validates email, not wallet address", () => {
      expect(source).toContain("email:");
      expect(source).toContain(".email(");
    });

    it("renders an email input field (type=email)", () => {
      expect(source).toContain('type="email"');
      expect(source).toContain('id="email-input"');
    });

    it("does NOT render a name input field (email-only form)", () => {
      expect(source).not.toContain('id="name-input"');
    });

    it("calls resolveEmailToWallet to convert email to wallet before on-chain call", () => {
      expect(source).toContain("communityAdminsService.resolveEmailToWallet");
    });

    it("passes resolved walletAddress (not raw email) to communityResolver.enlist", () => {
      expect(source).toContain("communityResolver.enlist(UUID, walletAddress)");
    });

    it("polls admin list using the resolved walletAddress, not email", () => {
      expect(source).toContain("admin.user.id.toLowerCase() === walletAddress");
    });

    it("sets isLoading to true at the start of onSubmit", () => {
      expect(source).toContain("setIsLoading(true)");
    });

    it("resets form on successful admin addition", () => {
      expect(source).toContain("reset()");
    });

    it("uses email in error reporting (not address)", () => {
      expect(source).toContain("email: data.email");
    });
  });

  describe("Zod schema validation (isolated)", () => {
    // Mirror the component's email-only schema
    const schema = z.object({
      email: z
        .string()
        .min(1, { message: "Email is required" })
        .email({ message: "Invalid email address" }),
    });

    it("rejects empty email", () => {
      const result = schema.safeParse({ email: "" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const result = schema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid email address");
      }
    });

    it("accepts valid email", () => {
      const result = schema.safeParse({ email: "alice@example.com" });
      expect(result.success).toBe(true);
    });

    it("does NOT accept a wallet address as a valid email", () => {
      const result = schema.safeParse({
        email: "0x1234567890123456789012345678901234567890",
      });
      expect(result.success).toBe(false);
    });
  });
});
