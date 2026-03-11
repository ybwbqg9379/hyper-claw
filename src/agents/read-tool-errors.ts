import { hasNodeErrorCode } from "../infra/path-guards.js";

export const READ_DIRECTORY_ERROR_MESSAGE =
  "Path is a directory, not a file. Use ls to inspect directories or specify a file path.";

const DIRECTORY_READ_MESSAGE_PATTERNS = [
  /^not a file$/i,
  /^path is a directory, not a file\./i,
  /path is not a regular file under root/i,
];

export function isDirectoryReadError(error: unknown): boolean {
  if (hasNodeErrorCode(error, "EISDIR")) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message?.trim() ?? "";
  if (DIRECTORY_READ_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
    return true;
  }
  const cause = (error as Error & { cause?: unknown }).cause;
  return cause !== undefined && cause !== error ? isDirectoryReadError(cause) : false;
}

export function createDirectoryReadError(error?: unknown): Error {
  return new Error(
    READ_DIRECTORY_ERROR_MESSAGE,
    error === undefined ? undefined : { cause: error },
  );
}
