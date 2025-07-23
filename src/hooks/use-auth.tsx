
// src/hooks/use-auth.tsx
"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAndCreateAdmin = async () => {
        const defaultAdminEmail = 'princegupta619@gmail.com';
        const defaultAdminPassword = 'Qwerty@123';
        
        try {
            // Attempt to sign in to check if the user exists.
            await signInWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
            await auth.signOut(); // Sign out immediately after check
        } catch (error: any) {
            // If user does not exist, create them
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                console.log("Default admin not found, creating one...");
                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
                    const adminUser: Omit<User, 'id'> = {
                        name: 'Prince',
                        email: defaultAdminEmail,
                        role: 'admin',
                    };
                    await setDoc(doc(db, "users", userCredential.user.uid), adminUser);
                    console.log("Default admin user created successfully.");
                    await auth.signOut(); // Sign out after creation
                } catch (creationError) {
                    console.error("Error creating default admin user:", creationError);
                }
            } else {
                console.error("Error checking for admin user:", error);
            }
        }
    };

    checkAndCreateAdmin();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
          } else {
            // This case might happen if a user is in Auth but not in Firestore.
            // For this app's logic, we log them out.
            auth.signOut();
            setUser(null);
          }
          setIsLoading(false);
        });
        return () => unsubSnapshot();
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {isLoading ? (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4">Authenticating...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
