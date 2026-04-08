import {
  buildGrantAllocationTotalMap,
  buildMilestoneAllocationMap,
  resolveTokenSymbol,
} from "@/hooks/useCommunityMilestoneAllocations";
import type { PayoutGrantConfig } from "@/src/features/payout-disbursement/types/payout-disbursement";

describe("resolveTokenSymbol", () => {
  it("should_return_grant_currency_when_provided", () => {
    const config = { tokenAddress: null, chainID: null } as PayoutGrantConfig;
    expect(resolveTokenSymbol(config, "FIL")).toBe("FIL");
  });

  it("should_return_USDC_when_tokenAddress_matches_usdc_on_ethereum", () => {
    const config = {
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      chainID: 1,
    } as PayoutGrantConfig;
    expect(resolveTokenSymbol(config)).toBe("USDC");
  });

  it("should_return_USDC_when_tokenAddress_matches_usdc_on_optimism", () => {
    const config = {
      tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
      chainID: 10,
    } as PayoutGrantConfig;
    expect(resolveTokenSymbol(config)).toBe("USDC");
  });

  it("should_return_USDC_case_insensitive", () => {
    const config = {
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      chainID: 1,
    } as PayoutGrantConfig;
    expect(resolveTokenSymbol(config)).toBe("USDC");
  });

  it("should_return_native_token_when_native_address", () => {
    const config = {
      tokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
      chainID: 10,
    } as PayoutGrantConfig;
    expect(resolveTokenSymbol(config)).toBe("ETH");
  });

  it("should_return_undefined_when_no_token_address", () => {
    const config = { tokenAddress: null, chainID: 1 } as PayoutGrantConfig;
    expect(resolveTokenSymbol(config)).toBeUndefined();
  });

  it("should_return_undefined_when_unknown_token_address", () => {
    const config = {
      tokenAddress: "0x1234567890abcdef1234567890abcdef12345678",
      chainID: 1,
    } as PayoutGrantConfig;
    expect(resolveTokenSymbol(config)).toBeUndefined();
  });

  it("should_prefer_grant_currency_over_token_address", () => {
    const config = {
      tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      chainID: 1,
    } as PayoutGrantConfig;
    expect(resolveTokenSymbol(config, "FIL")).toBe("FIL");
  });
});

describe("buildMilestoneAllocationMap", () => {
  it("should_return_empty_map_when_no_payout_configs", () => {
    const result = buildMilestoneAllocationMap([]);
    expect(result.size).toBe(0);
  });

  it("should_return_empty_map_when_all_configs_are_undefined", () => {
    const result = buildMilestoneAllocationMap([undefined, undefined]);
    expect(result.size).toBe(0);
  });

  it("should_map_milestone_uid_to_formatted_amount_when_pure_numeric", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [
          { id: "a1", milestoneUID: "ms-1", label: "Milestone 1", amount: "30000" },
        ],
      } as PayoutGrantConfig,
    ];

    const result = buildMilestoneAllocationMap(configs);

    expect(result.get("ms-1")).toBe("$30,000");
  });

  it("should_format_token_suffixed_amount_without_dollar_when_token_present", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [
          { id: "a1", milestoneUID: "ms-1", label: "Milestone 1", amount: "30000 OP" },
        ],
      } as PayoutGrantConfig,
    ];

    const result = buildMilestoneAllocationMap(configs);

    expect(result.get("ms-1")).toBe("30,000 OP");
  });

  it("should_skip_allocations_without_milestone_uid", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [
          { id: "a1", milestoneUID: undefined, label: "No UID", amount: "5000" },
        ],
      } as PayoutGrantConfig,
    ];

    const result = buildMilestoneAllocationMap(configs);

    expect(result.size).toBe(0);
  });

  it("should_skip_allocations_with_zero_amount", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "Zero", amount: "0" }],
      } as PayoutGrantConfig,
    ];

    const result = buildMilestoneAllocationMap(configs);

    expect(result.size).toBe(0);
  });

  it("should_aggregate_allocations_from_multiple_configs", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "10000" }],
      } as PayoutGrantConfig,
      {
        grantUID: "grant-2",
        milestoneAllocations: [
          { id: "a2", milestoneUID: "ms-2", label: "M2", amount: "20000 FIL" },
        ],
      } as PayoutGrantConfig,
    ];

    const result = buildMilestoneAllocationMap(configs);

    expect(result.size).toBe(2);
    expect(result.get("ms-1")).toBe("$10,000");
    expect(result.get("ms-2")).toBe("20,000 FIL");
  });

  it("should_use_grant_currency_when_currencyByGrant_provided", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "30000" }],
      } as PayoutGrantConfig,
    ];
    const currencyByGrant = new Map([["grant-1", "FIL"]]);

    const result = buildMilestoneAllocationMap(configs, currencyByGrant);

    expect(result.get("ms-1")).toBe("30,000 FIL");
  });

  it("should_fallback_to_dollar_when_grant_has_no_currency_in_map", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "30000" }],
      } as PayoutGrantConfig,
    ];
    const currencyByGrant = new Map<string, string>();

    const result = buildMilestoneAllocationMap(configs, currencyByGrant);

    expect(result.get("ms-1")).toBe("$30,000");
  });

  it("should_use_different_currencies_for_different_grants", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "10000" }],
      } as PayoutGrantConfig,
      {
        grantUID: "grant-2",
        milestoneAllocations: [{ id: "a2", milestoneUID: "ms-2", label: "M2", amount: "20000" }],
      } as PayoutGrantConfig,
    ];
    const currencyByGrant = new Map([
      ["grant-1", "FIL"],
      ["grant-2", "OP"],
    ]);

    const result = buildMilestoneAllocationMap(configs, currencyByGrant);

    expect(result.get("ms-1")).toBe("10,000 FIL");
    expect(result.get("ms-2")).toBe("20,000 OP");
  });

  it("should_resolve_USDC_from_payout_config_token_address", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        chainID: 1,
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "30000" }],
      } as PayoutGrantConfig,
    ];

    const result = buildMilestoneAllocationMap(configs);

    expect(result.get("ms-1")).toBe("30,000 USDC");
  });

  it("should_resolve_native_token_from_payout_config", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        tokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        chainID: 10,
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "5000" }],
      } as PayoutGrantConfig,
    ];

    const result = buildMilestoneAllocationMap(configs);

    expect(result.get("ms-1")).toBe("5,000 ETH");
  });

  it("should_skip_null_configs", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      null,
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "5000" }],
      } as PayoutGrantConfig,
    ];

    const result = buildMilestoneAllocationMap(configs);

    expect(result.size).toBe(1);
    expect(result.get("ms-1")).toBe("$5,000");
  });
});

