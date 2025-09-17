/**
 * Extracts structured data from the parsed ownership document object.
 */

/**
 * Safely extract field value handling both direct values and footnote references
 */
function getFieldValue(field) {
  if (!field) return null;

  // Handle direct string values
  if (typeof field === "string") return field;

  // Handle objects with value property
  if (field.value !== undefined) return field.value;

  // Handle footnote references - return null for now
  // In future, could resolve footnote text if needed
  if (field.footnoteId || field["@_id"]) return null;

  // Return the field itself if it's a primitive
  if (typeof field === "number" || typeof field === "boolean") return field;

  return null;
}

/**
 * Safely parse float values, handling null, undefined, and NaN
 */
function parseFloatSafe(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract issuer (company) information
 */
export function extractIssuerInfo(doc) {
  if (!doc.issuer) return null;
  return {
    cik: getFieldValue(doc.issuer.issuerCik),
    name: getFieldValue(doc.issuer.issuerName),
    tradingSymbol: getFieldValue(doc.issuer.issuerTradingSymbol),
  };
}

/**
 * Extract reporting owner (insider) information
 */
export function extractReportingOwnerInfo(doc) {
  if (!doc.reportingOwner) return null;

  const owner = doc.reportingOwner;
  const relationship = owner.reportingOwnerRelationship || {};

  const isDirector =
    relationship.isDirector === 1 ||
    relationship.isDirector === "1" ||
    relationship.isDirector === true;
  const isOfficer =
    relationship.isOfficer === 1 ||
    relationship.isOfficer === "1" ||
    relationship.isOfficer === true;
  const isTenPercentOwner =
    relationship.isTenPercentOwner === 1 ||
    relationship.isTenPercentOwner === "1" ||
    relationship.isTenPercentOwner === true;
  const isOther =
    relationship.isOther === 1 ||
    relationship.isOther === "1" ||
    relationship.isOther === true;

  const relationships = [];
  if (isDirector) relationships.push("Director");
  if (isOfficer) relationships.push("Officer");
  if (isTenPercentOwner) relationships.push("10% Owner");
  if (isOther) relationships.push("Other");

  return {
    cik: getFieldValue(owner.reportingOwnerId?.rptOwnerCik),
    name: getFieldValue(owner.reportingOwnerId?.rptOwnerName),
    relationship: relationships.join(", "),
    officerTitle: isOfficer ? getFieldValue(relationship.officerTitle) : null,
    isDirector,
    isOfficer,
    isTenPercentOwner,
    isOther,
  };
}

/**
 * Extract non-derivative transactions
 */
export function extractNonDerivativeTransactions(doc) {
  const transactions = doc.nonDerivativeTable?.nonDerivativeTransaction || [];

  return transactions.map((t) => ({
    securityTitle: getFieldValue(t.securityTitle),
    transactionDate: getFieldValue(t.transactionDate),
    transactionCode: getFieldValue(t.transactionCoding?.transactionCode),
    sharesTransacted: parseFloatSafe(
      getFieldValue(t.transactionAmounts?.transactionShares)
    ),
    transactionPrice: parseFloatSafe(
      getFieldValue(t.transactionAmounts?.transactionPricePerShare)
    ),
    acquiredDisposedCode: getFieldValue(
      t.transactionAmounts?.transactionAcquiredDisposedCode
    ),
    sharesOwnedAfter: parseFloatSafe(
      getFieldValue(t.postTransactionAmounts?.sharesOwnedFollowingTransaction)
    ),
    directOrIndirect: getFieldValue(
      t.ownershipNature?.directOrIndirectOwnership
    ),
    natureOfOwnership: getFieldValue(t.ownershipNature?.natureOfOwnership),
  }));
}

/**
 * Extract derivative transactions
 */
export function extractDerivativeTransactions(doc) {
  const transactions = doc.derivativeTable?.derivativeTransaction || [];

  return transactions.map((t) => ({
    securityTitle: getFieldValue(t.securityTitle),
    transactionDate: getFieldValue(t.transactionDate),
    transactionCode: getFieldValue(t.transactionCoding?.transactionCode),
    sharesTransacted: parseFloatSafe(
      getFieldValue(t.transactionAmounts?.transactionShares)
    ),
    exercisePrice: parseFloatSafe(getFieldValue(t.conversionOrExercisePrice)),
    transactionPrice: parseFloatSafe(
      getFieldValue(t.transactionAmounts?.transactionPricePerShare)
    ),
    acquiredDisposedCode: getFieldValue(
      t.transactionAmounts?.transactionAcquiredDisposedCode
    ),
    expirationDate: getFieldValue(t.expirationDate),
    underlyingSecurity: getFieldValue(
      t.underlyingSecurity?.underlyingSecurityTitle
    ),
    underlyingSecurityShares: parseFloatSafe(
      getFieldValue(t.underlyingSecurity?.underlyingSecurityShares)
    ),
    sharesOwnedAfter: parseFloatSafe(
      getFieldValue(t.postTransactionAmounts?.sharesOwnedFollowingTransaction)
    ),
    directOrIndirect: getFieldValue(
      t.ownershipNature?.directOrIndirectOwnership
    ),
    natureOfOwnership: getFieldValue(t.ownershipNature?.natureOfOwnership),
  }));
}

/**
 * Extract footnotes
 */
export function extractFootnotes(doc) {
  if (!doc.footnotes) return [];

  const footnotes = doc.footnotes.footnote || [];
  const footnoteArray = Array.isArray(footnotes) ? footnotes : [footnotes];

  return footnoteArray
    .map((f) => ({
      id: f["@_id"] || f.id || null,
      text: f["#text"] || f.text || getFieldValue(f) || "",
    }))
    .filter((f) => f.id && f.text);
}

/**
 * Extract signatures
 */
export function extractSignatures(doc) {
  if (!doc.ownerSignature) return [];

  const signatures = Array.isArray(doc.ownerSignature)
    ? doc.ownerSignature
    : [doc.ownerSignature];

  return signatures
    .map((s) => ({
      name: getFieldValue(s.signatureName) || null,
      date: getFieldValue(s.signatureDate) || null,
    }))
    .filter((s) => s.name || s.date);
}
