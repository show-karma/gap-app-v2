/**
 * @file Tests for <AttestationSubmit> — the generalized signer-readiness submit
 * control (issue #1821). Asserts the three signerStatus gates: no-wallet renders
 * a Connect CTA (never a silent submit), initializing disables submit, and ready
 * submits normally.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttestationSubmit } from "@/components/ui/AttestationSubmit";

describe("AttestationSubmit", () => {
  const baseProps = {
    onConnectWallet: vi.fn(),
    label: "Create Milestone",
  };

  describe("no-wallet", () => {
    it("renders a Connect wallet CTA instead of the submit button", () => {
      render(<AttestationSubmit signerStatus="no-wallet" {...baseProps} />);
      expect(screen.getByText("Connect wallet")).toBeInTheDocument();
      expect(screen.queryByText("Create Milestone")).not.toBeInTheDocument();
    });

    it("calls onConnectWallet when the CTA is clicked", () => {
      const onConnectWallet = vi.fn();
      render(
        <AttestationSubmit signerStatus="no-wallet" onConnectWallet={onConnectWallet} label="X" />
      );
      fireEvent.click(screen.getByText("Connect wallet"));
      expect(onConnectWallet).toHaveBeenCalledTimes(1);
    });

    it("honors a custom connectLabel", () => {
      render(
        <AttestationSubmit signerStatus="no-wallet" {...baseProps} connectLabel="Link a wallet" />
      );
      expect(screen.getByText("Link a wallet")).toBeInTheDocument();
    });
  });

  describe("initializing", () => {
    it("shows a clickable 'Preparing…' state (no manual retry) while the wallet provisions", () => {
      render(<AttestationSubmit signerStatus="initializing" {...baseProps} />);
      // Enabled so the click auto-proceeds; labelled 'Preparing…', not the action label.
      const button = screen.getByRole("button", { name: /Preparing/i });
      expect(button).toBeEnabled();
      expect(screen.queryByRole("button", { name: /Create Milestone/i })).not.toBeInTheDocument();
    });

    it("still disables the submit while initializing if the form is invalid", () => {
      render(<AttestationSubmit signerStatus="initializing" disabled {...baseProps} />);
      expect(screen.getByRole("button", { name: /Preparing/i })).toBeDisabled();
    });

    it("fires onSubmit when clicked during initializing (auto-proceed)", () => {
      const onSubmit = vi.fn();
      render(
        <AttestationSubmit
          signerStatus="initializing"
          type="button"
          onSubmit={onSubmit}
          {...baseProps}
        />
      );
      fireEvent.click(screen.getByRole("button", { name: /Preparing/i }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe("ready", () => {
    it("renders an enabled submit button by default", () => {
      render(<AttestationSubmit signerStatus="ready" {...baseProps} />);
      const button = screen.getByRole("button", { name: /Create Milestone/i });
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute("type", "submit");
    });

    it("disables submit when disabled (e.g. invalid form)", () => {
      render(<AttestationSubmit signerStatus="ready" disabled {...baseProps} />);
      expect(screen.getByRole("button", { name: /Create Milestone/i })).toBeDisabled();
    });

    it("disables submit while loading", () => {
      render(<AttestationSubmit signerStatus="ready" isLoading {...baseProps} />);
      expect(screen.getByRole("button", { name: /Create Milestone/i })).toBeDisabled();
    });

    it("fires onSubmit for type=button", () => {
      const onSubmit = vi.fn();
      render(
        <AttestationSubmit signerStatus="ready" type="button" onSubmit={onSubmit} {...baseProps} />
      );
      fireEvent.click(screen.getByRole("button", { name: /Create Milestone/i }));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
