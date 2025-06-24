import express, { Request, Response, NextFunction } from 'express';
import { AppError } from './utils/AppError';
import { correlationIdMiddleware } from './api/middleware/correlationId';
import { errorHandler } from './api/middleware/errorHandler';
import { apiKeyAuth } from './api/middleware/apiKeyAuth';
import { initializeRateLimiters } from './api/middleware/rateLimiter';
import { createOtpRouter } from './api/routes/otp.routes';

export const createApp = async (): Promise<express.Express> => {
  const app = express();
  const limiters = initializeRateLimiters();
  const otpRoutes = createOtpRouter(limiters);

  app.use(correlationIdMiddleware);
  app.use(express.json());

  app.use('/api/v1', apiKeyAuth);
  app.use('/api/v1', limiters.clientApiLimiter);

  app.use('/api/v1/otp', otpRoutes);

  app.all('*', (req: Request, res: Response, next: NextFunction) => {
    next(new AppError(404, `Can't find ${req.originalUrl} on this server!`));
  });

  app.use(errorHandler);

  return app;
};