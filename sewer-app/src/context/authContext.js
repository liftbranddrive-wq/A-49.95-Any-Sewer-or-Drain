import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [user, setUser] = useState(null);

  const login = (token, userData) => {
    setUserToken(token);
    
    // Extract role whether userData is an object { role: 'admin' } or a plain string 'admin'
    const role = typeof userData === 'object' && userData !== null 
      ? userData.role 
      : userData;

    setUser(userData);
    setUserRole(role);
  };

  const logout = () => {
    setUserToken(null);
    setUser(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{ userToken, userRole, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};