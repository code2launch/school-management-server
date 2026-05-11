import { z } from "zod";

const createTeacher = z.object({
  body: z.object({
    name: z.string({ required_error: "Name is required" }),
    phone: z.string({ required_error: "Phone is required" }),
    email: z.string().email().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    joinDate: z.string().optional(),
    password: z.string().min(6).optional(),
  }),
});

const updateTeacher = z.object({
  body: z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const TeacherValidation = { createTeacher, updateTeacher };
