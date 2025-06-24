
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('Config', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    
    process.env = { ...OLD_ENV, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('should throw an error if a required environment variable is missing', () => {
    
    process.env.OTP_PROVIDER = 'twilio';
    
    delete process.env.REDIS_URL;

    
    expect(() => {
      require('./index');
    }).toThrow('Missing environment variable: REDIS_URL');
  });

  it('should use default values if environment variables are not set', () => {
    
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.OTP_PROVIDER = 'twilio';

    
    delete process.env.PORT;
    delete process.env.DEFAULT_MONTHLY_LIMIT;

    const { config } = require('./index');

    expect(config.port).toBe(3001);
    expect(config.apiKey.defaultMonthlyLimit).toBe(1000);
  });
});