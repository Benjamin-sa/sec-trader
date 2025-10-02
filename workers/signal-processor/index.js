/**
 * Signal Processor Worker
 *
 * Runs on a schedule to pre-compute expensive signals:
 * - Cluster buy detection
 * - Important trade scoring
 * - First buy identification
 * - Historical metrics aggregation
 *
 * This worker does the heavy lifting so the API can be lightning fast
 */

import { processClusterBuys } from "./src/processors/cluster-buys.js";
import { processImportantTrades } from "./src/processors/important-trades.js";
import { processFirstBuys } from "./src/processors/first-buys.js";
import { processHistoricalMetrics } from "./src/processors/historical-metrics.js";
import { Logger } from "./src/utils/logger.js";

export default {
  /**
   * Scheduled trigger - runs every 30 minutes
   */
  async scheduled(event, env, ctx) {
    const logger = new Logger("scheduled", env);
    const startTime = Date.now();

    try {
      logger.info("🚀 Signal processor started", {
        cron: event.cron,
        scheduledTime: new Date(event.scheduledTime).toISOString(),
      });

      // Process signals in sequence
      const results = {};

      // 1. Cluster buy detection (primary focus)
      logger.info("📊 Processing cluster buys...");
      results.clusterBuys = await processClusterBuys(env, logger);

      // 2. Important trade scoring
      logger.info("🎯 Processing important trades...");
      results.importantTrades = await processImportantTrades(env, logger);

      // 3. First buy detection
      logger.info("🆕 Processing first buys...");
      results.firstBuys = await processFirstBuys(env, logger);

      // 4. Historical metrics aggregation
      logger.info("📈 Processing historical metrics...");
      results.historicalMetrics = await processHistoricalMetrics(env, logger);

      const duration = Date.now() - startTime;
      logger.info("✅ Signal processor completed", {
        duration: `${duration}ms`,
        results,
      });

      return results;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error("❌ Signal processor failed", {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
      });

      // Don't throw - we want the worker to continue running
      return {
        error: error.message,
        duration,
      };
    }
  },

  /**
   * HTTP endpoint for manual triggers (development/debugging)
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    const logger = new Logger("fetch", env);

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "ok",
          worker: "signal-processor",
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Manual trigger endpoint
    if (url.pathname === "/process" && request.method === "POST") {
      const startTime = Date.now();

      try {
        const body = await request.json();
        const processor = body.processor || "all";

        logger.info("🔧 Manual processing triggered", { processor });

        const results = {};

        if (processor === "all" || processor === "cluster-buys") {
          results.clusterBuys = await processClusterBuys(env, logger);
        }

        if (processor === "all" || processor === "important-trades") {
          results.importantTrades = await processImportantTrades(env, logger);
        }

        if (processor === "all" || processor === "first-buys") {
          results.firstBuys = await processFirstBuys(env, logger);
        }

        if (processor === "all" || processor === "historical-metrics") {
          results.historicalMetrics = await processHistoricalMetrics(
            env,
            logger
          );
        }

        const duration = Date.now() - startTime;

        return new Response(
          JSON.stringify({
            success: true,
            duration: `${duration}ms`,
            results,
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        logger.error("❌ Manual processing failed", {
          error: error.message,
          stack: error.stack,
        });

        return new Response(
          JSON.stringify({
            success: false,
            error: error.message,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Invalid endpoint
    return new Response(
      "Signal Processor Worker\n\nEndpoints:\n- GET /health\n- POST /process",
      {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }
    );
  },
};
