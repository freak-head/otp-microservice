export interface IOtpProvider {
  send(phoneNumber: string, otp: string): Promise<{ success: boolean; providerId?: string }>;
}