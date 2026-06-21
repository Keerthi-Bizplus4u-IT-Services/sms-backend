/**
 * Simple Smoke Test
 * Verifies Jest configuration is working
 */

describe('Jest Configuration', () => {
  it('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should support async tests', async () => {
    const promise = Promise.resolve('test');
    const result = await promise;
    expect(result).toBe('test');
  });

  it('should have test environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret-key-for-testing-only');
  });

  it('should support mocking', () => {
    const mockFn = jest.fn().mockReturnValue('mocked');
    expect(mockFn()).toBe('mocked');
    expect(mockFn).toHaveBeenCalled();
  });
});
