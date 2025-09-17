import { downloadAndParseFiling } from "./src/xml-parser.js";
import {
  extractIssuerInfo,
  extractReportingOwnerInfo,
  extractNonDerivativeTransactions,
  extractDerivativeTransactions,
  extractFootnotes,
  extractSignatures,
} from "./src/data-extractor.js";
import {
  storeForm4Data,
  updateFilingStatus,
  updateProcessedFilingStatus,
  extractAccessionNumber,
} from "./src/database.js";

/**
 * Form 4 Processor Worker - Extracts data from SEC Form 4 filings
 * Triggered by queue messages from RSS monitor
 */
export default {
  async queue(batch, env) {
    console.log(`Processing batch of ${batch.messages.length} filings`);

    for (const message of batch.messages) {
      const filing = message.body;
      const accessionNumber =
        filing.accession_number ||
        extractAccessionNumber(filing.entry_id, filing.filing_url);

      try {
        console.log(`Processing filing: ${accessionNumber}`);

        // 1. Download and parse the XML into a document object
        const doc = await downloadAndParseFiling(filing.filing_url);

        // 2. Extract structured data from the document
        const filingData = {
          raw: doc.raw, // Keep raw XML for storage
          issuer: extractIssuerInfo(doc),
          reportingOwner: extractReportingOwnerInfo(doc),
          nonDerivativeTransactions: extractNonDerivativeTransactions(doc),
          derivativeTransactions: extractDerivativeTransactions(doc),
          footnotes: extractFootnotes(doc),
          signatures: extractSignatures(doc),
          periodOfReport: doc.periodOfReport || null,
        };

        // 3. Store the comprehensive data in the database
        await storeForm4Data(filing, filingData, env.DB);

        // 4. Update status to "completed"
        await updateFilingStatus(accessionNumber, "completed", env.DB);
        await updateProcessedFilingStatus(accessionNumber, "completed", env.DB);

        console.log(`Successfully processed filing: ${accessionNumber}`);
        message.ack();
      } catch (error) {
        console.error(`Error processing filing ${accessionNumber}:`, error);

        // Update status to "failed"
        await updateFilingStatus(accessionNumber, "failed", env.DB);
        await updateProcessedFilingStatus(accessionNumber, "failed", env.DB);

        message.retry();
      }
    }
  },

  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      return new Response("Form 4 Processor is running", { status: 200 });
    }

    // ... (rest of the fetch handler remains for testing, but is less critical now)
    return new Response("Form 4 Processor Worker", { status: 200 });
  },
};
