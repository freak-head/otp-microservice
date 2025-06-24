import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError && err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  logger.error(`UNHANDLED ERROR: ${err.stack}`);
  
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected internal server error occurred.',
  });
};