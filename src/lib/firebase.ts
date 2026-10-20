import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIREBASE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

console.info('[CUSTOMER FIRESTORE PROJECT]', FIREBASE_PROJECT_ID);
console.info('[CUSTOMER FIRESTORE DATABASE]', FIREBASE_DATABASE_ID);

export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
    useFetchStreams: false,
  } as Parameters<typeof initializeFirestore>[1],
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Bootstrapped store owner email from runtime metadata
export const BOOTSTRAPPED_ADMIN_EMAIL = 'mdsohanurrahman5029@gmail.com';

export function isAuthorizedAdminUser(
  user: { email?: string | null; emailVerified?: boolean } | null | undefined
): boolean {
  if (!user) return false;
  return (
    user.emailVerified === true &&
    (user.email || '').trim().toLowerCase() ===
      BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
}

/**
 * Waits for Firebase Auth to finish initializing and verifies the currentUser
 * is the permanent authorized Admin with a fresh ID token before executing
 * protected Firestore admin reads/writes.
 */
export async function ensureAdminAuthenticated() {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();
  }
  const user = auth.currentUser;
  if (!user || !isAuthorizedAdminUser(user)) {
    throw new Error('আপনার এই Google Account-এর Admin access নেই!');
  }
  await user.getIdToken();
  return user;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
