import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import httpStatus from "http-status";

const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Validation Error",
          error: err.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
};

export default validateRequest;
