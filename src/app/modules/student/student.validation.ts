import { z } from "zod";

const createStudent = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }).min(2),
    dob: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    address: z.string().optional(),
    classId: z.string({ required_error: "Class ID is required" }),
    sectionId: z.string({ required_error: "Section ID is required" }),
    academicYearId: z.string({ required_error: "Academic year is required" }),
    rollNumber: z.string().optional(),
    parentName: z.string().optional(),
    parentPhone: z.string().optional(),
    parentRelation: z.string().optional(),
    createParentLogin: z.boolean().optional(),
    createStudentLogin: z.boolean().optional(),
  }),
});

const updateStudent = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    dob: z.string().optional(),
    gender: z.enum(["Male", "Female", "Other"]).optional(),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const promoteStudents = z.object({
  body: z.object({
    studentIds: z.array(z.string()).min(1, "At least one student required"),
    fromSectionId: z.string({ required_error: "From section required" }),
    toClassId: z.string({ required_error: "Target class required" }),
    toSectionId: z.string({ required_error: "Target section required" }),
    toAcademicYearId: z.string({ required_error: "Target academic year required" }),
  }),
});

const transferSection = z.object({
  body: z.object({
    studentId: z.string({ required_error: "Student ID required" }),
    newSectionId: z.string({ required_error: "New section required" }),
    academicYearId: z.string({ required_error: "Academic year required" }),
  }),
});

export const StudentValidation = {
  createStudent,
  updateStudent,
  promoteStudents,
  transferSection,
};
