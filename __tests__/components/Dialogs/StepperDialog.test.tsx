import { render, screen, fireEvent } from '@testing-library/react';
import { StepperDialog } from '@/components/Dialogs/StepperDialog';
import { useStepper, TxStepperSteps } from '@/store/modals/txStepper';

// Mock Headless UI Dialog components
jest.mock('@headlessui/react', () => {
  const React = require('react');

  // List of Headless UI Transition props that should be filtered
  const TRANSITION_PROPS = [
    'appear', 'show', 'enter', 'enterFrom', 'enterTo',
    'leave', 'leaveFrom', 'leaveTo', 'entered', 'beforeEnter',
    'afterEnter', 'beforeLeave', 'afterLeave'
  ];

  const MockDialog = ({ children, onClose, ...props }: any) => (
    <div data-testid="dialog" onClick={onClose} {...props}>
      {children}
    </div>
  );
  MockDialog.Panel = ({ children, ...props }: any) => (
    <div data-testid="dialog-panel" {...props}>
      {children}
    </div>
  );

  const MockTransitionRoot = ({ show, children, as, ...props }: any) => {
    if (!show) return null;

    // Filter out Transition-specific props
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || 'div';
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionRoot.displayName = 'Transition';

  const MockTransitionChild = ({ children, as, ...props }: any) => {
    // Filter out Transition-specific props
    const filteredProps = Object.keys(props).reduce((acc, key) => {
      if (!TRANSITION_PROPS.includes(key)) {
        acc[key] = props[key];
      }
      return acc;
    }, {} as any);

    const Component = as || 'div';
    return <Component {...filteredProps}>{children}</Component>;
  };
  MockTransitionChild.displayName = 'Transition.Child';

  // Assign Child to Root as a property
  MockTransitionRoot.Child = MockTransitionChild;

  return {
    Dialog: MockDialog,
    Transition: MockTransitionRoot,
    Fragment: React.Fragment,
  };
});

// Mock Heroicons
jest.mock('@heroicons/react/24/solid', () => ({
  XMarkIcon: (props: any) => (
    <svg role="img" aria-label="Close" {...props} data-testid="close-icon" />
  ),
}));

// Mock useStepper store
jest.mock('@/store/modals/txStepper', () => ({
  TxStepperSteps: jest.requireActual('@/store/modals/txStepper').TxStepperSteps,
  useStepper: jest.fn(),
}));

describe('StepperDialog', () => {
  const mockSetIsStepper = jest.fn();

  const defaultStepperState = {
    isStepperOpen: true,
    stepperStep: 'preparing' as TxStepperSteps,
    setIsStepper: mockSetIsStepper,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useStepper as jest.Mock).mockReturnValue(defaultStepperState);
  });

  describe('Rendering', () => {
    it('should render dialog when isStepperOpen is true', () => {
      render(<StepperDialog />);

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-panel')).toBeInTheDocument();
    });

    it('should not render dialog when isStepperOpen is false', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        isStepperOpen: false,
      });

      render(<StepperDialog />);

      expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    });

    it('should render dialog title', () => {
      render(<StepperDialog />);

      expect(screen.getByText('Saving your information')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<StepperDialog />);

      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });

    it('should render all 5 steps', () => {
      render(<StepperDialog />);

      expect(screen.getByText('Preparing to write to blockchain')).toBeInTheDocument();
      expect(screen.getByText('Executing the onchain transaction')).toBeInTheDocument();
      expect(screen.getByText('Waiting for confirmation')).toBeInTheDocument();
      expect(screen.getByText('Indexing the blockchain data')).toBeInTheDocument();
      expect(screen.getByText('Indexing complete')).toBeInTheDocument();
    });
  });

  describe('Step States', () => {
    it('should highlight "preparing" step when active', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'preparing',
      });

      render(<StepperDialog />);

      const preparingText = screen.getByText('Preparing to write to blockchain');
      expect(preparingText.className).toContain('text-black');
      expect(preparingText.className).toContain('dark:text-zinc-100');
    });

    it('should highlight "pending" step when active', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'pending',
      });

      render(<StepperDialog />);

      const pendingText = screen.getByText('Executing the onchain transaction');
      expect(pendingText.className).toContain('text-black');
    });

    it('should highlight "confirmed" step when active', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'confirmed',
      });

      render(<StepperDialog />);

      const confirmedText = screen.getByText('Waiting for confirmation');
      expect(confirmedText.className).toContain('text-black');
    });

    it('should highlight "indexing" step when active', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'indexing',
      });

      render(<StepperDialog />);

      const indexingText = screen.getByText('Indexing the blockchain data');
      expect(indexingText.className).toContain('text-black');
    });

    it('should highlight "indexed" step when active', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'indexed',
      });

      render(<StepperDialog />);

      const indexedText = screen.getByText('Indexing complete');
      expect(indexedText.className).toContain('text-black');
    });

    it('should dim steps that are not yet reached', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'preparing',
      });

      render(<StepperDialog />);

      // Steps after "preparing" should be dimmed
      const pendingText = screen.getByText('Executing the onchain transaction');
      expect(pendingText.className).toContain('text-[#535c68]');
      expect(pendingText.className).toContain('dark:text-zinc-300');
    });

    it('should keep completed steps highlighted', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'confirmed',
      });

      render(<StepperDialog />);

      // Previous steps should remain highlighted
      const preparingText = screen.getByText('Preparing to write to blockchain');
      expect(preparingText.className).toContain('text-black');

      const pendingText = screen.getByText('Executing the onchain transaction');
      expect(pendingText.className).toContain('text-black');
    });
  });

  describe('Step Numbers and Icons', () => {
    it('should display step numbers for all steps', () => {
      const { container } = render(<StepperDialog />);

      // There should be 5 steps total
      const stepCircles = container.querySelectorAll('.w-8.h-8');
      expect(stepCircles.length).toBe(5);

      // Default is 'preparing' (step 1), so steps 2-5 should show numbers
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      expect(screen.getAllByText('4').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    });

    it('should show spinner for active step', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'pending',
      });

      const { container } = render(<StepperDialog />);

      // Active step should have spinner instead of number
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner?.className).toContain('border-dashed');
      expect(spinner?.className).toContain('border-white');
    });

    it('should show number for completed steps', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'confirmed',
      });

      render(<StepperDialog />);

      // Steps 1 and 2 should show numbers (completed)
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });

    it('should show number for pending steps', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'preparing',
      });

      render(<StepperDialog />);

      // Future steps should show numbers
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      expect(screen.getAllByText('4').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    });
  });

  describe('Step Colors', () => {
    it('should use blue color for completed and active steps', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'confirmed',
      });

      const { container } = render(<StepperDialog />);

      // Query step circles by their classes and check for style attribute
      const stepCircles = container.querySelectorAll('.w-8.h-8.flex.flex-col.justify-center.items-center.rounded-full');
      expect(stepCircles.length).toBe(5);

      // Steps 1, 2, and 3 should be blue, step 4 and 5 should be gray
      const blueSteps = Array.from(stepCircles).filter(el =>
        (el as HTMLElement).style.backgroundColor === 'rgb(76, 111, 255)'
      );
      expect(blueSteps.length).toBe(3);
    });

    it('should use gray color for pending steps', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'preparing',
      });

      const { container } = render(<StepperDialog />);

      const stepCircles = container.querySelectorAll('.w-8.h-8.flex.flex-col.justify-center.items-center.rounded-full');
      expect(stepCircles.length).toBe(5);

      // Only step 1 should be blue, steps 2-5 should be gray
      const graySteps = Array.from(stepCircles).filter(el =>
        (el as HTMLElement).style.backgroundColor === 'rgb(83, 92, 104)'
      );
      expect(graySteps.length).toBe(4);
    });
  });

  describe('User Interactions', () => {
    it('should call setIsStepper(false) when close button is clicked', () => {
      render(<StepperDialog />);

      const closeButton = screen.getByTestId('close-icon').closest('button');
      if (closeButton) {
        fireEvent.click(closeButton);
      }

      expect(mockSetIsStepper).toHaveBeenCalledWith(false);
    });

    it('should have close button with proper styling', () => {
      render(<StepperDialog />);

      const closeButton = screen.getByTestId('close-icon').closest('button');
      expect(closeButton?.className).toContain('text-black');
      expect(closeButton?.className).toContain('dark:text-white');
      expect(closeButton?.className).toContain('absolute');
      expect(closeButton?.className).toContain('top-4');
      expect(closeButton?.className).toContain('right-4');
    });
  });

  describe('Step Progression', () => {
    it('should show all steps in correct order', () => {
      render(<StepperDialog />);

      const stepTexts = [
        'Preparing to write to blockchain',
        'Executing the onchain transaction',
        'Waiting for confirmation',
        'Indexing the blockchain data',
        'Indexing complete',
      ];

      stepTexts.forEach((text) => {
        expect(screen.getByText(text)).toBeInTheDocument();
      });
    });

    it('should correctly identify step numbers', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'indexing',
      });

      render(<StepperDialog />);

      // Steps 1-4 should be completed/highlighted
      expect(screen.getByText('Preparing to write to blockchain').className).toContain('text-black');
      expect(screen.getByText('Executing the onchain transaction').className).toContain('text-black');
      expect(screen.getByText('Waiting for confirmation').className).toContain('text-black');
      expect(screen.getByText('Indexing the blockchain data').className).toContain('text-black');

      // Step 5 should be dimmed
      expect(screen.getByText('Indexing complete').className).toContain('text-[#535c68]');
    });

    it('should handle final step completion', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'indexed',
      });

      render(<StepperDialog />);

      // All steps should be highlighted
      expect(screen.getByText('Preparing to write to blockchain').className).toContain('text-black');
      expect(screen.getByText('Executing the onchain transaction').className).toContain('text-black');
      expect(screen.getByText('Waiting for confirmation').className).toContain('text-black');
      expect(screen.getByText('Indexing the blockchain data').className).toContain('text-black');
      expect(screen.getByText('Indexing complete').className).toContain('text-black');
    });
  });

  describe('Styling and Layout', () => {
    it('should have proper dialog styling', () => {
      const { container } = render(<StepperDialog />);

      const panel = screen.getByTestId('dialog-panel');
      expect(panel.className).toContain('rounded-2xl');
      expect(panel.className).toContain('dark:bg-zinc-800');
      expect(panel.className).toContain('bg-white');
      expect(panel.className).toContain('p-6');
    });

    it('should have proper title styling', () => {
      render(<StepperDialog />);

      const title = screen.getByText('Saving your information');
      expect(title.className).toContain('text-2xl');
      expect(title.className).toContain('font-bold');
      expect(title.className).toContain('dark:text-zinc-200');
    });

    it('should have responsive max-width', () => {
      const { container } = render(<StepperDialog />);

      const panel = screen.getByTestId('dialog-panel');
      expect(panel.className).toContain('max-w-2xl');
    });

    it('should have proper step circle sizing', () => {
      const { container } = render(<StepperDialog />);

      const stepCircles = container.querySelectorAll('.w-8.h-8');
      expect(stepCircles.length).toBeGreaterThan(0);
    });

    it('should have proper gap between steps', () => {
      const { container } = render(<StepperDialog />);

      const stepsContainer = container.querySelector('.flex.flex-col.gap-3');
      expect(stepsContainer).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes for dialog panel', () => {
      render(<StepperDialog />);

      const panel = screen.getByTestId('dialog-panel');
      expect(panel.className).toContain('dark:bg-zinc-800');
    });

    it('should have dark mode classes for title', () => {
      render(<StepperDialog />);

      const title = screen.getByText('Saving your information');
      expect(title.className).toContain('dark:text-zinc-200');
    });

    it('should have dark mode classes for close button', () => {
      render(<StepperDialog />);

      const closeButton = screen.getByTestId('close-icon').closest('button');
      expect(closeButton?.className).toContain('dark:text-white');
    });

    it('should have dark mode classes for step text', () => {
      render(<StepperDialog />);

      const stepText = screen.getByText('Preparing to write to blockchain');
      expect(stepText.className).toContain('dark:text-zinc-100');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<StepperDialog />);

      const title = screen.getByText('Saving your information');
      expect(title.tagName).toBe('H2');
    });

    it('should have close icon with aria-label', () => {
      render(<StepperDialog />);

      const closeIcon = screen.getByTestId('close-icon');
      expect(closeIcon).toHaveAttribute('aria-label', 'Close');
    });

    it('should have step numbers visible for screen readers', () => {
      render(<StepperDialog />);

      // Default is 'preparing' (step 1 is active with spinner), so steps 2-5 show numbers
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      expect(screen.getAllByText('4').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);

      // Step 1 should have a spinner, not a number
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('should have proper color contrast for text', () => {
      render(<StepperDialog />);

      const activeText = screen.getByText('Preparing to write to blockchain');
      expect(activeText.className).toContain('text-black');
    });
  });

  describe('Animation', () => {
    it('should have spinner animation class', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'pending',
      });

      const { container } = render(<StepperDialog />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have transition classes on dialog', () => {
      render(<StepperDialog />);

      const panel = screen.getByTestId('dialog-panel');
      expect(panel.className).toContain('transition-all');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined stepperStep', () => {
      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: undefined,
      });

      render(<StepperDialog />);

      // Should still render without crashing
      expect(screen.getByTestId('dialog')).toBeInTheDocument();
    });

    it('should handle rapid step changes', () => {
      const { rerender } = render(<StepperDialog />);

      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'pending',
      });
      rerender(<StepperDialog />);

      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        stepperStep: 'confirmed',
      });
      rerender(<StepperDialog />);

      expect(screen.getByText('Waiting for confirmation')).toBeInTheDocument();
    });

    it('should maintain state when reopened', () => {
      const { rerender } = render(<StepperDialog />);

      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        isStepperOpen: false,
      });
      rerender(<StepperDialog />);

      (useStepper as jest.Mock).mockReturnValue({
        ...defaultStepperState,
        isStepperOpen: true,
        stepperStep: 'indexed',
      });
      rerender(<StepperDialog />);

      expect(screen.getByText('Indexing complete')).toBeInTheDocument();
    });
  });
});
