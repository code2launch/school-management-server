import { z } from "zod";

const createClass = z.object({
  body: z.object({
    name: z.string({ required_error: "Class name is required" }),
    numericValue: z.number({ required_error: "Numeric value is required" }).min(1).max(12),
  }),
});

const createSection = z.object({
  body: z.object({
    name: z.string({ required_error: "Section name is required" }),
    classId: z.string({ required_error: "Class ID is required" }),
  }),
});

export const ClassValidation = { createClass, createSection };
