import { apiKeyService, ApiKeyData } from './apiKey.service';
import { redisService } from './redis.service';
import { AppError } from '../utils/AppError';

jest.mock('./redis.service');
const mockedRedis = redisService as jest.Mocked<typeof redisService>;

const mockRedisClient = {
  get: jest.fn(),
  hGetAll: jest.fn(),
  hGet: jest.fn(),
  hSet: jest.fn(),
  hIncrBy: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  multi: jest.fn().mockReturnThis(),
  exec: jest.fn(),
  scanIterator: jest.fn(),
} as any;

describe('ApiKeyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedRedis.getClient.mockReturnValue(mockRedisClient);
  });

  const clientId = 'test-client';
  const hashedKey = 'd04b98f48e8f8bcc15c6ae5ac050801cd6dcfd428fb5f9e65c4e16e7807340fa';
  const apiKeyRedisKey = `apikey:${hashedKey}`;
  const clientIdRedisKey = `clientid:${clientId}`;

  const sampleKeyData: ApiKeyData = {
    clientId: clientId,
    status: 'active',
    createdAt: new Date().toISOString(),
    monthlyLimit: '1000',
    usage: '100',
    periodStart: new Date(new Date().setDate(1)).toISOString().split('T')[0],
  };

  describe('findKeyByClientId', () => {
    it('should return null if client ID lookup fails', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const result = await apiKeyService.findKeyByClientId('non-existent');
      expect(result).toBeNull();
    });

    it('should return null if key data is invalid', async () => {
      mockRedisClient.get.mockResolvedValue(hashedKey);
      mockRedisClient.hGetAll.mockResolvedValue({ some: 'invalid-data' });
      const result = await apiKeyService.findKeyByClientId(clientId);
      expect(result).toBeNull();
    });
  });

  describe('createKey', () => {
    it('should create a new API key successfully', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const newKey = await apiKeyService.createKey(clientId, 5000);

      expect(newKey.startsWith('sk_')).toBe(true);
      expect(mockRedisClient.multi).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.hSet).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
      expect(mockRedisClient.exec).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if the client ID already exists', async () => {
      mockRedisClient.get.mockResolvedValue('some-existing-hash');
      mockRedisClient.hGetAll.mockResolvedValue(sampleKeyData);

      await expect(apiKeyService.createKey(clientId, 5000)).rejects.toThrow(
        new AppError(409, `Client ID '${clientId}' already exists.`)
      );
    });
  });

  describe('validateKeyAndHandleUsage', () => {
    it('should return invalid for a key with wrong format', async () => {
      const result = await apiKeyService.validateKeyAndHandleUsage('bad_key');
      expect(result).toEqual({ valid: false, message: 'Invalid API key format.' });
    });

    it('should return invalid for a non-existent key', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({});
      const result = await apiKeyService.validateKeyAndHandleUsage('sk_nonexistentkey');
      expect(result).toEqual({ valid: false, message: 'Invalid API key.' });
    });

    it('should return invalid for a paused key', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({ ...sampleKeyData, status: 'paused' });
      const result = await apiKeyService.validateKeyAndHandleUsage('sk_pausedkey');
      expect(result).toEqual({ valid: false, message: 'API key is inactive.' });
    });

    it('should return invalid if usage exceeds limit', async () => {
      mockRedisClient.hGetAll.mockResolvedValue({ ...sampleKeyData, usage: '1000' });
      const result = await apiKeyService.validateKeyAndHandleUsage('sk_limitedkey');
      expect(result).toEqual({ valid: false, message: 'Monthly OTP limit exceeded for this API key.' });
    });

    it('should return valid for a correct and active key', async () => {
      mockRedisClient.hGetAll.mockResolvedValue(sampleKeyData);
      const result = await apiKeyService.validateKeyAndHandleUsage('sk_validkey');
      expect(result).toEqual({ valid: true, message: 'OK', clientId: clientId });
    });

    it('should reset usage if the period has changed', async () => {
      const oldPeriodData = {
        ...sampleKeyData,
        periodStart: '2020-01-01',
        usage: '500',
      };
      mockRedisClient.hGetAll.mockResolvedValue(oldPeriodData);
      await apiKeyService.validateKeyAndHandleUsage('sk_validkey');

      expect(mockRedisClient.hSet).toHaveBeenCalledWith(expect.any(String), [
        ['periodStart', new Date(new Date().setDate(1)).toISOString().split('T')[0]],
        ['usage', '0'],
      ]);
    });
  });

  describe('incrementUsage', () => {
    it('should increment usage and total stats', async () => {
      mockRedisClient.get.mockResolvedValue(hashedKey);
      await apiKeyService.incrementUsage(clientId);

      expect(mockRedisClient.multi).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.hIncrBy).toHaveBeenCalledWith(apiKeyRedisKey, 'usage', 1);
      expect(mockRedisClient.hIncrBy).toHaveBeenCalledWith('stats:otp:generated', clientId, 1);
      expect(mockRedisClient.exec).toHaveBeenCalledTimes(1);
    });

    it('should not do anything if client ID is not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      await apiKeyService.incrementUsage('non-existent');
      expect(mockRedisClient.multi).not.toHaveBeenCalled();
    });
  });

  describe('revokeKeyByClientId', () => {
    it('should delete the key hash and client ID lookup', async () => {
      mockRedisClient.get.mockResolvedValue(hashedKey);
      const result = await apiKeyService.revokeKeyByClientId(clientId);

      expect(result).toBe(true);
      expect(mockRedisClient.multi).toHaveBeenCalledTimes(1);
      expect(mockRedisClient.del).toHaveBeenCalledWith(apiKeyRedisKey);
      expect(mockRedisClient.del).toHaveBeenCalledWith(clientIdRedisKey);
      expect(mockRedisClient.exec).toHaveBeenCalledTimes(1);
    });

    it('should return false if client ID is not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const result = await apiKeyService.revokeKeyByClientId('non-existent');
      expect(result).toBe(false);
      expect(mockRedisClient.multi).not.toHaveBeenCalled();
    });
  });

  describe('updateKeyByClientId', () => {
    it('should update the monthly limit', async () => {
      mockRedisClient.get.mockResolvedValue(hashedKey);
      await apiKeyService.updateKeyByClientId(clientId, { monthlyLimit: 2000 });
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(apiKeyRedisKey, { monthlyLimit: '2000' });
    });

    it('should update the status', async () => {
      mockRedisClient.get.mockResolvedValue(hashedKey);
      await apiKeyService.updateKeyByClientId(clientId, { status: 'paused' });
      expect(mockRedisClient.hSet).toHaveBeenCalledWith(apiKeyRedisKey, { status: 'paused' });
    });

    it('should return false if client ID is not found', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      const result = await apiKeyService.updateKeyByClientId('non-existent', { status: 'active' });
      expect(result).toBe(false);
      expect(mockRedisClient.hSet).not.toHaveBeenCalled();
    });
  });

  describe('listAllKeys', () => {
    it('should return a list of all API keys', async () => {
      const mockScanIterator = async function* () {
        yield apiKeyRedisKey;
      };
      mockRedisClient.scanIterator.mockReturnValue(mockScanIterator());
      mockRedisClient.hGetAll.mockResolvedValue(sampleKeyData);

      const keys = await apiKeyService.listAllKeys();
      expect(keys).toHaveLength(1);
      expect(keys[0]).toEqual(sampleKeyData);
    });
  });

  describe('getStats', () => {
    it('should return total count for a client', async () => {
      mockRedisClient.hGet.mockResolvedValue('123');
      const count = await apiKeyService.getStats(clientId);
      expect(count).toBe(123);
    });

    it('should return 0 if no stats exist', async () => {
      mockRedisClient.hGet.mockResolvedValue(null);
      const count = await apiKeyService.getStats(clientId);
      expect(count).toBe(0);
    });
  });
});