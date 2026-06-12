import { communitySubpageMetadata } from "@/utilities/metadata/communityCanonical";
import { getWhitelabelContext } from "@/utilities/whitelabel-server";

vi.mock("@/utilities/whitelabel-server", () => ({
  getWhitelabelContext: vi.fn(),
}));

describe("communitySubpageMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds a full /community/<id>/<subpath> self-canonical on the main site", async () => {
    vi.mocked(getWhitelabelContext).mockResolvedValue({ isWhitelabel: false } as never);

    const meta = await communitySubpageMetadata("arbitrum", "reports");

    expect(meta.alternates?.canonical).toBe("/community/arbitrum/reports");
  });

  it("strips the /community/<id> prefix on a whitelabel domain", async () => {
    vi.mocked(getWhitelabelContext).mockResolvedValue({ isWhitelabel: true } as never);

    const meta = await communitySubpageMetadata("optimism", "reports/2026-05-01");

    expect(meta.alternates?.canonical).toBe("/reports/2026-05-01");
  });
});
