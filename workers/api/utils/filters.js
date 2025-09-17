/**
 * Filtering utilities for building dynamic SQL queries
 */
import {
  validateTransactionType,
  validateAcquiredDisposed,
  validateOwnership,
  validateDate,
  validateNumber,
  validateBoolean,
  sanitizeString,
} from "./validation.js";

export class QueryBuilder {
  constructor() {
    this.conditions = ["1=1"]; // Always-true starting condition
    this.params = [];
  }

  addSearchFilter(q) {
    const searchTerm = sanitizeString(q);
    if (searchTerm.length > 0) {
      this.conditions.push(
        "(LOWER(issuer_name) LIKE ? OR LOWER(COALESCE(trading_symbol,'')) LIKE ? OR LOWER(person_name) LIKE ?)"
      );
      const likeTerm = `%${searchTerm.toLowerCase()}%`;
      this.params.push(likeTerm, likeTerm, likeTerm);
    }
    return this;
  }

  addTransactionTypeFilter(type) {
    if (validateTransactionType(type)) {
      this.conditions.push("transaction_code = ?");
      this.params.push(type);
    }
    return this;
  }

  addAcquiredDisposedFilter(acquired) {
    if (validateAcquiredDisposed(acquired)) {
      this.conditions.push("acquired_disposed_code = ?");
      this.params.push(acquired);
    }
    return this;
  }

  addOwnershipFilter(ownership) {
    if (validateOwnership(ownership)) {
      this.conditions.push("direct_or_indirect = ?");
      this.params.push(ownership);
    }
    return this;
  }

  addRoleFilters(searchParams) {
    if (validateBoolean(searchParams.get("is_director"))) {
      this.conditions.push("is_director = 1");
    }
    if (validateBoolean(searchParams.get("is_officer"))) {
      this.conditions.push("is_officer = 1");
    }
    if (validateBoolean(searchParams.get("is_ten_percent_owner"))) {
      this.conditions.push("is_ten_percent_owner = 1");
    }
    return this;
  }

  addSymbolFilter(symbol) {
    const cleanSymbol = sanitizeString(symbol);
    if (cleanSymbol.length > 0) {
      this.conditions.push("UPPER(COALESCE(trading_symbol,'')) = UPPER(?)");
      this.params.push(cleanSymbol);
    }
    return this;
  }

  addMinValueFilter(minValue) {
    if (validateNumber(minValue)) {
      this.conditions.push("transaction_value >= ?");
      this.params.push(parseFloat(minValue));
    }
    return this;
  }

  addMinSharesFilter(minShares) {
    if (validateNumber(minShares)) {
      this.conditions.push("shares_transacted >= ?");
      this.params.push(parseFloat(minShares));
    }
    return this;
  }

  addDateRangeFilter(startDate, endDate) {
    if (validateDate(startDate)) {
      this.conditions.push("transaction_date >= date(?)");
      this.params.push(startDate);
    }
    if (validateDate(endDate)) {
      this.conditions.push("transaction_date <= date(?)");
      this.params.push(endDate);
    }
    return this;
  }

  build() {
    return {
      whereClause: `WHERE ${this.conditions.join(" AND ")}`,
      params: this.params,
      filtersCount: this.conditions.length - 1, // Exclude the "1=1" condition
    };
  }
}

export function buildLatestTradesFilters(searchParams) {
  const builder = new QueryBuilder();

  return builder
    .addSearchFilter(searchParams.get("q"))
    .addTransactionTypeFilter(searchParams.get("type"))
    .addAcquiredDisposedFilter(searchParams.get("acquired"))
    .addOwnershipFilter(searchParams.get("ownership"))
    .addRoleFilters(searchParams)
    .addSymbolFilter(searchParams.get("symbol"))
    .addMinValueFilter(searchParams.get("min_value"))
    .addMinSharesFilter(searchParams.get("min_shares"))
    .addDateRangeFilter(
      searchParams.get("start_date"),
      searchParams.get("end_date")
    )
    .build();
}
