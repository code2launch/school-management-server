import { z } from "zod";

const createFeeStructure = z.object({
  body: z.object({
    feeType: z.enum(["ADMISSION", "MONTHLY_TUITION", "EXAM", "OTHER"]),
    amount: z.number({ required_error: "Amount required" }).positive(),
    label: z.string({ required_error: "Label required" }),
    academicYearId: z.string({ required_error: "Academic year required" }),
    classId: z.string().optional(),
  }),
});

const recordPayment = z.object({
  body: z.object({
    studentId: z.string({ required_error: "Student ID required" }),
    academicYearId: z.string({ required_error: "Academic year required" }),
    feeType: z.enum(["ADMISSION", "MONTHLY_TUITION", "EXAM", "OTHER"]),
    amount: z.number({ required_error: "Amount required" }).positive(),
    paidAmount: z.number({ required_error: "Paid amount required" }).nonnegative(),
    month: z.number().min(1).max(12).optional(),
    year: z.number().optional(),
    paymentMethod: z.string().optional(),
    paymentDate: z.string().optional(),
    note: z.string().optional(),
  }),
});

export const FeesValidation = { createFeeStructure, recordPayment };
