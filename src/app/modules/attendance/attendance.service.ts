import httpStatus from "http-status";
import { AttendanceStatus } from "@prisma/client";
import { prisma } from "../../shared/prisma";
import ApiError from "../../errors/ApiError";

// ── Student Attendance ────────────────────────────────────────

const markStudentAttendance = async (payload: {
  sectionId: string;
  academicYearId: string;
  date: string;
  takenByTeacherId?: string;
  records: Array<{ studentId: string; status: AttendanceStatus; note?: string }>;
}) => {
  const attendanceDate = new Date(payload.date);

  // Validate section
  const section = await prisma.section.findFirst({
    where: { id: payload.sectionId, isDeleted: false },
  });
  if (!section) throw new ApiError(httpStatus.NOT_FOUND, "Section not found.");

  // Upsert all records in one transaction for performance
  return prisma.$transaction(
    payload.records.map((record) =>
      prisma.studentAttendance.upsert({
        where: {
          studentId_date: { studentId: record.studentId, date: attendanceDate },
        },
        create: {
          studentId: record.studentId,
          sectionId: payload.sectionId,
          academicYearId: payload.academicYearId,
          date: attendanceDate,
          status: record.status,
          takenByTeacherId: payload.takenByTeacherId,
          note: record.note,
        },
        update: {
          status: record.status,
          note: record.note,
          takenByTeacherId: payload.takenByTeacherId,
        },
      })
    )
  );
};

const getAttendanceByDate = async (sectionId: string, date: string, academicYearId: string) => {
  const attendanceDate = new Date(date);

  // Get all enrolled students for this section
  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, academicYearId, isActive: true },
    include: { student: { select: { id: true, name: true, studentId: true } } },
    orderBy: { rollNumber: "asc" },
  });

  // Get existing attendance for the date
  const attendanceMap = new Map(
    (
      await prisma.studentAttendance.findMany({
        where: { sectionId, date: attendanceDate, academicYearId },
      })
    ).map((a) => [a.studentId, a])
  );

  return enrollments.map((e) => ({
    student: e.student,
    rollNumber: e.rollNumber,
    attendance: attendanceMap.get(e.studentId) ?? null,
  }));
};

const getMonthlyAttendance = async (
  sectionId: string,
  academicYearId: string,
  month: number,
  year: number
) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  // Get all enrolled students
  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, academicYearId, isActive: true },
    include: { student: { select: { id: true, name: true, studentId: true } } },
    orderBy: { rollNumber: "asc" },
  });

  // Fetch all attendance for the month in one query
  const attendances = await prisma.studentAttendance.findMany({
    where: {
      sectionId,
      academicYearId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  // Group attendance by student
  const byStudent = new Map<string, typeof attendances>();
  for (const a of attendances) {
    if (!byStudent.has(a.studentId)) byStudent.set(a.studentId, []);
    byStudent.get(a.studentId)!.push(a);
  }

  // Get unique dates present in the data
  const datesSet = new Set(attendances.map((a) => a.date.toISOString().split("T")[0]));
  const dates = Array.from(datesSet).sort();

  // Build summary per student
  const summary = enrollments.map((e) => {
    const records = byStudent.get(e.studentId) ?? [];
    const counts = records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalDays = dates.length;
    const present = counts["PRESENT"] ?? 0;
    const attendancePercent = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;

    return {
      student: e.student,
      rollNumber: e.rollNumber,
      present: counts["PRESENT"] ?? 0,
      absent: counts["ABSENT"] ?? 0,
      late: counts["LATE"] ?? 0,
      leave: counts["LEAVE"] ?? 0,
      totalDays,
      attendancePercent,
      records: records.map((r) => ({
        date: r.date.toISOString().split("T")[0],
        status: r.status,
      })),
    };
  });

  return { month, year, sectionId, dates, summary };
};

const getStudentAttendanceSummary = async (
  studentId: string,
  academicYearId: string,
  month?: number,
  year?: number
) => {
  const where: any = { studentId, academicYearId };

  if (month && year) {
    where.date = {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0),
    };
  }

  const records = await prisma.studentAttendance.findMany({
    where,
    orderBy: { date: "asc" },
  });

  const counts = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const total = records.length;
  const present = counts["PRESENT"] ?? 0;
  return {
    total,
    present,
    absent: counts["ABSENT"] ?? 0,
    late: counts["LATE"] ?? 0,
    leave: counts["LEAVE"] ?? 0,
    attendancePercent: total > 0 ? Math.round((present / total) * 100) : 0,
    records,
  };
};

// ── Teacher Attendance ────────────────────────────────────────

const markTeacherAttendance = async (payload: {
  teacherId: string;
  academicYearId: string;
  date: string;
  status: AttendanceStatus;
  note?: string;
}) => {
  const teacher = await prisma.teacher.findFirst({
    where: { id: payload.teacherId, isDeleted: false },
  });
  if (!teacher) throw new ApiError(httpStatus.NOT_FOUND, "Teacher not found.");

  const attendanceDate = new Date(payload.date);

  return prisma.teacherAttendance.upsert({
    where: { teacherId_date: { teacherId: payload.teacherId, date: attendanceDate } },
    create: {
      teacherId: payload.teacherId,
      academicYearId: payload.academicYearId,
      date: attendanceDate,
      status: payload.status,
      note: payload.note,
    },
    update: { status: payload.status, note: payload.note },
  });
};

const getTeacherAttendanceByMonth = async (
  teacherId: string,
  academicYearId: string,
  month: number,
  year: number
) => {
  const records = await prisma.teacherAttendance.findMany({
    where: {
      teacherId,
      academicYearId,
      date: {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0),
      },
    },
    orderBy: { date: "asc" },
  });

  const counts = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    month, year, teacherId,
    present: counts["PRESENT"] ?? 0,
    absent: counts["ABSENT"] ?? 0,
    late: counts["LATE"] ?? 0,
    leave: counts["LEAVE"] ?? 0,
    records,
  };
};

const getTodayAttendanceSummary = async (sectionId: string, academicYearId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, records] = await Promise.all([
    prisma.enrollment.count({ where: { sectionId, academicYearId, isActive: true } }),
    prisma.studentAttendance.findMany({
      where: { sectionId, date: today, academicYearId },
    }),
  ]);

  const counts = records.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    date: today.toISOString().split("T")[0],
    totalEnrolled: total,
    present: counts["PRESENT"] ?? 0,
    absent: counts["ABSENT"] ?? 0,
    late: counts["LATE"] ?? 0,
    leave: counts["LEAVE"] ?? 0,
    notMarked: total - records.length,
  };
};

export const AttendanceService = {
  markStudentAttendance,
  getAttendanceByDate,
  getMonthlyAttendance,
  getStudentAttendanceSummary,
  markTeacherAttendance,
  getTeacherAttendanceByMonth,
  getTodayAttendanceSummary,
};
