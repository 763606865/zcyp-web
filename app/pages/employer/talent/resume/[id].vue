<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()

// ============ Mock 数据 ============
const isFavorited = ref(false)

const profile = ref({
  avatar: '',
  name: '张三三',
  gender: '女',
  age: 35,
  city: '南昌',
  workYears: 10,
  contact: '15846964790',
  jobStatus: '正在找工作',
})

const intention = ref({
  position: 'PLC电气工程师',
  workType: '全职',
  salary: '9-12K x 12薪',
  city: '南昌',
  industry: '行业不限',
})

const works = ref([
  {
    company_name: '南昌市高意文化传媒有限公司',
    position: '电器工程师',
    salary: '10K/月',
    position_category: '电器工程师',
    industry: '互联网电商',
    skills: ['技能文字', '技能文字', '技能', '技能文字', '技能文字'],
    description: '负责公司各个系统项目高保真页面的整体界面视觉设计与风格把控根据产品需求，输出高质量页面视觉方案负责核心页面设计，包括首页、功能页、活动页、会员体系页等',
    start_date: '',
    end_date: '',
  },
])

const educations = ref([
  {
    school_name: '南昌大学',
    major: '电器自动化工程',
    degree: '本科',
    education_type: '全日制',
    start_date: '2020-06',
    end_date: '2024-09',
  },
])

const projects = ref([
  {
    name: '西门子电器编程操作',
    position: '电器工程师',
    start_date: '2013.09',
    end_date: '2016.02',
    description: '负责公司各个系统项目高保真页面的整体界面视觉设计与风格把控根据产品需求，输出高质量页面视觉方案负责核心页面设计，包括首页、功能页、活动页、会员体系页等负责交互动效设计，提升产品体验与页面表现力与产品经理、开发团队紧密配合，确保设计方案高质量落地持续优化产品视觉规范与设计组件库探索并应用AI设计工具，提高设计效率与创意表现力',
  },
  {
    name: '西门子电器编程操作',
    position: '电器工程师',
    start_date: '2013.09',
    end_date: '2016.02',
    description: '负责公司各个系统项目高保真页面的整体界面视觉设计与风格把控根据产品需求，输出高质量页面视觉方案负责核心页面设计，包括首页、功能页、活动页、会员体系页等负责交互动效设计，提升产品体验与页面表现力与产品经理、开发团队紧密配合，确保设计方案高质量落地持续优化产品视觉规范与设计组件库探索并应用AI设计工具，提高设计效率与创意表现力',
  },
])

const trainings = ref([
  {
    institution: '某某某某培训机构',
    content: '人员管理能力培训',
    start_date: '2026.01',
    end_date: '2026.04',
  },
])

const languages = ref([
  { language: '英语', level: '六级' },
])

const certificates = ref([
  { name: 'XXXXXXXXXX证书' },
])

const attachments = ref([
  { name: '简历.PDF', size: '203K', url: '#' },
  { name: '作品集.PDF', size: '16.3M', url: '#' },
])

function toggleFavorite() {
  isFavorited.value = !isFavorited.value
}
</script>

