import { z } from "zod";

const markStudentAttendance = z.object({
  body: z.object({
    sectionId: z.string({ required_error: "Section ID required" }),
    academicYearId: z.string({ required_error: "Academic year required" }),
    date: z.string({ required_error: "Date required" }),
    records: z.array(
      z.object({
        studentId: z.string(),
        status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
        note: z.string().optional(),
      })
    ).min(1, "At least one attendance record required"),
  }),
});

const markTeacherAttendance = z.object({
  body: z.object({
    teacherId: z.string({ required_error: "Teacher ID required" }),
    academicYearId: z.string({ required_error: "Academic year required" }),
    date: z.string({ required_error: "Date required" }),
    status: z.enum(["PRESENT", "ABSENT", "LATE", "LEAVE"]),
    note: z.string().optional(),
  }),
});

const monthlyQuery = z.object({
  query: z.object({
    sectionId: z.string({ required_error: "Section ID required" }),
    academicYearId: z.string({ required_error: "Academic year required" }),
    month: z.string({ required_error: "Month required" }),  // 1-12
    year: z.string({ required_error: "Year required" }),
  }),
});

export const AttendanceValidation = {
  markStudentAttendance,
  markTeacherAttendance,
  monthlyQuery,
};
