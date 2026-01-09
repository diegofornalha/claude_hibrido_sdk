/**
 * Modelos de Autenticação - Nanda
 * Baseados nos schemas Pydantic do backend FastAPI
 */

export interface UserBase {
  username: string;
  email: string;
}

export interface UserCreate extends UserBase {
  password: string;
  phone_number?: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface User extends UserBase {
  user_id: number;
  phone_number?: string;
  created_at?: string;
  profile_image?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  error?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  error?: string;
  user_id?: number;
}

export interface OTPRequest {
  email: string;
  username: string;
}

export interface OTPVerification {
  email: string;
  otp_code: string;
}

export interface ChangePasswordRequest {
  username: string;
  old_password: string;
  new_password: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}
