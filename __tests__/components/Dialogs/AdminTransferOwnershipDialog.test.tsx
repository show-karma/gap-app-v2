/**
 * Tests for AdminTransferOwnershipDialog component
 *
 * Uses static source-code analysis (same pattern as AddAdminDialog.test.tsx)
 * because the component depends on web3 + modal store infrastructure.
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

const componentPath = path.join(
  process.cwd(),
  "components/Dialogs/AdminTransferOwnershipDialog.tsx"
);

describe("AdminTransferOwnershipDialog", () => {
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

    it("uses Zod email validation in schema", () => {
      expect(source).toContain(".email(");
      expect(source).toContain('"Email is required"');
      expect(source).toContain('"Invalid email address"');
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

    it("registers the email field with react-hook-form", () => {
      expect(source).toContain('register("email")');
    });

    it("calls resolveEmailToWallet before the API call", () => {
      expect(source).toContain("communityAdminsService.resolveEmailToWallet(data.email)");
    });

    it("passes resolved address (not email) to adminTransferOwnership", () => {
      expect(source).toContain(
        "adminTransferOwnership(project.uid, project.chainID, newOwnerAddress)"
      );
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
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Email is required");
      }
    });

    it("rejects invalid email format", () => {
      const result = schema.safeParse({ email: "not-an-email" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid email address");
      }
    });

    it("accepts valid email", () => {
      const result = schema.safeParse({ email: "owner@example.com" });
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
