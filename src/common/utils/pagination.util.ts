import { Paginated } from 'nestjs-paginate';
import { PaginatedResponse } from '../types';

/**
 * Map kết quả từ nestjs-paginate thành shape chuẩn contract FE.
 *
 * @param result  Kết quả paginate gốc từ nestjs-paginate
 * @param mapper  Hàm map entity → DTO (VD: UserResponseDto.fromEntity)
 */
export function toPaginatedResponse<TEntity, TDto>(
  result: Paginated<TEntity>,
  mapper: (entity: TEntity) => TDto,
): PaginatedResponse<TDto> {
  return {
    data: result.data.map(mapper),
    meta: {
      totalItems: result.meta.totalItems || 0,
      itemCount: result.data.length,
      itemsPerPage: result.meta.itemsPerPage,
      totalPages: result.meta.totalPages || 0,
      currentPage: result.meta.currentPage || 0,
    },
    links: result.links,
  };
}
