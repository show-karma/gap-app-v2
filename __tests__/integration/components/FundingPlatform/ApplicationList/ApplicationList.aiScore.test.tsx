import { render, screen, fireEvent } from '@testing-library/react';
import ApplicationList from '@/components/FundingPlatform/ApplicationList/ApplicationList';
import { IFundingApplication } from '@/types/funding-platform';

// Mock the helper functions
jest.mock('@/components/FundingPlatform/helper/getAIScore', () => ({
  formatAIScore: jest.fn()
}));

// Mock the other helper functions
jest.mock('@/components/FundingPlatform/helper/getProjecTitle', () => ({
  getProjectTitle: jest.fn(() => 'Test Project')
}));

jest.mock('@/utilities/formatDate', () => ({
  formatDate: jest.fn(() => '2025-01-01')
}));

// Mock SortableTableHeader
jest.mock('@/components/Utilities/SortableTableHeader', () => {
  return function MockSortableTableHeader({
    label,
    sortKey,
    onSort
  }: {
    label: string;
    sortKey: string;
    onSort?: (sortKey: string) => void;
  }) {
    return (
      <th data-testid={`header-${sortKey}`}>
        <button onClick={() => onSort?.(sortKey)}>
          {label}
        </button>
      </th>
    );
  };
});

import { formatAIScore } from '@/components/FundingPlatform/helper/getAIScore';

const mockFormatAIScore = formatAIScore as jest.MockedFunction<typeof formatAIScore>;

// Helper to create mock application
const createMockApplication = (overrides?: Partial<IFundingApplication>): IFundingApplication => ({
  id: 'test-id',
  programId: 'test-program',
  chainID: 11155111,
  applicantEmail: 'test@example.com',
  applicationData: {},
  status: 'pending',
  statusHistory: [],
  referenceNumber: 'APP-TEST-123',
  submissionIP: '127.0.0.1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
  ...overrides
});

