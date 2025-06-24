import axios from 'axios';
import { IOtpProvider } from '../interface/IOtpProvider';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class CustomApiProvider implements IOtpProvider {
  async send(phoneNumber: string, otp: string): Promise<{ success: boolean; providerId?: string }> {
    const { baseUrl, user, password } = config.customApi;
    if (!baseUrl || !user || !password) {
      logger.error('Custom API provider missing credentials or base URL.');
      return { success: false };
    }

    const credentials = Buffer.from(`${user}:${password}`).toString('base64');
    const url = `${baseUrl}/3rdparty/v1/messages`;
    const messageBody = `Your ${config.otp.issuerName} verification code is: ${otp}`;
    const payload = {
      message: messageBody,
      phoneNumbers: [phoneNumber],
    };

    try {
      const response = await axios({
        method: 'POST',
        url: url,
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
        data: payload,
      });

      if (response.status === 202) {
        const messageId = response.data?.id || 'N/A';
        logger.info(`Custom API OTP enqueued. ID: ${messageId}`);
        return { success: true, providerId: messageId };
      } else {
        logger.warn(`Custom API returned non-202 status: ${response.status}`);
        return { success: false };
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        logger.error(`Custom API Axios Error: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
      } else {
        logger.error(`Custom API Unknown Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      return { success: false };
    }
  }
}