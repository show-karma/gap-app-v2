import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from '@/components/Disbursement/components/LoadingSpinner';
import '@testing-library/jest-dom';

describe('LoadingSpinner', () => {
  describe('Rendering', () => {
    it('should render spinner element', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should have rounded-full class', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.rounded-full');
      expect(spinner).toBeInTheDocument();
    });

    it('should have border class', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.border-b-2');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should apply medium size by default', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.h-6.w-6');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const spinner = container.querySelector('.h-4.w-4');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply medium size explicitly', () => {
      const { container } = render(<LoadingSpinner size="md" />);

      const spinner = container.querySelector('.h-6.w-6');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const spinner = container.querySelector('.h-8.w-8');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Color Variants', () => {
    it('should apply blue color by default', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.border-blue-600');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply blue color explicitly', () => {
      const { container } = render(<LoadingSpinner color="blue" />);

      const spinner = container.querySelector('.border-blue-600');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply white color', () => {
      const { container } = render(<LoadingSpinner color="white" />);

      const spinner = container.querySelector('.border-white');
      expect(spinner).toBeInTheDocument();
    });

    it('should apply gray color', () => {
      const { container } = render(<LoadingSpinner color="gray" />);

      const spinner = container.querySelector('.border-gray-600');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should not display message by default', () => {
      const { container } = render(<LoadingSpinner />);

      const wrapper = container.querySelector('.flex.items-center.justify-center.py-8');
      expect(wrapper).not.toBeInTheDocument();
    });

    it('should display message when provided', () => {
      render(<LoadingSpinner message="Loading..." />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should wrap spinner and message in flex container', () => {
      const { container } = render(<LoadingSpinner message="Please wait" />);

      const wrapper = container.querySelector('.flex.items-center.justify-center.py-8');
      expect(wrapper).toBeInTheDocument();
    });

    it('should add margin to spinner when message exists', () => {
      const { container } = render(<LoadingSpinner message="Loading" />);

      const spinner = container.querySelector('.mr-3');
      expect(spinner).toBeInTheDocument();
    });

    it('should style message as font-medium', () => {
      render(<LoadingSpinner message="Loading..." />);

      const message = screen.getByText('Loading...');
      expect(message.className).toContain('font-medium');
    });
  });

  describe('Combinations', () => {
    it('should combine size and color', () => {
      const { container } = render(<LoadingSpinner size="lg" color="white" />);

      const spinner = container.querySelector('.h-8.w-8.border-white');
      expect(spinner).toBeInTheDocument();
    });

    it('should combine all props', () => {
      render(<LoadingSpinner size="sm" color="gray" message="Processing..." />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      const { container } = render(<LoadingSpinner size="sm" color="gray" />);
      const spinner = container.querySelector('.h-4.w-4.border-gray-600');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('should have animate-spin class', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Message Color Matching', () => {
    it('should use matching text color for blue spinner', () => {
      render(<LoadingSpinner color="blue" message="Loading" />);

      const message = screen.getByText('Loading');
      expect(message.className).toContain('text-blue-600');
    });

    it('should use white text for white spinner', () => {
      render(<LoadingSpinner color="white" message="Loading" />);

      const message = screen.getByText('Loading');
      expect(message.className).toContain('text-white');
    });

    it('should use matching text color for gray spinner', () => {
      render(<LoadingSpinner color="gray" message="Loading" />);

      const message = screen.getByText('Loading');
      expect(message.className).toContain('text-gray-600');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      const { container } = render(<LoadingSpinner message="" />);

      // Empty string is falsy, so it should render without the wrapper (just spinner)
      const wrapper = container.querySelector('.flex.items-center.justify-center.py-8');
      expect(wrapper).not.toBeInTheDocument();

      // Should render just the spinner
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render without any props', () => {
      const { container } = render(<LoadingSpinner />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should handle long messages', () => {
      const longMessage = 'This is a very long loading message that might wrap';

      render(<LoadingSpinner message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('should render simple spinner without wrapper when no message', () => {
      const { container } = render(<LoadingSpinner />);

      const directSpinner = container.firstChild;
      expect(directSpinner).toHaveClass('animate-spin');
    });

    it('should render wrapper div when message provided', () => {
      const { container } = render(<LoadingSpinner message="Loading" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center', 'py-8');
    });
  });
});
