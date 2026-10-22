import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/serviceFactory';
import { LoginCredentials } from '../services/interfaces/IAuthService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (oldPw: string, newPw: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const updateUserDeduped = React.useCallback((nextUser: User | null) => {
    setUser((prev) => {
      if (!prev && !nextUser) return null;
      if (
        prev &&
        nextUser &&
        prev.id === nextUser.id &&
        prev.role === nextUser.role &&
        prev.mustChangePassword === nextUser.mustChangePassword &&
        prev.name === nextUser.name &&
        prev.email === nextUser.email
      ) {
        return prev;
      }
      return nextUser;
    });
  }, []);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((currUser) => {
      updateUserDeduped(currUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [updateUserDeduped]);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const loggedUser = await authService.login(credentials);
      updateUserDeduped(loggedUser);
      setLoading(false);
      return loggedUser;
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const changePassword = async (oldPw: string, newPw: string) => {
    const res = await authService.changePassword(oldPw, newPw);
    if (res && user) {
      setUser({ ...user, mustChangePassword: false });
    }
    return res;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
