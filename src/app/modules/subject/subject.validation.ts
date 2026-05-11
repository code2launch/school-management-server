import { z } from "zod";

const createSubject = z.object({
  body: z.object({
    name: z.string({ required_error: "Subject name is required" }),
    code: z.string().optional(),
    classId: z.string({ required_error: "Class ID is required" }),
  }),
});

const assignTeacher = z.object({
  body: z.object({
    teacherId: z.string({ required_error: "Teacher ID is required" }),
    subjectId: z.string({ required_error: "Subject ID is required" }),
    sectionId: z.string().optional(),
  }),
});

const createRoutineSlot = z.object({
  body: z.object({
    sectionId: z.string({ required_error: "Section ID is required" }),
    subjectId: z.string({ required_error: "Subject ID is required" }),
    teacherId: z.string().optional(),
    dayOfWeek: z.enum(["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]),
    periodNumber: z.number().min(1).max(10),
    startTime: z.string({ required_error: "Start time is required" }),
    endTime: z.string({ required_error: "End time is required" }),
  }),
});

export const SubjectValidation = { createSubject, assignTeacher, createRoutineSlot };
