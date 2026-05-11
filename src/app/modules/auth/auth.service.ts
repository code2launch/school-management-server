import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import httpStatus from "http-status";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import config from "../../config";
import { JwtPayload } from "../../types";

const login = async (payload: { phone: string; password: string }) => {
  const user = await prisma.user.findUnique({ where: { phone: payload.phone } });
  if (!user || user.isDeleted)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  if (!user.isActive)
    throw new ApiError(httpStatus.FORBIDDEN, "Your account is deactivated.");

  const isMatch = await bcrypt.compare(payload.password, user.password);
  if (!isMatch)
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect password.");

  const jwtPayload: JwtPayload = { id: user.id, phone: user.phone, role: user.role };

  const accessToken = jwt.sign(jwtPayload, config.jwt.access_secret, {
    expiresIn: config.jwt.access_expires_in as any,
  });
  const refreshToken = jwt.sign(jwtPayload, config.jwt.refresh_secret, {
    expiresIn: config.jwt.refresh_expires_in as any,
  });

  // Fetch role-specific profile
  let profile = null;
  if (user.role === "TEACHER") {
    profile = await prisma.teacher.findUnique({ where: { userId: user.id } });
  } else if (user.role === "STUDENT") {
    profile = await prisma.student.findUnique({
      where: { userId: user.id },
      include: {
        enrollments: {
          where: { isActive: true },
          include: { section: { include: { class: true } }, academicYear: true },
          take: 1,
        },
      },
    });
  } else if (user.role === "PARENT") {
    profile = await prisma.parent.findUnique({
      where: { userId: user.id },
      include: {
        children: {
          include: {
            student: {
              select: { id: true, name: true, studentId: true },
            },
          },
        },
      },
    });
  }

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, phone: user.phone, role: user.role },
    profile,
  };
};

const refreshToken = async (token: string) => {
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(token, config.jwt.refresh_secret) as JwtPayload;
  } catch {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired refresh token.");
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user || !user.isActive || user.isDeleted)
    throw new ApiError(httpStatus.FORBIDDEN, "User is not active.");

  const jwtPayload: JwtPayload = { id: user.id, phone: user.phone, role: user.role };
  const accessToken = jwt.sign(jwtPayload, config.jwt.access_secret, {
    expiresIn: config.jwt.access_expires_in as any,
  });

  return { accessToken };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, role: true, createdAt: true },
  });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");
  return user;
};

const changePassword = async (
  userId: string,
  payload: { currentPassword: string; newPassword: string }
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found.");

  const isMatch = await bcrypt.compare(payload.currentPassword, user.password);
  if (!isMatch)
    throw new ApiError(httpStatus.UNAUTHORIZED, "Current password is incorrect.");

  const hashed = await bcrypt.hash(payload.newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return { message: "Password changed successfully." };
};

export const AuthService = { login, refreshToken, getMe, changePassword };
