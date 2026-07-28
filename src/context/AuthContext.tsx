'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase-client';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';

export type UserRole = 'PENGINPUT' | 'PEREVIEW';

interface AuthContextType {
  user: User | { email: string; name: string } | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  login: (password: string, username?: string) => Promise<boolean>;
  selectRole: (role: UserRole) => void;
  logout: () => Promise<void>;
  isMock: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | { email: string; name: string } | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);

  // Check if Firebase is actually configured or running mock
  const checkFirebase = () => {
    return process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'mock-api-key';
  };

  useEffect(() => {
    // Check local storage for persistent role selection
    const savedRole = localStorage.getItem('maramis_session_role');
    if (savedRole === 'PENGINPUT' || savedRole === 'PEREVIEW') {
      setRole(savedRole);
    }

    if (!checkFirebase()) {
      // Offline Mock Authentication check
      const savedMockUser = localStorage.getItem('maramis_mock_user');
      if (savedMockUser) {
        setUser(JSON.parse(savedMockUser));
      }
      setIsMock(true);
      setLoading(false);
      return;
    }

    // Live Firebase Auth listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        setUser(null);
        setRole(null);
        localStorage.removeItem('maramis_session_role');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (password: string, username = 'maramis') => {
    setError(null);
    setLoading(true);

    // Fixed internal domain — never shown to or typed by the user.
    const email = `${username}@maramis.local`;

    if (!checkFirebase()) {
      // Mock Login Fallback
      if (password === 'maramis2026' || password === 'admin123' || password === 'password123') {
        const mockUserData = { email, name: 'Tim LMAN' };
        setUser(mockUserData);
        localStorage.setItem('maramis_mock_user', JSON.stringify(mockUserData));
        setLoading(false);
        setIsMock(true);
        return true;
      } else {
        setError('Username atau kata sandi salah (Mode Demo: gunakan "maramis2026")');
        setLoading(false);
        return false;
      }
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Firebase Auth error:', err);
      let errMsg = 'Terjadi kesalahan login.';
      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-credential'
      ) {
        errMsg = 'Username atau kata sandi salah.';
      } else {
        errMsg = 'Terjadi kesalahan login.';
      }
      setError(errMsg);
      setLoading(false);
      return false;
    }
  };

  const selectRole = (selectedRole: UserRole) => {
    setRole(selectedRole);
    localStorage.setItem('maramis_session_role', selectedRole);
  };

  const logout = async () => {
    setLoading(true);
    if (!checkFirebase()) {
      setUser(null);
      setRole(null);
      localStorage.removeItem('maramis_mock_user');
      localStorage.removeItem('maramis_session_role');
      setLoading(false);
      return;
    }

    try {
      await firebaseSignOut(auth);
      setRole(null);
      localStorage.removeItem('maramis_session_role');
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        error,
        login,
        selectRole,
        logout,
        isMock,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
