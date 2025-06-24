import twilio from 'twilio';
import { IOtpProvider } from '../interface/IOtpProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class TwilioProvider implements IOtpProvider {
  private client: twilio.Twilio;

  constructor() {
    if (!config.twilio.accountSid || !config.twilio.authToken) {
      logger.warn('Twilio provider initialized without credentials.');
      this.client = {} as twilio.Twilio;
    } else {
      this.client = twilio(config.twilio.accountSid, config.twilio.authToken);
    }
  }

  async send(phoneNumber: string, otp: string): Promise<{ success: boolean; providerId?: string }> {
    if (!this.client.messages) {
      logger.error('Twilio client not available. Cannot send OTP.');
      return { success: false };
    }
    
    const messageBody = `Your ${config.otp.issuerName} verification code is: ${otp}`;

    try {
      const message = await this.client.messages.create({
        body: messageBody,
        from: config.twilio.phoneNumber,
        to: phoneNumber,
      });
      logger.info(`Twilio OTP sent. SID: ${message.sid}`);
      return { success: true, providerId: message.sid };
    } catch (error) {
      logger.error(`Twilio Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { success: false };
    }
  }
}