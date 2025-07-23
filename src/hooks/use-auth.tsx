// src/hooks/use-auth.tsx
"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { toast } from './use-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

// A flag to ensure the admin check runs only once per application lifecycle.
let adminCheckCompleted = false;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAndCreateAdmin = async () => {
        if (adminCheckCompleted) return;
        adminCheckCompleted = true;

        const defaultAdminEmail = 'princegupta619@gmail.com';
        const defaultAdminPassword = 'Qwerty@123';
        
        try {
            // This is a more robust way to handle one-time setup.
            // It attempts to create the user, and if it fails because the user already exists,
            // we can safely ignore the error.
            const userCredential = await createUserWithEmailAndPassword(auth, defaultAdminEmail, defaultAdminPassword);
            const adminUser: Omit<User, 'id'> = {
                name: 'Prince',
                email: defaultAdminEmail,
                role: 'admin',
            };
            // Use the created user's UID for the document ID
            await setDoc(doc(db, "users", userCredential.user.uid), adminUser);
            // After successful creation, sign the user out so it doesn't interfere with the normal login flow.
            await auth.signOut();
        } catch (error: any) {
            // 'auth/email-already-in-use' is the expected error if the admin already exists.
            // We can safely ignore it and proceed.
            if (error.code !== 'auth/email-already-in-use') {
                console.error("Error creating default admin user:", error);
                toast({
                    title: "Setup Error",
                    description: "Could not create the default admin user.",
                    variant: "destructive"
                });
            }
        }
    };

    checkAndCreateAdmin();

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // If a user is logged in, listen for their data from Firestore.
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
          } else {
            // This case can happen if the user was deleted from Firestore but not from Auth.
            // Treat them as logged out.
            setUser(null);
          }
          setIsLoading(false); // Stop loading only after we have the user data.
        }, (error) => {
            console.error("Firestore snapshot error:", error);
            toast({
                title: "Database Connection Error",
                description: "Could not fetch user profile. Please try again later.",
                variant: "destructive",
            });
            setUser(null);
            setIsLoading(false);
        });
        return () => unsubSnapshot(); // Return the Firestore listener unsubscriber.
      } else {
        // If no user is logged in, set user to null and stop loading.
        setUser(null);
        setIsLoading(false);
      }
    });

    // The returned function will be called on component unmount.
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
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
