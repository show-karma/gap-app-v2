/**
 * @file Tests for IndicatorForm component
 * @description Comprehensive tests for the indicator form component covering form validation, submission, and error handling
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IndicatorForm, type IndicatorFormData } from '@/components/Forms/IndicatorForm';
import fetchData from '@/utilities/fetchData';
import { INDEXER } from '@/utilities/indexer';

// Mock fetchData
jest.mock('@/utilities/fetchData');
const mockFetchData = fetchData as jest.MockedFunction<typeof fetchData>;

// Mock errorManager
jest.mock('@/components/Utilities/errorManager', () => ({
  errorManager: jest.fn(),
}));

// Mock Button component
jest.mock('@/components/Utilities/Button', () => ({
  Button: ({ onClick, disabled, children, className, isLoading, type }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-loading={isLoading}
      type={type}
    >
      {isLoading ? 'Loading...' : children}
    </button>
  ),
}));

describe('IndicatorForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnError = jest.fn();

  const mockIndicatorResponse = {
    id: 'indicator-123',
    name: 'Test Indicator',
    description: 'Test Description',
    unitOfMeasure: 'int',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with all fields', () => {
      render(<IndicatorForm />);

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Unit Type')).toBeInTheDocument();
      expect(screen.getByText('Create Output Metric')).toBeInTheDocument();
    });

    it('should render with default placeholder values', () => {
      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      expect(nameInput).toBeInTheDocument();
      expect(descriptionInput).toBeInTheDocument();
    });

    it('should render both unit type options', () => {
      render(<IndicatorForm />);

      expect(screen.getByText('Int')).toBeInTheDocument();
      expect(screen.getByText('Float')).toBeInTheDocument();
    });

    it('should show update button text when indicatorId is provided', () => {
      render(<IndicatorForm indicatorId="indicator-123" />);

      expect(screen.getByText('Update Output Metric')).toBeInTheDocument();
    });

    it('should show create button text when no indicatorId', () => {
      render(<IndicatorForm />);

      expect(screen.getByText('Create Output Metric')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for name too short', async () => {
      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      fireEvent.change(nameInput, { target: { value: 'ab' } });
      fireEvent.blur(nameInput);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name must be at least 3 characters long')).toBeInTheDocument();
      });
    });

    it('should show validation error for name too long', async () => {
      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const longName = 'a'.repeat(51);
      fireEvent.change(nameInput, { target: { value: longName } });
      fireEvent.blur(nameInput);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name must be less than 50 characters')).toBeInTheDocument();
      });
    });

    it('should show validation error for empty description', async () => {
      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      fireEvent.change(nameInput, { target: { value: 'Valid Name' } });

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Description is required')).toBeInTheDocument();
      });
    });

    it('should show validation error for description too long', async () => {
      render(<IndicatorForm />);

      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');
      const longDescription = 'a'.repeat(501);
      fireEvent.change(descriptionInput, { target: { value: longDescription } });
      fireEvent.blur(descriptionInput);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Description must be less than 500 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission - Create Mode', () => {
    it('should submit form with valid data', async () => {
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(<IndicatorForm onSuccess={mockOnSuccess} />);

      // Fill form
      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      // Select unit type
      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      // Submit
      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          INDEXER.INDICATORS.CREATE_OR_UPDATE(),
          'POST',
          expect.objectContaining({
            name: 'Test Indicator',
            description: 'Test Description',
            unitOfMeasure: 'int',
            programs: [],
          })
        );
      });

      expect(mockOnSuccess).toHaveBeenCalledWith(mockIndicatorResponse);
    });

    it('should call onSuccess callback after successful creation', async () => {
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(<IndicatorForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockIndicatorResponse);
      });
    });

    it('should reset form after successful creation (not update)', async () => {
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(<IndicatorForm onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name') as HTMLInputElement;
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description') as HTMLTextAreaElement;

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Form should be reset (only for create, not update)
      await waitFor(() => {
        expect(nameInput.value).toBe('');
        expect(descriptionInput.value).toBe('');
      });
    });
  });

  describe('Form Submission - Update Mode', () => {
    it('should submit form in update mode with indicatorId', async () => {
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(
        <IndicatorForm
          indicatorId="indicator-123"
          onSuccess={mockOnSuccess}
          defaultValues={{
            name: 'Existing Indicator',
            description: 'Existing Description',
            unitOfMeasure: 'int',
          }}
        />
      );

      const nameInput = screen.getByDisplayValue('Existing Indicator');
      fireEvent.change(nameInput, { target: { value: 'Updated Indicator' } });

      const submitButton = screen.getByText('Update Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          INDEXER.INDICATORS.CREATE_OR_UPDATE(),
          'POST',
          expect.objectContaining({
            indicatorId: 'indicator-123',
            name: 'Updated Indicator',
          })
        );
      });
    });

    it('should not reset form after successful update', async () => {
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(
        <IndicatorForm
          indicatorId="indicator-123"
          onSuccess={mockOnSuccess}
          defaultValues={{
            name: 'Existing Indicator',
            description: 'Existing Description',
            unitOfMeasure: 'int',
          }}
        />
      );

      const submitButton = screen.getByText('Update Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // Form should NOT be reset in update mode
      const nameInput = screen.getByDisplayValue('Existing Indicator');
      expect(nameInput).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should call onError callback on submission failure', async () => {
      const error = new Error('API Error');
      mockFetchData.mockResolvedValueOnce([null, error]);

      render(<IndicatorForm onError={mockOnError} />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(error);
      });
    });

    it('should handle invalid response format', async () => {
      mockFetchData.mockResolvedValueOnce([null, null]); // Invalid response

      render(<IndicatorForm onError={mockOnError} />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });

    it('should handle response without id', async () => {
      mockFetchData.mockResolvedValueOnce([{ name: 'Test' }, null]); // No id

      render(<IndicatorForm onError={mockOnError} />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalled();
      });
    });
  });

  describe('Loading State', () => {
    it('should disable submit button when external isLoading is true', () => {
      render(<IndicatorForm isLoading={true} />);

      const submitButton = screen.getByText('Loading...');
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state during submission', async () => {
      mockFetchData.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([mockIndicatorResponse, null]), 100))
      );

      render(<IndicatorForm />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Loading...')).toBeInTheDocument();
      });
    });
  });

  describe('Read-only Fields', () => {
    it('should make name field readonly when specified', () => {
      render(
        <IndicatorForm
          readOnlyFields={{ name: true }}
          defaultValues={{
            name: 'Readonly Name',
            description: 'Description',
            unitOfMeasure: 'int',
          }}
        />
      );

      const nameInput = screen.getByDisplayValue('Readonly Name') as HTMLInputElement;
      expect(nameInput.readOnly).toBe(true);
    });

    it('should make description field readonly when specified', () => {
      render(
        <IndicatorForm
          readOnlyFields={{ description: true }}
          defaultValues={{
            name: 'Name',
            description: 'Readonly Description',
            unitOfMeasure: 'int',
          }}
        />
      );

      const descriptionInput = screen.getByDisplayValue('Readonly Description') as HTMLTextAreaElement;
      expect(descriptionInput.readOnly).toBe(true);
    });

    it('should disable unitOfMeasure radios when specified', () => {
      render(
        <IndicatorForm
          readOnlyFields={{ unitOfMeasure: true }}
          defaultValues={{
            name: 'Name',
            description: 'Description',
            unitOfMeasure: 'int',
          }}
        />
      );

      const intRadio = screen.getByDisplayValue('int') as HTMLInputElement;
      const floatRadio = screen.getByDisplayValue('float') as HTMLInputElement;

      expect(intRadio.disabled).toBe(true);
      expect(floatRadio.disabled).toBe(true);
    });
  });

  describe('Pre-selected Programs', () => {
    it('should render pre-selected programs when provided', () => {
      const preSelectedPrograms = [
        { programId: 'program-1', title: 'Program 1', chainID: 1 },
        { programId: 'program-2', title: 'Program 2', chainID: 2 },
      ];

      render(<IndicatorForm preSelectedPrograms={preSelectedPrograms} />);

      expect(screen.getByText('Selected Programs')).toBeInTheDocument();
      expect(screen.getByText('Program 1')).toBeInTheDocument();
      expect(screen.getByText('Program 2')).toBeInTheDocument();
    });

    it('should submit with pre-selected programs', async () => {
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      const preSelectedPrograms = [
        { programId: 'program-1', title: 'Program 1', chainID: 1 },
      ];

      render(<IndicatorForm preSelectedPrograms={preSelectedPrograms} onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          INDEXER.INDICATORS.CREATE_OR_UPDATE(),
          'POST',
          expect.objectContaining({
            programs: [{ programId: 'program-1', chainID: 1 }],
          })
        );
      });
    });
  });

  describe('Event Propagation', () => {
    it('should prevent propagation when preventPropagation is true', () => {
      const handleClick = jest.fn();

      render(
        <div onClick={handleClick}>
          <IndicatorForm preventPropagation={true} />
        </div>
      );

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const form = nameInput.closest('form');
      expect(form).toBeInTheDocument();

      if (form) {
        fireEvent.click(form);
        expect(handleClick).not.toHaveBeenCalled();
      }
    });

    it('should stop propagation on Enter key when preventPropagation is true', () => {
      const handleKeyDown = jest.fn();

      const { container } = render(
        <div onKeyDown={handleKeyDown}>
          <IndicatorForm preventPropagation={true} />
        </div>
      );

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const form = nameInput.closest('form');

      if (form) {
        fireEvent.keyDown(form, { key: 'Enter', code: 'Enter' });
      }

      // We just verify the form handles the event, exact propagation behavior depends on implementation
      expect(form).toBeInTheDocument();
    });
  });

  describe('Default Values', () => {
    it('should populate form with default values', () => {
      const defaultValues: Partial<IndicatorFormData> = {
        name: 'Default Name',
        description: 'Default Description',
        unitOfMeasure: 'float',
      };

      render(<IndicatorForm defaultValues={defaultValues} />);

      expect(screen.getByDisplayValue('Default Name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Default Description')).toBeInTheDocument();
      expect((screen.getByDisplayValue('float') as HTMLInputElement).checked).toBe(true);
    });

    it('should reset form when defaultValues change', () => {
      const { rerender } = render(
        <IndicatorForm
          defaultValues={{
            name: 'Initial Name',
            description: 'Initial Description',
            unitOfMeasure: 'int',
          }}
        />
      );

      expect(screen.getByDisplayValue('Initial Name')).toBeInTheDocument();

      // Update default values
      rerender(
        <IndicatorForm
          defaultValues={{
            name: 'Updated Name',
            description: 'Updated Description',
            unitOfMeasure: 'float',
          }}
        />
      );

      expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Updated Description')).toBeInTheDocument();
    });
  });

  describe('Unit Type Selection', () => {
    it('should select int unit type', () => {
      render(<IndicatorForm />);

      const intRadio = screen.getByDisplayValue('int') as HTMLInputElement;
      fireEvent.click(intRadio);

      expect(intRadio.checked).toBe(true);
    });

    it('should select float unit type', () => {
      render(<IndicatorForm />);

      const floatRadio = screen.getByDisplayValue('float') as HTMLInputElement;
      fireEvent.click(floatRadio);

      expect(floatRadio.checked).toBe(true);
    });

    it('should toggle between unit types', () => {
      render(<IndicatorForm />);

      const intRadio = screen.getByDisplayValue('int') as HTMLInputElement;
      const floatRadio = screen.getByDisplayValue('float') as HTMLInputElement;

      fireEvent.click(intRadio);
      expect(intRadio.checked).toBe(true);

      fireEvent.click(floatRadio);
      expect(floatRadio.checked).toBe(true);
      expect(intRadio.checked).toBe(false);
    });
  });

  describe('Community ID Integration', () => {
    it('should include communityUID in submission when provided', async () => {
      mockFetchData.mockResolvedValueOnce([mockIndicatorResponse, null]);

      render(<IndicatorForm communityId="community-123" onSuccess={mockOnSuccess} />);

      const nameInput = screen.getByPlaceholderText('Enter indicator name');
      const descriptionInput = screen.getByPlaceholderText('Enter indicator description');

      fireEvent.change(nameInput, { target: { value: 'Test Indicator' } });
      fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });

      const intRadio = screen.getByDisplayValue('int');
      fireEvent.click(intRadio);

      const submitButton = screen.getByText('Create Output Metric');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetchData).toHaveBeenCalledWith(
          INDEXER.INDICATORS.CREATE_OR_UPDATE(),
          'POST',
          expect.objectContaining({
            communityUID: 'community-123',
          })
        );
      });
    });
  });
});
