<script setup lang="ts">
import type { CompanyAlbumItem, CompanyAlbumPayload } from '~/services/company'
import type { CompanyProfile } from '~/types/company'
import { NImage, NModal, NSelect, NTabPane, NTabs } from 'naive-ui'
import { createCompanyAlbum, deleteCompanyAlbum, getCompanyAlbums, updateCompanyAlbum, updateCompanyProfile } from '~/services/company'
import { upload } from '~/services/upload'
import { useMetaStore } from '~/stores/meta'
import { pushGlobalNotice } from '~/utils/notice'

definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

// ── Mock 开关：开发阶段使用，上线前改为 false ──
const USE_MOCK = false

const mockProfile: CompanyProfile = {
  id: 1,
  company_id: 1,
  short_name: '星瀚智能科技有限公司',
  logo: '/assets/images/employer/businessalbum1.png',
  display_logo: '/assets/images/employer/businessalbum1.png',
  city_code: '310100',
  scale_type: 4,
  scale_type_label: '500-999人',
  nature_type: 1,
  nature_type_label: '民营企业',
  industry_codes: ['tech', 'internet'],
  industry_labels: ['互联网', '人工智能'],
  founded_at: '2018-03-15',
  website: 'https://www.xinghan-tech.com',
  introduction: '星瀚智能科技成立于2018年，是一家专注于人工智能和产业数字化的高新技术企业。公司核心团队来自 BAT 等一线互联网公司，拥有丰富的技术研发和产业落地经验。目前已服务超过 200 家企业客户，覆盖金融、制造、零售等多个行业领域。我们致力于用 AI 技术推动产业升级，创造更大的社会价值。',
  benefit_tags: ['social_insurance', 'housing_fund', 'weekend_off', 'annual_bonus', 'paid_leave', 'flexible_work', 'stock_option', 'meal_allowance'],
  benefit_tag_labels: ['五险一金', '住房公积金', '双休', '年终奖', '带薪年假', '弹性工作', '股票期权', '餐补'],
  funding_stage: 4,
  funding_stage_label: 'B轮',
  profile_status: 1,
  profile_status_label: '已审核',
  is_certified: true,
}

const mockAlbums: CompanyAlbumItem[] = [
  { id: 101, company_id: 1, title: '现代化开放式办公区', image: '/assets/images/employer/businessalbum1.png', display_image: '/assets/images/employer/businessalbum1.png', description: '宽敞明亮的办公环境，配备人体工学座椅', type: 1, type_label: '办公环境', sort: 1, status: 1, status_label: '启用', extra: null, created_at: '2026-01-10 10:00:00', updated_at: '2026-01-10 10:00:00' },
  { id: 102, company_id: 1, title: '智能会议室', image: '/assets/images/employer/businessalbum2.png', display_image: '/assets/images/employer/businessalbum2.png', description: '配备智能投屏和视频会议系统', type: 1, type_label: '办公环境', sort: 2, status: 1, status_label: '启用', extra: null, created_at: '2026-01-11 10:00:00', updated_at: '2026-01-11 10:00:00' },
  { id: 103, company_id: 1, title: '休闲茶歇区', image: '/assets/images/employer/businessalbum3.png', display_image: '/assets/images/employer/businessalbum3.png', description: '免费咖啡和零食，放松身心', type: 1, type_label: '办公环境', sort: 3, status: 1, status_label: '启用', extra: null, created_at: '2026-01-12 10:00:00', updated_at: '2026-01-12 10:00:00' },
  { id: 201, company_id: 1, title: '2025年度团建活动', image: '/assets/images/employer/businessalbum1.png', display_image: '/assets/images/employer/businessalbum1.png', description: '全员三亚团建，共度美好时光', type: 2, type_label: '企业文化相册', sort: 1, status: 1, status_label: '启用', extra: null, created_at: '2026-02-01 10:00:00', updated_at: '2026-02-01 10:00:00' },
  { id: 202, company_id: 1, title: '技术分享沙龙', image: '/assets/images/employer/businessalbum2.png', display_image: '/assets/images/employer/businessalbum2.png', description: '每周技术分享会，共同成长', type: 2, type_label: '企业文化相册', sort: 2, status: 1, status_label: '启用', extra: null, created_at: '2026-02-05 10:00:00', updated_at: '2026-02-05 10:00:00' },
  { id: 203, company_id: 1, title: '员工生日会', image: '/assets/images/employer/businessalbum3.png', display_image: '/assets/images/employer/businessalbum3.png', description: '每月集体生日会，温馨氛围', type: 2, type_label: '企业文化相册', sort: 3, status: 0, status_label: '停用', extra: null, created_at: '2026-02-10 10:00:00', updated_at: '2026-02-10 10:00:00' },
  { id: 301, company_id: 1, title: '高新技术企业认证', image: '/assets/images/employer/businessalbum1.png', display_image: '/assets/images/employer/businessalbum1.png', description: '2025年获得高新技术企业认定', type: 3, type_label: '企业荣誉相册', sort: 1, status: 1, status_label: '启用', extra: null, created_at: '2026-03-01 10:00:00', updated_at: '2026-03-01 10:00:00' },
  { id: 302, company_id: 1, title: '行业创新奖', image: '/assets/images/employer/businessalbum2.png', display_image: '/assets/images/employer/businessalbum2.png', description: '荣获2025年度行业创新企业奖', type: 3, type_label: '企业荣誉相册', sort: 2, status: 1, status_label: '启用', extra: null, created_at: '2026-03-05 10:00:00', updated_at: '2026-03-05 10:00:00' },
]

const userStore = useUserStore()
const metaStore = useMetaStore()

