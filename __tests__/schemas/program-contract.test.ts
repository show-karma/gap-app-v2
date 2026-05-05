/**
 * Program API Contract Tests
 *
 * Validates that program factory output conforms to the Zod contract
 * schemas for FundingProgramConfig, catching shape drift between
 * mock data, schemas, and actual API responses.
 */
import { describe, expect, it } from "vitest";
import {
  formFieldSchema,
  formSchemaSchema,
  fundingProgramConfigSchema,
} from "../contracts/contracts/schemas/program.schema";
import {
  createMockFormSchema,
  createMockProgramConfig,
  programWithAI,
} from "../factories/program.factory";

describe("Program API Contract", () => {
  describe("factory output conforms to schema", () => {
    it("default program config passes schema validation", () => {
      const mock = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse(mock);
      if (!result.success) {
      }
      expect(result.success).toBe(true);
    });

    it("program with AI config passes schema validation", () => {
      const mock = programWithAI();
      const result = fundingProgramConfigSchema.safeParse(mock);
      expect(result.success).toBe(true);
    });

    it("program config with overrides still conforms", () => {
      const mock = createMockProgramConfig({
        isEnabled: false,
        systemPrompt: "Custom prompt",
        aiModel: "gpt-4o",
      });
      const result = fundingProgramConfigSchema.safeParse(mock);
      expect(result.success).toBe(true);
    });

    it("multiple factory calls produce unique, valid data", () => {
      const mocks = Array.from({ length: 5 }, () => createMockProgramConfig());
      const ids = new Set(mocks.map((m) => m.id));
      expect(ids.size).toBe(5);

      for (const mock of mocks) {
        const result = fundingProgramConfigSchema.safeParse(mock);
        expect(result.success).toBe(true);
      }
    });
  });

  describe("required fields validation", () => {
    it("rejects when id is missing", () => {
      const { id, ...rest } = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when programId is missing", () => {
      const { programId, ...rest } = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when chainID is missing", () => {
      const { chainID, ...rest } = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when formSchema is missing", () => {
      const { formSchema, ...rest } = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when isEnabled is missing", () => {
      const { isEnabled, ...rest } = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when createdAt is missing", () => {
      const { createdAt, ...rest } = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it("rejects when updatedAt is missing", () => {
      const { updatedAt, ...rest } = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });
  });

  describe("field type validation", () => {
    it("rejects non-number chainID", () => {
      const mock = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse({
        ...mock,
        chainID: "ten",
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-boolean isEnabled", () => {
      const mock = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse({
        ...mock,
        isEnabled: "yes",
      });
      expect(result.success).toBe(false);
    });

    it("accepts createdAt as Date object", () => {
      const mock = createMockProgramConfig();
      const result = fundingProgramConfigSchema.safeParse({
        ...mock,
        createdAt: new Date(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("formSchema sub-schema", () => {
    it("factory formSchema output passes validation", () => {
      const formSchema = createMockFormSchema();
      const result = formSchemaSchema.safeParse(formSchema);
      expect(result.success).toBe(true);
    });

    it("validates individual form fields from factory", () => {
      const formSchema = createMockFormSchema();
      for (const field of formSchema.fields) {
        const result = formFieldSchema.safeParse(field);
        expect(result.success).toBe(true);
      }
    });

    it("rejects form field with invalid type", () => {
      const result = formFieldSchema.safeParse({
        id: "test",
        type: "invalid_type",
        label: "Test",
      });
      expect(result.success).toBe(false);
    });

    it("accepts formSchema with empty fields array", () => {
      const result = formSchemaSchema.safeParse({ fields: [] });
      expect(result.success).toBe(true);
    });
  });
});
