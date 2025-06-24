import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../app';
import { otpService } from '../../services/otp.service';
import { apiKeyService } from '../../services/apiKey.service';
import { redisService } from '../../services/redis.service';
import { AppError } from '../../utils/AppError';


jest.mock('express-rate-limit', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()),
  rateLimit: jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()),
}));
jest.mock('../../services/otp.service');
jest.mock('../../services/apiKey.service');

const mockedOtpService = otpService as jest.Mocked<typeof otpService>;
const mockedApiKeyService = apiKeyService as jest.Mocked<typeof apiKeyService>;

let app: Express;
const VALID_API_KEY = 'sk_test_key';

describe('OTP API Endpoints', () => {
  beforeAll(async () => {
    await redisService.connect();
    app = await createApp();
  });

  afterAll(async () => {
    await redisService.disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedApiKeyService.validateKeyAndHandleUsage.mockResolvedValue({
      valid: true,
      message: 'OK',
      clientId: 'test-client-id',
    });
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 if X-API-Key header is missing', async () => {
      const response = await request(app)
        .post('/api/v1/otp/generate')
        .send({ identifier: '+919876543210' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('API key is missing. Provide it in the X-API-Key header.');
    });
  });

  describe('POST /api/v1/otp/generate', () => {
    const validPayload = { identifier: '+919876543210' };

    it('should return 202 and a reference ID on successful OTP generation', async () => {
      const referenceId = 'fake-reference-id';
      mockedOtpService.sendOtp.mockResolvedValue(referenceId);

      const response = await request(app)
        .post('/api/v1/otp/generate')
        .set('X-API-Key', VALID_API_KEY)
        .send(validPayload);

      expect(response.status).toBe(202);
      expect(response.body.referenceId).toBe(referenceId);
    });
  });

  describe('POST /api/v1/otp/verify', () => {
    const validPayload = { identifier: '+919876543210', otp: '123456' };

    it('should return 200 on successful OTP verification', async () => {
      mockedOtpService.verifyOtp.mockResolvedValue();

      const response = await request(app)
        .post('/api/v1/otp/verify')
        .set('X-API-Key', VALID_API_KEY)
        .send(validPayload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('OTP verified successfully.');
    });

    it('should return 400 if the submitted OTP is incorrect', async () => {
      mockedOtpService.verifyOtp.mockRejectedValue(new AppError(400, 'Invalid OTP.'));

      const response = await request(app)
        .post('/api/v1/otp/verify')
        .set('X-API-Key', VALID_API_KEY)
        .send(validPayload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Invalid OTP.');
    });

    it('should return 429 if too many verification attempts are made', async () => {
      mockedOtpService.verifyOtp.mockRejectedValue(
        new AppError(429, 'Too many incorrect attempts. Please request a new OTP.')
      );

      const response = await request(app)
        .post('/api/v1/otp/verify')
        .set('X-API-Key', VALID_API_KEY)
        .send(validPayload);

      expect(response.status).toBe(429);
      expect(response.body.message).toBe('Too many incorrect attempts. Please request a new OTP.');
    });
  });
});