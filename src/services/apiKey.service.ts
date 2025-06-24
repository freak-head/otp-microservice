import crypto from 'crypto';
import { redisService } from './redis.service';
import { config } from '../config';
import { AppError } from '../utils/AppError';

export interface ApiKeyData {
  clientId: string;
  status: 'active' | 'paused';
  createdAt: string;
  monthlyLimit: string;
  usage: string;
  periodStart: string;
}

const API_KEY_PREFIX = 'sk_';
const API_KEY_HASH_PREFIX = 'apikey:';
const CLIENT_ID_LOOKUP_PREFIX = 'clientid:';
const STATS_KEY = 'stats:otp:generated';

const hashKey = (key: string): string => {
  return crypto.createHash('sha256').update(key).digest('hex');
};

function isApiKeyData(data: Record<string, any>): data is ApiKeyData {
  return (
    data &&
    typeof data.clientId === 'string' &&
    typeof data.status === 'string' &&
    (data.status === 'active' || data.status === 'paused') &&
    typeof data.createdAt === 'string' &&
    typeof data.monthlyLimit === 'string' &&
    typeof data.usage === 'string' &&
    typeof data.periodStart === 'string'
  );
}

class ApiKeyService {
  private generateKey(): string {
    return API_KEY_PREFIX + crypto.randomBytes(24).toString('hex');
  }

  private getApiKeyRedisKey(apiKeyHash: string): string {
    return `${API_KEY_HASH_PREFIX}${apiKeyHash}`;
  }

  private getClientIdRedisKey(clientId: string): string {
    return `${CLIENT_ID_LOOKUP_PREFIX}${clientId}`;
  }

  public async findKeyByClientId(clientId: string): Promise<ApiKeyData | null> {
    const hashedKey = await redisService.getClient().get(this.getClientIdRedisKey(clientId));
    if (!hashedKey) return null;
    const data = await redisService.getClient().hGetAll(this.getApiKeyRedisKey(hashedKey));
    if (!isApiKeyData(data)) return null;
    return data;
  }

  public async createKey(clientId: string, monthlyLimit: number): Promise<string> {
    const existingKey = await this.findKeyByClientId(clientId);
    if (existingKey) {
      throw new AppError(409, `Client ID '${clientId}' already exists.`);
    }

    const rawKey = this.generateKey();
    const hashedKey = hashKey(rawKey);
    const apiKeyRedisKey = this.getApiKeyRedisKey(hashedKey);
    const clientIdRedisKey = this.getClientIdRedisKey(clientId);

    const keyData: ApiKeyData = {
      clientId,
      status: 'active',
      createdAt: new Date().toISOString(),
      monthlyLimit: String(monthlyLimit),
      usage: '0',
      periodStart: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    };

    const multi = redisService.getClient().multi();
    multi.hSet(apiKeyRedisKey, { ...keyData });
    multi.set(clientIdRedisKey, hashedKey);
    await multi.exec();

    return rawKey;
  }

  public async validateKeyAndHandleUsage(rawKey: string): Promise<{ valid: boolean; message: string; clientId?: string }> {
    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      return { valid: false, message: 'Invalid API key format.' };
    }

    const hashedKey = hashKey(rawKey);
    const redisKey = this.getApiKeyRedisKey(hashedKey);

    const keyData = await this.findAndResetPeriod(redisKey);

    if (!keyData) {
      return { valid: false, message: 'Invalid API key.' };
    }

    if (keyData.status !== 'active') {
      return { valid: false, message: 'API key is inactive.' };
    }

    if (parseInt(keyData.usage, 10) >= parseInt(keyData.monthlyLimit, 10)) {
      return { valid: false, message: 'Monthly OTP limit exceeded for this API key.' };
    }

    return { valid: true, message: 'OK', clientId: keyData.clientId };
  }

  private async findAndResetPeriod(redisKey: string): Promise<ApiKeyData | null> {
    const keyData = await redisService.getClient().hGetAll(redisKey);
    if (!isApiKeyData(keyData)) return null;

    const currentPeriodStart = new Date(new Date().setDate(1)).toISOString().split('T')[0];
    if (keyData.periodStart !== currentPeriodStart) {
      await redisService.getClient().hSet(redisKey, [
        ['periodStart', currentPeriodStart],
        ['usage', '0'],
      ]);
      keyData.periodStart = currentPeriodStart;
      keyData.usage = '0';
    }
    return keyData;
  }

  public async incrementUsage(clientId: string): Promise<void> {
    const hashedKey = await redisService.getClient().get(this.getClientIdRedisKey(clientId));
    if (!hashedKey) return;
    const apiKeyRedisKey = this.getApiKeyRedisKey(hashedKey);

    const multi = redisService.getClient().multi();
    multi.hIncrBy(apiKeyRedisKey, 'usage', 1);
    multi.hIncrBy(STATS_KEY, clientId, 1);
    await multi.exec();
  }

  public async updateKeyByClientId(clientId: string, updates: { status?: 'active' | 'paused'; monthlyLimit?: number }): Promise<boolean> {
    const hashedKey = await redisService.getClient().get(this.getClientIdRedisKey(clientId));
    if (!hashedKey) return false;

    const redisKey = this.getApiKeyRedisKey(hashedKey);
    const fieldsToUpdate: Record<string, string> = {};
    if (updates.status) fieldsToUpdate.status = updates.status;
    if (updates.monthlyLimit !== undefined) fieldsToUpdate.monthlyLimit = String(updates.monthlyLimit);

    if (Object.keys(fieldsToUpdate).length > 0) {
      await redisService.getClient().hSet(redisKey, fieldsToUpdate);
    }
    return true;
  }

  public async revokeKeyByClientId(clientId: string): Promise<boolean> {
    const hashedKey = await redisService.getClient().get(this.getClientIdRedisKey(clientId));
    if (!hashedKey) return false;

    const apiKeyRedisKey = this.getApiKeyRedisKey(hashedKey);
    const clientIdRedisKey = this.getClientIdRedisKey(clientId);

    const multi = redisService.getClient().multi();
    multi.del(apiKeyRedisKey);
    multi.del(clientIdRedisKey);
    await multi.exec();

    return true;
  }

  public async listAllKeys(): Promise<ApiKeyData[]> {
    const keys: ApiKeyData[] = [];
    for await (const key of redisService.getClient().scanIterator({ TYPE: 'hash', MATCH: `${API_KEY_HASH_PREFIX}*`, COUNT: 100 })) {
      const data = await redisService.getClient().hGetAll(key);
      if (isApiKeyData(data)) {
        keys.push(data);
      }
    }
    return keys;
  }

  public async getStats(clientId: string): Promise<number> {
    const count = await redisService.getClient().hGet(STATS_KEY, clientId);
    return count ? parseInt(count, 10) : 0;
  }
}

export const apiKeyService = new ApiKeyService();