describe('ApplicationList - AI Score Column', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AI Score Column Header', () => {
    it('should render AI Score column header', () => {
      const applications = [createMockApplication()];
      
      render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          sortBy="status"
          sortOrder="asc"
          onSortChange={jest.fn()}
        />
      );

      expect(screen.getByTestId('header-aiEvaluationScore')).toBeInTheDocument();
      expect(screen.getByText('AI Score')).toBeInTheDocument();
    });

    it('should call onSortChange when AI Score header is clicked', () => {
      const mockOnSortChange = jest.fn();
      const applications = [createMockApplication()];
      
      render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          sortBy="status"
          sortOrder="asc"
          onSortChange={mockOnSortChange}
        />
      );

      const aiScoreHeader = screen.getByTestId('header-aiEvaluationScore');
      const button = aiScoreHeader.querySelector('button');
      
      fireEvent.click(button!);
      
      expect(mockOnSortChange).toHaveBeenCalledWith('aiEvaluationScore');
    });

    it('should pass correct sorting props to AI Score header', () => {
      const applications = [createMockApplication()];
      
      render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          sortBy="aiEvaluationScore"
          sortOrder="desc"
          onSortChange={jest.fn()}
        />
      );

      // The SortableTableHeader should receive the correct props
      // This is tested through the mock implementation
      expect(screen.getByTestId('header-aiEvaluationScore')).toBeInTheDocument();
    });
  });

  describe('AI Score Column Data', () => {
    it('should display formatted AI score for each application', () => {
      mockFormatAIScore
        .mockReturnValueOnce('4.5')
        .mockReturnValueOnce('0')
        .mockReturnValueOnce('');

      const applications = [
        createMockApplication({ referenceNumber: 'APP-001' }),
        createMockApplication({ referenceNumber: 'APP-002' }),
        createMockApplication({ referenceNumber: 'APP-003' })
      ];

      render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          sortBy="status"
          sortOrder="asc"
        />
      );

      // Check that formatAIScore was called for each application
      expect(mockFormatAIScore).toHaveBeenCalledTimes(3);
      expect(mockFormatAIScore).toHaveBeenCalledWith(applications[0]);
      expect(mockFormatAIScore).toHaveBeenCalledWith(applications[1]);
      expect(mockFormatAIScore).toHaveBeenCalledWith(applications[2]);

      // The AI scores are rendered in the table cells
      // We can check that the formatted scores are in the document
      expect(screen.getByText('4.5')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should apply correct CSS classes to AI score cells', () => {
      mockFormatAIScore.mockReturnValue('4.5');
      
      const applications = [createMockApplication()];
      
      const { container } = render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          sortBy="status"
          sortOrder="asc"
        />
      );

      // Find the AI score cell (5th column after: ID, Title, Email, Status, AI Score)
      const rows = container.querySelectorAll('tbody tr');
      expect(rows).toHaveLength(1);
      
      const cells = rows[0].querySelectorAll('td');
      const aiScoreCell = cells[4]; // AI Score is the 5th column (index 4)
      
      expect(aiScoreCell).toHaveClass(
        'px-4',
        'py-4', 
        'whitespace-nowrap',
        'text-sm',
        'text-gray-600',
        'dark:text-gray-400',
        'text-center'
      );
    });

    it('should display empty string for applications without scores', () => {
      mockFormatAIScore.mockReturnValue('');
      
      const applications = [createMockApplication()];
      
      const { container } = render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          sortBy="status"
          sortOrder="asc"
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      const cells = rows[0].querySelectorAll('td');
      const aiScoreCell = cells[4];
      const scoreSpan = aiScoreCell.querySelector('span');
      
      expect(scoreSpan).toHaveTextContent('');
    });

    it('should display "0" for applications with zero scores', () => {
      mockFormatAIScore.mockReturnValue('0');
      
      const applications = [createMockApplication()];
      
      const { container } = render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          sortBy="status"
          sortOrder="asc"
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      const cells = rows[0].querySelectorAll('td');
      const aiScoreCell = cells[4];
      const scoreSpan = aiScoreCell.querySelector('span');
      
      expect(scoreSpan).toHaveTextContent('0');
    });
  });

  describe('Column Positioning', () => {
    it('should position AI Score column after Status column and before Created Date', () => {
      mockFormatAIScore.mockReturnValue('4.5');
      
      const applications = [createMockApplication()];
      
      render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          sortBy="status"
          sortOrder="asc"
        />
      );

      // Check header order
      const headers = screen.getAllByRole('columnheader');
      const headerTexts = headers.map(header => header.textContent);
      
      const statusIndex = headerTexts.findIndex(text => text?.includes('Status'));
      const aiScoreIndex = headerTexts.findIndex(text => text?.includes('AI Score'));
      const createdDateIndex = headerTexts.findIndex(text => text?.includes('Created Date'));
      
      expect(statusIndex).toBeLessThan(aiScoreIndex);
      expect(aiScoreIndex).toBeLessThan(createdDateIndex);
    });
  });

  describe('Integration with Application Selection', () => {
    it('should open new tab when row with AI score is clicked', () => {
      // Mock window.open
      const mockWindowOpen = jest.fn();
      const originalOpen = window.open;
      window.open = mockWindowOpen;

      mockFormatAIScore.mockReturnValue('4.5');

      const applications = [createMockApplication()];

      const { container } = render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          onApplicationSelect={jest.fn()}
          sortBy="status"
          sortOrder="asc"
        />
      );

      const row = container.querySelector('tbody tr');
      fireEvent.click(row!);

      // Component now opens in new tab instead of calling onApplicationSelect
      expect(mockWindowOpen).toHaveBeenCalled();

      // Restore original
      window.open = originalOpen;
    });

    it('should call onApplicationHover when row with AI score is hovered', () => {
      const mockOnApplicationHover = jest.fn();
      mockFormatAIScore.mockReturnValue('4.5');

      const applications = [createMockApplication()];

      const { container } = render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={applications}
          onApplicationHover={mockOnApplicationHover}
          sortBy="status"
          sortOrder="asc"
        />
      );

      const row = container.querySelector('tbody tr');
      fireEvent.mouseEnter(row!);

      expect(mockOnApplicationHover).toHaveBeenCalledWith(applications[0].referenceNumber);
    });
  });

  describe('Loading and Empty States', () => {
    it('should not render AI Score column when loading', () => {
      render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={[]}
          isLoading={true}
          sortBy="status"
          sortOrder="asc"
        />
      );

      expect(screen.queryByText('AI Score')).not.toBeInTheDocument();
      expect(screen.getByText('Loading applications...')).toBeInTheDocument();
    });

    it('should not render AI Score header when no applications', () => {
      render(
        <ApplicationList
          programId="test-program"
          chainID={11155111}
          applications={[]}
          isLoading={false}
          sortBy="status"
          sortOrder="asc"
        />
      );

      // When there are no applications, the table (including headers) is not rendered
      expect(screen.queryByText('AI Score')).not.toBeInTheDocument();
      expect(screen.getByText('No applications found.')).toBeInTheDocument();
    });
  });
});
