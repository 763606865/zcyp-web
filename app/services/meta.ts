import type { ApiMetaWrapper, MetaAreasResponse, MetaIndustriesResponse, MetaPositionsResponse, MetaResponse } from '~/types/meta'
import { getJson } from './http'

function createAuthHeaders(authorization: string) {
  return authorization ? { Authorization: authorization } : undefined
}

export async function fetchMeta(authorization: string) {
  const response = await getJson<ApiMetaWrapper<MetaResponse>>(
    '/rc/meta',
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function fetchMetaAreas(authorization: string) {
  const response = await getJson<ApiMetaWrapper<MetaAreasResponse>>(
    '/rc/meta/areas',
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function fetchMetaIndustries(authorization: string) {
  const response = await getJson<ApiMetaWrapper<MetaIndustriesResponse>>(
    '/rc/meta/industries',
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data
}

export async function fetchMetaPositions(authorization: string) {
  const response = await getJson<ApiMetaWrapper<MetaPositionsResponse>>(
    '/rc/meta/positions',
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data
}

export interface MajorNode {
  id: number
  full_code: string
  name: string
  level: number
  level_label: string
  parent_code: string | null
  type: string
  type_label: string
  tag: string
  sort: number
  children: MajorNode[]
}

interface MajorsResponse {
  majors: MajorNode[]
  major_levels: { value: number, label: string }[]
  major_education_types: { value: string, label: string }[]
}

export async function fetchMetaMajors(authorization: string) {
  const response = await getJson<ApiMetaWrapper<MajorsResponse>>(
    '/rc/meta/majors',
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data
}

export interface SchoolItem {
  value: string
  label: string
}

interface SchoolsResponse {
  schools: SchoolItem[]
}

export async function fetchMetaSchools(authorization: string) {
  const response = await getJson<ApiMetaWrapper<SchoolsResponse>>(
    '/rc/meta/schools',
    undefined,
    createAuthHeaders(authorization),
  )

  return response.data.schools
}
