/**
 * Database interaction functions for storing Form 4 data.
 */

/**
 * Store comprehensive Form 4 data using the new universal schema
 */
export async function storeForm4Data(filing, filingData, db) {
  console.log("Starting comprehensive Form 4 data storage...");

  try {
    // 1. Get or create issuer (company)
    const issuerId = await getOrCreateIssuer(filingData.issuer, db);

    // 2. Get or create reporting owner (person)
    const personId = await getOrCreatePerson(filingData.reportingOwner, db);

    // 3. Get filing type ID for Form 4
    const filingTypeResult = await db
      .prepare("SELECT id FROM filing_types WHERE type_code = ?")
      .bind("4")
      .first();

    if (!filingTypeResult) {
      throw new Error("Form 4 filing type not found in database");
    }

    // 4. Extract accession number
    const accessionNumber =
      filing.accession_number ||
      extractAccessionNumber(filing.entry_id, filing.filing_url);

    // 5. Create the filing record
    const filingId = await createFiling(
      {
        accessionNumber,
        filingUrl: filing.filing_url,
        filedAt: filing.published_date,
        periodOfReport: filingData.periodOfReport,
        filingTypeId: filingTypeResult.id,
        issuerId: issuerId,
        rawXml: filingData.raw,
      },
      db
    );

    // 6. Create person relationship record
    await createPersonRelationship(
      filingId,
      personId,
      filingData.reportingOwner,
      db
    );

    // 7. Store all transactions
    const transactionCount = await storeTransactions(filingId, filingData, db);

    // 8. Store footnotes
    await storeFootnotes(filingId, filingData.footnotes, db);

    // 9. Store signatures
    await storeSignatures(filingId, filingData.signatures, db);

    console.log(
      `Successfully stored Form 4 data: ${transactionCount} transactions, filing ID: ${filingId}`
    );
    return filingId;
  } catch (error) {
    console.error("Error storing Form 4 data:", error);
    throw error;
  }
}

/**
 * Get or create issuer (company) record
 */
async function getOrCreateIssuer(issuerData, db) {
  if (!issuerData || !issuerData.cik) {
    throw new Error("Invalid issuer data - CIK required");
  }

  const existing = await db
    .prepare("SELECT id FROM issuers WHERE cik = ?")
    .bind(issuerData.cik)
    .first();

  if (existing) {
    if (issuerData.name || issuerData.tradingSymbol) {
      await db
        .prepare(
          "UPDATE issuers SET name = COALESCE(?, name), trading_symbol = COALESCE(?, trading_symbol), updated_at = CURRENT_TIMESTAMP WHERE cik = ?"
        )
        .bind(issuerData.name, issuerData.tradingSymbol, issuerData.cik)
        .run();
    }
    return existing.id;
  }

  const result = await db
    .prepare("INSERT INTO issuers (cik, name, trading_symbol) VALUES (?, ?, ?)")
    .bind(issuerData.cik, issuerData.name, issuerData.tradingSymbol)
    .run();

  return result.meta.last_row_id;
}

/**
 * Get or create person (reporting owner) record
 */
async function getOrCreatePerson(personData, db) {
  if (!personData || !personData.cik) {
    throw new Error("Invalid person data - CIK required");
  }

  const existing = await db
    .prepare("SELECT id FROM persons WHERE cik = ?")
    .bind(personData.cik)
    .first();

  if (existing) {
    if (personData.name) {
      await db
        .prepare(
          "UPDATE persons SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE cik = ?"
        )
        .bind(personData.name, personData.cik)
        .run();
    }
    return existing.id;
  }

  const result = await db
    .prepare("INSERT INTO persons (cik, name) VALUES (?, ?)")
    .bind(personData.cik, personData.name)
    .run();

  return result.meta.last_row_id;
}

/**
 * Create filing record
 */
async function createFiling(filingInfo, db) {
  const result = await db
    .prepare(
      `
      INSERT INTO filings (
        accession_number, filing_url, filed_at, period_of_report, 
        filing_type_id, issuer_id, raw_xml, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'processing')
    `
    )
    .bind(
      filingInfo.accessionNumber,
      filingInfo.filingUrl,
      filingInfo.filedAt,
      filingInfo.periodOfReport,
      filingInfo.filingTypeId,
      filingInfo.issuerId,
      filingInfo.rawXml
    )
    .run();

  return result.meta.last_row_id;
}

/**
 * Create person relationship record
 */
