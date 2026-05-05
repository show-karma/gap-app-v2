/**
 * Community API Contract Tests
 *
 * Validates that factory-produced mock data conforms to the Zod contract
 * schemas, catching API drift between factories, schemas, and the real
 * backend response shape.
 */
import { describe, expect, it } from "vitest";
import {
  communityDetailsSchema,
  communitySchema,
} from "../contracts/contracts/schemas/community.schema";
import { createMockCommunity } from "../factories/community.factory";

describe("Community API Contract", () => {
  describe("factory output conforms to schema", () => {
    it("default factory output passes community schema validation", () => {
      const mock = createMockCommunity();
      const result = communitySchema.safeParse(mock);
      if (!result.success) {
      }
      expect(result.success).toBe(true);
    });

    it("factory with overrides still conforms to schema", () => {
      const mock = createMockCommunity({
        details: {
          name: "Custom Community",
          description: "A custom community for testing",
          slug: "custom-community",
        },
      });
      const result = communitySchema.safeParse(mock);
      expect(result.success).toBe(true);
    });

    it("multiple factory calls produce unique, valid data", () => {
      const mocks = Array.from({ length: 5 }, () => createMockCommunity());
      const uids = new Set(mocks.map((m) => m.uid));
      expect(uids.size).toBe(5);

      for (const mock of mocks) {
        const result = communitySchema.safeParse(mock);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("required fields validation", () => {
    it("rejects when uid is missing", () => {
      const { uid, ...rest } = createMockCommunity();
      const result = communitySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when chainID is missing", () => {
      const { chainID, ...rest } = createMockCommunity();
      const result = communitySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when details is missing", () => {
      const { details, ...rest } = createMockCommunity();
      const result = communitySchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when details.name is missing", () => {
      const mock = createMockCommunity();
      const { name, ...detailsRest } = mock.details;
      const result = communitySchema.safeParse({
        ...mock,
        details: detailsRest,
      });
      expect(result.success).toBe(false);
    });

    it("rejects when details.slug is missing", () => {
      const mock = createMockCommunity();
      const { slug, ...detailsRest } = mock.details;
      const result = communitySchema.safeParse({
        ...mock,
        details: detailsRest,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("field type validation", () => {
    it("rejects non-hex uid", () => {
      const mock = createMockCommunity({ uid: "not-a-hex-uid" as `0x${string}` });
      const result = communitySchema.safeParse(mock);
      expect(result.success).toBe(false);
    });

    it("rejects non-number chainID", () => {
      const mock = createMockCommunity();
      const result = communitySchema.safeParse({
        ...mock,
        chainID: "ten",
      });
      expect(result.success).toBe(false);
    });

    it("accepts optional fields when absent", () => {
      const result = communitySchema.safeParse({
        uid: "0xabc123",
        chainID: 42161,
        details: { name: "Minimal", slug: "minimal" },
      });
      expect(result.success).toBe(true);
    });

    it("validates communityDetailsSchema independently", () => {
      const mock = createMockCommunity();
      const result = communityDetailsSchema.safeParse(mock.details);
      expect(result.success).toBe(true);
    });
  });
});
