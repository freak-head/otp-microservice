

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/AppError';
import { apiKeyService } from '../../services/apiKey.service';

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key'] as string;

  if (!key) {
    return next(new AppError(401, 'API key is missing. Provide it in the X-API-Key header.'));
  }

  
  const validationResult = await apiKeyService.validateKeyAndHandleUsage(key);

  if (!validationResult.valid) {
    
    const statusCode = validationResult.message.includes('limit') ? 429 : 401;
    return next(new AppError(statusCode, validationResult.message));
  }
  
  
  req.clientId = validationResult.clientId;

  next();
};