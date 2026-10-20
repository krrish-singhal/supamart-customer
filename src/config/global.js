// Shop UPI payment config. Values come from env with production fallbacks.
export const UPI_ID = process.env.EXPO_PUBLIC_UPI_ID || 'SBIBHIM.INSTANT06905003255577185@sbipay';
export const UPI_PAYEE_NAME = process.env.EXPO_PUBLIC_UPI_PAYEE_NAME || 'MS Store';
export const UPI_PHONE = process.env.EXPO_PUBLIC_UPI_PHONE || '+919037655180';

