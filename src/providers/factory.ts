import { IOtpProvider } from './interface/IOtpProvider';
import { TwilioProvider } from './implementations/twilio.provider';
import { CustomApiProvider } from './implementations/customApi.provider';
import { config } from '../config';
import { AppError } from '../utils/AppError';

export const getOtpProvider = (): IOtpProvider => {
  switch (config.otp.provider) {
    case 'twilio':
      return new TwilioProvider();
    case 'custom':
      return new CustomApiProvider();
    default:
      throw new AppError(500, `Invalid OTP_PROVIDER configured: ${config.otp.provider}`);
  }
};