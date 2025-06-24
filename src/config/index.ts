import dotenv from 'dotenv';
dotenv.config();

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const config = {
  env: getEnv('NODE_ENV', 'development'),
  port: parseInt(getEnv('PORT', '3001'), 10),
  redis: {
    url: getEnv('REDIS_URL'),
  },
  apiKey: {
    
    defaultMonthlyLimit: parseInt(getEnv('DEFAULT_MONTHLY_LIMIT', '1000'), 10),
  },
  otp: {
    provider: getEnv('OTP_PROVIDER').toLowerCase(),
    issuerName: getEnv('OTP_ISSUER_NAME', 'MyApp'),
    length: parseInt(getEnv('OTP_LENGTH', '6'), 10),
    expirySeconds: parseInt(getEnv('OTP_EXPIRY_SECONDS', '180'), 10),
    maxVerifyAttempts: parseInt(getEnv('MAX_VERIFY_ATTEMPTS', '5'), 10),
  },
  twilio: {
    accountSid: getEnv('TWILIO_ACCOUNT_SID', ''),
    authToken: getEnv('TWILIO_AUTH_TOKEN', ''),
    phoneNumber: getEnv('TWILIO_PHONE_NUMBER', ''),
  },
  customApi: {
    baseUrl: getEnv('CUSTOM_API_BASE_URL', ''),
    user: getEnv('CUSTOM_API_USER', ''),
    password: getEnv('CUSTOM_API_PASSWORD', ''),
  },
};