import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [donor, setDonor] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedDonor = localStorage.getItem('donor');

    if (storedToken && storedDonor) {
      try {
        setToken(storedToken);
        setDonor(JSON.parse(storedDonor));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('donor');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken, donorData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('donor', JSON.stringify(donorData));
    setToken(newToken);
    setDonor(donorData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('donor');
    setToken(null);
    setDonor(null);
  };

  const updateDonor = (donorData) => {
    localStorage.setItem('donor', JSON.stringify(donorData));
    setDonor(donorData);
  };

  const isAuthenticated = !!token && !!donor;

  return (
    <AuthContext.Provider value={{ donor, token, loading, isAuthenticated, login, logout, updateDonor }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
