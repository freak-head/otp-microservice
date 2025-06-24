import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { asyncContext } from '../../utils/asyncContext';

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = req.headers['x-correlation-id'] as string || crypto.randomBytes(16).toString('hex');
  
  asyncContext.run({ correlationId }, () => {
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  });
};
