import httpStatus from "http-status";
import { ExamType } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { getGrade } from "../../constants";

// ── Exam Management ───────────────────────────────────────────

const createExam = async (payload: {
  name: string;
  examType: ExamType;
  academicYearId: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return prisma.exam.create({
    data: {
      ...payload,
      startDate: payload.startDate ? new Date(payload.startDate) : undefined,
      endDate: payload.endDate ? new Date(payload.endDate) : undefined,
    },
  });
};

const getAllExams = async (academicYearId: string, classId?: string) => {
  return prisma.exam.findMany({
    where: {
      academicYearId,
      ...(classId ? { OR: [{ classId }, { classId: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { subjects: true, results: true } },
    },
  });
};

const getExamById = async (id: string) => {
  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      subjects: { include: { subject: true } },
      _count: { select: { results: true } },
    },
  });
  if (!exam) throw new ApiError(httpStatus.NOT_FOUND, "Exam not found.");
  return exam;
};

const addExamSubject = async (payload: {
  examId: string;
  subjectId: string;
  totalMarks?: number;
  passMarks?: number;
  examDate?: string;
}) => {
  const exam = await prisma.exam.findUnique({ where: { id: payload.examId } });
  if (!exam) throw new ApiError(httpStatus.NOT_FOUND, "Exam not found.");

  return prisma.examSubject.upsert({
    where: { examId_subjectId: { examId: payload.examId, subjectId: payload.subjectId } },
    create: {
      examId: payload.examId,
      subjectId: payload.subjectId,
      totalMarks: payload.totalMarks ?? 100,
      passMarks: payload.passMarks ?? 33,
      examDate: payload.examDate ? new Date(payload.examDate) : undefined,
    },
    update: {
      totalMarks: payload.totalMarks,
      passMarks: payload.passMarks,
      examDate: payload.examDate ? new Date(payload.examDate) : undefined,
    },
  });
};

// ── Marks Entry ───────────────────────────────────────────────

const enterMarks = async (payload: {
  examId: string;
  sectionId: string;
  subjectId: string;
  results: Array<{ studentId: string; marksObtained: number }>;
}) => {
  // Get the exam subject config for total/pass marks
  const examSubject = await prisma.examSubject.findUnique({
    where: { examId_subjectId: { examId: payload.examId, subjectId: payload.subjectId } },
  });
  if (!examSubject)
    throw new ApiError(httpStatus.NOT_FOUND, "Subject not configured for this exam. Add it first.");

  // Upsert all results in a single transaction
  return prisma.$transaction(
    payload.results.map((r) => {
      const { grade, point, isPassed } = getGrade(r.marksObtained, examSubject.totalMarks);

      return prisma.examResult.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: payload.examId,
            studentId: r.studentId,
            subjectId: payload.subjectId,
          },
        },
        create: {
          examId: payload.examId,
          studentId: r.studentId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
          marksObtained: r.marksObtained,
          totalMarks: examSubject.totalMarks,
          grade,
          gradePoint: point,
          isPassed,
        },
        update: {
          marksObtained: r.marksObtained,
          totalMarks: examSubject.totalMarks,
          grade,
          gradePoint: point,
          isPassed,
        },
      });
    })
  );
};

// ── Result Sheet ──────────────────────────────────────────────

