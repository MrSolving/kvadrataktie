import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const token = localStorage.getItem('kvadrat_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const me = await api.get('/auth/me');
      setUser(me);
    } catch {
      localStorage.removeItem('kvadrat_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  async function login(email, password) {
    const { token, user: u } = await api.post('/auth/login', { email, password });
    localStorage.setItem('kvadrat_token', token);
    setUser(u);
    return u;
  }

  function logout() {
    localStorage.removeItem('kvadrat_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
