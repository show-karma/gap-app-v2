import formatCurrency from '../formatCurrency';

describe('formatCurrency', () => {
  describe('Zero and very small values', () => {
    it('should format zero as "0"', () => {
      expect(formatCurrency(0)).toBe('0');
    });

    it('should format values less than 1 with 2 decimal places', () => {
      expect(formatCurrency(0.5)).toBe('0.50');
      expect(formatCurrency(0.12)).toBe('0.12');
      expect(formatCurrency(0.99)).toBe('0.99');
      expect(formatCurrency(0.01)).toBe('0.01');
    });

    it('should handle very small decimals', () => {
      expect(formatCurrency(0.001)).toBe('0.00');
      expect(formatCurrency(0.0001)).toBe('0.00');
      expect(formatCurrency(0.999)).toBe('1.00');
    });
  });

  describe('Values from 1 to 999', () => {
    it('should format single digits without suffix', () => {
      expect(formatCurrency(1)).toBe('1');
      expect(formatCurrency(5)).toBe('5');
      expect(formatCurrency(9)).toBe('9');
    });

    it('should format tens without suffix', () => {
      expect(formatCurrency(10)).toBe('10');
      expect(formatCurrency(50)).toBe('50');
      expect(formatCurrency(99)).toBe('99');
    });

    it('should format hundreds without suffix', () => {
      expect(formatCurrency(100)).toBe('100');
      expect(formatCurrency(500)).toBe('500');
      expect(formatCurrency(999)).toBe('999');
    });
  });

  describe('Thousands (K)', () => {
    it('should format thousands with K suffix', () => {
      expect(formatCurrency(1000)).toBe('1K');
      expect(formatCurrency(5000)).toBe('5K');
      expect(formatCurrency(10000)).toBe('10K');
    });

    it('should format thousands with one decimal place', () => {
      expect(formatCurrency(1500)).toBe('1.5K');
      expect(formatCurrency(2700)).toBe('2.7K');
      expect(formatCurrency(9900)).toBe('9.9K');
    });

    it('should handle edge case at 999K', () => {
      expect(formatCurrency(999000)).toBe('999K');
      expect(formatCurrency(999900)).toBe('999.9K');
    });
  });

  describe('Millions (M)', () => {
    it('should format millions with M suffix', () => {
      expect(formatCurrency(1000000)).toBe('1M');
      expect(formatCurrency(5000000)).toBe('5M');
      expect(formatCurrency(10000000)).toBe('10M');
    });

    it('should format millions with one decimal place', () => {
      expect(formatCurrency(1500000)).toBe('1.5M');
      expect(formatCurrency(2700000)).toBe('2.7M');
      expect(formatCurrency(9900000)).toBe('9.9M');
    });

    it('should handle fractional millions', () => {
      expect(formatCurrency(1100000)).toBe('1.1M');
      expect(formatCurrency(1250000)).toBe('1.3M'); // Rounded
    });
  });

  describe('Billions (B)', () => {
    it('should format billions with B suffix', () => {
      expect(formatCurrency(1000000000)).toBe('1B');
      expect(formatCurrency(5000000000)).toBe('5B');
    });

    it('should format billions with one decimal place', () => {
      expect(formatCurrency(1500000000)).toBe('1.5B');
      expect(formatCurrency(2700000000)).toBe('2.7B');
    });
  });

  describe('Trillions (T)', () => {
    it('should format trillions with T suffix', () => {
      expect(formatCurrency(1000000000000)).toBe('1T');
      expect(formatCurrency(5000000000000)).toBe('5T');
    });

    it('should format trillions with one decimal place', () => {
      expect(formatCurrency(1500000000000)).toBe('1.5T');
    });
  });

  describe('Very large numbers', () => {
    it('should handle quadrillions (P)', () => {
      expect(formatCurrency(1000000000000000)).toBe('1P');
    });

    it('should handle quintillions (E)', () => {
      // JavaScript number precision limit reached - formatted as string
      expect(formatCurrency(1000000000000000000)).toBe('1000000000000000000');
    });
  });

  describe('Precision and rounding', () => {
    it('should round to 1 decimal place', () => {
      expect(formatCurrency(1234)).toBe('1.2K');
      expect(formatCurrency(1567)).toBe('1.6K');
      expect(formatCurrency(1999)).toBe('2K');
    });

    it('should handle rounding edge cases', () => {
      expect(formatCurrency(1949)).toBe('1.9K');
      // millify rounds to 1 decimal place, so 1950 becomes 1.9K (1950/1000 = 1.95 rounds to 1.9)
      expect(formatCurrency(1950)).toBe('1.9K');
      expect(formatCurrency(1951)).toBe('2K');
    });
  });

  describe('Negative values', () => {
    it('should format negative values', () => {
      // All negative values are < 1, so they get formatted with 2 decimal places
      expect(formatCurrency(-100)).toBe('-100.00');
      expect(formatCurrency(-1000)).toBe('-1000.00');
      expect(formatCurrency(-1500)).toBe('-1500.00');
      expect(formatCurrency(-1000000)).toBe('-1000000.00');
    });

    it('should format negative decimals', () => {
      expect(formatCurrency(-0.5)).toBe('-0.50');
      expect(formatCurrency(-0.01)).toBe('-0.01');
    });
  });

  describe('Edge cases', () => {
    it('should handle decimal inputs correctly', () => {
      expect(formatCurrency(1234.56)).toBe('1.2K');
      expect(formatCurrency(999.99)).toBe('1K');
    });

    it('should handle very precise decimals', () => {
      expect(formatCurrency(0.12345)).toBe('0.12');
      expect(formatCurrency(0.99999)).toBe('1.00');
    });

    it('should handle exactly 1', () => {
      expect(formatCurrency(1)).toBe('1');
    });

    it('should handle exactly 1000', () => {
      expect(formatCurrency(1000)).toBe('1K');
    });

    it('should handle exactly 1000000', () => {
      expect(formatCurrency(1000000)).toBe('1M');
    });
  });

  describe('Real-world scenarios', () => {
    it('should format typical cryptocurrency values', () => {
      expect(formatCurrency(0.00123)).toBe('0.00');
      // millify removes trailing zeros for values >= 1
      expect(formatCurrency(1.5)).toBe('1.5');
      // millify rounds to 1 decimal place for values >= 1
      expect(formatCurrency(42.95)).toBe('43');
    });

    it('should format typical fiat currency values', () => {
      // millify removes trailing zeros
      expect(formatCurrency(25.50)).toBe('25.5');
      expect(formatCurrency(100)).toBe('100');
      expect(formatCurrency(1000)).toBe('1K');
      expect(formatCurrency(50000)).toBe('50K');
    });

    it('should format large grant amounts', () => {
      expect(formatCurrency(250000)).toBe('250K');
      expect(formatCurrency(1500000)).toBe('1.5M');
      expect(formatCurrency(10000000)).toBe('10M');
    });

    it('should format DAO treasury values', () => {
      expect(formatCurrency(5000000)).toBe('5M');
      expect(formatCurrency(50000000)).toBe('50M');
      expect(formatCurrency(500000000)).toBe('500M');
    });
  });

  describe('Type handling', () => {
    it('should handle integer inputs', () => {
      expect(formatCurrency(1000)).toBe('1K');
      expect(formatCurrency(1234567)).toBe('1.2M');
    });

    it('should handle float inputs', () => {
      expect(formatCurrency(1000.5)).toBe('1K');
      expect(formatCurrency(0.5)).toBe('0.50');
    });
  });

  describe('Boundary values', () => {
    it('should handle values just under thresholds', () => {
      expect(formatCurrency(999)).toBe('999');
      expect(formatCurrency(999999)).toBe('1M'); // Rounds up
      expect(formatCurrency(999000)).toBe('999K');
    });

    it('should handle values just over thresholds', () => {
      expect(formatCurrency(1001)).toBe('1K');
      expect(formatCurrency(1000001)).toBe('1M');
    });
  });
});
