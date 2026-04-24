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

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null, authUser: any) {
  if (error && error.code === 'permission-denied') {
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: authUser?.uid || 'unauthenticated',
        email: authUser?.email || '',
        emailVerified: authUser?.emailVerified || false,
        isAnonymous: authUser?.isAnonymous || true,
        providerInfo: authUser?.providerData?.map((p: any) => ({
          providerId: p.providerId,
          displayName: p.displayName,
          email: p.email
        })) || []
      }
    };
    
    // In production, this would be sent to a logging service
    console.error("Firebase Security Rule Violation:", JSON.stringify(errorInfo, null, 2));
    throw new Error(JSON.stringify(errorInfo));
  }
  
  // Re-throw generic errors
  throw error;
}
