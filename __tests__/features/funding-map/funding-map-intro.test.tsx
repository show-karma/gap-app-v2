import { render, screen } from "@testing-library/react";
import { FundingMapIntro } from "@/src/features/funding-map/components/funding-map-intro";
import type { FundingMapOverview } from "@/src/features/funding-map/server/funding-map-overview";
import { EMPTY_OVERVIEW } from "@/src/features/funding-map/server/funding-map-overview";

const FULL_OVERVIEW: FundingMapOverview = {
  totalPrograms: 460,
  activePrograms: 92,
  organizationCount: 168,
  topOrganizations: ["Celo", "Optimism", "Filecoin", "Ethereum Foundation"],
  featuredPrograms: [],
};

describe("FundingMapIntro", () => {
  describe("success", () => {
    it("renders live counts and top organizations in the answer copy", () => {
      render(<FundingMapIntro overview={FULL_OVERVIEW} />);

      const copy = screen.getByText(/live directory of grants/i);
      expect(copy.textContent).toContain("460 funding programs");
      expect(copy.textContent).toContain("168 organizations");
      expect(copy.textContent).toContain("92 of them open for applications");
      expect(copy.textContent).toContain("Celo, Optimism, Filecoin and Ethereum Foundation");
    });

    it("pluralizes a single program correctly", () => {
      render(
        <FundingMapIntro overview={{ ...FULL_OVERVIEW, totalPrograms: 1, organizationCount: 1 }} />
      );

      const copy = screen.getByText(/live directory of grants/i);
      expect(copy.textContent).toContain("1 funding program from");
      expect(copy.textContent).toContain("1 organization and ecosystems");
      expect(copy.textContent).not.toContain("1 funding programs");
    });
  });

  describe("empty", () => {
    it("omits every count sentence when stats are unavailable, keeping the answer copy", () => {
      render(<FundingMapIntro overview={EMPTY_OVERVIEW} />);

      const copy = screen.getByText(/live directory of grants/i);
      expect(copy.textContent).not.toContain("It currently lists");
      expect(copy.textContent).not.toContain("open for applications");
      expect(copy.textContent).toContain("how to apply");
    });

    it("hides the open-programs clause when the active count is zero", () => {
      render(<FundingMapIntro overview={{ ...FULL_OVERVIEW, activePrograms: 0 }} />);

      expect(screen.getByText(/live directory of grants/i).textContent).not.toContain(
        "open for applications"
      );
    });
  });
});
