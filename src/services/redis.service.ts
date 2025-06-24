import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';

class RedisService {
  private client: RedisClientType;
  private static instance: RedisService;

  private constructor() {
    this.client = createClient({ url: config.redis.url });
    this.client.on('error', (err) => logger.error(`Redis Client Error: ${err}`));
  }

  
  public async connect(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }
    try {
      await this.client.connect();
      logger.info('Connected to Redis');
    } catch (err) {
      logger.error(`Failed to connect to Redis: ${err}`);
      throw err; 
    }
  }
  
  
  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
      
    }
    return RedisService.instance;
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async setWithExpiry(key: string, value: string, expirySeconds: number): Promise<void> {
    await this.client.set(key, value, { EX: expirySeconds });
  }

  public async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  public getClient(): RedisClientType {
    return this.client;
  }
  
  
  public async disconnect(): Promise<void> {
    if (this.client) {
        await this.client.disconnect();
        logger.info('Redis client connection disconnected.');
    }
  }
}

export const redisService = RedisService.getInstance();