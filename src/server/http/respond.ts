/**
 * HTTP response envelope and error mapping.
 *
 * This is the ONLY place that translates domain errors into status codes.
 * Modules throw `AppError` subclasses and stay transport-agnostic.
 */
import { NextResponse } from 'next/server';
import { AppError, isAppError, type AppErrorCode } from '@/shared/lib/errors';

export interface ApiSuccess<T> {
  readonly data: T;
}

export interface ApiFailure {
  readonly error: {
    readonly code: AppErrorCode;
    readonly message: string;
    readonly details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  POLICY_REQUIRED: 422,
  INTERNAL: 500,
};

export function jsonOk<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ data }, { status });
}

export function jsonError(error: unknown): NextResponse<ApiFailure> {
  const appError = isAppError(error)
    ? error
    : new AppError('INTERNAL', 'An unexpected error occurred.');

  if (!isAppError(error)) {
    // Unexpected faults are logged server-side; the client never sees internals.
    console.error('[holdfast] unhandled error', error);
  }

  return NextResponse.json(
    {
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details === undefined ? {} : { details: appError.details }),
      },
    },
    { status: STATUS_BY_CODE[appError.code] },
  );
}
