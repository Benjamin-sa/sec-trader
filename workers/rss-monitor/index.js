import { XMLParser } from "fast-xml-parser";

/**
 * RSS Monitor Worker - Constantly monitors SEC RSS feed for Form 4 filings
 * Runs on CRON schedule and dispatches tasks to queue when new filings are found
 */

export default {
  async scheduled(event, env, ctx) {
    console.log("RSS Monitor triggered at:", new Date().toISOString());

    try {
      // Fetch the SEC RSS feed
      console.log("Fetching SEC RSS feed from:", env.SEC_RSS_URL);

      const rssResponse = await fetch(env.SEC_RSS_URL, {
        headers: {
          "User-Agent": "SEC Filing Analyzer Bot (contact@example.com)",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });

      console.log("RSS Response status:", rssResponse.status);
      console.log(
        "RSS Response headers:",
        Object.fromEntries(rssResponse.headers)
      );

      if (!rssResponse.ok) {
        throw new Error(
          `RSS fetch failed: ${rssResponse.status} ${rssResponse.statusText}`
        );
      }

      const rssText = await rssResponse.text();
      console.log("RSS Response length:", rssText.length);
      console.log(
        "RSS Response preview (first 500 chars):",
        rssText.substring(0, 500)
      );
      console.log(
        "RSS Response preview (last 500 chars):",
        rssText.substring(rssText.length - 500)
      );

      // Parse RSS feed
      const filings = await parseRSSFeed(rssText);

      // Filter for Form 4 filings only (filing_type === "4")
      const form4Filings = filings.filter(
        (filing) => filing.filing_type === "4"
      );

      console.log(
        `Found ${form4Filings.length} Form 4 filings out of ${filings.length} total filings`
      );

      // Check for new filings and add to queue
      for (const filing of form4Filings) {
        // Extract proper accession number from entry_id
        const accessionNumber = extractAccessionNumber(
          filing.entry_id,
          filing.filing_url
        );

        const isNew = await isNewFiling(accessionNumber, env.DB);

        if (isNew) {
          // Add to processing queue - let the form4-processor handle all database storage
          await env.filing_processing_queue.send({
            filing_url: filing.filing_url,
            filing_type: filing.filing_type,
            entry_id: filing.entry_id, // Keep for compatibility
            accession_number: accessionNumber, // Add proper accession number
            published_date: filing.published_date,
            title: filing.title,
            summary: filing.summary,
          });

          console.log(`Queued new filing: ${accessionNumber}`);
        }
      }
    } catch (error) {
      console.error("Error in RSS monitoring:", error);
      throw error;
    }
  },

  async fetch(request, env, ctx) {
    // Health check endpoint
    if (new URL(request.url).pathname === "/health") {
      return new Response("RSS Monitor is running", { status: 200 });
    }

    return new Response("RSS Monitor Worker", { status: 200 });
  },
};

/**
 * Parse SEC RSS feed and extract filing information using a proper XML parser
 */
async function parseRSSFeed(rssText) {
  const filings = [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  try {
    const feed = parser.parse(rssText);

    // Ensure feed and entries exist
    if (!feed || !feed.feed || !feed.feed.entry) {
      console.warn("RSS feed is empty or has an unexpected structure");
      return filings;
    }

    // Handle both single and multiple entries
    const entries = Array.isArray(feed.feed.entry)
      ? feed.feed.entry
      : [feed.feed.entry];

    for (const entry of entries) {
      if (entry && entry.id && entry.title && entry.link && entry.updated) {
        const filingType =
          entry.category && entry.category["@_term"]
            ? entry.category["@_term"]
            : "unknown";
        const summary =
          typeof entry.summary === "object"
            ? entry.summary["#text"]
            : entry.summary;

        filings.push({
          entry_id: entry.id,
          filing_url: entry.link["@_href"],
          filing_type: filingType,
          published_date: entry.updated,
          title: entry.title,
          summary: summary || "",
        });
      }
    }
  } catch (error) {
    console.error("Failed to parse RSS feed:", error);
    throw new Error("XML parsing failed");
  }

  return filings;
}

/**
 * Check if filing is new (not already processed or queued)
 * Uses a simple tracking table to avoid duplicate processing
 */
async function isNewFiling(accessionNumber, db) {
  // Check if we've already seen this filing
  const result = await db
    .prepare("SELECT id FROM processed_filings WHERE accession_number = ?")
    .bind(accessionNumber)
    .first();

  if (!result) {
    // Mark this filing as seen (queued for processing)
    await db
      .prepare(
        "INSERT INTO processed_filings (accession_number, queued_at, status) VALUES (?, CURRENT_TIMESTAMP, 'queued')"
      )
      .bind(accessionNumber)
      .run();

    return true;
  }

  return false;
}

/**
 * Extract accession number from entry_id or filing_url
 */
function extractAccessionNumber(entryId, filingUrl) {
  // Try to extract from entry_id first
  if (entryId && entryId.includes("accession-number=")) {
    const match = entryId.match(/accession-number=([^&,\s]+)/);
    if (match) return match[1];
  }

  // Try to extract from filing URL
  const urlMatch = filingUrl.match(/\/(\d{10}-\d{2}-\d{6})-/);
  if (urlMatch) return urlMatch[1];

  // Fallback - generate from timestamp and entry_id
  const timestamp = Date.now();
  const suffix = entryId ? entryId.slice(-6) : "000000";
  return `UNKNOWN-${timestamp}-${suffix}`;
}