const getResultSheet = async (examId: string, sectionId: string) => {
  const [exam, enrollments] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: examId },
      include: { subjects: { include: { subject: true } } },
    }),
    prisma.enrollment.findMany({
      where: { sectionId, isActive: true },
      include: { student: { select: { id: true, name: true, studentId: true } } },
      orderBy: { rollNumber: "asc" },
    }),
  ]);
  if (!exam) throw new ApiError(httpStatus.NOT_FOUND, "Exam not found.");

  const results = await prisma.examResult.findMany({
    where: { examId, sectionId },
  });

  // Group results by studentId → subjectId
  const resultMap = new Map<string, Map<string, typeof results[0]>>();
  for (const r of results) {
    if (!resultMap.has(r.studentId)) resultMap.set(r.studentId, new Map());
    resultMap.get(r.studentId)!.set(r.subjectId, r);
  }

  const sheet = enrollments.map((e) => {
    const studentResults = resultMap.get(e.studentId) ?? new Map();
    const subjectBreakdown = exam.subjects.map((es) => {
      const r = studentResults.get(es.subjectId);
      return {
        subject: es.subject.name,
        subjectId: es.subjectId,
        totalMarks: es.totalMarks,
        marksObtained: r?.marksObtained ?? null,
        grade: r?.grade ?? null,
        gradePoint: r?.gradePoint ?? null,
        isPassed: r?.isPassed ?? null,
      };
    });

    const attempted = subjectBreakdown.filter((s) => s.marksObtained !== null);
    const totalObtained = attempted.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
    const totalMax = attempted.reduce((s, r) => s + r.totalMarks, 0);
    const avgGpa =
      attempted.length > 0
        ? attempted.reduce((s, r) => s + (r.gradePoint ?? 0), 0) / attempted.length
        : null;
    const overallGrade = avgGpa !== null ? getGrade(avgGpa * 20, 100) : null;
    const isPassedAll = attempted.length > 0 && attempted.every((r) => r.isPassed);

    return {
      student: e.student,
      rollNumber: e.rollNumber,
      subjects: subjectBreakdown,
      totalObtained,
      totalMax,
      percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : null,
      gpa: avgGpa !== null ? Math.round(avgGpa * 100) / 100 : null,
      overallGrade: overallGrade?.grade ?? null,
      isPassed: isPassedAll,
    };
  });

  // Rank students
  const ranked = sheet
    .filter((s) => s.totalMax > 0)
    .sort((a, b) => b.totalObtained - a.totalObtained)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return { exam, sectionId, students: ranked };
};

// ── Report Card (single student) ─────────────────────────────

const getStudentReportCard = async (examId: string, studentId: string) => {
  const [exam, student, results] = await Promise.all([
    prisma.exam.findUnique({
      where: { id: examId },
      include: {
        subjects: { include: { subject: true } },
        academicYear: true,
      },
    }),
    prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: { isActive: true },
          include: { section: { include: { class: true } } },
          take: 1,
        },
        parents: {
          where: { isPrimary: true },
          include: { parent: { select: { name: true, phone: true } } },
        },
      },
    }),
    prisma.examResult.findMany({
      where: { examId, studentId },
      include: { subject: true } as any,
    }),
  ]);

  if (!exam) throw new ApiError(httpStatus.NOT_FOUND, "Exam not found.");
  if (!student) throw new ApiError(httpStatus.NOT_FOUND, "Student not found.");

  const school = await prisma.schoolProfile.findFirst();

  const subjectResults = exam.subjects.map((es) => {
    const r = results.find((r) => r.subjectId === es.subjectId);
    return {
      subject: es.subject.name,
      totalMarks: es.totalMarks,
      passMarks: es.passMarks,
      marksObtained: r?.marksObtained ?? null,
      grade: r?.grade ?? null,
      gradePoint: r?.gradePoint ?? null,
      isPassed: r?.isPassed ?? null,
    };
  });

  const attempted = subjectResults.filter((s) => s.marksObtained !== null);
  const totalObtained = attempted.reduce((s, r) => s + (r.marksObtained ?? 0), 0);
  const totalMax = attempted.reduce((s, r) => s + r.totalMarks, 0);
  const avgGpa = attempted.length > 0
    ? attempted.reduce((s, r) => s + (r.gradePoint ?? 0), 0) / attempted.length : 0;
  const overallGrade = getGrade(avgGpa * 20, 100);

  return {
    school,
    student: {
      ...student,
      class: student.enrollments[0]?.section?.class?.name,
      section: student.enrollments[0]?.section?.name,
    },
    exam: { name: exam.name, type: exam.examType, year: (exam as any).academicYear?.year },
    subjects: subjectResults,
    summary: {
      totalObtained,
      totalMax,
      percentage: totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0,
      gpa: Math.round(avgGpa * 100) / 100,
      overallGrade: overallGrade.grade,
      isPassed: attempted.length > 0 && attempted.every((r) => r.isPassed),
    },
  };
};

const publishExam = async (id: string) => {
  const exam = await prisma.exam.findUnique({ where: { id } });
  if (!exam) throw new ApiError(httpStatus.NOT_FOUND, "Exam not found.");
  return prisma.exam.update({ where: { id }, data: { isPublished: true } });
};

export const ExamService = {
  createExam,
  getAllExams,
  getExamById,
  addExamSubject,
  enterMarks,
  getResultSheet,
  getStudentReportCard,
  publishExam,
};
