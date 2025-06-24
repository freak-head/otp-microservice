import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/AppError';

const validationMiddleware = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return next(new AppError(400, error.details[0].message));
  }
  next();
};

const generateOtpSchema = Joi.object({
  identifier: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Identifier must be a valid E.164 phone number format (e.g., +919876543210).',
  }),
});

const verifyOtpSchema = Joi.object({
  identifier: Joi.string().pattern(/^\+[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Identifier must be a valid E.164 phone number format (e.g., +919876543210).',
  }),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
});

export const validateGenerateOtp = validationMiddleware(generateOtpSchema);
export const validateVerifyOtp = validationMiddleware(verifyOtpSchema);