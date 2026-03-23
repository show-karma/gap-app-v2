import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// --- Mocks for DisbursementForm dependencies ---
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x123", isConnected: true }),
  useChainId: () => 42220,
  useWalletClient: () => ({ data: null }),
}));

jest.mock("@/hooks/useWallet", () => ({
  useWallet: () => ({ switchChainAsync: jest.fn(), isPending: false }),
}));

jest.mock("react-hot-toast", () => ({ default: { error: jest.fn() } }));

jest.mock("papaparse", () => ({
  parse: jest.fn(),
}));

jest.mock("viem", () => ({
  isAddress: jest.fn(() => true),
}));

jest.mock("@heroicons/react/24/solid", () => ({
  CheckIcon: () => <svg data-testid="check-icon" />,
}));

jest.mock("lucide-react", () => ({
  CheckCircle: () => <svg data-testid="check-circle" />,
  CircleX: () => <svg data-testid="circle-x" />,
  Coins: () => <svg data-testid="coins" />,
  Globe: () => <svg data-testid="globe" />,
  Loader: () => <svg data-testid="loader" />,
  Shield: () => <svg data-testid="shield" />,
  UserCheck: () => <svg data-testid="user-check" />,
}));

// Mock safe utilities to prevent real network calls
jest.mock("../../../utilities/safe", () => ({
  canProposeToSafe: jest.fn(),
  getSafeTokenBalance: jest.fn(),
  isSafeDeployed: jest.fn(),
  signAndProposeDisbursement: jest.fn(),
}));

import { Button } from "@/components/Disbursement/components/Button";
// --- Imports (after mocks) ---
import { Card } from "@/components/Disbursement/components/Card";
import { StatusAlert } from "@/components/Disbursement/components/StatusAlert";
import { StatusCheckItem } from "@/components/Disbursement/components/StatusCheckItem";
import { DisbursementReview } from "@/components/Disbursement/DisbursementReview";
import { DisbursementStepper } from "@/components/Disbursement/DisbursementStepper";

/**
 * Helper: collect all class strings from all elements in a container
 * and check that at least one element contains the given dark: class.
 */
function expectDarkClass(container: HTMLElement, darkClass: string) {
  const allElements = container.querySelectorAll("*");
  const found = Array.from(allElements).some((el) => el.className?.toString().includes(darkClass));
  expect(found).toBe(true);
}

// ─── Card ────────────────────────────────────────────────────────────────────

describe("Card dark theme", () => {
  it("has dark:bg-zinc-900 on the container", () => {
    const { container } = render(<Card title="Test">Content</Card>);
    expectDarkClass(container, "dark:bg-zinc-900");
  });

  it("has dark:border-zinc-700 on the container", () => {
    const { container } = render(<Card title="Test">Content</Card>);
    expectDarkClass(container, "dark:border-zinc-700");
  });

  it("has dark:text-zinc-100 on the title", () => {
    const { container } = render(<Card title="Test Title">Content</Card>);
    expectDarkClass(container, "dark:text-zinc-100");
  });
});

// ─── Button ──────────────────────────────────────────────────────────────────

describe("Button dark theme", () => {
  it("secondary variant has dark:bg-zinc-900", () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    expectDarkClass(container, "dark:bg-zinc-900");
  });

  it("secondary variant has dark:text-zinc-100", () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    expectDarkClass(container, "dark:text-zinc-100");
  });

  it("secondary variant has dark:border-zinc-700", () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    expectDarkClass(container, "dark:border-zinc-700");
  });

  it("secondary variant has dark:hover:bg-zinc-800", () => {
    const { container } = render(<Button variant="secondary">Secondary</Button>);
    expectDarkClass(container, "dark:hover:bg-zinc-800");
  });
});

// ─── DisbursementStepper ─────────────────────────────────────────────────────

