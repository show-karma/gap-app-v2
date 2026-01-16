import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, test } from "bun:test";
import {
  createFieldLabelsMap,
  createFieldTypeMap,
  type ExtractedAmountField,
  extractAmountField,
  extractApplicationSummary,
} from "@/utilities/form-schema-helpers";

describe("form-schema-helpers", () => {
  describe("createFieldTypeMap", () => {
    it("should create a map of field IDs to types", () => {
      const formSchema = {
        fields: [
          { id: "field1", type: "text", label: "Field 1" },
          { id: "field2", type: "number", label: "Field 2" },
        ],
      };

      const result = createFieldTypeMap(formSchema);

      expect(result.field1).toBe("text");
      expect(result.field2).toBe("number");
    });

    it("should also map labels to types", () => {
      const formSchema = {
        fields: [{ id: "amount", type: "number", label: "Funding Amount" }],
      };

      const result = createFieldTypeMap(formSchema);

      expect(result.amount).toBe("number");
      expect(result["Funding Amount"]).toBe("number");
    });

    it("should return empty object for invalid schema", () => {
      expect(createFieldTypeMap(null)).toEqual({});
      expect(createFieldTypeMap(undefined)).toEqual({});
      expect(createFieldTypeMap({})).toEqual({});
      expect(createFieldTypeMap({ fields: null })).toEqual({});
    });

    it("should skip fields without id or type", () => {
      const formSchema = {
        fields: [{ id: "valid", type: "text" }, { id: "noType" }, { type: "number" }],
      };

      const result = createFieldTypeMap(formSchema);

      expect(result.valid).toBe("text");
      expect(result.noType).toBeUndefined();
    });
  });

  describe("createFieldLabelsMap", () => {
    it("should create a map of field IDs to labels", () => {
      const formSchema = {
        fields: [
          { id: "name", label: "Project Name" },
          { id: "amount", label: "Funding Amount" },
        ],
      };

      const result = createFieldLabelsMap(formSchema);

      expect(result.name).toBe("Project Name");
      expect(result.amount).toBe("Funding Amount");
    });

    it("should return empty object for invalid schema", () => {
      expect(createFieldLabelsMap(null)).toEqual({});
      expect(createFieldLabelsMap(undefined)).toEqual({});
    });

    it("should skip fields without id or label", () => {
      const formSchema = {
        fields: [{ id: "valid", label: "Valid Label" }, { id: "noLabel" }, { label: "No ID" }],
      };

      const result = createFieldLabelsMap(formSchema);

      expect(result.valid).toBe("Valid Label");
      expect(result.noLabel).toBeUndefined();
    });
  });

  describe("extractAmountField", () => {
    describe("pattern matching for different field names", () => {
      const testPatternMatching = (fieldName: string, value: string | number) => {
        const applicationData = { [fieldName]: value };
        const result = extractAmountField(applicationData, undefined);
        return result;
      };

      it('should match "OP request locked"', () => {
        const result = testPatternMatching("OP request locked", "1231");
        expect(result).not.toBeNull();
        expect(result?.value).toBe("1231");
        expect(result?.fieldLabel).toBe("OP request locked");
      });

      it('should match "ARB Request Locked"', () => {
        const result = testPatternMatching("ARB Request Locked", 5000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(5000);
      });

      it('should match "funding_amount"', () => {
        const result = testPatternMatching("funding_amount", 10000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(10000);
      });

      it('should match "Funding Amount"', () => {
        const result = testPatternMatching("Funding Amount", "25000");
        expect(result).not.toBeNull();
        expect(result?.value).toBe("25000");
      });

      it('should match "requested_amount"', () => {
        const result = testPatternMatching("requested_amount", 7500);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(7500);
      });

      it('should match "grant_amount"', () => {
        const result = testPatternMatching("grant_amount", 15000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(15000);
      });

      it('should match "budget_amount"', () => {
        const result = testPatternMatching("budget_amount", 20000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(20000);
      });

      it('should match "Total Amount Requested"', () => {
        const result = testPatternMatching("Total Amount Requested", 30000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(30000);
      });

      it('should match "Total OP Requested"', () => {
        const result = testPatternMatching("Total OP Requested", 45000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(45000);
      });

      it('should match "OP Request Unlocked"', () => {
        const result = testPatternMatching("OP Request Unlocked", 8000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(8000);
      });

      it('should match "Token Request"', () => {
        const result = testPatternMatching("Token Request", 12000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(12000);
      });

      it('should match "amount"', () => {
        const result = testPatternMatching("amount", 5000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(5000);
      });

      it('should match "funding"', () => {
        const result = testPatternMatching("funding", 3000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(3000);
      });

      it('should match "budget"', () => {
        const result = testPatternMatching("budget", 4000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(4000);
      });

      it('should match fields ending in "Requested"', () => {
        const result = testPatternMatching("Funds Requested", 6000);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(6000);
      });

      it("should be case-insensitive", () => {
        const result1 = testPatternMatching("FUNDING_AMOUNT", 1000);
        const result2 = testPatternMatching("funding_amount", 1000);
        const result3 = testPatternMatching("Funding_Amount", 1000);

        expect(result1).not.toBeNull();
        expect(result2).not.toBeNull();
        expect(result3).not.toBeNull();
      });
    });

    describe("value lookup by field.id vs field.label", () => {
      it("should find value by field.id when applicationData uses id as key", () => {
        const applicationData = { amount_field: 5000 };
        const formSchema = {
          fields: [{ id: "amount_field", label: "Funding Amount", type: "number" }],
        };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe(5000);
        expect(result?.fieldId).toBe("amount_field");
      });

      it("should find value by field.label when applicationData uses label as key", () => {
        const applicationData = { "Funding Amount": 7500 };
        const formSchema = {
          fields: [{ id: "amount_field", label: "Funding Amount", type: "number" }],
        };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe(7500);
        expect(result?.fieldLabel).toBe("Funding Amount");
      });

      it("should prefer field.id over field.label when both exist", () => {
        const applicationData = {
          amount_field: 5000,
          "Funding Amount": 7500,
        };
        const formSchema = {
          fields: [{ id: "amount_field", label: "Funding Amount", type: "number" }],
        };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe(5000); // Should use id-based value
      });
    });

    describe("direct applicationData keys search (third pass)", () => {
      it("should find amount from applicationData keys when schema is undefined", () => {
        const applicationData = {
          "Project Name": "Test Project",
          "OP request locked": "1231",
          Description: "Test description",
        };

        const result = extractAmountField(applicationData, undefined);

        expect(result).not.toBeNull();
        expect(result?.value).toBe("1231");
        expect(result?.fieldId).toBe("OP request locked");
        expect(result?.fieldLabel).toBe("OP request locked");
      });

      it("should find amount from applicationData keys when schema has no matching fields", () => {
        const applicationData = {
          "Project Name": "Test Project",
          "Funding Amount": 10000,
        };
        const formSchema = {
          fields: [{ id: "other_field", label: "Other Field", type: "text" }],
        };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe(10000);
      });

      it("should find amount when schema.fields is empty", () => {
        const applicationData = { grant_amount: 15000 };
        const formSchema = { fields: [] };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe(15000);
      });
    });

    describe("edge cases", () => {
      it("should return null for undefined applicationData", () => {
        const result = extractAmountField(undefined, {});
        expect(result).toBeNull();
      });

      it("should return null for empty applicationData", () => {
        const result = extractAmountField({}, undefined);
        expect(result).toBeNull();
      });

      it("should return null when no amount fields are found", () => {
        const applicationData = {
          "Project Name": "Test",
          Description: "A description",
          Category: "DeFi",
        };

        const result = extractAmountField(applicationData, undefined);
        expect(result).toBeNull();
      });

      it("should return null for empty string values", () => {
        const applicationData = { "Funding Amount": "" };
        const result = extractAmountField(applicationData, undefined);
        expect(result).toBeNull();
      });

      it("should return null for null values", () => {
        const applicationData = { "Funding Amount": null };
        const result = extractAmountField(applicationData, undefined);
        expect(result).toBeNull();
      });

      it("should return null for non-numeric string values", () => {
        const applicationData = { "Funding Amount": "not a number" };
        const result = extractAmountField(applicationData, undefined);
        expect(result).toBeNull();
      });

      it("should return null for zero values", () => {
        const applicationData = { "Funding Amount": 0 };
        const result = extractAmountField(applicationData, undefined);
        expect(result).toBeNull();
      });

      it("should return null for negative values", () => {
        const applicationData = { "Funding Amount": -1000 };
        const result = extractAmountField(applicationData, undefined);
        expect(result).toBeNull();
      });

      it("should handle string numbers correctly", () => {
        const applicationData = { "Funding Amount": "12345" };
        const result = extractAmountField(applicationData, undefined);
        expect(result).not.toBeNull();
        expect(result?.value).toBe("12345");
      });

      it("should handle decimal numbers", () => {
        const applicationData = { "Funding Amount": 1234.56 };
        const result = extractAmountField(applicationData, undefined);
        expect(result).not.toBeNull();
        expect(result?.value).toBe(1234.56);
      });

      it("should handle string decimal numbers", () => {
        const applicationData = { "Funding Amount": "1234.56" };
        const result = extractAmountField(applicationData, undefined);
        expect(result).not.toBeNull();
        expect(result?.value).toBe("1234.56");
      });
    });

    describe("schema-based extraction (first and second pass)", () => {
      it("should prioritize number-type fields in first pass", () => {
        const applicationData = {
          funding_amount_num: 5000,
          funding_amount_txt: "7500",
        };
        const formSchema = {
          fields: [
            { id: "funding_amount_txt", label: "Funding Amount Text", type: "text" },
            { id: "funding_amount_num", label: "Funding Amount Number", type: "number" },
          ],
        };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe(5000);
        expect(result?.fieldId).toBe("funding_amount_num");
      });

      it("should fall back to text fields in second pass", () => {
        const applicationData = { funding_text: "7500" };
        const formSchema = {
          fields: [{ id: "funding_text", label: "Funding Amount", type: "text" }],
        };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe("7500");
      });

      it("should match by field.id pattern", () => {
        const applicationData = { funding_amount: 10000 };
        const formSchema = {
          fields: [{ id: "funding_amount", label: "Custom Label", type: "number" }],
        };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe(10000);
      });

      it("should match by field.label pattern", () => {
        const applicationData = { custom_id: 10000 };
        const formSchema = {
          fields: [{ id: "custom_id", label: "Funding Amount", type: "number" }],
        };

        const result = extractAmountField(applicationData, formSchema);

        expect(result).not.toBeNull();
        expect(result?.value).toBe(10000);
      });
    });

    describe("real-world application data scenarios", () => {
      it("should handle Optimism grant application data", () => {
        const applicationData = {
          "Project Name": "Test DeFi Protocol",
          "Project Contact Email": "test@example.com",
          "Project Description (2-3 sentences)": "A DeFi protocol for testing",
          "OP request locked": "1231",
          "Current TVL on Optimism": 2222,
          "Current TVL on Superchain": 123,
        };

        const result = extractAmountField(applicationData, undefined);

        expect(result).not.toBeNull();
        expect(result?.value).toBe("1231");
        expect(result?.fieldLabel).toBe("OP request locked");
      });

      it("should handle application with multiple potential amount fields - picks first match", () => {
        const applicationData = {
          "Project Name": "Test",
          "Total Amount Requested": 50000,
          "Funding Amount": 25000,
          Budget: 75000,
        };

        const result = extractAmountField(applicationData, undefined);

        // Should pick one of them based on pattern order
        expect(result).not.toBeNull();
        expect([50000, 25000, 75000]).toContain(result?.value);
      });
    });
  });

  describe("extractApplicationSummary", () => {
    const sampleFormSchema = {
      fields: [
        { id: "project_name", label: "Project Name", type: "text" },
        { id: "amount", label: "Funding Amount", type: "number" },
        { id: "description", label: "Description", type: "textarea" },
        { id: "category", label: "Category", type: "text" },
        { id: "timeline", label: "Timeline", type: "text" },
      ],
    };

    it("should extract summary fields from application data", () => {
      const applicationData = {
        project_name: "Test Project",
        amount: 10000,
        description: "A long description",
        category: "DeFi",
        timeline: "6 months",
      };

      const result = extractApplicationSummary(applicationData, sampleFormSchema);

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should mark amount fields with isAmount: true", () => {
      const applicationData = {
        project_name: "Test Project",
        amount: 10000,
      };

      const result = extractApplicationSummary(applicationData, sampleFormSchema);
      const amountField = result.find((f) => f.label === "Funding Amount");

      expect(amountField).toBeDefined();
      expect(amountField?.isAmount).toBe(true);
    });

    it("should respect maxFields parameter", () => {
      const applicationData = {
        project_name: "Test Project",
        amount: 10000,
        description: "Description",
        category: "DeFi",
        timeline: "6 months",
      };

      const result = extractApplicationSummary(applicationData, sampleFormSchema, 3);

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("should return empty array for invalid inputs", () => {
      expect(extractApplicationSummary(undefined, sampleFormSchema)).toEqual([]);
      expect(extractApplicationSummary({}, sampleFormSchema)).toEqual([]);
      expect(extractApplicationSummary({ test: "value" }, undefined)).toEqual([]);
      expect(extractApplicationSummary({ test: "value" }, {})).toEqual([]);
    });

    it("should skip milestone and textarea fields in fill pass", () => {
      const formSchema = {
        fields: [
          { id: "milestones", label: "Milestones", type: "milestone" },
          { id: "long_text", label: "Long Text", type: "textarea" },
          { id: "short_field", label: "Short Field", type: "text" },
        ],
      };
      const applicationData = {
        milestones: [{ title: "M1" }],
        long_text: "Very long text",
        short_field: "Short",
      };

      const result = extractApplicationSummary(applicationData, formSchema);

      // Should not include milestone or textarea fields unless they match priority patterns
      const milestoneField = result.find((f) => f.label === "Milestones");
      expect(milestoneField).toBeUndefined();
    });

    it("should truncate long string values", () => {
      const formSchema = {
        fields: [{ id: "name", label: "Project Name", type: "text" }],
      };
      const longValue = "A".repeat(150);
      const applicationData = { name: longValue };

      const result = extractApplicationSummary(applicationData, formSchema);

      if (result.length > 0) {
        expect(result[0].value.length).toBeLessThanOrEqual(100);
      }
    });

    it("should handle array values", () => {
      const formSchema = {
        fields: [{ id: "tags", label: "Tags", type: "multiselect" }],
      };
      const applicationData = { tags: ["tag1", "tag2", "tag3", "tag4", "tag5"] };

      const result = extractApplicationSummary(applicationData, formSchema);
      const tagsField = result.find((f) => f.label === "Tags");

      if (tagsField) {
        expect(tagsField.value).toContain("tag1");
        expect(tagsField.value).toContain("...");
      }
    });
  });
});
