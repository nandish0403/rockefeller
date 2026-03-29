import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "@/config/api";

const TOKEN_KEY = "token";
const USER_KEY = "currentUser";

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AuthContext = createContext({
  currentUser: null, token: null,
  isLoading: true, login: async () => {}, logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(readStoredUser);
  const [token,       setToken]       = useState(
    localStorage.getItem(TOKEN_KEY) || null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      localStorage.removeItem(USER_KEY);
      setCurrentUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();

    axios
      .get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then(res => {
        setCurrentUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setCurrentUser(null);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(
      `${API_BASE_URL}/api/auth/login`,
      { email, password }
    );
    const access_token = res.data.access_token;
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);

    const user = res.data.user;
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }

    const meRes = await axios.get(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    setCurrentUser(meRes.data);
    localStorage.setItem(USER_KEY, JSON.stringify(meRes.data));
    return meRes.data;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
