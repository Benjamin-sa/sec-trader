/**
 * SEC API client for fetching historical filings
 * Uses the SEC EDGAR browse-edgar RSS feed endpoint
 */

import { XMLParser } from "fast-xml-parser";

/**
 * Fetch historical Form 4 filings for a CIK from SEC
 * Uses the SEC EDGAR browse-edgar Atom feed
 *
 * Example URL: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001661534&type=4&dateb=&owner=include&count=100&output=atom
 */
export async function fetchHistoricalFilings(
  cik,
  startDate = null,
  endDate = null,
  limit = 100,
  env
) {
  const paddedCIK = cik.padStart(10, "0");

  // Build the SEC browse-edgar URL for Form 4 filings
  const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCIK}&type=4&dateb=${
    endDate || ""
  }&owner=include&count=${Math.min(limit, 100)}&output=atom`;

  console.log(`Fetching Form 4 filings from: ${url}`);

  const response = await fetch(url, {
    headers: {
      "User-Agent": "SEC Filing Analyzer Bot contact@example.com",
      Accept: "application/atom+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `SEC API request failed: ${response.status} ${response.statusText}`
    );
  }

  const xmlText = await response.text();

  // Parse the Atom XML feed
  const filings = parseAtomFeed(xmlText, startDate, endDate);

  console.log(`Parsed ${filings.length} Form 4 filings for CIK ${paddedCIK}`);

  return filings;
}

/**
 * Parse SEC Atom feed and extract filing information
 */
function parseAtomFeed(xmlText, startDate = null, endDate = null) {
  const filings = [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  try {
    const feed = parser.parse(xmlText);

    if (!feed || !feed.feed) {
      console.warn("Feed is empty or has an unexpected structure");
      return filings;
    }

    // Extract company info
    const companyInfo = feed.feed["company-info"] || {};
    const companyName = companyInfo["conformed-name"] || "Unknown Company";
    const companyCIK = companyInfo.cik || "";

    // Handle both single and multiple entries
    const entries = feed.feed.entry
      ? Array.isArray(feed.feed.entry)
        ? feed.feed.entry
        : [feed.feed.entry]
      : [];

    for (const entry of entries) {
      if (!entry || !entry.content) continue;

      const content = entry.content;
      const accessionNumber = content["accession-number"];
      const filingDate = content["filing-date"];
      const filingHref = content["filing-href"];
      const formName = content["form-name"] || "Form 4";

      // Filter by date range if specified
      if (startDate && filingDate < startDate) continue;
      if (endDate && filingDate > endDate) continue;

      // Extract the direct XML file URL from the filing href
      // The filing-href points to the index page, we need the actual XML file
      // Pattern: https://www.sec.gov/Archives/edgar/data/1661534/000166153425000004/0001661534-25-000004-index.htm
      // We need to find the .xml file in that directory
      const filingUrl = getXMLFileUrl(filingHref, accessionNumber);

      const title = entry.title || `Form 4 - ${companyName}`;
      const summary =
        typeof entry.summary === "object"
          ? entry.summary["#text"]
          : entry.summary || "";

      filings.push({
        accessionNumber,
        filingDate,
        reportDate: filingDate, // Use filing date as report date
        filingUrl,
        title,
        summary,
        reportingOwner: companyName,
        companyCIK,
      });
    }
  } catch (error) {
    console.error("Failed to parse Atom feed:", error);
    throw new Error("XML parsing failed");
  }

  return filings;
}

/**
 * Get the direct XML file URL from the filing index page URL
 * Converts index page URL to direct .xml file URL
 */
function getXMLFileUrl(filingHref, accessionNumber) {
  // Example filingHref: https://www.sec.gov/Archives/edgar/data/1661534/000166153425000004/0001661534-25-000004-index.htm
  // We need: https://www.sec.gov/Archives/edgar/data/1661534/000166153425000004/wf-form4_172794426932753.xml
  // The actual filename varies, so we'll construct a request to the processor that will handle it

  // For now, return the filing href - the form4-processor already handles downloading and parsing
  // It will fetch the index page and find the XML file
  return filingHref;
}

/**
 * Validate that a CIK exists and has filings
 */
export async function validateCIKExists(cik, env) {
  try {
    const paddedCIK = cik.padStart(10, "0");
    const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${paddedCIK}&type=4&count=1&output=atom`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "SEC Filing Analyzer Bot contact@example.com",
        Accept: "application/atom+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) return false;

    const xmlText = await response.text();
    // Check if the feed has valid content
    return xmlText.includes("<feed") && xmlText.includes("company-info");
  } catch (error) {
    console.error("Error validating CIK:", error);
    return false;
  }
}
