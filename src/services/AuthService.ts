import ApiService from './ApiService';
import type {
  ChangePasswordRequest,
  RefreshRequest,
  RegisterRequest,
  ResetPasswordRequest,
  SendOtpData,
  SendOtpRequest,
  SessionUser,
  SignInData,
  SignInRequest,
  UpdateProfileRequest,
} from '@/types/auth';

export const apiSignIn = (data: SignInRequest) => ApiService.post<SignInData, SignInRequest>('/Auth/Login', data);
export const apiSendOtp = (data: SendOtpRequest) => ApiService.post<SendOtpData, SendOtpRequest>('/Auth/SendOtp', data);
/** New business + owner login; answers like Login, so the owner is signed in right away. */
export const apiRegister = (data: RegisterRequest) => ApiService.post<SignInData, RegisterRequest>('/Auth/Register', data);
export const apiResetPassword = (data: ResetPasswordRequest) =>
  ApiService.post<boolean, ResetPasswordRequest>('/Auth/ResetPassword', data);
export const apiRefresh = (data: RefreshRequest) => ApiService.post<SignInData, RefreshRequest>('/Auth/Refresh', data);
export const apiSignOut = () => ApiService.post<boolean>('/Auth/Logout');
export const apiGetMe = () => ApiService.post<SessionUser>('/Auth/Me');
export const apiChangePassword = (data: ChangePasswordRequest) =>
  ApiService.post<boolean, ChangePasswordRequest>('/Auth/ChangePassword', data);
export const apiUpdateProfile = (data: UpdateProfileRequest) =>
  ApiService.post<SessionUser, UpdateProfileRequest>('/Auth/UpdateProfile', data);
/** Demo only (mock backend): puts the sample data back. */
export const apiResetDemo = () => ApiService.post<boolean>('/Auth/ResetDemo');
