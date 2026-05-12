
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
    // Only initialize on the client
    if (typeof window === 'undefined') return;

    try {
      // Check if config is actually set or still placeholder
      const isPlaceholder = firebaseConfig.apiKey === "placeholder-api-key";
      
      let firebaseApp: FirebaseApp;
      if (getApps().length === 0) {
        firebaseApp = initializeApp(firebaseConfig);
      } else {
        firebaseApp = getApps()[0];
      }
      
      const firebaseAuth = getAuth(firebaseApp);
      
      setApp(firebaseApp);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      // Avoid logging browser Event objects as errors to console
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
