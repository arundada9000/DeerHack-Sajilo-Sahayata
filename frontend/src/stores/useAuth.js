import { create } from "zustand";
import API from "../api/axios";

const useAuth = create((set) => ({
  user: null,
  token: null,
  login: (user, token) => {
    localStorage.setItem("token", token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null });
  },
  updateUser: (newData) => {
    const current = useAuth.getState().user;
    if (current) {
      set({ user: { ...current, ...newData } });
    }
  },
  isAuthenticated: () => !!useAuth.getState().user,
  autoLogin: async () => {
    try {
      const verifyRes = await API.get("/auth/verify", {
        withCredentials: true,
      });

      // `verify` already returns the full user object
      const fullUser = verifyRes.data.user;

      set({ user: fullUser });
    } catch (err) {
      set({ user: null });
    }
  },
}));

export default useAuth;