describe("DisbursementStepper dark theme", () => {
  it("has dark:bg-zinc-900 on the outer container", () => {
    const { container } = render(
      <DisbursementStepper currentStep="configure" completedSteps={[]} />
    );
    expectDarkClass(container, "dark:bg-zinc-900");
  });

  it("has dark:border-zinc-700 on the outer container", () => {
    const { container } = render(
      <DisbursementStepper currentStep="configure" completedSteps={[]} />
    );
    expectDarkClass(container, "dark:border-zinc-700");
  });

  it("has dark:text-zinc-400 on description text", () => {
    const { container } = render(
      <DisbursementStepper currentStep="configure" completedSteps={[]} />
    );
    expectDarkClass(container, "dark:text-zinc-400");
  });

  it("current step circle has dark:bg-zinc-900", () => {
    const { container } = render(
      <DisbursementStepper currentStep="configure" completedSteps={[]} />
    );
    expectDarkClass(container, "dark:bg-zinc-900");
  });
});

// ─── DisbursementReview ──────────────────────────────────────────────────────

describe("DisbursementReview dark theme", () => {
  const recipients = [
    { address: "0xabc", amount: "100" },
    { address: "0xdef", amount: "200" },
  ];

  it("has dark:bg-zinc-900 on the outer container", () => {
    const { container } = render(<DisbursementReview recipients={recipients} />);
    expectDarkClass(container, "dark:bg-zinc-900");
  });

  it("has dark:border-zinc-700 on the outer container", () => {
    const { container } = render(<DisbursementReview recipients={recipients} />);
    expectDarkClass(container, "dark:border-zinc-700");
  });

  it("has dark:text-zinc-100 on title and column headers", () => {
    const { container } = render(<DisbursementReview recipients={recipients} />);
    expectDarkClass(container, "dark:text-zinc-100");
  });

  it("has dark:hover:bg-zinc-800 on table rows", () => {
    const { container } = render(<DisbursementReview recipients={recipients} />);
    expectDarkClass(container, "dark:hover:bg-zinc-800");
  });

  it("tbody has dark:bg-zinc-900", () => {
    const { container } = render(<DisbursementReview recipients={recipients} />);
    expectDarkClass(container, "dark:bg-zinc-900");
  });
});

// ─── StatusCheckItem ─────────────────────────────────────────────────────────

describe("StatusCheckItem dark theme", () => {
  it("pending state has dark:bg-zinc-800 for gray background", () => {
    const { container } = render(
      <StatusCheckItem
        status={null}
        title="Test"
        successMessage="OK"
        failureMessage="Fail"
        pendingMessage="Pending"
        icon="test"
      />
    );
    expectDarkClass(container, "dark:bg-zinc-800");
  });

  it("pending state has dark:border-zinc-700", () => {
    const { container } = render(
      <StatusCheckItem
        status={null}
        title="Test"
        successMessage="OK"
        failureMessage="Fail"
        pendingMessage="Pending"
        icon="test"
      />
    );
    expectDarkClass(container, "dark:border-zinc-700");
  });

  it("pending state has dark:text-zinc-400", () => {
    const { container } = render(
      <StatusCheckItem
        status={null}
        title="Test"
        successMessage="OK"
        failureMessage="Fail"
        pendingMessage="Pending"
        icon="test"
      />
    );
    expectDarkClass(container, "dark:text-zinc-400");
  });
});

// ─── StatusAlert ─────────────────────────────────────────────────────────────

describe("StatusAlert dark theme", () => {
  it("error alert has dark:bg-red-950 for dark background", () => {
    const { container } = render(
      <StatusAlert type="error" title="Error" message="Something failed" />
    );
    expectDarkClass(container, "dark:bg-red-950");
  });

  it("warning alert has dark:bg-amber-950", () => {
    const { container } = render(
      <StatusAlert type="warning" title="Warning" message="Watch out" />
    );
    expectDarkClass(container, "dark:bg-amber-950");
  });

  it("info alert has dark:bg-blue-950", () => {
    const { container } = render(<StatusAlert type="info" title="Info" message="FYI" />);
    expectDarkClass(container, "dark:bg-blue-950");
  });

  it("success alert has dark:bg-green-950", () => {
    const { container } = render(<StatusAlert type="success" title="Success" message="Yay" />);
    expectDarkClass(container, "dark:bg-green-950");
  });
});
