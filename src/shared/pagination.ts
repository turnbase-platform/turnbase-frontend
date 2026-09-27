/** `rest-conventions.md`: the list envelope every paginated GET response shares. */
export interface ListEnvelope<T> {
  content: T[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}
