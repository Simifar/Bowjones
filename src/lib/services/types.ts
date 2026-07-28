export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginationResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}
