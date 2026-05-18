
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, onAuthStateChanged, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "placeholder-api-key",
  authDomain: "bot-humango-app.firebaseapp.com",
  projectId: "bot-humango-app",
  storageBucket: "bot-humango-app.appspot.com",
  messagingSenderId: "placeholder-id",
  appId: "placeholder-app-id"
};

const FirebaseContext = createContext<{
  app: FirebaseApp | null;
  auth: Auth | null;
  user: User | null;
  loading: boolean;
}>({
  app: null,
  auth: null,
  user: null,
  loading: true,
});

export const useFirebase = () => useContext(FirebaseContext);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [app, setApp] = useState<FirebaseApp | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      let firebaseApp: FirebaseApp;
      if (getApps().length === 0) {
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        firebaseApp = getApps()[0];
      }
      
      setApp(firebaseApp);

      // Check if config is actually set or still placeholder before calling Auth
      if (firebaseConfig.apiKey !== "placeholder-api-key") {
        const firebaseAuth = getAuth(firebaseApp);
        setAuth(firebaseAuth);

        const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
          setUser(currentUser);
          setLoading(false);
        });

        return () => unsubscribe();
      } else {
        setLoading(false);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn("Firebase Provider initialization restricted:", error.message);
      }
      setLoading(false);
    }
  }, []);

  return (
    <FirebaseContext.Provider value={{ app, auth, user, loading }}>
      {children}
    </FirebaseContext.Provider>
  );
}
