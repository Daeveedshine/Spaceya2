import { logger } from './logger';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export class SafeAPIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeAPIError';
    // NEVER expose stack trace - deleting it ensures it's safe for clients
    delete this.stack;
  }
}

export function extractErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  if (typeof error === 'string') return error;
  
  let msg = error.message || 'An unexpected error occurred.';
  
  try {
    const parsed = JSON.parse(msg);
    if (parsed && typeof parsed.error === 'string') {
      msg = parsed.error;
    }
  } catch (e) {
    // message is not JSON, which is fine
  }
  
  if (msg.includes('Missing or insufficient permissions.')) {
     return 'You do not have permission to perform this action.';
  }
  
  return msg;
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null, authUser?: any) {
  const isPermissionDenied = error && error.code === 'permission-denied';
  
  const errorInfo: FirestoreErrorInfo = {
    error: isPermissionDenied ? (error.message || 'Permission Denied') : 'An unexpected error occurred during the requested operation.',
    operationType,
    path,
    authInfo: {
      userId: authUser?.uid || 'unauthenticated',
      email: authUser?.email || '',
      emailVerified: authUser?.emailVerified || false,
      isAnonymous: authUser ? !!authUser.isAnonymous : true,
      providerInfo: authUser?.providerData?.map((p: any) => ({
        providerId: p.providerId,
        displayName: p.displayName,
        email: p.email
      })) || []
    }
  };
  
  const safeJsonError = JSON.stringify(errorInfo, null, 2);
  
  // In production, this would be sent to a secure logging service
  if (isPermissionDenied) {
    logger.error("Firebase Security Rule Violation:", safeJsonError);
  } else {
    // We log the real error internally here, but do NOT return it to the client layer
    logger.error("Internal API Error Details:", error);
    logger.error("Structured API Error:", safeJsonError);
  }
  
  // Throw a structured JSON error without a stack trace
  throw new SafeAPIError(safeJsonError);
}