const profile = ref<CompanyProfile | null>(null)
const isSaving = ref(false)
const isUploadingLogo = ref(false)
const errorMessage = ref('')
// 编辑弹窗 Logo：原始路径（用于判断是否修改）+ 待上传文件 + 预览 URL
const editLogoOriginalPath = ref<string | null>(null)
const editLogoPendingFile = ref<File | null>(null)
const editLogoPreviewUrl = ref<string | null>(null)

// ── 编辑弹窗 ──
const showEditDialog = ref(false)

const editForm = reactive({
  shortName: '',
  logo: null as string | null,
  displayLogo: null as string | null,
  cityCode: '',
  scaleType: null as number | null,
  natureType: null as number | null,
  industryCodes: [] as string[],
  website: '',
  introduction: '',
  benefitTags: [] as string[],
  fundingStage: null as number | null,
})

const editProvinceCode = ref('')
const editCityCode = ref('')
const editCityOptions = computed(() => metaStore.getCitiesByProvinceCode(editProvinceCode.value))
watch(editProvinceCode, () => {
  editCityCode.value = ''
})
watch(editCityCode, (code) => {
  editForm.cityCode = code
})

const scaleTypeOptions = [
  { label: '0-20人', value: 1 },
  { label: '20-99人', value: 2 },
  { label: '100-499人', value: 3 },
  { label: '500-999人', value: 4 },
  { label: '1000-9999人', value: 5 },
  { label: '10000人以上', value: 6 },
]
const natureTypeOptions = [
  { label: '民营企业', value: 1 },
  { label: '国有企业', value: 2 },
  { label: '外资企业', value: 3 },
  { label: '合资企业', value: 4 },
  { label: '事业单位', value: 5 },
  { label: '非营利组织', value: 6 },
  { label: '其他', value: 7 },
]
const fundingStageOptions = [
  { label: '未融资', value: 1 },
  { label: '天使轮', value: 2 },
  { label: 'A轮', value: 3 },
  { label: 'B轮', value: 4 },
  { label: 'C轮', value: 5 },
  { label: 'D轮及以上', value: 6 },
  { label: '已上市', value: 7 },
  { label: '不需要融资', value: 8 },
]
const benefitTagOptions = [
  { label: '五险一金', value: 'social_insurance' },
  { label: '住房公积金', value: 'housing_fund' },
  { label: '双休', value: 'weekend_off' },
  { label: '弹性工作', value: 'flexible_work' },
  { label: '年终奖', value: 'annual_bonus' },
  { label: '带薪年假', value: 'paid_leave' },
  { label: '餐补', value: 'meal_allowance' },
  { label: '交通补贴', value: 'transport_allowance' },
  { label: '股票期权', value: 'stock_option' },
  { label: '培训机会', value: 'training' },
]

// ── Tab 状态 ──
const activeTab = ref('overview')

// ── 企业相册 ──
const fileExtensionPattern = /\.[^.]+$/
const albumTypeOptions = [
  { label: '办公环境', value: 1 },
  { label: '企业文化相册', value: 2 },
  { label: '企业荣誉相册', value: 3 },
  { label: '其他', value: 4 },
]
const albumStatusOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

const albumKeyword = ref('')
const albumFilterType = ref<number | null>(null)
const albumFilterStatus = ref<number | null>(null)
const albums = ref<CompanyAlbumItem[]>([])
const isAlbumLoading = ref(false)
const isAlbumSaving = ref(false)
const editingAlbum = ref<CompanyAlbumItem | null>(null)
const previewAlbumImage = ref<string | null>(null)
// 相册图片：原始路径（判断是否修改）+ 待上传文件 + 预览 URL
const albumOriginalImage = ref('')
const albumPendingFile = ref<File | null>(null)
const albumPreviewUrl = ref('')

const albumForm = reactive({
  title: '',
  image: '',
  displayImage: '',
  description: '',
  type: 1,
  sort: 0,
  status: 1,
})

const activeAlbums = computed(() => albums.value.filter(item => item.status === 1).length)
const disabledAlbums = computed(() => albums.value.filter(item => item.status === 0).length)

const groupedAlbums = computed(() => {
  const groups: Record<string, CompanyAlbumItem[]> = {}
  const order: { type: number, label: string }[] = []
  for (const item of albums.value) {
    const label = item.type_label || '其他'
    if (!groups[label]) {
      groups[label] = []
      order.push({ type: item.type, label })
    }
    groups[label].push(item)
  }
  return order.map(o => ({ label: o.label, items: groups[o.label] }))
})

// ── 数据加载 ──
const provinceCode = ref('')
const cityCode = ref('')
const cityOptions = computed(() => metaStore.getCitiesByProvinceCode(provinceCode.value))
watch(cityCode, (code) => {
  // 仅用于展示
})

const form = reactive({
  shortName: '',
  logo: null as string | null,
  displayLogo: null as string | null,
  cityCode: '',
  scaleType: null as number | null,
  natureType: null as number | null,
  industryCodes: [] as string[],
  foundedAt: '',
  website: '',
  introduction: '',
  benefitTags: [] as string[],
  fundingStage: null as number | null,
})

function loadProfileToForm(p: CompanyProfile) {
  form.shortName = p.short_name || ''
  form.logo = p.logo
  form.displayLogo = p.display_logo
  form.cityCode = p.city_code || ''
  form.scaleType = p.scale_type
  form.natureType = p.nature_type
  form.industryCodes = p.industry_codes || []
  form.foundedAt = p.founded_at || ''
  form.website = p.website || ''
  form.introduction = p.introduction || ''
  form.benefitTags = p.benefit_tags || []
  form.fundingStage = p.funding_stage

  if (p.city_code && metaStore.areas.length) {
    const area = metaStore.getAreaByCode(p.city_code)
    if (area?.parent_code) {
      provinceCode.value = area.parent_code
      nextTick(() => {
        cityCode.value = p.city_code || ''
      })
    }
  }
}