<template>
  <div class="px-[12px]">
    <!-- 面包屑 -->
    <div class="text-[13px] text-[#999] mb-[16px] flex gap-2 items-center">
      <NuxtLink to="/employer/talent" class="text-[#333] hover:text-[#f90]">
        推荐牛人
      </NuxtLink>
      <span>/</span>
      <span class="text-[#999]">查看简历</span>
    </div>

    <!-- 个人信息卡片 -->
    <div class="py-[22px] pl-[24px] pr-[20px] rounded-[4px] bg-white">
      <div class="flex items-start justify-between">
        <div class="flex gap-[14px] items-start">
          <div class="bg-[#f5f5f5] shrink-0 h-[89px] w-[74px] overflow-hidden">
            <img v-if="profile.avatar" :src="profile.avatar" alt="" class="h-full w-full object-cover">
            <div v-else class="text-[32px] text-[#ccc] flex h-full w-full items-center justify-center">
              👤
            </div>
          </div>
          <div>
            <div class="text-[20px] text-[#222] font-bold">
              {{ profile.name }}
            </div>
            <div class="text-[14px] text-[#666] mt-[10px] flex flex-wrap items-center">
              <span class="leading-none">{{ profile.gender }}</span>
              <div class="mx-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
              <span class="leading-none">{{ profile.age }}岁</span>
              <div class="mx-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
              <span class="leading-none">{{ profile.city }}</span>
              <div class="mx-[8px] bg-[#CECECE] h-[10px] w-[1px]" />
              <span class="leading-none">工作{{ profile.workYears }}年</span>
            </div>
            <div class="text-[14px] text-[#555] mt-[12px] flex flex-wrap gap-[53px] items-center">
              <span>联系方式：{{ profile.contact }}</span>
              <span>求职-{{ profile.jobStatus }}</span>
            </div>
          </div>
        </div>
        <div class="flex gap-3 items-center">
          <button
            class="text-[14px] text-[#FFA500] px-[20px] border border-[#FFA500] rounded-[4px] flex gap-1 h-[32px] items-center"
            @click="toggleFavorite"
          >
            <span :class="isFavorited ? 'text-[#FFA500]' : ''">{{ isFavorited ? '★' : '☆' }}</span>
            <span>收藏</span>
          </button>
          <button class="text-[14px] text-white font-medium px-[20px] rounded-[4px] border-none bg-[#f90] h-[32px]">
            立即沟通
          </button>
        </div>
      </div>
    </div>

    <!-- 主体两栏布局 -->
    <div class="mt-4 flex gap-4">
      <!-- 左侧主内容 -->
      <div class="py-[22px] pl-[24px] pr-[20px] rounded-[4px] bg-white flex-1 min-w-0">
        <!-- 求职意向 -->
        <div class="mb-[31px]">
          <div class="text-[15px] text-[#222] font-bold mb-4 flex gap-2 items-center">
            <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
            求职意向
          </div>
          <div class="text-[14px] text-[#222] flex flex-wrap items-center">
            <span class="font-medium">{{ intention.position }}</span>
            <div class="text-[12px] text-[#999] ml-[7px] px-[4px] py-[1px] border-1 border-[#ECECEC] bg-[#FCFCFC]">
              {{ intention.workType }}
            </div>
            <span class="ml-[30px]">{{ intention.salary }}</span>
            <span class="text-[#CECECE] mx-[16px]">|</span>
            <span>{{ intention.city }}</span>
            <span class="text-[#CECECE] mx-[16px]">|</span>
            <span class="text-[#999999]">{{ intention.industry }}</span>
          </div>
        </div>

        <!-- 工作/实习经历 -->
        <div v-if="works.length" class="mb-[31px]">
          <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
            <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
            工作/实习经历
          </div>
          <div v-for="(w, wi) in works" :key="wi" :class="{ 'border-b border-[#f0f0f0]': wi < works.length - 1 }">
            <div class="flex items-center justify-between">
              <div class="text-[16px] text-[#222] font-bold mb-[18px]">
                {{ w.company_name }}
              </div>
            </div>
            <div class="text-[14px] text-[#222] mb-[16px]">
              {{ w.position }}
              <span class="text-[#ddd] mx-[16px]">|</span>
              <span>{{ w.salary }}</span>
            </div>
            <div class="text-[14px] text-[#222] mb-[16px]">
              <span class="text-[#999]">职位类别：<span class="text-[#222]">{{ w.position_category }}</span></span>
              <span class="text-[#999] ml-[158px]">所属行业：<span class="text-[#222]">{{ w.industry }}</span></span>
            </div>
            <div v-if="w.skills?.length" class="mb-[16px] flex flex-wrap items-center">
              <span class="text-[14px] text-[#999]">拥有技能：</span>
              <span
                v-for="(s, si) in w.skills"
                :key="si"
                class="text-[14px] text-[#555] mr-[8px] px-[18px] py-[6px] rounded-[4px] bg-[#efefef]"
              >
                {{ s }}
              </span>
            </div>
            <div v-if="w.description" class="text-[14px] text-[#222] leading-6">
              <span class="text-[#999]">工作内容：</span>{{ w.description }}
            </div>
          </div>
        </div>

        <!-- 教育经历 -->
        <div v-if="educations.length" class="mb-[31px]">
          <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
            <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
            教育经历
          </div>
          <div v-for="(e, ei) in educations" :key="ei" class="flex gap-[10px] items-start" :class="{ 'mb-[12px]]': ei < educations.length - 1 }">
            <div class="text-[10px] text-[#999] rounded-[8px] bg-[#f5f5f5] flex shrink-0 h-[52px] w-[52px] items-center justify-center">
              学校<br>logo
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex gap-[11px] items-center">
                <span class="text-[16px] text-[#222] font-bold">{{ e.school_name }}</span>
                <span class="text-[14px] text-[#999]">{{ e.start_date }}—{{ e.end_date }}</span>
              </div>
              <div class="text-[14px] text-[#222] mt-[11px]">
                {{ e.major }}
                <span class="text-[#CECECE] mx-[16px]">|</span>
                <span>{{ e.degree }}·{{ e.education_type }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 项目经历 -->
        <div v-if="projects.length" class="mb-[31px]">
          <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
            <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
            项目经历
          </div>
          <div v-for="(p, pi) in projects" :key="pi" :class="{ 'pb-[16px]': pi < projects.length - 1 }">
            <div class="mb-[16px] flex items-center">
              <span class="text-[16px] text-[#222] font-bold mr-[16px]">{{ p.name }}</span>
              <span class="text-[14px] text-[#666] mr-[8px]">{{ p.position }}</span>
              <span class="text-[14px] text-[#999]">{{ p.start_date }}-{{ p.end_date }}</span>
            </div>
            <div v-if="p.description" class="text-[14px] text-[#555] flex">
              <div class="text-[#999] w-[70px]">
                项目描述：
              </div>
              <div class="flex-1 whitespace-pre-wrap">
                {{ p.description }}
              </div>
            </div>
          </div>
        </div>

        <!-- 培训经历 -->
        <div v-if="trainings.length" class="mb-[31px]">
          <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
            <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
            培训经历
          </div>
          <div v-for="(t, ti) in trainings" :key="ti" class="flex items-center justify-between" :class="{ 'mb-[12px]': ti < trainings.length - 1 }">
            <div>
              <span class="text-[14px] text-[#222] font-medium">{{ t.institution }}</span>
              <span class="text-[14px] text-[#222] ml-[58px]">{{ t.content }}</span>
              <span class="text-[14px] text-[#999] ml-[94px]">{{ t.start_date }}-{{ t.end_date }}</span>
            </div>
          </div>
        </div>

        <!-- 语言能力 -->
        <div v-if="languages.length" class="mb-[31px]">
          <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
            <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
            语言能力
          </div>
          <div class="text-[14px] flex gap-[113px] items-center">
            <div>
              <span class="text-[#999]">语种：</span>
              <span class="text-[#222]">{{ languages[0].language }}</span>
            </div>
            <div>
              <span class="text-[#999]">等级：</span>
              <span class="text-[#222]">{{ languages[0].level }}</span>
            </div>
          </div>
        </div>

        <!-- 专业证书 -->
        <div v-if="certificates.length">
          <div class="text-[14px] text-[#222] font-bold mb-[16px] flex gap-2 items-center">
            <span class="rounded-full bg-[#f90] h-[16px] w-[3px] inline-block" />
            专业证书
          </div>
          <div class="text-[14px]">
            <span class="text-[#999]">证书名称：</span>
            <span class="text-[#222]">{{ certificates[0].name }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧附件栏 -->
      <div class="shrink-0 w-[280px]">
        <div class="p-[16px] rounded-[8px] bg-white ring-1 ring-[#f0f0f0] shadow-sm">
          <div class="text-[15px] text-[#222] font-bold mb-[16px]">
            他的附件
          </div>
          <div class="space-y-[25px]">
            <div v-for="(file, fi) in attachments" :key="fi" class="flex gap-3 items-start">
              <div class="rounded-[6px] bg-[#fff0f0] flex shrink-0 h-[48px] w-[48px] items-center justify-center">
                <span class="text-[11px] text-[#f56c6c] font-bold">PDF</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[16px] text-[#222] font-[500] mb-[7px] truncate">
                  {{ file.name }}
                </div>
                <div class="text-[14px] text-[#999] leading-none">
                  {{ file.size }}
                </div>
              </div>
              <a :href="file.url" class="text-[12px] text-[#FFA500] shrink-0 hover:underline">
                下载附件
              </a>
            </div>
          </div>
          <button class="text-[14px] text-white font-medium mt-[31px] rounded-[16px] border-none bg-[#FFA500] h-[32px] w-full">
            全部下载
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
