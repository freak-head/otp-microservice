import axios from 'axios';
import { CustomApiProvider } from './customApi.provider';
import { config } from '../../config';
import { logger } from '../../utils/logger';

jest.mock('axios');
jest.mock('../../utils/logger');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CustomApiProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (config as any).customApi = {
      baseUrl: 'http://test.api',
      user: 'testuser',
      password: 'testpassword',
    };
    (config as any).otp = {
      issuerName: 'TestApp',
    };
  });

  it('should send an OTP successfully', async () => {
    (mockedAxios as any).mockResolvedValue({ status: 202, data: { id: 'message-123' } });
    const provider = new CustomApiProvider();
    const result = await provider.send('+91234567890', '123456');

    expect(result).toEqual({ success: true, providerId: 'message-123' });
    expect(logger.info).toHaveBeenCalledWith('Custom API OTP enqueued. ID: message-123');
  });

  it('should handle non-202 success statuses', async () => {
    (mockedAxios as any).mockResolvedValue({ status: 200, data: {} });
    const provider = new CustomApiProvider();
    const result = await provider.send('+91234567890', '123456');

    expect(result).toEqual({ success: false });
    expect(logger.warn).toHaveBeenCalledWith('Custom API returned non-202 status: 200');
  });

  it('should handle Axios errors', async () => {
    
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const error = { response: { status: 500, data: 'Server Error' } };
    (mockedAxios as any).mockRejectedValue(error);
    const provider = new CustomApiProvider();
    const result = await provider.send('+91234567890', '123456');

    expect(result).toEqual({ success: false });
    expect(logger.error).toHaveBeenCalledWith('Custom API Axios Error: 500 - "Server Error"');
  });

  it('should handle non-Axios errors', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
    (mockedAxios as any).mockRejectedValue(new Error('Network Error'));
    const provider = new CustomApiProvider();
    const result = await provider.send('+91234567890', '123456');

    expect(result).toEqual({ success: false });
    expect(logger.error).toHaveBeenCalledWith('Custom API Unknown Error: Network Error');
  });

  it('should handle unknown error types', async () => {
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(false);
    (mockedAxios as any).mockRejectedValue('a string error');
    const provider = new CustomApiProvider();
    const result = await provider.send('+91234567890', '123456');
    expect(result).toEqual({ success: false });
    expect(logger.error).toHaveBeenCalledWith('Custom API Unknown Error: Unknown error');
  });

  it('should fail if configuration is missing', async () => {
    (config as any).customApi = {};
    const provider = new CustomApiProvider();
    const result = await provider.send('+91234567890', '123456');

    expect(result).toEqual({ success: false });
    expect(logger.error).toHaveBeenCalledWith('Custom API provider missing credentials or base URL.');
  });
});