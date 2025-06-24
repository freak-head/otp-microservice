import crypto from 'crypto';
import { redisService } from './redis.service';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { getOtpProvider } from '../providers/factory';
import { apiKeyService } from './apiKey.service';

class OtpService {
  private generateOtp(): string {
    const buffer = crypto.randomBytes(Math.ceil(config.otp.length / 2));
    const otp = parseInt(buffer.toString('hex'), 16).toString().padStart(config.otp.length, '0');
    return otp.slice(0, config.otp.length);
  }

  private getKeys(identifier: string) {
    const sanitizedId = identifier.replace(/[^0-9]/g, '');
    return {
      otpKey: `otp:${sanitizedId}`,
      attemptsKey: `attempts:${sanitizedId}`,
    };
  }

  public async sendOtp(identifier: string, clientId: string): Promise<string> {
    const otp = this.generateOtp();
    const { otpKey, attemptsKey } = this.getKeys(identifier);
    const provider = getOtpProvider();

    await redisService.setWithExpiry(otpKey, otp, config.otp.expirySeconds);
    await redisService.setWithExpiry(attemptsKey, '0', config.otp.expirySeconds);

    const result = await provider.send(identifier, otp);
    if (!result.success) {
      throw new AppError(503, 'Failed to send OTP. Please try again later.');
    }

    await apiKeyService.incrementUsage(clientId);

    return crypto.randomBytes(4).toString('hex');
  }

  public async verifyOtp(identifier: string, submittedOtp: string): Promise<void> {
    const { otpKey, attemptsKey } = this.getKeys(identifier);

    const attempts = await redisService.increment(attemptsKey);
    if (attempts > config.otp.maxVerifyAttempts) {
      await redisService.delete(otpKey);
      await redisService.delete(attemptsKey);
      throw new AppError(429, 'Too many incorrect attempts. Please request a new OTP.');
    }

    const storedOtp = await redisService.get(otpKey);
    if (!storedOtp) {
      throw new AppError(400, 'OTP is invalid or has expired.');
    }

    const isMatch =
      storedOtp.length === submittedOtp.length &&
      crypto.timingSafeEqual(Buffer.from(storedOtp), Buffer.from(submittedOtp));

    if (!isMatch) {
      throw new AppError(400, 'Invalid OTP.');
    }

    await redisService.delete(otpKey);
    await redisService.delete(attemptsKey);
  }
}

export const otpService = new OtpService();