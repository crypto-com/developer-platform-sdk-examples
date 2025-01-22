import { REQUIRED_ARGS } from './agent.constants.js';
import { Function } from './agent.interfaces.js';

/**
 * Validates that the required arguments for a given function are present in the provided arguments object.
 *
 * @param {Function} functionName - The function for which arguments are being validated.
 * @param {object} args - An object containing the arguments to validate.
 * @returns {boolean} - Returns `true` if all required arguments are present; otherwise, `false`.
 */
export function validateArgs(functionName: Function, args: object): boolean {
  const requiredArgs = REQUIRED_ARGS[functionName] || [];
  return requiredArgs.every((arg) => arg in args);
}
