import { isAxiosError } from 'axios';

/**
 * General function to get a message from a thrown object.
 * @param {unknown} thrown - The error object to extract the message from.
 * @returns {string} The error message.
 */
export const getErrorMessage = (thrown: unknown): string => {
  let message;
  if (isAxiosError(thrown)) {
    message = thrown.response?.data?.message || thrown.message;
  } else if (thrown instanceof Error) {
    message = thrown.message;
  } else if (thrown && typeof thrown === 'object' && 'message' in thrown) {
    message = String(thrown.message);
  } else if (typeof thrown === 'string') {
    message = thrown;
  } else {
    message = 'Unknown error message';
  }
  return message;
};
