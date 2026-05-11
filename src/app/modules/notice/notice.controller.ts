import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { NoticeService } from "./notice.service";
import pick from "../../shared/pick";
import { PAGINATION_FIELDS } from "../../constants";

const createNotice = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticeService.createNotice(req.body, req.user!.id);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Notice posted.", data: result });
});

const getAllNotices = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, ["audience", "isPublished", "searchTerm"]);
  const pagination = pick(req.query, PAGINATION_FIELDS);
  const result = await NoticeService.getAllNotices(filters as any, pagination as any);
  sendResponse(res, {
    statusCode: httpStatus.OK, success: true, message: "Notices fetched.",
    meta: result.meta, data: result.data,
  });
});

const getNoticeById = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticeService.getNoticeById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Notice fetched.", data: result });
});

const updateNotice = catchAsync(async (req: Request, res: Response) => {
  const result = await NoticeService.updateNotice(req.params.id, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Notice updated.", data: result });
});

const deleteNotice = catchAsync(async (req: Request, res: Response) => {
  await NoticeService.deleteNotice(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Notice deleted.", data: null });
});

const getPublicNotices = catchAsync(async (req: Request, res: Response) => {
  const role = req.user?.role;
  const result = await NoticeService.getPublicNotices(role);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Notices fetched.", data: result });
});

export const NoticeController = {
  createNotice, getAllNotices, getNoticeById, updateNotice, deleteNotice, getPublicNotices,
};
