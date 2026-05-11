import { z } from "zod";

const updateProfile = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
  }),
});

const createAcademicYear = z.object({
  body: z.object({
    year: z.string({ required_error: "Year is required" }),
    startDate: z.string({ required_error: "Start date is required" }),
    endDate: z.string({ required_error: "End date is required" }),
    isCurrent: z.boolean().optional(),
  }),
});

export const SchoolValidation = { updateProfile, createAcademicYear };
