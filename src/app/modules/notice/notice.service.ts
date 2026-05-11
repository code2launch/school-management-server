import httpStatus from "http-status";
import { NoticeAudience } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { paginationHelpers } from "../../helper/paginationHelper";

const createNotice = async (
  payload: {
    title: string;
    content: string;
    audience?: NoticeAudience;
    isPublished?: boolean;
  },
  publishedBy: string
) => {
  return prisma.notice.create({
    data: {
      title: payload.title,
      content: payload.content,
      audience: payload.audience ?? "ALL",
      isPublished: payload.isPublished ?? true,
      publishedBy,
    },
  });
};

const getAllNotices = async (
  filters: { audience?: string; isPublished?: string; searchTerm?: string },
  pagination: { page?: number; limit?: number }
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(pagination);

  const where: any = { isDeleted: false };

  if (filters.isPublished !== undefined) {
    where.isPublished = filters.isPublished === "true";
  }

  if (filters.audience) {
    where.audience = { in: [filters.audience, "ALL"] };
  }

  if (filters.searchTerm) {
    where.OR = [
      { title: { contains: filters.searchTerm, mode: "insensitive" } },
      { content: { contains: filters.searchTerm, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.notice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notice.count({ where }),
  ]);

  return { meta: { page, limit, total }, data };
};

const getNoticeById = async (id: string) => {
  const notice = await prisma.notice.findFirst({ where: { id, isDeleted: false } });
  if (!notice) throw new ApiError(httpStatus.NOT_FOUND, "Notice not found.");
  return notice;
};

const updateNotice = async (
  id: string,
  payload: { title?: string; content?: string; audience?: NoticeAudience; isPublished?: boolean }
) => {
  const notice = await prisma.notice.findFirst({ where: { id, isDeleted: false } });
  if (!notice) throw new ApiError(httpStatus.NOT_FOUND, "Notice not found.");
  return prisma.notice.update({ where: { id }, data: payload });
};

const deleteNotice = async (id: string) => {
  const notice = await prisma.notice.findFirst({ where: { id, isDeleted: false } });
  if (!notice) throw new ApiError(httpStatus.NOT_FOUND, "Notice not found.");
  return prisma.notice.update({ where: { id }, data: { isDeleted: true } });
};

const getPublicNotices = async (role?: string) => {
  const audienceFilter: any = { isPublished: true, isDeleted: false };

  if (role === "STUDENT") {
    audienceFilter.audience = { in: ["ALL", "STUDENTS"] };
  } else if (role === "PARENT") {
    audienceFilter.audience = { in: ["ALL", "PARENTS"] };
  } else if (role === "TEACHER") {
    audienceFilter.audience = { in: ["ALL", "TEACHERS"] };
  }

  return prisma.notice.findMany({
    where: audienceFilter,
    orderBy: { createdAt: "desc" },
    take: 20,
  });
};

export const NoticeService = {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  getPublicNotices,
};
