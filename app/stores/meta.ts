import type { ArticleCategoryNode, ArticleTagItem } from '~/services/cms'
import type { CmsTagGroup, RcAreaNode, RcIndustryNode, RcPositionNode } from '~/types/meta'
import { acceptHMRUpdate, defineStore } from 'pinia'
import { fetchCmsMetaArticles, fetchCmsMetaTags } from '~/services/cms'
import { ApiRequestError } from '~/services/http'
import { fetchMeta, fetchMetaAreas, fetchMetaIndustries, fetchMetaPositions, fetchMetaSchools } from '~/services/meta'

const AREAS_STORAGE_KEY = 'zcgz-meta-areas'
const INDUSTRIES_STORAGE_KEY = 'zcgz-meta-industries'
const POSITIONS_STORAGE_KEY = 'zcgz-meta-positions'
const TAGS_STORAGE_KEY = 'zcgz-meta-tags'
const SCHOOLS_STORAGE_KEY = 'zcgz-meta-schools'
const ARTICLE_CATEGORIES_KEY = 'zcgz-meta-article-categories'
const ARTICLE_TAGS_KEY = 'zcgz-meta-article-tags'
const META_CACHE_VERSION = 1

interface MetaCacheEntry<T> {
  version: number
  timestamp: number
  data: T
}

function readLocalCache<T>(key: string): T | null {
  if (typeof window === 'undefined')
    return null

  const raw = window.localStorage.getItem(key)

  if (!raw)
    return null

  try {
    const entry = JSON.parse(raw) as MetaCacheEntry<T>

    if (entry.version !== META_CACHE_VERSION)
      return null

    return entry.data
  }
  catch {
    return null
  }
}

function writeLocalCache<T>(key: string, data: T) {
  if (typeof window === 'undefined')
    return

  const entry: MetaCacheEntry<T> = {
    version: META_CACHE_VERSION,
    timestamp: Date.now(),
    data,
  }

  window.localStorage.setItem(key, JSON.stringify(entry))
}

function unwrapAreaRoot(list: RcAreaNode[]): RcAreaNode[] {
  if (list.length === 1 && Number(list[0]!.level) === 0 && list[0]!.children?.length > 0)
    return list[0]!.children as RcAreaNode[]

  return list
}

