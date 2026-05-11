import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { AuthService } from "./auth.service";

const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Login successful.", data: result });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.refreshToken(req.body.refreshToken);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Token refreshed.", data: result });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.getMe(req.user!.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Profile retrieved.", data: result });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.changePassword(req.user!.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Password changed.", data: result });
});

export const AuthController = { login, refreshToken, getMe, changePassword };