function loadProfileToEditForm(p: CompanyProfile) {
  editForm.shortName = p.short_name || ''
  editForm.logo = p.logo
  editForm.displayLogo = p.display_logo
  editForm.cityCode = p.city_code || ''
  editForm.scaleType = p.scale_type
  editForm.natureType = p.nature_type
  editForm.industryCodes = p.industry_codes || []
  editForm.website = p.website || ''
  editForm.introduction = p.introduction || ''
  editForm.benefitTags = p.benefit_tags || []
  editForm.fundingStage = p.funding_stage

  if (p.city_code && metaStore.areas.length) {
    const area = metaStore.getAreaByCode(p.city_code)
    if (area?.parent_code) {
      editProvinceCode.value = area.parent_code
      nextTick(() => {
        editCityCode.value = p.city_code || ''
      })
    }
  }

  // 同步 Logo 原始值
  editLogoOriginalPath.value = p.logo || null
  editLogoPendingFile.value = null
  editLogoPreviewUrl.value = p.display_logo || null
}

async function loadProfile() {
  if (!userStore.authHeader)
    return null
  errorMessage.value = ''
  try {
    const { getCompanyProfile } = await import('~/services/company')
    const result = await getCompanyProfile(userStore.authHeader)
    if (USE_MOCK && !result?.short_name)
      return mockProfile
    return result
  }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '企业资料加载失败'
    if (USE_MOCK)
      return mockProfile
    return null
  }
}

await callOnce(async () => {
  if (userStore.authHeader)
    await metaStore.ensureAllLoaded(userStore.authHeader)
})

const { data: companyProfileData, pending: isLoading } = await useAsyncData(
  'employer-company-profile',
  loadProfile,
  {
    server: false,
    default: () => null,
  },
)

watch(companyProfileData, (value) => {
  profile.value = value
  if (value) {
    loadProfileToForm(value)
    loadProfileToEditForm(value)
  }
}, { immediate: true })

// ── 编辑弹窗操作 ──
function openEditDialog() {
  if (profile.value)
    loadProfileToEditForm(profile.value)
  showEditDialog.value = true
}

async function saveProfile() {
  if (!userStore.authHeader || isSaving.value)
    return
  isSaving.value = true
  let logoUploadFailed = false
  try {
    // 判断 Logo 是否修改：有新文件 或 原Logo被删除
    const logoChanged = editLogoPendingFile.value !== null || (editLogoOriginalPath.value && !editLogoPendingFile.value && !editLogoPreviewUrl.value)
    let logoPath = editLogoOriginalPath.value
    if (logoChanged && editLogoPendingFile.value) {
      // 有新文件，先上传
      isUploadingLogo.value = true
      try {
        const uploadResult = await upload(editLogoPendingFile.value, 'file', userStore.authHeader)
        logoPath = uploadResult.path
      }
      catch {
        logoUploadFailed = true
        // 上传失败仍使用原路径（如果有）
      }
      finally {
        isUploadingLogo.value = false
      }
    }
    else if (!editLogoOriginalPath.value && !editLogoPreviewUrl.value) {
      // Logo 被删除且无新文件
      logoPath = null
    }

    const result = await updateCompanyProfile({
      short_name: editForm.shortName || null,
      logo: logoPath || null,
      city_code: editForm.cityCode || null,
      scale_type: editForm.scaleType,
      nature_type: editForm.natureType,
      industry_codes: editForm.industryCodes.length > 0 ? editForm.industryCodes : undefined,
      website: editForm.website || null,
      introduction: editForm.introduction || null,
      benefit_tags: editForm.benefitTags.length > 0 ? editForm.benefitTags : undefined,
      funding_stage: editForm.fundingStage,
    } as any, userStore.authHeader)
    profile.value = result
    loadProfileToForm(result)
    loadProfileToEditForm(result)
    showEditDialog.value = false
    if (logoUploadFailed)
      pushGlobalNotice('保存成功，但 Logo 上传失败', 'warning')
    else
      pushGlobalNotice('保存成功')
  }
  catch (e) {
    pushGlobalNotice(e instanceof Error ? e.message : '保存失败', 'error')
  }
  finally {
    isSaving.value = false
  }
}

// ── 编辑弹窗 Logo 上传（延迟上传：选择时只存文件，保存时才真正上传） ─
function triggerEditLogoUpload() {
  if (!import.meta.client)
    return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/jpeg,image/png'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file)
      return
    editLogoPendingFile.value = file
    // 用本地预览展示
    editLogoPreviewUrl.value = URL.createObjectURL(file)
  }
  input.click()
}

function handleEditLogoRemove() {
  editLogoPendingFile.value = null
  editLogoPreviewUrl.value = null
}

function toggleEditBenefitTag(code: string) {
  const idx = editForm.benefitTags.indexOf(code)
  if (idx >= 0)
    editForm.benefitTags.splice(idx, 1)
  else if (editForm.benefitTags.length < 20)
    editForm.benefitTags.push(code)
}

// ── 企业相册操作 ──
async function loadAlbums() {
  if (!userStore.authHeader)
    return
  isAlbumLoading.value = true
  try {
    const result = await getCompanyAlbums(userStore.authHeader, {
      keyword: albumKeyword.value.trim() || undefined,
      type: albumFilterType.value ?? undefined,
      status: albumFilterStatus.value ?? undefined,
      per_page: 100,
    })
    const list = result.data || []
    albums.value = (USE_MOCK && list.length === 0) ? mockAlbums : list
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '企业相册加载失败', 'error')
    if (USE_MOCK)
      albums.value = mockAlbums
  }
  finally {
    isAlbumLoading.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'albums' && albums.value.length === 0)
    void loadAlbums()
})

