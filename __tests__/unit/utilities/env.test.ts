import { clientSchema, serverSchema, validateEnv } from "@/utilities/env.schema";

describe("env validation", () => {
  const validClientEnv = {
    NEXT_PUBLIC_ENV: "development",
    NEXT_PUBLIC_GAP_INDEXER_URL: "https://indexer.example.com",
    NEXT_PUBLIC_PRIVY_APP_ID: "test-privy-id",
  };

  describe("clientSchema", () => {
    it("accepts valid required vars", () => {
      const result = clientSchema.safeParse(validClientEnv);
      expect(result.success).toBe(true);
    });

    it("defaults NEXT_PUBLIC_ENV to development when missing", () => {
      const { NEXT_PUBLIC_ENV, ...rest } = validClientEnv;
      const result = clientSchema.safeParse(rest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_ENV).toBe("development");
      }
    });

    it("rejects invalid NEXT_PUBLIC_ENV value", () => {
      const result = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_ENV: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("accepts all valid NEXT_PUBLIC_ENV values", () => {
      for (const env of ["production", "staging", "development", "dev"]) {
        const result = clientSchema.safeParse({
          ...validClientEnv,
          NEXT_PUBLIC_ENV: env,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid NEXT_PUBLIC_GAP_INDEXER_URL", () => {
      const result = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_GAP_INDEXER_URL: "not-a-url",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty NEXT_PUBLIC_PRIVY_APP_ID", () => {
      const result = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_PRIVY_APP_ID: "",
      });
      expect(result.success).toBe(false);
    });

    it("allows optional RPC URLs", () => {
      const result = clientSchema.safeParse(validClientEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_RPC_MAINNET).toBeUndefined();
      }
    });

    it("accepts valid optional RPC URLs", () => {
      const result = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_RPC_MAINNET: "https://rpc.mainnet.example.com",
        NEXT_PUBLIC_RPC_OPTIMISM: "https://rpc.optimism.example.com",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty string for RPC URLs that have min(1)", () => {
      const result = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_RPC_MAINNET: "",
      });
      expect(result.success).toBe(false);
    });

    it("validates NEXT_PUBLIC_SENTRY_DSN as URL when provided", () => {
      const result = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_SENTRY_DSN: "not-a-url",
      });
      expect(result.success).toBe(false);

      const valid = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_SENTRY_DSN: "https://sentry.io/123",
      });
      expect(valid.success).toBe(true);
    });

    it("transforms NEXT_PUBLIC_E2E_AUTH_BYPASS to boolean", () => {
      const trueResult = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_E2E_AUTH_BYPASS: "true",
      });
      expect(trueResult.success).toBe(true);
      if (trueResult.success) {
        expect(trueResult.data.NEXT_PUBLIC_E2E_AUTH_BYPASS).toBe(true);
      }

      const falseResult = clientSchema.safeParse({
        ...validClientEnv,
        NEXT_PUBLIC_E2E_AUTH_BYPASS: "false",
      });
      expect(falseResult.success).toBe(true);
      if (falseResult.success) {
        expect(falseResult.data.NEXT_PUBLIC_E2E_AUTH_BYPASS).toBe(false);
      }
    });

    it("defaults NEXT_PUBLIC_E2E_AUTH_BYPASS to false when not set", () => {
      const result = clientSchema.safeParse(validClientEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_E2E_AUTH_BYPASS).toBe(false);
      }
    });

    it("defaults optional string vars to empty string", () => {
      const result = clientSchema.safeParse(validClientEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.NEXT_PUBLIC_PROJECT_ID).toBe("");
        expect(result.data.NEXT_PUBLIC_OSO_API_KEY).toBe("");
        expect(result.data.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe("");
      }
    });

    it("accepts valid NEXT_PUBLIC_VERCEL_ENV values", () => {
      for (const env of ["production", "preview", "development"]) {
        const result = clientSchema.safeParse({
          ...validClientEnv,
          NEXT_PUBLIC_VERCEL_ENV: env,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("serverSchema", () => {
    it("accepts empty env (all optional)", () => {
      const result = serverSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts valid SENTRY_AUTH_TOKEN", () => {
      const result = serverSchema.safeParse({
        SENTRY_AUTH_TOKEN: "some-token",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty SENTRY_AUTH_TOKEN (min 1)", () => {
      const result = serverSchema.safeParse({ SENTRY_AUTH_TOKEN: "" });
      expect(result.success).toBe(false);
    });

    it("transforms ANALYZE to boolean", () => {
      const trueResult = serverSchema.safeParse({ ANALYZE: "true" });
      expect(trueResult.success).toBe(true);
      if (trueResult.success) {
        expect(trueResult.data.ANALYZE).toBe(true);
      }
    });

    it("defaults ANALYZE to false", () => {
      const result = serverSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ANALYZE).toBe(false);
      }
    });
  });

  describe("validateEnv", () => {
    it("returns validated data for valid input", () => {
      const result = validateEnv(clientSchema, validClientEnv, "client");
      expect(result.NEXT_PUBLIC_ENV).toBe("development");
      expect(result.NEXT_PUBLIC_GAP_INDEXER_URL).toBe("https://indexer.example.com");
    });

    it("throws with descriptive error for invalid input", () => {
      expect(() => validateEnv(clientSchema, {}, "client")).toThrow(
        "Invalid client environment variables"
      );
    });

    it("lists all invalid vars in error message", () => {
      expect.assertions(2);
      try {
        validateEnv(clientSchema, {}, "client");
      } catch (e) {
        const message = (e as Error).message;
        expect(message).toContain("NEXT_PUBLIC_GAP_INDEXER_URL");
        expect(message).toContain("NEXT_PUBLIC_PRIVY_APP_ID");
      }
    });

    it("treats empty strings as undefined (unset vars)", () => {
      const result = validateEnv(
        clientSchema,
        {
          ...validClientEnv,
          NEXT_PUBLIC_VERCEL_ENV: "",
          NEXT_PUBLIC_SENTRY_DSN: "",
        },
        "client"
      );
      expect(result.NEXT_PUBLIC_VERCEL_ENV).toBeUndefined();
      expect(result.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
    });
  });
});
