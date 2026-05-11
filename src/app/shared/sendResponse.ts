import { Response } from "express";

type IApiResponse<T> = {
  statusCode: number;
  success: boolean;
  message: string;
  meta?: { page: number; limit: number; total: number };
  data: T | null;
};

const sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    meta: data.meta,
    data: data.data,
  });
};

export default sendResponse;
