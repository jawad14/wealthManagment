/**
 * Domain error taxonomy.
 *
 * Services throw these; the HTTP layer (src/server/http) is the only place that
 * knows how to turn them into status codes. Modules never import Next.js types.
 */

export type AppErrorCode =
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'FORBIDDEN'
  | 'UNAUTHENTICATED'
  | 'POLICY_REQUIRED'
  | 'INTERNAL';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} "${id}" was not found.`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_FAILED', message, details);
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have access to this record.') {
    super('FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

/**
 * Raised when an action is blocked because a business policy has not been
 * approved yet — e.g. the cross-collateral debt allocation policy (BR-04) or the
 * bond handling rule surfaced in the lease form. These are expected, not bugs.
 */
export class PolicyRequiredError extends AppError {
  constructor(policy: string, message: string) {
    super('POLICY_REQUIRED', message, { policy });
    this.name = 'PolicyRequiredError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
