import { rateLimit } from 'express-rate-limit';
import { RedisStore, RedisReply } from 'rate-limit-redis';
import { redisService } from '../../services/redis.service';
import { Request } from 'express';

const keyGenerator = (req: Request) => req.body.identifier || req.ip;

export const initializeRateLimiters = () => {
  const storeOptions = {
    
    
    sendCommand: ((...args: string[]) =>
      redisService.getClient().sendCommand(args)) as (
      ...args: string[]
    ) => Promise<RedisReply>,
  };

  const generateOtpLimiter = rateLimit({
    store: new RedisStore({
      ...storeOptions,
      prefix: 'rl-generate:',
    }),
    windowMs: 60 * 1000,
    limit: 2,
    keyGenerator,
    message: {
      status: 'error',
      message: 'Too many OTP requests. Please wait a minute before trying again.',
    },
  });

  const verifyOtpLimiter = rateLimit({
    store: new RedisStore({
      ...storeOptions,
      prefix: 'rl-verify:',
    }),
    windowMs: 5 * 60 * 1000,
    limit: 10,
    keyGenerator,
    message: {
      status: 'error',
      message: 'Too many verification attempts. Please wait a few minutes before trying again.',
    },
  });

  const clientApiLimiter = rateLimit({
    store: new RedisStore({
      ...storeOptions,
      prefix: 'rl-client:',
    }),
    windowMs: 15 * 60 * 1000,
    limit: 100,
    keyGenerator: (req: Request) => req.clientId!,
    message: {
      status: 'error',
      message: 'API key rate limit exceeded. Please try again later.',
    },
    skip: (req) => !req.clientId,
  });

  return {
    generateOtpLimiter,
    verifyOtpLimiter,
    clientApiLimiter,
  };
};