import { betterAuth } from "better-auth";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import {
  getUserAlertPreferences,
  updateUserAlertPreferences,
  sendTestNotification,
  getUserNotificationStats,
  updateWatchlist,
} from "./alert-preferences.js";

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
      const url = new URL(request.url);

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
        // Allow cookies to work in local development
        advanced: {
          cookieOptions: {
            sameSite: env.BASE_URL?.includes('localhost') ? 'lax' : 'strict',
            secure: !env.BASE_URL?.includes('localhost'),
          },
        },
      });

      // Handle custom alert preferences endpoints
      if (url.pathname.startsWith('/api/alerts')) {
        return await handleAlertPreferencesRequest(request, env, auth, dynamicCorsHeaders);
      }

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

/**
 * Handle alert preferences API requests
 */
async function handleAlertPreferencesRequest(request, env, auth, corsHeaders) {
  const url = new URL(request.url);

  try {
    // Get user session
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = session.user.id;

    // GET /api/alerts/preferences - Get user preferences
    if (url.pathname === '/api/alerts/preferences' && request.method === 'GET') {
      const prefs = await getUserAlertPreferences(userId, env);
      return new Response(JSON.stringify(prefs), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /api/alerts/preferences - Update preferences
    if (url.pathname === '/api/alerts/preferences' && request.method === 'PUT') {
      const body = await request.json();
      const updated = await updateUserAlertPreferences(userId, body, env);
      return new Response(JSON.stringify(updated), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/alerts/test - Send test notification
    if (url.pathname === '/api/alerts/test' && request.method === 'POST') {
      const result = await sendTestNotification(userId, env);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /api/alerts/stats - Get notification statistics
    if (url.pathname === '/api/alerts/stats' && request.method === 'GET') {
      const stats = await getUserNotificationStats(userId, env);
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/alerts/watchlist - Add/remove from watchlist
    if (url.pathname === '/api/alerts/watchlist' && request.method === 'POST') {
      const body = await request.json();
      const { action, companies } = body;
      
      if (!action || !companies || !Array.isArray(companies)) {
        return new Response(JSON.stringify({ error: 'Invalid request' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await updateWatchlist(userId, action, companies, env);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Not found
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Alert preferences error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
