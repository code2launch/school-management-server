import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  node_env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",

  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET as string,
    refresh_secret: process.env.JWT_REFRESH_SECRET as string,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },

  admin: {
    name: process.env.ADMIN_NAME || "School Admin",
    phone: process.env.ADMIN_PHONE || "01700000000",
    password: process.env.ADMIN_PASSWORD || "Admin@1234",
  },

  school: {
    name: process.env.SCHOOL_NAME || "My School",
    address: process.env.SCHOOL_ADDRESS || "Dhaka, Bangladesh",
    phone: process.env.SCHOOL_PHONE || "",
    email: process.env.SCHOOL_EMAIL || "",
  },
};
