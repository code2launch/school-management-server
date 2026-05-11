export const PAGINATION_FIELDS = ["page", "limit", "sortBy", "sortOrder"];

export const USER_ROLES = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
  PARENT: "PARENT",
  SUPPORT_STAFF: "SUPPORT_STAFF",
} as const;

export const GRADE_SCALE = [
  { min: 80, max: 100, grade: "A+", point: 5.0 },
  { min: 70, max: 79,  grade: "A",  point: 4.0 },
  { min: 60, max: 69,  grade: "A-", point: 3.5 },
  { min: 50, max: 59,  grade: "B",  point: 3.0 },
  { min: 40, max: 49,  grade: "C",  point: 2.0 },
  { min: 33, max: 39,  grade: "D",  point: 1.0 },
  { min: 0,  max: 32,  grade: "F",  point: 0.0 },
] as const;

export const getGrade = (
  marks: number,
  total: number
): { grade: string; point: number; isPassed: boolean } => {
  const percentage = (marks / total) * 100;
  for (const g of GRADE_SCALE) {
    if (percentage >= g.min && percentage <= g.max) {
      return { grade: g.grade, point: g.point, isPassed: g.grade !== "F" };
    }
  }
  return { grade: "F", point: 0.0, isPassed: false };
};

export const generateStudentId = (year: number, seq: number): string =>
  `STD-${year}-${String(seq).padStart(4, "0")}`;

export const generateTeacherId = (year: number, seq: number): string =>
  `TCH-${year}-${String(seq).padStart(3, "0")}`;

export const generateReceiptNumber = (year: number, seq: number): string =>
  `RCP-${year}-${String(seq).padStart(5, "0")}`;