watch([albumFilterType, albumFilterStatus], () => {
  void loadAlbums()
})

function resetAlbumForm() {
  editingAlbum.value = null
  albumForm.title = ''
  albumForm.image = ''
  albumForm.displayImage = ''
  albumForm.description = ''
  albumForm.type = 1
  albumForm.sort = 0
  albumForm.status = 1
  albumOriginalImage.value = ''
  albumPendingFile.value = null
  albumPreviewUrl.value = ''
}

// ── 相册图片上传（延迟上传：选择时只存文件，保存时才真正上传）
function triggerAlbumUpload() {
  if (!import.meta.client)
    return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file)
      return
    albumPendingFile.value = file
    albumPreviewUrl.value = URL.createObjectURL(file)
    if (!albumForm.title)
      albumForm.title = file.name.replace(fileExtensionPattern, '').slice(0, 100)
  }
  input.click()
}

function onAlbumImageRemove() {
  albumForm.image = ''
  albumForm.displayImage = ''
  albumOriginalImage.value = ''
  albumPendingFile.value = null
  albumPreviewUrl.value = ''
}

async function handleAlbumSave() {
  if (!userStore.authHeader || isAlbumSaving.value)
    return
  // 新增必须有图，编辑可以没图（保留原图）
  const hasImage = albumPreviewUrl.value || albumForm.image
  if (!hasImage && !editingAlbum.value) {
    pushGlobalNotice('请先选择相册图片', 'warning')
    return
  }
  isAlbumSaving.value = true
  let imageUploadFailed = false
  try {
    // 如果有新选择的文件，先上传
    let imagePath = albumForm.image
    if (albumPendingFile.value) {
      try {
        const uploadResult = await upload(albumPendingFile.value, 'file', userStore.authHeader)
        imagePath = uploadResult.path
        albumForm.displayImage = uploadResult.url
      }
      catch {
        imageUploadFailed = true
        if (!albumOriginalImage.value)
          imagePath = ''
      }
    }

    if (!imagePath && !editingAlbum.value) {
      pushGlobalNotice('图片上传失败，无法新增', 'error')
      return
    }

    const payload: CompanyAlbumPayload & { image: string } = {
      title: albumForm.title.trim() || null,
      image: imagePath,
      description: albumForm.description.trim() || null,
      type: albumForm.type,
      sort: Number(albumForm.sort) || 0,
      status: albumForm.status,
    }
    if (editingAlbum.value) {
      const updated = await updateCompanyAlbum(editingAlbum.value.id, payload, userStore.authHeader)
      albums.value = albums.value.map(item => item.id === updated.id ? updated : item)
      pushGlobalNotice(imageUploadFailed ? '相册图片已更新，但图片上传失败' : '相册图片已更新', imageUploadFailed ? 'warning' : 'success')
    }
    else {
      const created = await createCompanyAlbum(payload, userStore.authHeader)
      albums.value = [created, ...albums.value].sort((a, b) => a.sort - b.sort || b.id - a.id)
      pushGlobalNotice(imageUploadFailed ? '相册图片已新增，但图片上传失败' : '相册图片已新增', imageUploadFailed ? 'warning' : 'success')
    }
    resetAlbumForm()
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '保存失败', 'error')
  }
  finally {
    isAlbumSaving.value = false
  }
}

async function toggleAlbumStatus(album: CompanyAlbumItem) {
  if (!userStore.authHeader)
    return
  try {
    const updated = await updateCompanyAlbum(album.id, { status: album.status === 1 ? 0 : 1 }, userStore.authHeader)
    albums.value = albums.value.map(item => item.id === updated.id ? updated : item)
    pushGlobalNotice(updated.status === 1 ? '已启用' : '已停用')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '操作失败', 'error')
  }
}

async function handleAlbumDelete(album: CompanyAlbumItem) {
  if (!userStore.authHeader)
    return
  const ok = typeof window === 'undefined' ? true : window.confirm(`确认删除「${album.title || album.type_label || '相册图片'}」吗？`) // eslint-disable-line no-alert
  if (!ok)
    return
  try {
    await deleteCompanyAlbum(album.id, userStore.authHeader)
    albums.value = albums.value.filter(item => item.id !== album.id)
    if (editingAlbum.value?.id === album.id)
      resetAlbumForm()
    pushGlobalNotice('已删除相册图片')
  }
  catch (error) {
    pushGlobalNotice(error instanceof Error ? error.message : '删除失败', 'error')
  }
}

function fillAlbumForm(album: CompanyAlbumItem) {
  editingAlbum.value = album
  albumForm.title = album.title || ''
  albumForm.image = album.image
  albumForm.displayImage = album.display_image || ''
  albumForm.description = album.description || ''
  albumForm.type = album.type
  albumForm.sort = album.sort
  albumForm.status = album.status
  albumOriginalImage.value = album.image
  albumPendingFile.value = null
  albumPreviewUrl.value = album.display_image || ''
}

// ── 计算属性 ──
const companyName = computed(() => {
  // 优先从 userStore 获取，再从 profile 兜底，都没有则留空
  const info = userStore.currentIdentityInfo
  const fromStore = info && typeof info === 'object' ? (info.organization?.name || '') : ''
  return fromStore || profile.value?.short_name || ''
})
const creditCode = computed(() => {
  const info = userStore.currentIdentityInfo
  const fromStore = info && typeof info === 'object' ? (info.organization?.credit_code || '') : ''
  return fromStore || ''
})
const companyAddress = computed(() => {
  const info = userStore.currentIdentityInfo
  const fromStore = info && typeof info === 'object' ? (info.organization?.address || '') : ''
  return fromStore || ''
})
const allInfoLabels = computed(() => {
  if (!profile.value)
    return []
  const labels: string[] = []
  if (profile.value.industry_labels?.length)
    labels.push(...profile.value.industry_labels)
  if (profile.value.scale_type_label)
    labels.push(profile.value.scale_type_label)
  if (profile.value.nature_type_label)
    labels.push(profile.value.nature_type_label)
  if (profile.value.funding_stage_label)
    labels.push(profile.value.funding_stage_label)
  return labels
})
</script>

