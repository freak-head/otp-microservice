import { initializeRateLimiters } from './rateLimiter';
import { Request } from 'express';


jest.mock('express-rate-limit', () => ({
  rateLimit: jest.fn(options => ({ options })),
}));

jest.mock('rate-limit-redis', () => ({
  RedisStore: jest.fn().mockImplementation(() => ({
    increment: jest.fn(),
    decrement: jest.fn(),
    resetKey: jest.fn(),
  })),
}));

jest.mock('../../services/redis.service');

describe('Rate Limiter', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create all limiters without error', () => {
    const limiters = initializeRateLimiters();
    expect(limiters.generateOtpLimiter).toBeDefined();
    expect(limiters.verifyOtpLimiter).toBeDefined();
    expect(limiters.clientApiLimiter).toBeDefined();
  });

  it('keyGenerator should use identifier if present, or fallback to IP', () => {
    const { generateOtpLimiter } = initializeRateLimiters();
    
    const keyGenerator = (generateOtpLimiter as any).options.keyGenerator as Function;

    const reqWithIdentifier = { body: { identifier: 'test-identifier' }, ip: '127.0.0.1' } as Request;
    expect(keyGenerator(reqWithIdentifier)).toBe('test-identifier');

    const reqWithoutIdentifier = { body: {}, ip: '127.0.0.1' } as Request;
    expect(keyGenerator(reqWithoutIdentifier)).toBe('127.0.0.1');
  });
});