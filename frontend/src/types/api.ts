/** Mirrors PageResponse (src/main/java/.../dto/response/PageResponse.java). */
export type Page<T> = {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  hasNext: boolean
}
