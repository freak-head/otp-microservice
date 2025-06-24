import { Request, Response, NextFunction } from 'express';
import { otpService } from '../../services/otp.service';
import { config } from '../../config';
import { asyncContext } from '../../utils/asyncContext';

export const generateOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.body;
    
    const referenceId = await otpService.sendOtp(identifier, req.clientId!);
    const expiryMinutes = Math.floor(config.otp.expirySeconds / 60);
    const correlationId = asyncContext.getStore()?.correlationId;

    res.status(202).json({
      status: 'success',
      message: `OTP sent successfully. It will expire in ${expiryMinutes} minutes.`,
      referenceId,
      correlationId, 
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, otp } = req.body;
    await otpService.verifyOtp(identifier, otp);
    const correlationId = asyncContext.getStore()?.correlationId;

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully.',
      correlationId, 
    });
  } catch (error) {
    next(error);
  }
};