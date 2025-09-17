import { XMLParser } from "fast-xml-parser";

/**
 * Download and parse Form 4 filing document
 */
export async function downloadAndParseFiling(filingUrl) {
  console.log(`Processing filing from HTML index: ${filingUrl}`);

  // Step 1: Convert HTML index URL to XML document URL
  const xmlUrl = await getXmlUrlFromHtmlIndex(filingUrl);
  console.log(`Found XML document at: ${xmlUrl}`);

  // Step 2: Download the actual XML Form 4 document
  const response = await fetch(xmlUrl, {
    headers: {
      "User-Agent": "SEC Filing Analyzer Bot (contact@example.com)",
      Accept: "application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to download XML: ${response.status} ${response.statusText}`
    );
  }

  const xmlContent = await response.text();
  console.log(`Downloaded XML content (${xmlContent.length} chars)`);

  // Step 3: Parse the XML content into a JavaScript object
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    // Ensure transactions and footnotes are always treated as arrays
    isArray: (name, jpath, isLeafNode, isAttribute) =>
      [
        "ownershipDocument.nonDerivativeTable.nonDerivativeTransaction",
        "ownershipDocument.derivativeTable.derivativeTransaction",
        "ownershipDocument.footnotes.footnote",
      ].indexOf(jpath) !== -1,
  });

  const filingObject = parser.parse(xmlContent);
  const parsedDoc = filingObject.ownershipDocument;

  // Attach raw XML for storage
  parsedDoc.raw = xmlContent;

  return parsedDoc;
}

/**
 * Convert HTML index URL to actual XML document URL
 */
async function getXmlUrlFromHtmlIndex(htmlUrl) {
  try {
    console.log(`Converting HTML URL to XML: ${htmlUrl}`);

    const response = await fetch(htmlUrl, {
      headers: {
        "User-Agent": "SEC Filing Analyzer Bot (contact@example.com)",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch HTML index: ${response.status}`);
    }

    const htmlContent = await response.text();
    console.log(`HTML content length: ${htmlContent.length}`);

    const xmlLinkRegex = /<a\s+[^>]*href="([^"]+)"[^>]*>([^<]+\.xml)<\/a>/i;
    const match = htmlContent.match(xmlLinkRegex);

    if (!match || !match[1]) {
      throw new Error("No primary XML link found in HTML index");
    }

    const primaryXmlPath = match[1];
    console.log(`Selected primary XML path: ${primaryXmlPath}`);

    let xmlUrl;
    if (primaryXmlPath.startsWith("http")) {
      xmlUrl = primaryXmlPath;
    } else if (primaryXmlPath.startsWith("/")) {
      xmlUrl = "https://www.sec.gov" + primaryXmlPath;
    } else {
      const baseUrl = htmlUrl.replace(/\/[^\/]+$/, "/");
      xmlUrl = baseUrl + primaryXmlPath;
    }

    console.log(`Final XML URL: ${xmlUrl}`);
    return xmlUrl;
  } catch (error) {
    console.error("Error converting HTML to XML URL:", error);
    throw error;
  }
}
