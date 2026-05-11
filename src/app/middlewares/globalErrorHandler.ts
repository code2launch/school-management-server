import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import config from "../config";

const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: number = err.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
  let success = false;
  let message: string = err.message || "Something went wrong!";
  let error: any = err;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        message = "Duplicate key error — unique constraint failed.";
        statusCode = httpStatus.CONFLICT;
        break;
      case "P2025":
        message = "Record to update/delete does not exist.";
        statusCode = httpStatus.NOT_FOUND;
        break;
      case "P2003":
        message = "Foreign key constraint failed.";
        statusCode = httpStatus.BAD_REQUEST;
        break;
      case "P2001":
      case "P2015":
      case "P2018":
        message = "Record not found.";
        statusCode = httpStatus.NOT_FOUND;
        break;
      default:
        message = `Database error (code: ${err.code}).`;
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    }
    error = err.meta || err.message;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    message = "Validation error in Prisma operation.";
    error = err.message;
    statusCode = httpStatus.BAD_REQUEST;
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    message = "Failed to initialize Prisma client — check your DB connection.";
    error = err.message;
    statusCode = httpStatus.BAD_GATEWAY;
  } else if (err instanceof Error) {
    message = err.message || "An unexpected error occurred.";
    error = err.stack;
  }

  res.status(statusCode).json({
    success,
    message,
    error,
    stack: config.node_env === "development" ? err.stack : undefined,
  });
};

export default globalErrorHandler;
