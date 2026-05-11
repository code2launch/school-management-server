import { z } from "zod";

const createNotice = z.object({
  body: z.object({
    title: z.string({ required_error: "Title is required" }).min(3),
    content: z.string({ required_error: "Content is required" }).min(5),
    audience: z.enum(["ALL", "STUDENTS", "PARENTS", "TEACHERS", "STAFF"]).default("ALL"),
    isPublished: z.boolean().optional(),
  }),
});

const updateNotice = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    content: z.string().min(5).optional(),
    audience: z.enum(["ALL", "STUDENTS", "PARENTS", "TEACHERS", "STAFF"]).optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const NoticeValidation = { createNotice, updateNotice };
