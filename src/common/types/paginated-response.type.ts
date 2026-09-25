export interface PaginatedMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedLinks {
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginatedMeta;
  links: PaginatedLinks;
}