export const useMetaStore = defineStore('meta', () => {
  const areas = ref<RcAreaNode[]>([])
  const industries = ref<RcIndustryNode[]>([])
  const positions = ref<RcPositionNode[]>([])
  const tags = ref<CmsTagGroup[]>([])
  const schools = ref<{ value: string, label: string }[]>([])
  const articleCategories = ref<ArticleCategoryNode[]>([])
  const articleTags = ref<ArticleTagItem[]>([])
  const isLoading = ref(false)
  const loadError = ref('')
  const normalizedAreas = computed(() => unwrapAreaRoot(areas.value))

  async function ensureAreasLoaded(authorization: string) {
    if (areas.value.length > 0)
      return

    const cached = readLocalCache<RcAreaNode[]>(AREAS_STORAGE_KEY)

    try {
      loadError.value = ''
      const data = await fetchMetaAreas(authorization)

      if (Array.isArray(data) && data.length > 0 && data[0] && typeof data[0] === 'object' && 'children' in data[0]) {
        areas.value = unwrapAreaRoot(data as unknown as RcAreaNode[])
      }
      else if (data && typeof data === 'object' && 'areas' in data) {
        areas.value = unwrapAreaRoot(data.areas || [])
      }
      else {
        areas.value = []
      }

      writeLocalCache(AREAS_STORAGE_KEY, areas.value)
    }
    catch (error) {
      loadError.value = error instanceof ApiRequestError ? error.message : '地区数据加载失败'

      if (cached && cached.length > 0)
        areas.value = unwrapAreaRoot(cached)
    }
  }

  async function ensureIndustriesLoaded(authorization: string) {
    if (industries.value.length > 0)
      return

    const cached = readLocalCache<RcIndustryNode[]>(INDUSTRIES_STORAGE_KEY)

    try {
      loadError.value = ''
      const data = await fetchMetaIndustries(authorization)

      if (data.industries) {
        industries.value = data.industries
        writeLocalCache(INDUSTRIES_STORAGE_KEY, industries.value)
      }
      else if (Array.isArray(data)) {
        industries.value = data as unknown as RcIndustryNode[]
        writeLocalCache(INDUSTRIES_STORAGE_KEY, industries.value)
      }
    }
    catch (error) {
      loadError.value = error instanceof ApiRequestError ? error.message : '行业数据加载失败'

      if (cached && cached.length > 0)
        industries.value = cached
    }
  }

  async function ensurePositionsLoaded(authorization: string) {
    if (positions.value.length > 0)
      return

    const cached = readLocalCache<RcPositionNode[]>(POSITIONS_STORAGE_KEY)

    try {
      loadError.value = ''
      const data = await fetchMetaPositions(authorization)

      if (data.positions) {
        positions.value = data.positions
        writeLocalCache(POSITIONS_STORAGE_KEY, positions.value)
      }
      else if (Array.isArray(data)) {
        positions.value = data as unknown as RcPositionNode[]
        writeLocalCache(POSITIONS_STORAGE_KEY, positions.value)
      }
    }
    catch (error) {
      loadError.value = error instanceof ApiRequestError ? error.message : '职位数据加载失败'

      if (cached && cached.length > 0)
        positions.value = cached
    }
  }

  async function ensureTagsLoaded() {
    if (tags.value.length > 0)
      return

    const cached = readLocalCache<CmsTagGroup[]>(TAGS_STORAGE_KEY)

    try {
      loadError.value = ''
      const data = await fetchCmsMetaTags()
      tags.value = data.tags || []
      writeLocalCache(TAGS_STORAGE_KEY, tags.value)
    }
    catch (error) {
      loadError.value = error instanceof ApiRequestError ? error.message : '标签数据加载失败'
      if (cached && cached.length > 0)
        tags.value = cached
    }
  }

  async function ensureSchoolsLoaded(authorization: string) {
    if (schools.value.length > 0)
      return

    const cached = readLocalCache<{ value: string, label: string }[]>(SCHOOLS_STORAGE_KEY)

    try {
      loadError.value = ''
      const data = await fetchMetaSchools(authorization)
      if (Array.isArray(data)) {
        schools.value = data as { value: string, label: string }[]
        writeLocalCache(SCHOOLS_STORAGE_KEY, schools.value)
      }
    }
    catch (error) {
      loadError.value = error instanceof ApiRequestError ? error.message : '学校数据加载失败'
      if (cached && cached.length > 0)
        schools.value = cached
    }
  }

  async function ensureArticleMetaLoaded() {
    if (articleCategories.value.length > 0 || articleTags.value.length > 0)
      return

    const cachedCats = readLocalCache<ArticleCategoryNode[]>(ARTICLE_CATEGORIES_KEY)
    const cachedTags = readLocalCache<ArticleTagItem[]>(ARTICLE_TAGS_KEY)

    try {
      loadError.value = ''
      const data = await fetchCmsMetaArticles()
      if (data.article_categories) {
        articleCategories.value = data.article_categories
        writeLocalCache(ARTICLE_CATEGORIES_KEY, articleCategories.value)
      }
      if (data.article_tags) {
        articleTags.value = data.article_tags
        writeLocalCache(ARTICLE_TAGS_KEY, articleTags.value)
      }
    }
    catch (error) {
      loadError.value = error instanceof ApiRequestError ? error.message : '文章元数据加载失败'
      if (cachedCats && cachedCats.length > 0)
        articleCategories.value = cachedCats
      if (cachedTags && cachedTags.length > 0)
        articleTags.value = cachedTags
    }
  }

  async function loadAllMeta(authorization: string) {
    if (isLoading.value)
      return

    isLoading.value = true
    loadError.value = ''

    try {
      const data = await fetchMeta(authorization)

      if (data.areas) {
        areas.value = unwrapAreaRoot(data.areas)
        writeLocalCache(AREAS_STORAGE_KEY, areas.value)
      }

      if (data.industries) {
        industries.value = data.industries
        writeLocalCache(INDUSTRIES_STORAGE_KEY, industries.value)
      }

      if (data.positions) {
        positions.value = data.positions
        writeLocalCache(POSITIONS_STORAGE_KEY, positions.value)
      }
    }
    catch (error) {
      loadError.value = error instanceof ApiRequestError ? error.message : '元数据加载失败'
    }
    finally {
      isLoading.value = false
    }
  }

  const provinceOptions = computed(() =>
    normalizedAreas.value
      .filter(a => Number(a.level) === 1)
      .map(a => ({ label: a.name, value: a.code })),
  )

  function getCitiesByProvinceCode(provinceCode: string) {
    const province = normalizedAreas.value.find(a => a.code === provinceCode)

    return (province?.children || [])
      .map(a => ({ label: a.name, value: a.code }))
  }

  function getDistrictsByCityCode(cityCode: string) {
    for (const province of normalizedAreas.value) {
      const city = province.children?.find(c => c.code === cityCode)

      if (city?.children)
        return city.children.map(a => ({ label: a.name, value: a.code }))
    }

    return []
  }

  function getAreaByCode(code: string): RcAreaNode | null {
    for (const province of normalizedAreas.value) {
      if (province.code === code)
        return province

      for (const city of province.children || []) {
        if (city.code === code)
          return city

        for (const district of city.children || []) {
          if (district.code === code)
            return district
        }
      }
    }

    return null
  }

  function buildAreaLabel(code: string): string {
    if (!code)
      return ''

    const parts: string[] = []

    for (const province of normalizedAreas.value) {
      for (const city of province.children || []) {
        if (city.code === code) {
          parts.push(province.name, city.name)
          return parts.join(' ')
        }

        for (const district of city.children || []) {
          if (district.code === code) {
            parts.push(province.name, city.name, district.name)
            return parts.join(' ')
          }
        }
      }

      if (province.code === code) {
        return province.name
      }
    }

    return code
  }

  const industryParentOptions = computed(() =>
    industries.value.map(i => ({ label: i.name, value: i.id })),
  )

  function getChildIndustries(parentId: number) {
    const parent = industries.value.find(i => i.id === parentId)
    return (parent?.children || []).map(i => ({ label: i.name, value: i.id }))
  }

  function getChildIndustriesByParentCode(parentCode: string) {
    const parent = industries.value.find(i => i.code === parentCode)
    return (parent?.children || []).map(i => ({ label: i.name, value: i.code }))
  }

  function getIndustryByCode(code: string): RcIndustryNode | null {
    for (const parent of industries.value) {
      if (parent.code === code)
        return parent
      for (const child of parent.children || []) {
        if (child.code === code)
          return child
      }
    }
    return null
  }

  function buildIndustryLabelByCode(code: string): string {
    for (const parent of industries.value) {
      if (parent.code === code)
        return parent.name
      for (const child of parent.children || []) {
        if (child.code === code)
          return `${parent.name} / ${child.name}`
      }
    }
    return ''
  }

  const positionParentOptions = computed(() =>
    positions.value.map(p => ({ label: p.name, value: p.id })),
  )

  function getChildPositions(parentId: number) {
    const parent = positions.value.find(p => p.id === parentId)
    return (parent?.children || []).map(p => ({ label: p.name, value: p.id }))
  }

  function getChildPositionCodes(parentId: number) {
    const parent = positions.value.find(p => p.id === parentId)
    return (parent?.children || []).map(p => ({ label: p.name, value: p.code }))
  }

  function getIndustryById(id: number): RcIndustryNode | null {
    for (const parent of industries.value) {
      if (parent.id === id)
        return parent
      for (const child of parent.children || []) {
        if (child.id === id)
          return child
      }
    }
    return null
  }

  function getPositionById(id: number): RcPositionNode | null {
    for (const parent of positions.value) {
      if (parent.id === id)
        return parent
      for (const child of parent.children || []) {
        if (child.id === id)
          return child
      }
    }
    return null
  }

  function buildIndustryLabel(id: number): string {
    for (const parent of industries.value) {
      if (parent.id === id)
        return parent.name
      for (const child of parent.children || []) {
        if (child.id === id)
          return `${parent.name} / ${child.name}`
      }
    }
    return ''
  }

  function buildPositionLabel(id: number): string {
    for (const parent of positions.value) {
      if (parent.id === id)
        return parent.name
      for (const child of parent.children || []) {
        if (child.id === id)
          return `${parent.name} / ${child.name}`
      }
    }
    return ''
  }

  function ensureAllLoaded(authorization: string) {
    return Promise.all([
      ensureAreasLoaded(authorization),
      ensureIndustriesLoaded(authorization),
      ensurePositionsLoaded(authorization),
    ])
  }

  return {
    areas,
    industries,
    positions,
    tags,
    schools,
    articleCategories,
    articleTags,
    isLoading,
    loadError,
    provinceOptions,
    industryParentOptions,
    positionParentOptions,
    ensureAreasLoaded,
    ensureIndustriesLoaded,
    ensurePositionsLoaded,
    ensureTagsLoaded,
    ensureSchoolsLoaded,
    ensureArticleMetaLoaded,
    loadAllMeta,
    ensureAllLoaded,
    getCitiesByProvinceCode,
    getDistrictsByCityCode,
    getAreaByCode,
    buildAreaLabel,
    getChildIndustries,
    getChildIndustriesByParentCode,
    getChildPositions,
    getChildPositionCodes,
    getIndustryById,
    getIndustryByCode,
    getPositionById,
    buildIndustryLabel,
    buildIndustryLabelByCode,
    buildPositionLabel,
  }
})

if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useMetaStore as any, import.meta.hot))
