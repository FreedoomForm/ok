// Shared error utilities — Backend Design System v1.0 §6.3

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export function toApiError(code: string, message: string, details?: Record<string, unknown>): ApiError {
  return { code, message, details };
}

export function toErrorResponse(error: ApiError, requestId: string) {
  return { error: { ...error, requestId } };
}
