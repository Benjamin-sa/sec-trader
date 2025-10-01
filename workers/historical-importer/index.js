/**
 * Historical Importer Worker
 *
 * Fetches complete filing history for a specific insider from SEC EDGAR
 * and queues unprocessed filings for processing.
 */

import { XMLParser } from "fast-xml-parser";

export default {
  /**
   * Handle HTTP requests (for testing)
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/test" && request.method === "POST") {
      return await handleTestRequest(request, env);
    }

    return new Response(
      'Historical Importer Worker\nUse POST /test to test historical imports\n\nExample request body:\n{"cik": "1234567890"}',
      {
        headers: { "Content-Type": "text/plain" },
      }
    );
  },

  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      try {
        console.log("Processing history request:", message.body);
        await processHistoryRequest(message.body, env);
        message.ack();
      } catch (error) {
        console.error("Error processing history request:", error);
        message.retry();
      }
    }
  },
};

/**
 * Process a history import request for a specific CIK
 */
async function processHistoryRequest(messageBody, env) {
  const { cik } = messageBody;

  if (!cik) {
    throw new Error("CIK is required in message body");
  }

  console.log(`Starting historical import for CIK: ${cik}`);

  // Verify the person exists in our database
  const person = await verifyPersonExists(cik, env.DB);
  if (!person) {
    throw new Error(`Person with CIK ${cik} not found in database`);
  }

  // Check if history was already imported
  if (person.history_imported) {
    console.log(`History already imported for CIK: ${cik}`);
    return;
  }

  // Fetch historical filings from SEC EDGAR
  const historicalFilings = await fetchHistoricalFilings(cik);

  console.log(
    `Found ${historicalFilings.length} historical filings for CIK: ${cik}`
  );

  // Process each filing
  let newFilingsQueued = 0;
  for (const filing of historicalFilings) {
    const alreadyExists = await checkFilingExists(
      filing.accessionNumber,
      env.DB
    );

    if (!alreadyExists) {
      // Queue for processing
      await env.FILING_QUEUE.send({
        accessionNumber: filing.accessionNumber,
        filingUrl: filing.filingUrl,
        filedAt: filing.filedAt,
        source: "historical-import",
      });
      newFilingsQueued++;
    }
  }

  console.log(`Queued ${newFilingsQueued} new filings for processing`);

  // Mark history as imported
  await markHistoryImported(cik, env.DB);

  console.log(`Completed historical import for CIK: ${cik}`);
}

/**
 * Verify that a person exists in our database
 */
async function verifyPersonExists(cik, db) {
  const stmt = db.prepare("SELECT * FROM persons WHERE cik = ?");
  const result = await stmt.bind(cik).first();
  return result;
}

/**
 * Check if a filing already exists in processed_filings table
 */
async function checkFilingExists(accessionNumber, db) {
  const stmt = db.prepare(
    "SELECT id FROM processed_filings WHERE accession_number = ?"
  );
  const result = await stmt.bind(accessionNumber).first();
  return !!result;
}

/**
 * Mark person's history as imported
 */
async function markHistoryImported(cik, db) {
  const stmt = db.prepare(
    "UPDATE persons SET history_imported = ?, updated_at = CURRENT_TIMESTAMP WHERE cik = ?"
  );
  await stmt.bind(true, cik).run();
}

/**
 * Fetch historical Form 4 filings for a CIK from SEC EDGAR using XML feed
 */
async function fetchHistoricalFilings(cik) {
  // Remove .0 suffix if present (SEC EDGAR doesn't accept it in URLs)
  let cleanCik = cik;
  if (cik.endsWith(".0")) {
    cleanCik = cik.slice(0, -2);
  }

  const paddedCik = cleanCik.padStart(10, "0");
  const searchUrl = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCik}&type=4&dateb=&owner=include&count=100&output=atom`;

  console.log(`Fetching XML feed from SEC EDGAR: ${searchUrl}`);

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "SEC Historical Importer (contact@example.com)", // Replace with your contact
      },
    });

    if (!response.ok) {
      throw new Error(
        `SEC request failed: ${response.status} ${response.statusText}`
      );
    }

    const xmlText = await response.text();
    console.log(`Received XML response (${xmlText.length} chars)`);
    console.log(`XML preview: ${xmlText.substring(0, 500)}...`);

    const filings = parseEdgarXmlFeed(xmlText);
    console.log(`Parsed ${filings.length} filings from XML`);

    return filings;
  } catch (error) {
    console.error("Error fetching from SEC EDGAR:", error);
    throw error;
  }
}

/**
 * Parse SEC EDGAR XML Atom feed to extract filing information
 */
function parseEdgarXmlFeed(xmlText) {
  const filings = [];

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true,
      ignoreDeclaration: true,
      ignorePiTags: true,
    });

    const xmlData = parser.parse(xmlText);
    console.log(
      "Parsed XML structure:",
      JSON.stringify(xmlData, null, 2).substring(0, 1000)
    );

    if (!xmlData.feed || !xmlData.feed.entry) {
      console.log("No entries found in XML feed");
      return filings;
    }

    // Handle both single entry and array of entries
    const entries = Array.isArray(xmlData.feed.entry)
      ? xmlData.feed.entry
      : [xmlData.feed.entry];

    console.log(`Found ${entries.length} entries in XML feed`);

    for (const entry of entries) {
      try {
        const filing = parseXmlEntry(entry);
        if (filing && (filing.formType === "4" || filing.formType === "4/A")) {
          filings.push(filing);
        }
      } catch (error) {
        console.error("Error parsing XML entry:", error);
        // Continue with other entries
      }
    }

    console.log(
      `Successfully parsed ${filings.length} Form 4 filings from XML feed`
    );
    return filings;
  } catch (error) {
    console.error("Error parsing XML feed:", error);
    throw new Error(`Failed to parse XML feed: ${error.message}`);
  }
}

/**
 * Parse individual XML entry to extract filing information
 */
function parseXmlEntry(entry) {
  try {
    console.log(
      "Parsing entry:",
      JSON.stringify(entry, null, 2).substring(0, 500)
    );

    if (!entry.content) {
      console.warn("No content found in XML entry");
      return null;
    }

    const content = entry.content;
    console.log("Content structure:", JSON.stringify(content, null, 2));

    // Extract filing information
    const accessionNumber = content["accession-number"];
    const filingDate = content["filing-date"];
    const filingType = content["filing-type"];
    const filingHref = content["filing-href"];

    console.log("Extracted fields:", {
      accessionNumber,
      filingDate,
      filingType,
      filingHref,
    });

    // Validate required fields
    if (!accessionNumber || !filingDate || !filingType || !filingHref) {
      console.warn("Missing required fields in XML entry:", {
        accessionNumber: !!accessionNumber,
        filingDate: !!filingDate,
        filingType: !!filingType,
        filingHref: !!filingHref,
      });
      return null;
    }

    return {
      formType: filingType,
      accessionNumber: accessionNumber,
      filingUrl: filingHref,
      filedAt: filingDate,
    };
  } catch (error) {
    console.error("Error parsing XML entry:", error);
    return null;
  }
}

/**
 * Handle test requests for historical importer
 */
async function handleTestRequest(request, env) {
  try {
    const body = await request.json();
    const { cik } = body;

    if (!cik) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "CIK is required in request body",
          example: { cik: "1234567890" },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Test: Starting historical import for CIK: ${cik}`);

    const startTime = Date.now();

    // For testing XML parsing, we'll skip database checks
    console.log(`Test: Skipping database checks for testing`);

    // Fetch historical filings from SEC EDGAR
    const historicalFilings = await fetchHistoricalFilings(cik);

    console.log(
      `Test: Found ${historicalFilings.length} historical filings for CIK: ${cik}`
    );

    const processingTime = Date.now() - startTime;

    console.log(
      `Test: Completed historical import test for CIK: ${cik} in ${processingTime}ms`
    );

    // For testing, we don't actually queue the filings or mark history as imported
    return new Response(
      JSON.stringify({
        success: true,
        message: `Historical import test completed for CIK ${cik}`,
        data: {
          cik: cik,
          totalFilingsFound: historicalFilings.length,
          processingTime: `${processingTime}ms`,
          sampleFilings: historicalFilings.slice(0, 5), // Show first 5 as samples
        },
        note: "This is a test - XML parsing only, database checks skipped",
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Test request error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