async function createPersonRelationship(filingId, personId, personData, db) {
  const relationship = personData.relationship || "";
  const isDirector = relationship.toLowerCase().includes("director");
  const isOfficer = relationship.toLowerCase().includes("officer");
  const isTenPercent =
    relationship.toLowerCase().includes("10%") ||
    relationship.toLowerCase().includes("ten percent");
  const isOther =
    !isDirector && !isOfficer && !isTenPercent && relationship.length > 0;

  await db
    .prepare(
      `
      INSERT INTO person_relationships (
        filing_id, person_id, is_director, is_officer, 
        is_ten_percent_owner, is_other, officer_title
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )
    .bind(
      filingId,
      personId,
      isDirector,
      isOfficer,
      isTenPercent,
      isOther,
      personData.officerTitle
    )
    .run();
}

/**
 * Store all transactions (both non-derivative and derivative)
 */
async function storeTransactions(filingId, filingData, db) {
  let transactionCount = 0;

  if (filingData.nonDerivativeTransactions) {
    for (const transaction of filingData.nonDerivativeTransactions) {
      await storeTransaction(filingId, transaction, "non_derivative", db);
      transactionCount++;
    }
  }

  if (filingData.derivativeTransactions) {
    for (const transaction of filingData.derivativeTransactions) {
      await storeTransaction(filingId, transaction, "derivative", db);
      transactionCount++;
    }
  }

  return transactionCount;
}

/**
 * Store individual transaction
 */
async function storeTransaction(filingId, transaction, transactionType, db) {
  const transactionPrice =
    transaction.transactionPrice || transaction.exercisePrice || 0;
  const sharesTransacted = transaction.sharesTransacted || 0;
  const transactionValue = sharesTransacted * transactionPrice;

  await db
    .prepare(
      `
      INSERT INTO insider_transactions (
        filing_id, transaction_date, security_title, transaction_type,
        transaction_code, shares_transacted, price_per_share, acquired_disposed_code,
        transaction_value, shares_owned_following, direct_or_indirect, nature_of_ownership
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .bind(
      filingId,
      transaction.transactionDate || null,
      transaction.securityTitle || null,
      transactionType,
      transaction.transactionCode || null,
      sharesTransacted,
      transactionPrice,
      transaction.acquiredDisposedCode || "D",
      transactionValue,
      transaction.sharesOwnedAfter || 0,
      transaction.directOrIndirect || "D",
      transaction.natureOfOwnership || null
    )
    .run();
}

/**
 * Store footnotes from the parsed data
 */
async function storeFootnotes(filingId, footnotes, db) {
  if (!footnotes || footnotes.length === 0) return;

  for (const footnote of footnotes) {
    if (footnote.id && footnote.text) {
      await db
        .prepare(
          "INSERT INTO footnotes (filing_id, footnote_id_in_xml, footnote_text) VALUES (?, ?, ?)"
        )
        .bind(filingId, footnote.id, footnote.text)
        .run();
      
      // If this footnote mentions 10b5-1, update the is_10b5_1_plan flag on related transactions
      if (footnote.text && footnote.text.toLowerCase().includes('10b5-1')) {
        await db.prepare(`
          UPDATE insider_transactions
          SET is_10b5_1_plan = 1
          WHERE id IN (
            SELECT tf.transaction_id
            FROM transaction_footnotes tf
            JOIN footnotes fn ON fn.id = tf.footnote_id
            WHERE fn.filing_id = ? AND fn.footnote_id_in_xml = ?
          )
        `).bind(filingId, footnote.id).run();
      }
    }
  }
}

/**
 * Store signature information from the parsed data
 */
async function storeSignatures(filingId, signatures, db) {
  if (!signatures || signatures.length === 0) return;

  for (const signature of signatures) {
    if (signature.name || signature.date) {
      await db
        .prepare(
          "INSERT INTO signatures (filing_id, signature_name, signature_date) VALUES (?, ?, ?)"
        )
        .bind(filingId, signature.name, signature.date)
        .run();
    }
  }
}

/**
 * Update filing status in the main filings table
 */
export async function updateFilingStatus(accessionNumber, status, db) {
  await db
    .prepare(
      "UPDATE filings SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE accession_number = ?"
    )
    .bind(status, accessionNumber)
    .run();
}

/**
 * Update processed filings tracking table
 */
export async function updateProcessedFilingStatus(accessionNumber, status, db) {
  // Set completed_at timestamp when status is completed
  if (status === "completed") {
    await db
      .prepare(
        "UPDATE processed_filings SET status = ?, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE accession_number = ?"
      )
      .bind(status, accessionNumber)
      .run();
  } else {
    await db
      .prepare(
        "UPDATE processed_filings SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE accession_number = ?"
      )
      .bind(status, accessionNumber)
      .run();
  }
}

/**
 * Extract accession number from entry_id or filing_url
 */
export function extractAccessionNumber(entryId, filingUrl) {
  if (entryId && entryId.includes("accession-number=")) {
    const match = entryId.match(/accession-number=([^&,\s]+)/);
    if (match) return match[1];
  }

  const urlMatch = filingUrl.match(/\/(\d{10}-\d{2}-\d{6})-/);
  if (urlMatch) return urlMatch[1];

  return `UNKNOWN-${Date.now()}`;
}
