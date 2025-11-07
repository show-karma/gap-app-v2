import { generateRandomString } from '../generateRandomString';

describe('generateRandomString', () => {
  it('should generate string of specified length', () => {
    expect(generateRandomString(10).length).toBe(10);
    expect(generateRandomString(20).length).toBe(20);
    expect(generateRandomString(50).length).toBe(50);
  });

  it('should generate strings with only alphanumeric characters', () => {
    const result = generateRandomString(100);
    expect(result).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should handle length of 1', () => {
    const result = generateRandomString(1);
    expect(result.length).toBe(1);
    expect(result).toMatch(/^[A-Za-z0-9]$/);
  });

  it('should handle length of 0', () => {
    const result = generateRandomString(0);
    expect(result).toBe('');
  });

  it('should generate different strings on consecutive calls', () => {
    const result1 = generateRandomString(20);
    const result2 = generateRandomString(20);
    // While theoretically possible to be the same, probability is extremely low
    expect(result1).not.toBe(result2);
  });

  it('should generate truly random strings (distribution test)', () => {
    const results = new Set();
    for (let i = 0; i < 100; i++) {
      results.add(generateRandomString(10));
    }
    // All 100 should be unique
    expect(results.size).toBe(100);
  });

  it('should include uppercase letters', () => {
    const results = [];
    for (let i = 0; i < 20; i++) {
      results.push(generateRandomString(50));
    }
    const combined = results.join('');
    expect(combined).toMatch(/[A-Z]/);
  });

  it('should include lowercase letters', () => {
    const results = [];
    for (let i = 0; i < 20; i++) {
      results.push(generateRandomString(50));
    }
    const combined = results.join('');
    expect(combined).toMatch(/[a-z]/);
  });

  it('should include numbers', () => {
    const results = [];
    for (let i = 0; i < 20; i++) {
      results.push(generateRandomString(50));
    }
    const combined = results.join('');
    expect(combined).toMatch(/[0-9]/);
  });

  it('should not include special characters', () => {
    const result = generateRandomString(100);
    expect(result).not.toMatch(/[^A-Za-z0-9]/);
  });

  it('should handle very large lengths', () => {
    const result = generateRandomString(10000);
    expect(result.length).toBe(10000);
    expect(result).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should handle negative length by returning empty string', () => {
    // Behavior may vary, but typically returns empty
    const result = generateRandomString(-5);
    expect(result).toBe('');
  });

  it('should have roughly even distribution of characters', () => {
    // Generate a large string and check character distribution
    const result = generateRandomString(10000);

    const uppercaseCount = (result.match(/[A-Z]/g) || []).length;
    const lowercaseCount = (result.match(/[a-z]/g) || []).length;
    const numberCount = (result.match(/[0-9]/g) || []).length;

    // Each category should have some representation
    expect(uppercaseCount).toBeGreaterThan(0);
    expect(lowercaseCount).toBeGreaterThan(0);
    expect(numberCount).toBeGreaterThan(0);

    // Total should equal string length
    expect(uppercaseCount + lowercaseCount + numberCount).toBe(10000);

    // Rough distribution check (within reasonable variance)
    // 26 uppercase + 26 lowercase + 10 digits = 62 characters
    // Expected: ~42% letters, ~16% digits
    const letterPercentage = ((uppercaseCount + lowercaseCount) / 10000) * 100;
    const numberPercentage = (numberCount / 10000) * 100;

    expect(letterPercentage).toBeGreaterThan(70); // Should be around 83.87%
    expect(numberPercentage).toBeGreaterThan(5);  // Should be around 16.13%
    expect(numberPercentage).toBeLessThan(30);
  });

  it('should be usable for generating IDs', () => {
    const id1 = generateRandomString(16);
    const id2 = generateRandomString(16);

    expect(id1.length).toBe(16);
    expect(id2.length).toBe(16);
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^[A-Za-z0-9]{16}$/);
    expect(id2).toMatch(/^[A-Za-z0-9]{16}$/);
  });

  it('should be usable for generating tokens', () => {
    const token = generateRandomString(32);

    expect(token.length).toBe(32);
    expect(token).toMatch(/^[A-Za-z0-9]{32}$/);
  });

  it('should handle decimal lengths by rounding up', () => {
    // JavaScript loop with i < 10.5 runs for 11 iterations (0-10)
    const result = generateRandomString(10.5);
    expect(result.length).toBe(11);
  });

  it('should generate unique strings in rapid succession', () => {
    const results = new Set();
    for (let i = 0; i < 1000; i++) {
      results.add(generateRandomString(8));
    }
    // Should have high uniqueness even with rapid generation
    expect(results.size).toBeGreaterThan(990);
  });
});
