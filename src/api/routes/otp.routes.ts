import { Router } from 'express';
import { generateOtp, verifyOtp } from '../controllers/otp.controller';
import { validateGenerateOtp, validateVerifyOtp } from '../validators/otp.validator';
import { RateLimitRequestHandler } from 'express-rate-limit';

interface OtpLimiters {
  generateOtpLimiter: RateLimitRequestHandler;
  verifyOtpLimiter: RateLimitRequestHandler;
}

export const createOtpRouter = (limiters: OtpLimiters) => {
  const router = Router();

  router.post('/generate', limiters.generateOtpLimiter, validateGenerateOtp, generateOtp);
  router.post('/verify', limiters.verifyOtpLimiter, validateVerifyOtp, verifyOtp);

  return router;
};