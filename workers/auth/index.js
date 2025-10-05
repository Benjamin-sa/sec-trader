import { betterAuth } from "better-auth";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://sec-frontend.benjamin-sautersb.workers.dev",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env, ctx) {
    // Get origin from request for dynamic CORS
    const origin = request.headers.get("Origin");
    const allowedOrigins = [
      "http://localhost:3000",
      "https://sec-frontend.benjamin-sautersb.workers.dev",
    ];

    // Determine if origin is allowed
    const isAllowedOrigin = allowedOrigins.some(
      (allowed) =>
        origin === allowed ||
        (allowed.includes("*") && origin?.includes(".pages.dev"))
    );

    // Set dynamic CORS headers
    const dynamicCorsHeaders = {
      ...corsHeaders,
      "Access-Control-Allow-Origin": isAllowedOrigin
        ? origin
        : corsHeaders["Access-Control-Allow-Origin"],
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: dynamicCorsHeaders });
    }

    try {
      // Create Kysely instance with D1Dialect
      const db = new Kysely({
        dialect: new D1Dialect({
          database: env.DB,
        }),
      });

      // Create Better Auth instance - pass Kysely directly
      const auth = betterAuth({
        database: db,
        emailAndPassword: {
          enabled: true,
          requireEmailVerification: false,
        },
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BASE_URL || "http://localhost:8787",
        trustedOrigins: [
          "http://localhost:3000",
          "https://*.pages.dev",
          "https://sec-frontend.benjamin-sautersb.workers.dev",
        ],
      });

      // Handle auth request
      const response = await auth.handler(request);

      // Add CORS headers
      const headers = new Headers(response.headers);
      Object.entries(dynamicCorsHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers,
      });
    } catch (error) {
      console.error("Auth error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      return new Response(
        JSON.stringify({
          error: error.message,
          details: error.stack,
        }),
        {
          status: 500,
          headers: {
            ...dynamicCorsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  },
};
