-- Migration 005: Add 10b5-1 Plan Flag Column
-- Denormalizes the 10b5-1 plan detection to avoid expensive EXISTS subquery
-- Expected impact: Eliminates correlated subquery, saving millions of reads

-- Add the column to store whether a transaction is part of a 10b5-1 plan
ALTER TABLE insider_transactions 
ADD COLUMN is_10b5_1_plan INTEGER DEFAULT 0 NOT NULL;

-- Create index for fast filtering
CREATE INDEX IF NOT EXISTS idx_insider_transactions_10b51
ON insider_transactions(is_10b5_1_plan)
WHERE is_10b5_1_plan = 1;

-- Populate the column for existing data
UPDATE insider_transactions
SET is_10b5_1_plan = 1
WHERE id IN (
  SELECT DISTINCT tf.transaction_id
  FROM transaction_footnotes tf
  JOIN footnotes fn ON fn.id = tf.footnote_id
  WHERE LOWER(fn.footnote_text) LIKE '%10b5-1%'
);

-- Add index for footnote detection to keep it updated efficiently
CREATE INDEX IF NOT EXISTS idx_footnotes_10b51_text
ON footnotes(id)
WHERE LOWER(footnote_text) LIKE '%10b5-1%';

CREATE INDEX IF NOT EXISTS idx_transaction_footnotes_lookup
ON transaction_footnotes(transaction_id, footnote_id);

ANALYZE insider_transactions;
