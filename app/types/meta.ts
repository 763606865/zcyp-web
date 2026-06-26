export interface RcAreaNode {
  id: number
  code: string
  parent_code: string | null
  name: string
  level: number
  type: string | null
  children: RcAreaNode[]
}

export interface RcIndustryNode {
  id: number
  parent_id: number | null
  name: string
  code: string
  sort: number
  extra: Record<string, unknown> | null
  children: RcIndustryNode[]
}

export interface RcPositionNode {
  id: number
  parent_id: number | null
  name: string
  code: string
  sort: number
  extra: Record<string, unknown> | null
  children: RcPositionNode[]
}

export interface MetaResponse {
  areas: RcAreaNode[]
  industries: RcIndustryNode[]
  positions: RcPositionNode[]
}

export interface MetaAreasResponse {
  areas: RcAreaNode[]
}

export interface MetaIndustriesResponse {
  industries: RcIndustryNode[]
}

export interface MetaPositionsResponse {
  positions: RcPositionNode[]
}

export interface CmsTag {
  id: number
  category: string
  name: string
  slug: string | null
}

export interface CmsTagGroup {
  category: string
  category_label: string
  children: CmsTag[]
}

export interface CmsTagCategory {
  value: string
  label: string
}

export interface ApiMetaWrapper<T> {
  code: number
  data: T
  message?: string
  meta?: {
    timestamp?: number
    response_time?: number
  }
}
