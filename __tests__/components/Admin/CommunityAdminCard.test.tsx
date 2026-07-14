import { render, screen } from "@testing-library/react";
import { CommunityAdminCard } from "@/components/Pages/Admin/CommunityAdminCard";
import type { Community } from "@/types/v2/community";
import "@testing-library/jest-dom";

// The Listing controls are exercised in their own suite; here we only assert
// the card mounts them behind the owner gate (no-glimpse: never rendered — and
// therefore never fetches config — for non-owners).
vi.mock("@/components/Pages/Admin/CommunityListingControls", () => ({
  CommunityListingControls: vi.fn(() => <div data-testid="listing-controls" />),
}));

// Heavy children that pull in network/hooks — stub to inert nodes.
vi.mock("@/components/CommunityStats", () => ({ default: () => <div data-testid="stats" /> }));
vi.mock("@/components/EthereumAddressToProfileName", () => ({
  default: ({ address }: { address: string }) => <span>{address}</span>,
}));
vi.mock("@/components/Pages/Admin/AddAdminDialog", () => ({
  AddAdmin: () => <button type="button">add</button>,
}));
vi.mock("@/components/Pages/Admin/RemoveAdminDialog", () => ({
  RemoveAdmin: () => <button type="button">remove</button>,
}));
vi.mock("@/src/components/navigation/Link", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock("next/image", () => ({ default: () => <img alt="" /> }));

const community: Community = {
  uid: "0x1234567890123456789012345678901234567890" as `0x${string}`,
  chainID: 10,
  details: { name: "Filecoin", slug: "filecoin" },
} as Community;

const baseProps = {
  community,
  matchingCommunityAdmin: undefined,
  canManageAdmins: true,
  isExpanded: false,
  onToggleExpansion: vi.fn(),
  adminProfiles: undefined,
  onRefetch: vi.fn(),
};

describe("CommunityAdminCard — Listing gate", () => {
  it("hides the Listing section (and never mounts the config controls) when canManageConfig is false", () => {
    render(<CommunityAdminCard {...baseProps} canManageConfig={false} />);

    expect(screen.queryByText("Listing")).not.toBeInTheDocument();
    expect(screen.queryByTestId("listing-controls")).not.toBeInTheDocument();
  });

  it("shows the Listing section with the config controls when canManageConfig is true", () => {
    render(<CommunityAdminCard {...baseProps} canManageConfig={true} />);

    expect(screen.getByText("Listing")).toBeInTheDocument();
    expect(screen.getByTestId("listing-controls")).toBeInTheDocument();
  });
});
