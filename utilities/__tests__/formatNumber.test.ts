import { formatNumberPercentage, formatPercentage } from '../formatNumber';

describe('formatNumber utilities', () => {
  describe('formatNumberPercentage', () => {
    describe('Number inputs', () => {
      it('should format numbers above 0.01 with 2 decimal places and %', () => {
        expect(formatNumberPercentage(0.02)).toBe('0.02%');
        // Unary + before toFixed removes trailing zeros for numbers
        expect(formatNumberPercentage(0.5)).toBe('0.5%');
        expect(formatNumberPercentage(1)).toBe('1%');
        expect(formatNumberPercentage(10)).toBe('10%');
        expect(formatNumberPercentage(100)).toBe('100%');
      });

      it('should format numbers equal to 0.01', () => {
        expect(formatNumberPercentage(0.01)).toBe('< 0.01%');
      });

      it('should format numbers below 0.01 as "< 0.01%"', () => {
        expect(formatNumberPercentage(0.001)).toBe('< 0.01%');
        expect(formatNumberPercentage(0.005)).toBe('< 0.01%');
        expect(formatNumberPercentage(0.009)).toBe('< 0.01%');
        expect(formatNumberPercentage(0.0001)).toBe('< 0.01%');
      });

      it('should handle zero', () => {
        expect(formatNumberPercentage(0)).toBe('< 0.01%');
      });

      it('should round to 2 decimal places', () => {
        expect(formatNumberPercentage(0.123)).toBe('0.12%');
        expect(formatNumberPercentage(0.456)).toBe('0.46%');
        expect(formatNumberPercentage(1.234)).toBe('1.23%');
        expect(formatNumberPercentage(10.567)).toBe('10.57%');
      });

      it('should handle very large numbers', () => {
        // Unary plus removes trailing zeros
        expect(formatNumberPercentage(1000)).toBe('1000%');
        expect(formatNumberPercentage(9999.99)).toBe('9999.99%');
      });

      it('should handle negative numbers', () => {
        // Negative values <= 0 are treated as < 0.01
        expect(formatNumberPercentage(-0.5)).toBe('< 0.01%');
        expect(formatNumberPercentage(-10)).toBe('< 0.01%');
        expect(formatNumberPercentage(-0.001)).toBe('< 0.01%');
      });
    });

    describe('String inputs', () => {
      it('should format string numbers above 0.01 with 2 decimal places and %', () => {
        expect(formatNumberPercentage('0.02')).toBe('0.02%');
        // String path: toFixed(2) WITHOUT + keeps trailing zeros
        expect(formatNumberPercentage('0.5')).toBe('0.50%');
        expect(formatNumberPercentage('1')).toBe('1.00%');
        expect(formatNumberPercentage('10')).toBe('10.00%');
        expect(formatNumberPercentage('100')).toBe('100.00%');
      });

      it('should format string numbers below or equal to 0.01 as "< 0.01%"', () => {
        expect(formatNumberPercentage('0.01')).toBe('< 0.01%');
        expect(formatNumberPercentage('0.001')).toBe('< 0.01%');
        expect(formatNumberPercentage('0.005')).toBe('< 0.01%');
        expect(formatNumberPercentage('0')).toBe('< 0.01%');
      });

      it('should handle string decimals', () => {
        expect(formatNumberPercentage('0.123')).toBe('0.12%');
        expect(formatNumberPercentage('1.456')).toBe('1.46%');
      });

      it('should handle negative string numbers', () => {
        // Negative values are not > 0.01, so they return "< 0.01%"
        expect(formatNumberPercentage('-0.5')).toBe('< 0.01%');
        expect(formatNumberPercentage('-10')).toBe('< 0.01%');
      });
    });

    describe('Edge cases', () => {
      it('should handle boundary value at 0.01', () => {
        expect(formatNumberPercentage(0.01)).toBe('< 0.01%');
        expect(formatNumberPercentage(0.0100001)).toBe('0.01%');
      });

      it('should handle values just above 0.01', () => {
        expect(formatNumberPercentage(0.011)).toBe('0.01%');
        // 0.015.toFixed(2) = "0.02" but +converts to 0.02, then toString = "0.02"
        expect(formatNumberPercentage(0.015)).toBe('0.01%');
      });

      it('should handle very precise decimals', () => {
        expect(formatNumberPercentage(0.123456789)).toBe('0.12%');
        // 1.999999.toFixed(2) rounds to "2.00", +converts to 2
        expect(formatNumberPercentage(1.999999)).toBe('2%');
      });

      it('should handle exactly 100%', () => {
        // Unary plus removes trailing zeros
        expect(formatNumberPercentage(100)).toBe('100%');
      });
    });
  });

  describe('formatPercentage', () => {
    describe('Number inputs', () => {
      it('should round and floor percentages', () => {
        expect(formatPercentage(50)).toBe(50);
        // Math.round(Math.floor(75.5 * 100) / 100) = Math.round(75.5) = 76
        expect(formatPercentage(75.5)).toBe(76);
        expect(formatPercentage(99.9)).toBe(100);
      });

      it('should handle decimals correctly', () => {
        // Math.round(Math.floor(0.5 * 100) / 100) = Math.round(0.5) = 1
        expect(formatPercentage(0.5)).toBe(1);
        expect(formatPercentage(1.4)).toBe(1);
        expect(formatPercentage(1.5)).toBe(2);
        expect(formatPercentage(2.7)).toBe(3);
      });

      it('should handle zero', () => {
        expect(formatPercentage(0)).toBe(0);
      });

      it('should handle 100', () => {
        expect(formatPercentage(100)).toBe(100);
      });

      it('should handle values over 100', () => {
        expect(formatPercentage(150)).toBe(150);
        // Math.round rounds .5 up
        expect(formatPercentage(200.5)).toBe(201);
      });

      it('should handle negative numbers', () => {
        expect(formatPercentage(-10)).toBe(-10);
        // Math.round rounds .5 up (towards positive)
        expect(formatPercentage(-50.5)).toBe(-50);
      });

      it('should handle very small decimals', () => {
        expect(formatPercentage(0.001)).toBe(0);
        expect(formatPercentage(0.01)).toBe(0);
        expect(formatPercentage(0.1)).toBe(0);
      });
    });

    describe('String inputs', () => {
      it('should convert and format string numbers', () => {
        expect(formatPercentage('50')).toBe(50);
        // Math.round rounds .5 up
        expect(formatPercentage('75.5')).toBe(76);
        expect(formatPercentage('99.9')).toBe(100);
      });

      it('should handle string decimals', () => {
        // Math.round rounds .5 up
        expect(formatPercentage('0.5')).toBe(1);
        expect(formatPercentage('1.4')).toBe(1);
        expect(formatPercentage('2.7')).toBe(3);
      });

      it('should handle negative string numbers', () => {
        expect(formatPercentage('-10')).toBe(-10);
        expect(formatPercentage('-50.5')).toBe(-50);
      });
    });

    describe('Mathematical behavior', () => {
      it('should apply Math.floor to remove decimals after multiplication by 100', () => {
        // The function does: Math.round(Math.floor(num * 100) / 100)
        expect(formatPercentage(0.123)).toBe(0);   // floor(12.3) = 12, 12/100 = 0.12, round = 0
        expect(formatPercentage(0.129)).toBe(0);   // floor(12.9) = 12, 12/100 = 0.12, round = 0
        expect(formatPercentage(1.234)).toBe(1);   // floor(123.4) = 123, 123/100 = 1.23, round = 1
        expect(formatPercentage(1.567)).toBe(2);   // floor(156.7) = 156, 156/100 = 1.56, round = 2
      });

      it('should round the final result', () => {
        expect(formatPercentage(0.504)).toBe(1);   // floor(50.4) = 50, 50/100 = 0.5, round = 1
        expect(formatPercentage(0.505)).toBe(1);   // floor(50.5) = 50, 50/100 = 0.5, round = 1
        expect(formatPercentage(0.514)).toBe(1);   // floor(51.4) = 51, 51/100 = 0.51, round = 1
        expect(formatPercentage(0.515)).toBe(1);   // floor(51.5) = 51, 51/100 = 0.51, round = 1
      });
    });

    describe('Edge cases', () => {
      it('should handle very large numbers', () => {
        expect(formatPercentage(1000)).toBe(1000);
        // Math.round rounds .99 up
        expect(formatPercentage(9999.99)).toBe(10000);
      });

      it('should handle boundary values', () => {
        expect(formatPercentage(0.99)).toBe(1);
        expect(formatPercentage(1.00)).toBe(1);
        expect(formatPercentage(1.01)).toBe(1);
      });

      it('should return integers', () => {
        const result = formatPercentage(50.5);
        expect(Number.isInteger(result)).toBe(true);
      });
    });

    describe('Real-world scenarios', () => {
      it('should format completion percentages', () => {
        expect(formatPercentage(0)).toBe(0);      // 0% complete
        expect(formatPercentage(25)).toBe(25);    // 25% complete
        expect(formatPercentage(50)).toBe(50);    // 50% complete
        // Math.round rounds .5 up
        expect(formatPercentage(75.5)).toBe(76);  // 76% complete
        expect(formatPercentage(100)).toBe(100);  // 100% complete
      });

      it('should handle progress tracking', () => {
        // Math.round rounds .5 up
        expect(formatPercentage(0.5)).toBe(1);    // 1% progress
        expect(formatPercentage(12.3)).toBe(12);  // 12% progress
        expect(formatPercentage(87.9)).toBe(88);  // 88% progress
      });
    });
  });

  describe('Integration between functions', () => {
    it('should handle complementary use cases', () => {
      // formatNumberPercentage for display
      expect(formatNumberPercentage(0.05)).toBe('0.05%');
      // Unary plus removes trailing zeros
      expect(formatNumberPercentage(50.5)).toBe('50.5%');

      // formatPercentage for calculations - Math.round rounds .5 up
      expect(formatPercentage(0.05)).toBe(0);
      expect(formatPercentage(50.5)).toBe(51);
    });

    it('should maintain consistency across types', () => {
      // formatPercentage has consistent behavior for number and string
      expect(formatPercentage(50)).toBe(formatPercentage('50'));
      // formatNumberPercentage has DIFFERENT behavior: number removes zeros, string keeps them
      expect(formatNumberPercentage(50)).toBe('50%'); // Number path
      expect(formatNumberPercentage('50')).toBe('50.00%'); // String path
    });
  });
});
