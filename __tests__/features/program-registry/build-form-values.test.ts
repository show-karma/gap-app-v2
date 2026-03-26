import { buildFormValuesFromMetadata } from "@/src/features/program-registry/hooks/use-admin-program-form";
import type { GrantProgram } from "@/src/features/program-registry/types";

describe("buildFormValuesFromMetadata", () => {
  const baseMetadata: GrantProgram["metadata"] = {
    title: "Test Program",
    description: "Test description",
    shortDescription: "Short",
    programBudget: 50000,
    startsAt: "2024-01-01T00:00:00.000Z" as unknown as Date,
    endsAt: "2024-12-31T00:00:00.000Z" as unknown as Date,
    adminEmails: ["admin@example.com"],
    financeEmails: ["finance@example.com"],
    invoiceRequired: true,
  } as GrantProgram["metadata"];

  it("should map metadata fields to form values", () => {
    const result = buildFormValuesFromMetadata(baseMetadata);

    expect(result).toEqual({
      name: "Test Program",
      description: "Test description",
      shortDescription: "Short",
      dates: {
        startsAt: expect.any(Date),
        endsAt: expect.any(Date),
      },
      budget: 50000,
      adminEmails: ["admin@example.com"],
      financeEmails: ["finance@example.com"],
      invoiceRequired: true,
    });
  });

  it("should preserve budget value of 0", () => {
    const metadata = { ...baseMetadata, programBudget: 0 };
    const result = buildFormValuesFromMetadata(metadata);

    expect(result?.budget).toBe(0);
  });

  it("should set budget to undefined when programBudget is null", () => {
    const metadata = { ...baseMetadata, programBudget: null };
    const result = buildFormValuesFromMetadata(metadata as unknown as GrantProgram["metadata"]);

    expect(result?.budget).toBeUndefined();
  });

  it("should set budget to undefined when programBudget is empty string", () => {
    const metadata = { ...baseMetadata, programBudget: "" };
    const result = buildFormValuesFromMetadata(metadata as unknown as GrantProgram["metadata"]);

    expect(result?.budget).toBeUndefined();
  });

  it("should set budget to undefined when programBudget is non-numeric string", () => {
    const metadata = { ...baseMetadata, programBudget: "not-a-number" };
    const result = buildFormValuesFromMetadata(metadata as unknown as GrantProgram["metadata"]);

    expect(result?.budget).toBeUndefined();
  });

  it("should set budget to undefined when programBudget is undefined", () => {
    const metadata = { ...baseMetadata, programBudget: undefined };
    const result = buildFormValuesFromMetadata(metadata);

    expect(result?.budget).toBeUndefined();
  });

  it("should return null for null metadata", () => {
    expect(buildFormValuesFromMetadata(null as unknown as GrantProgram["metadata"])).toBeNull();
  });

  it("should default empty arrays for missing email fields", () => {
    const metadata = {
      ...baseMetadata,
      adminEmails: undefined,
      financeEmails: undefined,
    } as unknown as GrantProgram["metadata"];

    const result = buildFormValuesFromMetadata(metadata);

    expect(result?.adminEmails).toEqual([]);
    expect(result?.financeEmails).toEqual([]);
  });

  it("should default invoiceRequired to false when not set", () => {
    const metadata = {
      ...baseMetadata,
      invoiceRequired: undefined,
    } as unknown as GrantProgram["metadata"];

    const result = buildFormValuesFromMetadata(metadata);

    expect(result?.invoiceRequired).toBe(false);
  });
});
