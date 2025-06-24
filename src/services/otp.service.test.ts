import { otpService } from './otp.service';
import { redisService } from './redis.service';
import { apiKeyService } from './apiKey.service';
import { getOtpProvider } from '../providers/factory';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { IOtpProvider } from '../providers/interface/IOtpProvider';

jest.mock('./redis.service');
jest.mock('./apiKey.service');
jest.mock('../providers/factory');

const mockedRedis = redisService as jest.Mocked<typeof redisService>;
const mockedApiKeyService = apiKeyService as jest.Mocked<typeof apiKeyService>;
const mockedGetOtpProvider = getOtpProvider as jest.Mock;

describe('OtpService', () => {
  const identifier = '+915551234567';
  const clientId = 'test-client';
  const submittedOtp = '123456';

  const mockProvider: IOtpProvider = {
    send: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetOtpProvider.mockReturnValue(mockProvider);
  });

  describe('sendOtp', () => {
    it('should send an OTP successfully', async () => {
      (mockProvider.send as jest.Mock).mockResolvedValue({ success: true });

      const referenceId = await otpService.sendOtp(identifier, clientId);

      expect(referenceId).toBeDefined();
      expect(typeof referenceId).toBe('string');
      expect(mockedRedis.setWithExpiry).toHaveBeenCalledTimes(2);
      expect(mockProvider.send).toHaveBeenCalledWith(identifier, expect.any(String));
      expect(mockedApiKeyService.incrementUsage).toHaveBeenCalledWith(clientId);
    });

    it('should throw an error if the provider fails to send', async () => {
      (mockProvider.send as jest.Mock).mockResolvedValue({ success: false });

      await expect(otpService.sendOtp(identifier, clientId)).rejects.toThrow(
        new AppError(503, 'Failed to send OTP. Please try again later.')
      );

      expect(mockedApiKeyService.incrementUsage).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    const { otpKey, attemptsKey } = {
        otpKey: `otp:${identifier.replace(/[^0-9]/g, '')}`,
        attemptsKey: `attempts:${identifier.replace(/[^0-9]/g, '')}`
    };

    it('should verify a correct OTP successfully', async () => {
      mockedRedis.increment.mockResolvedValue(1);
      mockedRedis.get.mockResolvedValue(submittedOtp);

      await expect(otpService.verifyOtp(identifier, submittedOtp)).resolves.not.toThrow();

      expect(mockedRedis.delete).toHaveBeenCalledWith(otpKey);
      expect(mockedRedis.delete).toHaveBeenCalledWith(attemptsKey);
    });

    it('should throw an error for an invalid OTP', async () => {
      mockedRedis.increment.mockResolvedValue(1);
      mockedRedis.get.mockResolvedValue('654321');

      await expect(otpService.verifyOtp(identifier, submittedOtp)).rejects.toThrow(
        new AppError(400, 'Invalid OTP.')
      );

      expect(mockedRedis.delete).not.toHaveBeenCalled();
    });

    it('should throw an error if OTP is expired or not found', async () => {
      mockedRedis.increment.mockResolvedValue(1);
      mockedRedis.get.mockResolvedValue(null);

      await expect(otpService.verifyOtp(identifier, submittedOtp)).rejects.toThrow(
        new AppError(400, 'OTP is invalid or has expired.')
      );
    });

    it('should throw an error for too many incorrect attempts', async () => {
      mockedRedis.increment.mockResolvedValue(config.otp.maxVerifyAttempts + 1);

      await expect(otpService.verifyOtp(identifier, submittedOtp)).rejects.toThrow(
        new AppError(429, 'Too many incorrect attempts. Please request a new OTP.')
      );

      expect(mockedRedis.delete).toHaveBeenCalledWith(otpKey);
      expect(mockedRedis.delete).toHaveBeenCalledWith(attemptsKey);
    });
  });
});
