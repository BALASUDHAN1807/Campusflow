import api from "./api";
import { ApiResponse, AuthUser } from "../types";

export interface LoginResponseData {
  user: AuthUser;
  token?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<ApiResponse<LoginResponseData>> {
    return api.post<LoginResponseData>("/auth/login", { email, password });
  },

  async register(name: string, email: string, password: string): Promise<ApiResponse<LoginResponseData>> {
    return api.post<LoginResponseData>("/auth/register", { name, email, password });
  },

  async logout(): Promise<ApiResponse<null>> {
    return api.post<null>("/auth/logout");
  },

  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return api.get<AuthUser>("/auth/me");
  },
};

export default authService;