<template>
  <div>
    <div class="text-[14px] mb-[20px]">
      <span class="text-[#222]">企业信息</span>
    </div>
    <!-- ═══════ 上Card：企业基础信息 ═══════ -->
    <div class="rounded-[12px] bg-white ring-1 ring-[#f0f0f0]" style="padding: 16px 24px;">
      <div class="flex items-center justify-between">
        <div class="text-[16px] text-[#000] font-bold">
          企业基础信息
        </div>
        <button
          type="button"
          class="text-[14px] text-white font-medium px-6 rounded-[6px] border-none h-[36px] cursor-pointer"
          style="background: linear-gradient(135deg, #ffbe3b 0%, #ffa500 60%, #ea9400 100%);"
          @click="openEditDialog"
        >
          编辑
        </button>
      </div>

      <div class="mt-4 flex" style="gap: 19px;">
        <!-- 左侧：企业Logo -->
        <div class="rounded-[4px] bg-[#f5f5f5] flex shrink-0 items-center justify-center overflow-hidden" style="width: 64px; height: 64px;">
          <img v-if="form.displayLogo" :src="form.displayLogo" alt="企业Logo" class="h-full w-full object-cover">
          <span v-else class="i-carbon-building text-[32px] text-[#ccc]" />
        </div>
        <!-- 右侧：企业名+认证 / 标签 -->
        <div class="flex flex-col min-w-0 justify-center">
          <!-- 上方：企业名 + 认证状态 -->
          <div class="flex items-center" style="gap: 22px;">
            <span class="text-[18px] text-[#222] font-bold">{{ companyName }}</span>
            <!-- TODO: 认证状态字段，接口未返回，暂时注释 -->
            <!-- <span v-if="profile?.is_certified" class="text-[12px] text-[#52c41a] flex gap-1 items-center">
              <span class="i-carbon-checkmark-filled" /> 已认证
            </span> -->
          </div>
          <!-- 下方：标签（竖线分隔） -->
          <div class="mt-2 flex flex-wrap items-center">
            <template v-for="(label, idx) in allInfoLabels" :key="idx">
              <span v-if="idx > 0" class="inline-block" style="width: 1px; height: 10px; background: #CECECE; margin: 0 8px;" />
              <span class="text-[14px] text-[#555555]">{{ label }}</span>
            </template>
          </div>
        </div>
      </div>

      <div class="text-[14px] mt-4 gap-3 grid grid-cols-1 md:grid-cols-3">
        <div class="text-[#666] flex gap-2 items-center">
          <span class="i-carbon-location text-[14px] text-[#222]" />
          <span>{{ companyAddress }}</span>
        </div>
        <div class="text-[#222] flex gap-2 items-center">
          <span class="text-[#999]">统一社会信用代码：</span>
          <span>{{ creditCode }}</span>
        </div>
        <div class="text-[#222] flex gap-2 items-center">
          <span class="text-[#999]">公司官网：</span>
          <a v-if="form.website" :href="form.website" target="_blank" class="text-[#1890ff] no-underline">{{ form.website }}</a>
          <span v-else>—</span>
        </div>
      </div>
    </div>

    <!-- ═══════ 下Card：企业概况 / 企业相册 ═══════ -->
    <ClientOnly>
      <div class="mt-4 rounded-[12px] bg-white ring-1 ring-[#f0f0f0]" style="padding: 16px 24px;">
        <NTabs v-model:value="activeTab" type="line" animated>
          <!-- ── 企业概况 ── -->
          <NTabPane name="overview" tab="企业概况">
            <div class="py-4">
              <div class="text-[14px] text-[#222] font-semibold mb-3">
                公司简介
              </div>
              <div class="text-[14px] text-[#555] leading-7 whitespace-pre-wrap">
                {{ form.introduction || '暂无企业简介' }}
              </div>

              <div class="text-[14px] text-[#222] font-semibold mb-3 mt-6">
                企业福利
              </div>
              <!-- TODO: 工作时间、周末双休字段，后期替换为真实字段 -->
              <div class="text-[14px] text-[#222] mb-3 flex gap-6 items-center">
                <span class="flex gap-1 items-center">
                  <span class="i-carbon-time text-[14px]" /> 上午9:00–下午17:30
                </span>
                <span class="flex gap-1 items-center">
                  <span class="i-carbon-calendar text-[14px]" /> 周末双休
                </span>
              </div>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="tag in form.benefitTags" :key="tag"
                  class="text-[13px] text-[#555] px-3 py-1 rounded-[6px] bg-[#f5f5f5]"
                >{{ benefitTagOptions.find(o => o.value === tag)?.label || tag }}</span>
                <span v-if="form.benefitTags.length === 0" class="text-[13px] text-[#999]">暂无福利标签</span>
              </div>
            </div>
          </NTabPane>

          <!-- ── 企业相册 ── -->
          <NTabPane name="albums" tab="企业相册">
            <div class="py-4">
              <!-- 3:7 布局 -->
              <div class="gap-6 grid" style="grid-template-columns: 3fr 7fr;">
                <!-- 左侧：上传表单 -->
                <div>
                  <!-- 上传区域 -->
                  <div class="mb-3">
                    <div
                      v-if="!albumPreviewUrl"
                      class="border-2 border-[#d9d9d9] rounded-[8px] border-dashed bg-[#fafafa] flex flex-col w-full cursor-pointer transition items-center justify-center hover:border-[#ffa500]"
                      style="height: 160px;"
                      @click="triggerAlbumUpload"
                    >
                      <img src="/assets/images/employer/businessupload-icon.png" alt="" class="mb-2" style="width: 48px;">
                      <div class="text-[14px] text-[#ffa500]">
                        点击上传图片
                      </div>
                      <div class="text-[12px] text-[#999] mt-1">
                        支持jpg、png、webp等格式，文件大小需小于3M
                      </div>
                    </div>
                    <div v-else class="group rounded-[8px] bg-[#f5f5f5] w-full relative overflow-hidden" style="height: 160px;">
                      <img :src="albumPreviewUrl" class="h-full w-full object-cover">
                      <!-- 悬浮操作 -->
                      <div class="bg-black/40 opacity-0 flex gap-3 transition items-center inset-0 justify-center absolute group-hover:opacity-100">
                        <button type="button" class="border border-white/40 rounded-full bg-white/20 flex h-[32px] w-[32px] cursor-pointer items-center justify-center" title="预览" @click="previewAlbumImage = albumPreviewUrl">
                          <span class="i-carbon-view text-[18px] text-white" />
                        </button>
                        <button type="button" class="border border-white/40 rounded-full bg-white/20 flex h-[32px] w-[32px] cursor-pointer items-center justify-center" title="删除" @click="onAlbumImageRemove">
                          <span class="i-carbon-trash-can text-[18px] text-white" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="mt-4 space-y-3">
                    <div>
                      <div class="text-[13px] text-[#333] mb-1">
                        图片名称
                      </div>
                      <input v-model="albumForm.title" placeholder="请输入名称如：公司团建照片" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] h-[36px] w-full focus:border-[#ffa500]">
                    </div>
                    <div class="gap-3 grid grid-cols-2">
                      <div>
                        <div class="text-[13px] text-[#333] mb-1">
                          图片类型
                        </div>
                        <select v-model.number="albumForm.type" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] bg-white h-[36px] w-full">
                          <option v-for="item in albumTypeOptions" :key="item.value" :value="item.value">
                            {{ item.label }}
                          </option>
                        </select>
                      </div>
                      <div>
                        <div class="text-[13px] text-[#333] mb-1">
                          状态
                        </div>
                        <select v-model.number="albumForm.status" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] bg-white h-[36px] w-full">
                          <option v-for="item in albumStatusOptions" :key="item.value" :value="item.value">
                            {{ item.label }}
                          </option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <div class="text-[13px] text-[#333] mb-1">
                        排序
                      </div>
                      <input v-model.number="albumForm.sort" type="number" min="0" placeholder="1" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] h-[36px] w-full focus:border-[#ffa500]">
                    </div>
                    <div>
                      <div class="text-[13px] text-[#333] mb-1">
                        图片描述(选填)
                      </div>
                      <textarea v-model="albumForm.description" rows="3" placeholder="请对图片进行简单的介绍" class="text-[13px] px-3 py-2 outline-none border border-[#d9d9d9] rounded-[6px] w-full resize-none focus:border-[#ffa500]" />
                    </div>
                    <button
                      type="button"
                      class="text-[14px] text-white font-medium rounded-[6px] border-none h-[40px] w-full cursor-pointer"
                      style="background: linear-gradient(135deg, #ffbe3b 0%, #ffa500 60%, #ea9400 100%);"
                      :disabled="isAlbumSaving"
                      @click="handleAlbumSave"
                    >
                      {{ isAlbumSaving ? '保存中...' : (editingAlbum ? '保存修改' : '新增图片') }}
                    </button>
                  </div>
                </div>

                <!-- 右侧：统计 + 相册列表 -->
                <div>
                  <!-- 统计卡片 -->
                  <div class="mb-[17px] gap-4 grid grid-cols-3">
                    <div
                      class="px-5 rounded-[8px] flex items-center justify-between overflow-hidden"
                      style="aspect-ratio: 258 / 76; background: url('/assets/images/employer/businessalbum1.png') center/cover no-repeat;"
                    >
                      <div>
                        <div class="text-[14px] text-[#222]">
                          相册总数
                        </div>
                        <div class="text-[24px] text-[#FFA500] font-bold">
                          {{ albums.length }}
                        </div>
                      </div>
                    </div>
                    <div
                      class="px-5 rounded-[8px] flex items-center justify-between overflow-hidden"
                      style="aspect-ratio: 258 / 76; background: url('/assets/images/employer/businessalbum2.png') center/cover no-repeat;"
                    >
                      <div>
                        <div class="text-[14px] text-[#222]">
                          启用数
                        </div>
                        <div class="text-[24px] text-[#25B270] font-bold">
                          {{ activeAlbums }}
                        </div>
                      </div>
                    </div>
                    <div
                      class="px-5 rounded-[8px] flex items-center justify-between overflow-hidden"
                      style="aspect-ratio: 258 / 76; background: url('/assets/images/employer/businessalbum3.png') center/cover no-repeat;"
                    >
                      <div>
                        <div class="text-[14px] text-[#222]">
                          停用数
                        </div>
                        <div class="text-[24px] text-[#F16767] font-bold">
                          {{ disabledAlbums }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 相册列表 -->
                  <div class="py-[13px] pl-[15px] pr-[24px] border-[1px] border-[#ECECEC] rounded-tl-[8px] rounded-tr-[8px] bg-[#F7F7F6] flex items-center justify-between">
                    <div class="text-[14px] text-[#222] font-semibold">
                      相册列表
                    </div>
                    <div class="flex gap-2 items-center">
                      <input v-model="albumKeyword" placeholder="搜索标题/描述" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] bg-[#fff] h-[32px] w-[160px]" @keyup.enter="loadAlbums">
                      <select v-model="albumFilterType" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] bg-white h-[32px]">
                        <option :value="null">
                          全部类型
                        </option>
                        <option v-for="item in albumTypeOptions" :key="item.value" :value="item.value">
                          {{ item.label }}
                        </option>
                      </select>
                      <select v-model="albumFilterStatus" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] bg-white h-[32px]">
                        <option :value="null">
                          全部状态
                        </option>
                        <option v-for="item in albumStatusOptions" :key="item.value" :value="item.value">
                          {{ item.label }}
                        </option>
                      </select>
                      <button type="button" class="text-[14px] text-[#666] border-none bg-transparent flex gap-1 cursor-pointer items-center" @click="loadAlbums">
                        <span class="i-carbon-trash-can text-[14px] leading-none" /> <span class="leading-none">清空筛选条件</span>
                      </button>
                    </div>
                  </div>

                  <div v-if="isAlbumLoading" class="text-[14px] text-[#999] py-10 text-center">
                    加载中...
                  </div>
                  <div v-else-if="albums.length === 0" class="text-[14px] text-[#999] py-10 text-center">
                    暂无企业相册图片
                  </div>
                  <div v-else class="px-[16px] py-[6px] border-[1px] border-[#ECECEC] rounded-bl-[8px] rounded-br-[8px] border-t-none">
                    <div v-for="group in groupedAlbums" :key="group.label" class="mb-[18px]">
                      <div class="text-[14px] text-[#222] font-medium mb-[4px]">
                        {{ group.label }}
                      </div>
                      <div class="gap-3 grid" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
                        <div v-for="album in group.items" :key="album.id" class="group rounded-[8px] bg-[#f5f5f5] relative overflow-hidden" style="aspect-ratio: 4/3;">
                          <img v-if="album.display_image" :src="album.display_image" :alt="album.title || '相册'" class="h-full w-full object-cover">
                          <div v-else class="text-[13px] text-[#ccc] flex h-full w-full items-center justify-center">
                            暂无预览
                          </div>
                          <!-- 悬浮操作 -->
                          <div class="bg-black/40 opacity-0 flex gap-2 transition items-center inset-0 justify-center absolute group-hover:opacity-100">
                            <button type="button" class="text-[12px] text-white px-3 border border-white/40 rounded-[4px] bg-white/20 h-[28px] cursor-pointer" @click="fillAlbumForm(album)">
                              编辑
                            </button>
                            <button type="button" class="text-[12px] text-white px-3 border border-white/40 rounded-[4px] bg-white/20 h-[28px] cursor-pointer" @click="toggleAlbumStatus(album)">
                              {{ album.status === 1 ? '停用' : '启用' }}
                            </button>
                            <button type="button" class="text-[12px] text-white px-3 border border-red-400/60 rounded-[4px] bg-red-500/60 h-[28px] cursor-pointer" @click="handleAlbumDelete(album)">
                              删除
                            </button>
                          </div>
                          <!-- 状态角标 -->
                          <div class="right-1 top-1 absolute">
                            <span class="text-[11px] px-1.5 py-0.5 rounded-[3px]" :class="album.status === 1 ? 'bg-[#52c41a]/80 text-white' : 'bg-[#999]/80 text-white'">{{ album.status_label }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </NTabPane>
        </NTabs>
      </div>
    </ClientOnly>

    <!-- ═══════ 编辑弹窗 ═══════ -->
    <NModal v-model:show="showEditDialog" preset="card" :style="{ width: '720px', maxWidth: '95vw' }" title="编辑企业信息" :bordered="false" size="huge" role="dialog" aria-modal="true">
      <div class="gap-x-6 gap-y-4 grid grid-cols-2">
        <!-- 公司名称（只读） -->
        <div>
          <div class="text-[14px] text-[#333] mb-1">
            公司名称
          </div>
          <input :value="companyName" readonly class="text-[13px] text-[#999] px-3 border border-[#d9d9d9] rounded-[6px] bg-[#f5f5f5] h-[36px] w-full">
        </div>
        <!-- 统一社会信用代码（只读） -->
        <div>
          <div class="text-[14px] text-[#333] mb-1">
            统一社会信用代码
          </div>
          <input :value="creditCode" readonly class="text-[13px] text-[#999] px-3 border border-[#d9d9d9] rounded-[6px] bg-[#f5f5f5] h-[36px] w-full">
        </div>
        <!-- 企业logo -->
        <div>
          <div class="text-[14px] text-[#333] mb-1">
            企业logo
          </div>
          <div class="flex gap-3 items-start">
            <!-- Logo 预览 / 上传区域 -->
            <div v-if="editLogoPreviewUrl" class="group rounded-[8px] bg-[#f5f5f5] relative overflow-hidden" style="width: 72px; height: 72px;">
              <img :src="editLogoPreviewUrl" alt="Logo" class="h-full w-full object-cover">
              <div class="bg-black/40 opacity-0 flex gap-2 transition items-center inset-0 justify-center absolute group-hover:opacity-100">
                <button type="button" class="border border-white/40 rounded-full bg-white/20 flex h-[28px] w-[28px] cursor-pointer items-center justify-center" title="更换" @click="triggerEditLogoUpload">
                  <span class="i-carbon-edit text-[14px] text-white" />
                </button>
                <button type="button" class="border border-white/40 rounded-full bg-white/20 flex h-[28px] w-[28px] cursor-pointer items-center justify-center" title="删除" @click="handleEditLogoRemove">
                  <span class="i-carbon-trash-can text-[14px] text-white" />
                </button>
              </div>
            </div>
            <div v-else class="rounded-[8px] bg-[#f5f5f5] flex cursor-pointer transition items-center justify-center hover:bg-[#eee]" style="width: 72px; height: 72px;" @click="triggerEditLogoUpload">
              <span v-if="isUploadingLogo" class="text-[12px] text-[#999]">上传中...</span>
              <span v-else class="i-carbon-add text-[24px] text-[#ccc]" />
            </div>
            <div class="text-[12px] text-[#999] leading-5 mt-2">
              建议上传200*200px<br>支持jpg/png格式
            </div>
          </div>
        </div>
        <!-- 公司性质 -->
        <div>
          <div class="text-[14px] text-[#333] mb-1">
            公司性质
          </div>
          <select v-model="editForm.natureType" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] bg-white h-[36px] w-full">
            <option :value="null">
              请选择
            </option>
            <option v-for="opt in natureTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <!-- 公司规模 -->
        <div>
          <div class="text-[14px] text-[#333] mb-1">
            公司规模
          </div>
          <select v-model="editForm.scaleType" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] bg-white h-[36px] w-full">
            <option :value="null">
              请选择
            </option>
            <option v-for="opt in scaleTypeOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <!-- 融资阶段 -->
        <div>
          <div class="text-[14px] text-[#333] mb-1">
            融资阶段
          </div>
          <select v-model="editForm.fundingStage" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] bg-white h-[36px] w-full">
            <option :value="null">
              请选择
            </option>
            <option v-for="opt in fundingStageOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <!-- 公司官网 -->
        <div>
          <div class="text-[14px] text-[#333] mb-1">
            公司官网(选填)
          </div>
          <input v-model="editForm.website" placeholder="请输入" class="text-[13px] px-3 outline-none border border-[#d9d9d9] rounded-[6px] h-[36px] w-full focus:border-[#ffa500]">
        </div>
        <!-- 主办公城市 -->
        <div>
          <div class="text-[14px] text-[#333] mb-1">
            主办公城市
          </div>
          <div class="flex gap-2">
            <ClientOnly>
              <NSelect v-model:value="editProvinceCode" :options="metaStore.provinceOptions as any" placeholder="请选择" filterable clearable class="flex-1" size="small" />
              <template #fallback>
                <div class="rounded-[3px] bg-white flex-1 h-[34px] ring-1 ring-[#e0e0e6]" />
              </template>
            </ClientOnly>
            <ClientOnly>
              <NSelect v-model:value="editCityCode" :options="editCityOptions as any" placeholder="请选择" filterable clearable class="flex-1" size="small" />
              <template #fallback>
                <div class="rounded-[3px] bg-white flex-1 h-[34px] ring-1 ring-[#e0e0e6]" />
              </template>
            </ClientOnly>
          </div>
        </div>
        <!-- 公司简介（全宽） -->
        <div class="col-span-2">
          <div class="text-[14px] text-[#333] mb-1">
            公司简介
          </div>
          <textarea v-model="editForm.introduction" rows="4" placeholder="请输入公司简介" class="text-[13px] px-3 py-2 outline-none border border-[#d9d9d9] rounded-[6px] w-full resize-none focus:border-[#ffa500]" />
        </div>
      </div>

      <!-- 弹窗底部按钮 -->
      <div class="mt-6 flex gap-3 justify-end">
        <button type="button" class="text-[14px] px-6 border border-[#d9d9d9] rounded-[6px] bg-white h-[36px] cursor-pointer" @click="showEditDialog = false">
          取消
        </button>
        <!-- <button type="button" class="text-[14px] px-6 border border-[#d9d9d9] rounded-[6px] bg-white h-[36px] cursor-pointer" :disabled="isSaving" @click="saveProfileWithStatus(0)">
          存为草稿
        </button>
        <button
          type="button"
          class="text-[14px] text-white font-medium px-6 rounded-[6px] border-none h-[36px] cursor-pointer"
          style="background: linear-gradient(135deg, #ffbe3b 0%, #ffa500 60%, #ea9400 100%);"
          :disabled="isSaving"
          @click="saveProfileWithStatus(1)"
        >
          {{ isSaving ? '提交中...' : '提交审核' }}
        </button> -->
        <button
          type="button"
          class="text-[14px] text-white font-medium px-6 rounded-[6px] border-none h-[36px] cursor-pointer"
          style="background: linear-gradient(135deg, #ffbe3b 0%, #ffa500 60%, #ea9400 100%);"
          :disabled="isSaving"
          @click="saveProfile"
        >
          {{ isSaving ? '保存中...' : '保存' }}
        </button>
      </div>
    </NModal>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="text-[13px] text-[#ff4d4f] mt-3 px-4 py-2 rounded-[8px] bg-[#fff2f0] ring-1 ring-[#ffccc7]">
      {{ errorMessage }}
    </div>

    <!-- 相册图片预览 -->
    <div v-if="previewAlbumImage" class="px-4 bg-black/60 flex items-center inset-0 justify-center fixed z-50" @click.self="previewAlbumImage = null">
      <div class="max-h-[88vh] max-w-[90vw] relative">
        <ClientOnly>
          <NImage :src="previewAlbumImage" object-fit="contain" class="max-h-[80vh]" style="max-width: 90vw;" />
          <template #fallback>
            <img :src="previewAlbumImage" class="max-h-[80vh]" style="max-width: 90vw; object-fit: contain;">
          </template>
        </ClientOnly>
        <button type="button" class="rounded-full bg-white flex h-[32px] w-[32px] cursor-pointer shadow items-center justify-center absolute -right-3 -top-3" @click="previewAlbumImage = null">
          <span class="i-carbon-close text-[18px] text-[#333]" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
:deep(.n-base-selection-label) {
  height: 36px;
  background: transparent;
}
:deep(.n-base-selection) {
  border-radius: 4px;
}
:deep(.n-base-selection__border) {
  border-color: #d9d9d9;
}
</style>
