/**
 * @file Tests for the runtime PII guard (utilities/analytics/redact.ts).
 *
 * Two failure modes are covered in equal measure: letting an identifier
 * through, and being so aggressive that it silently empties a legitimate
 * property — the second is the one that produces a report nobody can explain.
 */

import { redactSensitiveProps } from "@/utilities/analytics/redact";

describe("redactSensitiveProps", () => {
  describe("keys that are PII by name", () => {
    it.each([
      ["email"],
      ["viewerEmail"],
      ["wallet"],
      ["primary_wallet"],
      ["address"],
      ["walletAddress"],
      ["phone"],
      ["token"],
      ["api_token"],
      ["secret"],
      ["client_secret"],
    ])("drops %s whatever it holds", (key) => {
      const { safe, dropped } = redactSensitiveProps({ [key]: "anything", keep: 1 });

      expect(safe).toEqual({ keep: 1 });
      expect(dropped).toEqual([key]);
    });

    it("keeps a name that merely reads like one of them", () => {
      const { safe, dropped } = redactSensitiveProps({ currency: "USDC", share_type: "token" });

      expect(safe).toEqual({ currency: "USDC", share_type: "token" });
      expect(dropped).toEqual([]);
    });
  });

  describe("values that look like an identifier", () => {
    it("drops a property holding an email", () => {
      const { safe, dropped } = redactSensitiveProps({ label: "alice@example.test" });

      expect(safe).toEqual({});
      expect(dropped).toEqual(["label"]);
    });

    it("drops a property holding an email inside a longer string", () => {
      const { safe } = redactSensitiveProps({ label: "invited alice@example.test to the team" });

      expect(safe).toEqual({});
    });

    it("drops a property holding an EVM address", () => {
      const { safe } = redactSensitiveProps({
        actor: "0x1234567890abcdef1234567890abcdef12345678",
      });

      expect(safe).toEqual({});
    });

    it("inspects strings only, so real metrics survive", () => {
      const props = {
        total_usd: 100,
        chain_id: 10,
        used_onramp: false,
        results_count: null,
        milestones_count: 0,
      };

      expect(redactSensitiveProps(props).safe).toEqual(props);
    });
  });

  describe("arrays", () => {
    it("keeps a list of field names that merely mention a wallet", () => {
      const { safe, dropped } = redactSensitiveProps({
        fields_changed: ["title", "walletAddress", "description"],
      });

      expect(safe).toEqual({ fields_changed: ["title", "walletAddress", "description"] });
      expect(dropped).toEqual([]);
    });

    it("drops only the offending element, never the whole array", () => {
      const { safe, dropped } = redactSensitiveProps({
        fields_changed: ["title", "alice@example.test", "description"],
      });

      expect(safe).toEqual({ fields_changed: ["title", "description"] });
      expect(dropped).toEqual(["fields_changed"]);
    });

    it("keeps the property as an empty array when every element was sensitive", () => {
      const { safe } = redactSensitiveProps({
        fields_changed: ["0x1234567890abcdef1234567890abcdef12345678"],
      });

      expect(safe).toEqual({ fields_changed: [] });
    });

    it("still drops an array whose key is PII by name", () => {
      const { safe } = redactSensitiveProps({ wallets: ["0xabc", "0xdef"] });

      expect(safe).toEqual({});
    });
  });

  it("reports every dropped property so strict mode can name them", () => {
    const { dropped } = redactSensitiveProps({
      email: "a@b.test",
      wallet: "0xabc",
      keep: "fine",
    });

    expect(dropped).toEqual(["email", "wallet"]);
  });
});