describe("buildGrantAllocationTotalMap", () => {
  it("should_return_empty_map_when_no_configs", () => {
    const result = buildGrantAllocationTotalMap([]);
    expect(result.size).toBe(0);
  });

  it("should_sum_milestone_allocations_per_grant", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [
          { id: "a1", milestoneUID: "ms-1", label: "M1", amount: "10000" },
          { id: "a2", milestoneUID: "ms-2", label: "M2", amount: "20000" },
        ],
      } as PayoutGrantConfig,
    ];

    const result = buildGrantAllocationTotalMap(configs);

    expect(result.get("grant-1")).toBe("$30,000");
  });

  it("should_use_currency_from_currencyByGrant", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [
          { id: "a1", milestoneUID: "ms-1", label: "M1", amount: "10000" },
          { id: "a2", milestoneUID: "ms-2", label: "M2", amount: "5000" },
        ],
      } as PayoutGrantConfig,
    ];
    const currencyByGrant = new Map([["grant-1", "FIL"]]);

    const result = buildGrantAllocationTotalMap(configs, currencyByGrant);

    expect(result.get("grant-1")).toBe("15,000 FIL");
  });

  it("should_resolve_token_from_payout_config", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        tokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        chainID: 1,
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "50000" }],
      } as PayoutGrantConfig,
    ];

    const result = buildGrantAllocationTotalMap(configs);

    expect(result.get("grant-1")).toBe("50,000 USDC");
  });

  it("should_skip_zero_total_grants", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "0" }],
      } as PayoutGrantConfig,
    ];

    const result = buildGrantAllocationTotalMap(configs);

    expect(result.size).toBe(0);
  });

  it("should_handle_token_suffixed_amounts", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [
          { id: "a1", milestoneUID: "ms-1", label: "M1", amount: "10000 OP" },
          { id: "a2", milestoneUID: "ms-2", label: "M2", amount: "5000 OP" },
        ],
      } as PayoutGrantConfig,
    ];

    const result = buildGrantAllocationTotalMap(configs);

    expect(result.get("grant-1")).toBe("$15,000");
  });

  it("should_handle_multiple_grants", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "10000" }],
      } as PayoutGrantConfig,
      {
        grantUID: "grant-2",
        milestoneAllocations: [{ id: "a2", milestoneUID: "ms-2", label: "M2", amount: "20000" }],
      } as PayoutGrantConfig,
    ];
    const currencyByGrant = new Map([
      ["grant-1", "FIL"],
      ["grant-2", "OP"],
    ]);

    const result = buildGrantAllocationTotalMap(configs, currencyByGrant);

    expect(result.get("grant-1")).toBe("10,000 FIL");
    expect(result.get("grant-2")).toBe("20,000 OP");
  });

  it("should_skip_null_configs", () => {
    const configs: (PayoutGrantConfig | null | undefined)[] = [
      null,
      undefined,
      {
        grantUID: "grant-1",
        milestoneAllocations: [{ id: "a1", milestoneUID: "ms-1", label: "M1", amount: "5000" }],
      } as PayoutGrantConfig,
    ];

    const result = buildGrantAllocationTotalMap(configs);

    expect(result.size).toBe(1);
    expect(result.get("grant-1")).toBe("$5,000");
  });
});
