import { betterAuth } from "better-auth";

// This is a standalone config file for the Better Auth CLI
// to generate the database schema

export const auth = betterAuth({
  database: {
    type: "sqlite", // D1 uses SQLite
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  secret: "placeholder-for-schema-generation",
  baseURL: "http://localhost:8787",
});
