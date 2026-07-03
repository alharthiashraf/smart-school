type NullableQuery = {
  eq: (column: string, value: unknown) => NullableQuery;
  is: (column: string, value: null) => NullableQuery;
};

function applyNullableEq(
  query: NullableQuery,
  column: string,
  value: string | null | undefined,
): NullableQuery {
  if (value === undefined) return query;
  if (value === null) return query.is(column, null);
  return query.eq(column, value);
}