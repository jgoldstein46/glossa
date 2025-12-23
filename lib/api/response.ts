import { NextResponse } from 'next/server'

export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
  details?: string
}

export interface PaginationMeta {
  total: number | null
  limit: number
  offset: number
  hasMore: boolean
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status })
}

export function apiError(
  error: string,
  status: number,
  details?: string
): NextResponse {
  return NextResponse.json({ success: false, error, details }, { status })
}

export function apiPaginated<T>(
  data: T[],
  pagination: PaginationMeta,
  status = 200
): NextResponse {
  return NextResponse.json({ success: true, data, pagination }, { status })
}
