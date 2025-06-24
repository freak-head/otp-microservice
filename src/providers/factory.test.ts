import { getOtpProvider } from './factory';
import { config } from '../config';
import { TwilioProvider } from './implementations/twilio.provider';
import { CustomApiProvider } from './implementations/customApi.provider';
import { AppError } from '../utils/AppError';

jest.mock('../config');
jest.mock('./implementations/twilio.provider');
jest.mock('./implementations/customApi.provider');

describe('OTP Provider Factory', () => {
  it('should return TwilioProvider when configured', () => {
    (config as any).otp.provider = 'twilio';
    const provider = getOtpProvider();
    expect(provider).toBeInstanceOf(TwilioProvider);
  });

  it('should return CustomApiProvider when configured', () => {
    (config as any).otp.provider = 'custom';
    const provider = getOtpProvider();
    expect(provider).toBeInstanceOf(CustomApiProvider);
  });

  it('should throw an error for an invalid provider', () => {
    (config as any).otp.provider = 'invalid-provider';
    expect(() => getOtpProvider()).toThrow(
      new AppError(500, 'Invalid OTP_PROVIDER configured: invalid-provider')
    );
  });
});
