/**
 * Tests for DonationAlerts component
 *
 * Covers:
 * - Connected state: no alerts shown
 * - Not connected: wallet connection alert with Connect Wallet button
 * - Unsupported network: network alert shown
 * - Both alerts can appear independently
 */

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DonationAlerts } from "@/components/Donation/DonationAlerts";
import { renderWithProviders } from "../../utils/render";

const mockLogin = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock("@/components/Utilities/Button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("DonationAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Connected and supported network", () => {
    it("should not show any alerts", () => {
      renderWithProviders(
        <DonationAlerts
          isConnected={true}
          address="0x1234567890123456789012345678901234567890"
          isCurrentNetworkSupported={true}
        />
      );

      expect(screen.queryByText("Connect Wallet")).not.toBeInTheDocument();
      expect(screen.queryByText("Network Unsupported")).not.toBeInTheDocument();
    });
  });

  describe("Not connected", () => {
    it("should show the wallet connection alert", () => {
      renderWithProviders(
        <DonationAlerts isConnected={false} address={undefined} isCurrentNetworkSupported={true} />
      );

      // "Connect Wallet" appears as both a heading and button text
      expect(screen.getAllByText("Connect Wallet")).toHaveLength(2);
      expect(
        screen.getByText("Connect your wallet to view token balances and submit donations.")
      ).toBeInTheDocument();
    });

    it("should call login when Connect Wallet button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <DonationAlerts isConnected={false} address={undefined} isCurrentNetworkSupported={true} />
      );

      // There are two "Connect Wallet" texts (heading + button), click the button
      const buttons = screen.getAllByText("Connect Wallet");
      const button = buttons.find((el) => el.tagName === "BUTTON");
      expect(button).toBeTruthy();
      await user.click(button!);

      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it("should show wallet alert when connected but no address", () => {
      renderWithProviders(
        <DonationAlerts isConnected={true} address={undefined} isCurrentNetworkSupported={true} />
      );

      expect(screen.getAllByText("Connect Wallet").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Unsupported network", () => {
    it("should show the network unsupported alert when connected on wrong network", () => {
      renderWithProviders(
        <DonationAlerts
          isConnected={true}
          address="0x1234567890123456789012345678901234567890"
          isCurrentNetworkSupported={false}
        />
      );

      expect(screen.getByText("Network Unsupported")).toBeInTheDocument();
      expect(
        screen.getByText("Switch to a supported network before submitting donations.")
      ).toBeInTheDocument();
    });

    it("should not show network alert when not connected", () => {
      renderWithProviders(
        <DonationAlerts isConnected={false} address={undefined} isCurrentNetworkSupported={false} />
      );

      // Network alert only shows when isConnected is true
      expect(screen.queryByText("Network Unsupported")).not.toBeInTheDocument();
    });
  });
});
