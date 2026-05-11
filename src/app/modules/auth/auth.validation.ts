import { z } from "zod";

const login = z.object({
  body: z.object({
    phone: z.string({ required_error: "Phone is required" }),
    password: z.string({ required_error: "Password is required" }),
  }),
});

const refreshToken = z.object({
  body: z.object({
    refreshToken: z.string({ required_error: "Refresh token is required" }),
  }),
});

const changePassword = z.object({
  body: z.object({
    currentPassword: z.string({ required_error: "Current password is required" }),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  }),
});

export const AuthValidation = { login, refreshToken, changePassword };
