import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

// A component that deliberately throws an error for testing
const ThrowingComponent = ({ shouldThrow = true }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Something went wrong in the component');
  }
  return <div className="p-4 bg-green-50 rounded-lg text-green-800">Content rendered successfully</div>;
};

// A safe wrapper that catches the error before Storybook does
const ErrorBoundaryDemo = ({
  shouldThrow,
  fallback,
}: {
  shouldThrow: boolean;
  fallback?: React.ReactNode;
}) => {
  return (
    <ErrorBoundary fallback={fallback}>
      <ThrowingComponent shouldThrow={shouldThrow} />
    </ErrorBoundary>
  );
};

export const WithError: Story = {
  render: () => <ErrorBoundaryDemo shouldThrow={true} />,
};

export const WithoutError: Story = {
  render: () => <ErrorBoundaryDemo shouldThrow={false} />,
};

export const CustomFallback: Story = {
  render: () => (
    <ErrorBoundaryDemo
      shouldThrow={true}
      fallback={
        <div className="p-6 rounded-lg bg-yellow-50 border border-yellow-200 text-center">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Oops!</h3>
          <p className="text-yellow-700">A custom error fallback was provided.</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            Reload Page
          </button>
        </div>
      }
    />
  ),
};
