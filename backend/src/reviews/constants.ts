/** Default page size for GET /reviews (cursor-based pagination). */
export const DEFAULT_LIMIT = 10;

/** Maximum allowed limit per request. */
export const MAX_LIMIT = 100;

/** Separator for cursor encoding: "createdAt::id". */
export const CURSOR_SEPARATOR = '::';
