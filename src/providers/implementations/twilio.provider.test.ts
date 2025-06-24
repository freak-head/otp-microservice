import twilio from 'twilio';
import { TwilioProvider } from './twilio.provider';
import { config } from '../../config';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger');
const mCreate = jest.fn();
jest.mock('twilio', () =>
  jest.fn(() => ({
    messages: {
      create: mCreate,
    },
  }))
);

describe('TwilioProvider', () => {
  beforeEach(() => {
    (config as any).twilio = {
      accountSid: 'ACxxxxxx',
      authToken: 'authxxxxxx',
      phoneNumber: '+915005550006',
    };
  });

  it('should send an OTP successfully', async () => {
    mCreate.mockResolvedValue({ sid: 'SMxxxxxxxxxxxx' });
    const provider = new TwilioProvider();
    const result = await provider.send('+91234567890', '123456');

    expect(result).toEqual({ success: true, providerId: 'SMxxxxxxxxxxxx' });
    expect(logger.info).toHaveBeenCalledWith('Twilio OTP sent. SID: SMxxxxxxxxxxxx');
  });

  it('should handle errors from the Twilio client', async () => {
    mCreate.mockRejectedValue(new Error('Twilio API Error'));
    const provider = new TwilioProvider();
    const result = await provider.send('+91234567890', '123456');

    expect(result).toEqual({ success: false });
    expect(logger.error).toHaveBeenCalledWith('Twilio Error: Twilio API Error');
  });

  it('should fail gracefully if not initialized with credentials', async () => {
    (config as any).twilio = {};
    const provider = new TwilioProvider();
    const result = await provider.send('+91234567890', '123456');

    expect(result).toEqual({ success: false });
    expect(logger.error).toHaveBeenCalledWith('Twilio client not available. Cannot send OTP.');
  });
});
