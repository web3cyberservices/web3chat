
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('[Seed] Firebase Admin initialized.');
  } catch (error) {
    console.error('[Seed] Firebase Admin init error:', error);
    process.exit(1);
  }
}

const auth = admin.auth();

async function seed() {
  const email = 'abuse@humango.app';
  const password = 'Web3p00d@3';

  console.log(`[Seed] Attempting to create manager: ${email}`);

  try {
    const user = await auth.getUserByEmail(email);
    console.log('[Seed] User already exists in Firebase Auth. UID:', user.uid);
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      const user = await auth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: 'Compliance Manager',
      });
      console.log('[Seed] Successfully created new manager in Firebase Auth. UID:', user.uid);
    } else {
      console.error('[Seed] Error checking/creating user:', error);
    }
  }
}

seed().then(() => {
  console.log('[Seed] Process finished.');
  process.exit(0);
});
