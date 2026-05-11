import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import jwt from "jsonwebtoken";
import config from "../config";
import ApiError from "../errors/ApiError";
import { JwtPayload } from "../types";
import { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const auth = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!"));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.access_secret) as JwtPayload;
      req.user = decoded;

      if (roles.length && !roles.includes(decoded.role)) {
        return next(new ApiError(httpStatus.FORBIDDEN, "Forbidden: insufficient role!"));
      }

      next();
    } catch {
      return next(new ApiError(httpStatus.UNAUTHORIZED, "Invalid or expired token!"));
    }
  };
};

export default auth;
