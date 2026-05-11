import { z } from "zod";

const createExam = z.object({
  body: z.object({
    name: z.string({ required_error: "Exam name required" }),
    examType: z.enum(["CLASS_TEST", "MID_TERM", "FINAL", "OTHER"]),
    academicYearId: z.string({ required_error: "Academic year required" }),
    classId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

const addExamSubject = z.object({
  body: z.object({
    examId: z.string({ required_error: "Exam ID required" }),
    subjectId: z.string({ required_error: "Subject ID required" }),
    totalMarks: z.number().positive().default(100),
    passMarks: z.number().positive().default(33),
    examDate: z.string().optional(),
  }),
});

const enterMarks = z.object({
  body: z.object({
    examId: z.string({ required_error: "Exam ID required" }),
    sectionId: z.string({ required_error: "Section ID required" }),
    subjectId: z.string({ required_error: "Subject ID required" }),
    results: z.array(
      z.object({
        studentId: z.string(),
        marksObtained: z.number().nonnegative(),
      })
    ).min(1),
  }),
});

export const ExamValidation = { createExam, addExamSubject, enterMarks };
