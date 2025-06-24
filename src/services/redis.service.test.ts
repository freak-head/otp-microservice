
const mockClient = {
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
  isOpen: false,
  disconnect: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue('value'),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(124),
};

jest.mock('redis', () => ({
  createClient: jest.fn(() => mockClient),
}));

jest.mock('../utils/logger');
jest.mock('../config', () => ({
  config: {
    redis: {
      url: 'redis://mock-url:6379',
    },
  },
}));

describe('RedisService', () => {
  let redisService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    
    
    redisService = require('./redis.service').redisService;
  });

  describe('Connection Management', () => {
    it('should create a client and attach an error handler on instantiation', () => {
      expect(require('redis').createClient).toHaveBeenCalled();
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should connect to Redis successfully', async () => {
      mockClient.isOpen = false;
      await redisService.connect();
      expect(mockClient.connect).toHaveBeenCalled();
      const { logger } = require('../utils/logger');
      expect(logger.info).toHaveBeenCalledWith('Connected to Redis');
    });

    it('should not try to connect if already open', async () => {
      mockClient.isOpen = true;
      await redisService.connect();
      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      mockClient.isOpen = false;
      const connectionError = new Error('Connection failed');
      mockClient.connect.mockRejectedValue(connectionError);

      await expect(redisService.connect()).rejects.toThrow(connectionError);
      const { logger } = require('../utils/logger');
      expect(logger.error).toHaveBeenCalledWith(`Failed to connect to Redis: ${connectionError}`);
    });

    it('should handle client errors after connection', () => {
      const errorHandler = mockClient.on.mock.calls.find((call: any) => call[0] === 'error')[1];
      const clientError = new Error('Redis Client Error');
      errorHandler(clientError);

      const { logger } = require('../utils/logger');
      expect(logger.error).toHaveBeenCalledWith(`Redis Client Error: ${clientError}`);
    });

    it('should disconnect successfully', async () => {
      await redisService.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalled();
      const { logger } = require('../utils/logger');
      expect(logger.info).toHaveBeenCalledWith('Redis client connection disconnected.');
    });
  });

  describe('Data Operations', () => {
    it('should call client.get', async () => {
      const result = await redisService.get('mykey');
      expect(mockClient.get).toHaveBeenCalledWith('mykey');
      expect(result).toBe('value');
    });

    it('should call client.set with expiry', async () => {
      await redisService.setWithExpiry('mykey', 'myvalue', 60);
      expect(mockClient.set).toHaveBeenCalledWith('mykey', 'myvalue', { EX: 60 });
    });

    it('should call client.increment', async () => {
      const result = await redisService.increment('mykey');
      expect(mockClient.incr).toHaveBeenCalledWith('mykey');
      expect(result).toBe(124);
    });

    it('should call client.delete', async () => {
      await redisService.delete('mykey');
      expect(mockClient.del).toHaveBeenCalledWith('mykey');
    });

    it('should return the underlying client instance', () => {
      const client = redisService.getClient();
      expect(client).toBe(mockClient);
    });
  });
});