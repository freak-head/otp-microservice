import winston from 'winston';


let mockPrintf: jest.Mock;
let mockJson: jest.Mock;
let mockLogger: { [key: string]: jest.Mock };


jest.mock('winston', () => {
  
  mockPrintf = jest.fn(template => template);
  mockJson = jest.fn(() => 'json_format');
  mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    http: jest.fn(),
  };

  
  return {
    ...jest.requireActual('winston'),
    format: {
      combine: jest.fn((...args) => ({ combined: args })),
      timestamp: jest.fn(() => 'timestamp_format'),
      json: jest.fn(() => mockJson),
      printf: mockPrintf,
      colorize: jest.fn(opts => ({ ...opts, colorized: true })),
    },
    createLogger: jest.fn(() => mockLogger),
    transports: {
      Console: jest.fn(),
    },
    addColors: jest.fn(),
  };
});

describe('Logger', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should use devFormat with colorize and the correct log level', () => {
      const winstonMock = require('winston');
      require('./logger');
      expect(winstonMock.createLogger).toHaveBeenCalledWith(expect.objectContaining({
        level: 'debug',
      }));
      const passedFormat = (winstonMock.createLogger as jest.Mock).mock.calls[0][0].format;
      expect(passedFormat.combined).toEqual(expect.arrayContaining([
        'timestamp_format',
        expect.objectContaining({ colorized: true }),
        expect.any(Function), 
      ]));
    });

    it('should log with a correlation ID when it exists in async context', () => {
      const { asyncContext } = require('../utils/asyncContext');
      require('./logger');
      const template = mockPrintf.mock.calls[0][0];

      asyncContext.run({ correlationId: 'test-id' }, () => {
        const result = template({ level: 'info', message: 'test message', timestamp: 'time' });
        expect(result).toBe('[time] [test-id] info: test message');
      });
    });

    it('should log with "system" when correlation ID does not exist', () => {
      require('./logger');
      const template = mockPrintf.mock.calls[0][0];

      const result = template({ level: 'warn', message: 'another message', timestamp: 'time' });
      expect(result).toBe('[time] [system] warn: another message');
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should use prodFormat with json and the correct log level', () => {
      const winstonMock = require('winston');
      require('./logger');
      expect(winstonMock.createLogger).toHaveBeenCalledWith(expect.objectContaining({
        level: 'warn',
      }));
      const passedFormat = (winstonMock.createLogger as jest.Mock).mock.calls[0][0].format;
      expect(passedFormat.combined).toEqual(expect.arrayContaining([
        'timestamp_format',
        mockJson,
        expect.any(Function), 
      ]));
    });
  });
});