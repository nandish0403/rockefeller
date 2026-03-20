import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext({
  currentUser: null,
  token: null,
  isLoading: true,
  login: async () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.get("http://localhost:8000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => setCurrentUser(res.data))
        .catch(() => { localStorage.removeItem("token"); setToken(null); })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post("http://localhost:8000/api/auth/login", { email, password });
    const { access_token, user } = res.data;
    localStorage.setItem("token", access_token);
    setToken(access_token);
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
