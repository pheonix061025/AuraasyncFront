// firebaseAdmin.ts
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App;

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "⚠️ Firebase Admin not fully configured. Missing environment variables."
    );
  } else {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }
}

export const adminAuth = adminApp ? getAuth(adminApp) : undefined;

/**
 * Verify a Firebase ID token
 */
export async function verifyFirebaseIdToken(idToken: string) {
  if (!adminAuth) {
    throw new Error("Firebase Admin is not configured");
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error("❌ Firebase token verification failed:", error);
    throw new Error("Invalid Firebase ID token");
  }
}

/**
 * Get user data from Firebase ID token
 */
export async function getUserDataFromToken(idToken: string) {
  const decodedToken = await verifyFirebaseIdToken(idToken);
  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    name: decodedToken.name,
    picture: decodedToken.picture
  };
}
