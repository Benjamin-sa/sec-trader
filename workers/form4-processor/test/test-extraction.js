/**
 * Test script to verify the data extraction fixes
 */

import { XMLParser } from "fast-xml-parser";
import {
  extractIssuerInfo,
  extractReportingOwnerInfo,
  extractDerivativeTransactions,
  extractFootnotes,
  extractSignatures,
} from "../src/data-extractor.js";

// Sample XML from the user's issue
const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<ownershipDocument>
<schemaVersion>X0508</schemaVersion>
<documentType>4</documentType>
<periodOfReport>2025-09-15</periodOfReport>
<issuer>
<issuerCik>0001046257</issuerCik>
<issuerName>Ingredion Inc</issuerName>
<issuerTradingSymbol>INGR</issuerTradingSymbol>
</issuer>
<reportingOwner>
<reportingOwnerId>
<rptOwnerCik>0002020263</rptOwnerCik>
<rptOwnerName>Leonard Michael J</rptOwnerName>
</reportingOwnerId>
<reportingOwnerAddress>
<rptOwnerStreet1>5 WESTBROOK CORPORATE CENTER</rptOwnerStreet1>
<rptOwnerStreet2/>
<rptOwnerCity>WESTCHESTER</rptOwnerCity>
<rptOwnerState>IL</rptOwnerState>
<rptOwnerZipCode>60154</rptOwnerZipCode>
<rptOwnerStateDescription/>
</reportingOwnerAddress>
<reportingOwnerRelationship>
<isOfficer>1</isOfficer>
<officerTitle>SVP, CIO & Head of Prot. Fort.</officerTitle>
</reportingOwnerRelationship>
</reportingOwner>
<aff10b5One>0</aff10b5One>
<derivativeTable>
<derivativeTransaction>
<securityTitle>
<value>Phantom Stock</value>
</securityTitle>
<conversionOrExercisePrice>
<footnoteId id="F1"/>
</conversionOrExercisePrice>
<transactionDate>
<value>2025-09-15</value>
</transactionDate>
<transactionCoding>
<transactionFormType>4</transactionFormType>
<transactionCode>A</transactionCode>
<equitySwapInvolved>0</equitySwapInvolved>
</transactionCoding>
<transactionTimeliness/>
<transactionAmounts>
<transactionShares>
<value>26.686</value>
</transactionShares>
<transactionPricePerShare>
<value>123.67</value>
</transactionPricePerShare>
<transactionAcquiredDisposedCode>
<value>A</value>
</transactionAcquiredDisposedCode>
</transactionAmounts>
<exerciseDate>
<footnoteId id="F1"/>
</exerciseDate>
<expirationDate>
<footnoteId id="F1"/>
</expirationDate>
<underlyingSecurity>
<underlyingSecurityTitle>
<value>Common Stock</value>
</underlyingSecurityTitle>
<underlyingSecurityShares>
<value>26.686</value>
</underlyingSecurityShares>
</underlyingSecurity>
<postTransactionAmounts>
<sharesOwnedFollowingTransaction>
<value>366.171</value>
</sharesOwnedFollowingTransaction>
</postTransactionAmounts>
<ownershipNature>
<directOrIndirectOwnership>
<value>D</value>
</directOrIndirectOwnership>
</ownershipNature>
</derivativeTransaction>
</derivativeTable>
<footnotes>
<footnote id="F1">Represents the aggregate number of shares of phantom stock allocated to the reporting person under the SERP as of the date hereof based on the closing price of a share of the issuer's Common Stock on September 15, 2025. Each phantom stock unit represents the right to receive one share of common stock.</footnote>
</footnotes>
<ownerSignature>
<signatureName>Michael N. Levy, attorney-in-fact</signatureName>
<signatureDate>2025-09-16</signatureDate>
</ownerSignature>
</ownershipDocument>`;

function testExtraction() {
  console.log("Testing data extraction with sample XML...\n");

  // Parse the XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name, jpath, isLeafNode, isAttribute) =>
      [
        "ownershipDocument.nonDerivativeTable.nonDerivativeTransaction",
        "ownershipDocument.derivativeTable.derivativeTransaction",
        "ownershipDocument.footnotes.footnote",
      ].indexOf(jpath) !== -1,
  });

  const filingObject = parser.parse(testXml);
  const doc = filingObject.ownershipDocument;

  console.log("1. Testing issuer extraction:");
  const issuer = extractIssuerInfo(doc);
  console.log(JSON.stringify(issuer, null, 2));

  console.log("\n2. Testing reporting owner extraction:");
  const owner = extractReportingOwnerInfo(doc);
  console.log(JSON.stringify(owner, null, 2));

  console.log("\n3. Testing derivative transactions extraction:");
  const derivatives = extractDerivativeTransactions(doc);
  console.log(JSON.stringify(derivatives, null, 2));

  console.log("\n4. Testing footnotes extraction:");
  const footnotes = extractFootnotes(doc);
  console.log(JSON.stringify(footnotes, null, 2));

  console.log("\n5. Testing signatures extraction:");
  const signatures = extractSignatures(doc);
  console.log(JSON.stringify(signatures, null, 2));

  console.log("\n✅ All extractions completed without errors!");
}

// Run the test
testExtraction();
