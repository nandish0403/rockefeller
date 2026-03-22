import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext({
  currentUser: null, token: null,
  isLoading: true, login: async () => {}, logout: () => {},
});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token,       setToken]       = useState(
    localStorage.getItem("token") || null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    // ✅ Add 5s timeout — never hangs forever
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      localStorage.removeItem("token");
      setToken(null);
      setIsLoading(false);
    }, 5000);

    axios
      .get("http://localhost:8000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
      .then(res => setCurrentUser(res.data))
      .catch(() => {
        localStorage.removeItem("token");
        setToken(null);
        setCurrentUser(null);
      })
      .finally(() => {
        clearTimeout(timer);
        setIsLoading(false);
      });

    return () => { clearTimeout(timer); controller.abort(); };
  }, [token]);

  const login = async (email, password) => {
    const res = await axios.post(
      "http://localhost:8000/api/auth/login",
      { email, password }
    );
    const access_token = res.data.access_token;
    localStorage.setItem("token", access_token);
    setToken(access_token);

    const meRes = await axios.get(
      "http://localhost:8000/api/auth/me",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    setCurrentUser(meRes.data);
    return meRes.data;
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
