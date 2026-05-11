import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import { ExamService } from "./exam.service";

const createExam = catchAsync(async (req: Request, res: Response) => {
  const result = await ExamService.createExam(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Exam created.", data: result });
});

const getAllExams = catchAsync(async (req: Request, res: Response) => {
  const { academicYearId, classId } = req.query as Record<string, string>;
  const result = await ExamService.getAllExams(academicYearId, classId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Exams fetched.", data: result });
});

const getExamById = catchAsync(async (req: Request, res: Response) => {
  const result = await ExamService.getExamById(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Exam fetched.", data: result });
});

const addExamSubject = catchAsync(async (req: Request, res: Response) => {
  const result = await ExamService.addExamSubject(req.body);
  sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Subject added to exam.", data: result });
});

const enterMarks = catchAsync(async (req: Request, res: Response) => {
  const result = await ExamService.enterMarks(req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Marks entered.", data: result });
});

const getResultSheet = catchAsync(async (req: Request, res: Response) => {
  const { sectionId } = req.query as Record<string, string>;
  const result = await ExamService.getResultSheet(req.params.examId, sectionId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Result sheet fetched.", data: result });
});

const getStudentReportCard = catchAsync(async (req: Request, res: Response) => {
  const result = await ExamService.getStudentReportCard(req.params.examId, req.params.studentId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Report card fetched.", data: result });
});

const publishExam = catchAsync(async (req: Request, res: Response) => {
  const result = await ExamService.publishExam(req.params.id);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Exam published.", data: result });
});

export const ExamController = {
  createExam, getAllExams, getExamById, addExamSubject,
  enterMarks, getResultSheet, getStudentReportCard, publishExam,
};
