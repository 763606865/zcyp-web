<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: ['auth', 'identity-required'],
})

const router = useRouter()
const route = useRoute()

// Mock 数据
const mockJob = ref({
  id: Number(route.params.id) || 1,
  title: 'UI/UX设计负责人-中国大区',
  employment_type_label: '社招全职',
  salary_min: 22000,
  salary_max: 32000,
  salary_unit: 1,
  salary_unit_label: '月薪',
  salary_multiplier: 13,
  salary_negotiable: false,
  city_label: '南昌',
  experience_label: '5-10年',
  education_level_label: '本科',
  workplace: '南昌红谷滩区绿地中心期-A座13',
  lng: 115.858198,
  lat: 28.657922,
  benefit: '五险一金,年终奖,带薪年假,餐补,交通补贴,定期体检,节日福利,弹性工作',
  description: `（1）负责公司内部系统、数据可视化平台、项目工程经济管理系统等产品的界面视觉设计；
（2）参与产品需求讨论，根据业务场景完成高质量UI设计稿及交互说明；
（3）制定和维护设计规范，保证产品视觉风格统一、用户体验良好；
（4）跟进设计落地，与前端开发协作，确保实现效果与设计一致。`,
  requirement: `（1）公司提供五险一金+奖金等丰富待遇；
（2）注重员工成长，鼓励技术交流与设计创新；
（3）公司行业稳定，设计方向以效率工具和数据可视化为核心，有长期迭代价值。`,
  other_note: `（1）简历投递后我们将在3个工作日内反馈；
（2）面试流程：初试-复试-HR面；
（3）入职需提供离职证明、学历证明等材料。`,
  keywords: ['UI设计', 'UX设计', '数据可视化', '设计规范', 'Figma'],
  headcount: 2,
  show_headcount: true,
  status: 1,
  status_label: '招聘中',
})

const mockCompany = ref({
  name: '北京气质云知识产权代理有限公司',
  logo: '',
  verified: true,
  industry: '互联网',
  scale: '10000人以上',
  nature: '上市公司',
  funding_stage: 'c轮融资',
  introduction: `中创意义创建于1999年，是全国领先的企业数字门户服务商，为企业级客户提供行业化的数字营销、业务经营相关的产品与服务，以SaaS产品通过全国本地服务网络、帮助企业打通全域数字化营销与数字化业务的一站式平台。中企动力自成立起一直专注于企业与机构服务，总部位于北京，在全国24个省市拥有近70家分公司、5000名员工，累计服务150万+企业客户，其中规模以上企业客户80万+，涉及工业、食品、零售在全国24个省市拥有近70家分公司、5000名员工，累计服务150万+企业客户，其中规模以上企业客户80万+企业客...`,
  business_info: {
    company_name: '北京气质云知识产权代理有限公司',
    enterprise_type: '股份有限公司',
    legal_person: '王武',
    business_status: '存续',
    established_date: '2003-01-01',
    registered_capital: '1000万元',
  },
})

const benefitTags = computed(() => {
  const raw = mockJob.value.benefit
  if (!raw)
    return []
  return raw.split(',').map(s => s.trim()).filter(Boolean)
})

const salaryDisplay = computed(() => {
  const job = mockJob.value
  if (job.salary_negotiable && job.salary_min !== null && job.salary_max !== null) {
    if (job.salary_unit === 1) {
      const minW = (job.salary_min / 10000).toFixed(1)
      const maxW = (job.salary_max / 10000).toFixed(1)
      return `${minW}-${maxW}万·${job.salary_multiplier}薪 面议`
    }
    return `${job.salary_min}-${job.salary_max}·${job.salary_multiplier}薪 面议`
  }
  if (job.salary_negotiable)
    return '面议'
  if (job.salary_unit === 1) {
    const minW = (job.salary_min / 10000).toFixed(1)
    const maxW = (job.salary_max / 10000).toFixed(1)
    return `${minW}-${maxW}万·${job.salary_multiplier}薪`
  }
  return `${job.salary_min}-${job.salary_max}·${job.salary_multiplier}薪`
})

function goEdit() {
  router.push(`/employer/jobs/edit/${mockJob.value.id}`)
}
</script>

<template>
  <div>
    <!-- 面包屑 -->
    <div class="mb-[16px] flex gap-[8px] items-center">
      <NuxtLink to="/employer/jobs" class="text-[14px] text-[#BBBDBF] leading-none no-underline hover:text-[#FFA500]">
        职位管理
      </NuxtLink>
      <span class="text-[14px] text-[#BBBDBF] leading-none">/</span>
      <span class="text-[14px] text-[#222222] leading-none">职位详情</span>
    </div>

    <!-- 主白色 Card -->
    <div class="rounded-[4px] bg-white" style="padding: 16px 32px;">
      <!-- 标题行 -->
      <div class="mb-[16px] flex items-center justify-between">
        <h1 class="text-[24px] text-[#222] leading-none font-bold">
          查看职位详情
        </h1>
        <button
          class="text-[14px] text-white px-[16px] rounded-[4px] border-none bg-[#FFA500] no-underline inline-flex gap-[6px] h-[32px] cursor-pointer items-center hover:bg-[#E69500]"
          @click="goEdit"
        >
          <span class="i-carbon-edit text-[14px]" />
          <span>编辑</span>
        </button>
      </div>

      <!-- #F7F7F6 数据内容区域 -->
      <div style="background-color: #F7F7F6; padding: 28px 100px; border-radius: 4px;">
        <!-- 职位基本信息 -->
        <h2 class="text-[28px] text-[#222] font-bold" style="margin-bottom: 8px;">
          {{ mockJob.title }}
        </h2>
        <div class="text-[24px] text-[#FFA500] font-semibold" style="margin-bottom: 16px;">
          {{ salaryDisplay }}
        </div>
        <div class="text-[14px] text-[#000] flex gap-[24px] items-center" style="margin-bottom: 16px;">
          <span class="flex gap-[4px] items-center">
            <span class="i-carbon-location text-[#999]" />
            {{ mockJob.city_label }}
          </span>
          <span class="flex gap-[4px] items-center">
            <span class="i-carbon-time text-[#999]" />
            {{ mockJob.experience_label }}
          </span>
          <span class="flex gap-[4px] items-center">
            <span class="i-carbon-education text-[#999]" />
            {{ mockJob.education_level_label }}
          </span>
        </div>

        <!-- 职位描述 + 工作地址 合并卡片 -->
        <div class="rounded-[4px] bg-white" style="padding: 20px 24px;">
          <!-- 职位描述 -->
          <h3 class="text-[16px] text-[#222] font-semibold mb-[16px]">
            职位描述
          </h3>

          <!-- 福利标签 -->
          <div v-if="benefitTags.length > 0" class="mb-[20px] flex flex-wrap gap-[8px]">
            <span
              v-for="tag in benefitTags"
              :key="tag"
              class="text-[13px] text-[#595959] px-[12px] py-[4px] border border-[#EBEDF0] rounded-[4px] bg-[#F7F8FA]"
            >
              {{ tag }}
            </span>
          </div>

          <!-- 岗位职责 -->
          <div class="mb-[20px]">
            <h4 class="text-[14px] text-[#555] font-semibold mb-[8px]">
              岗位职责
            </h4>
            <p class="text-[14px] text-[#262626] leading-[28px] whitespace-pre-line">
              {{ mockJob.description }}
            </p>
          </div>

          <!-- 岗位要求 -->
          <div class="mb-[20px]">
            <h4 class="text-[14px] text-[#555] font-semibold mb-[8px]">
              岗位要求
            </h4>
            <p class="text-[14px] text-[#262626] leading-[28px] whitespace-pre-line">
              {{ mockJob.requirement }}
            </p>
          </div>

          <!-- 其他说明 -->
          <div class="mb-[20px]">
            <h4 class="text-[14px] text-[#555] font-semibold mb-[8px]">
              其他说明
            </h4>
            <p class="text-[14px] text-[#262626] leading-[28px] whitespace-pre-line">
              {{ mockJob.other_note }}
            </p>
          </div>

          <!-- 工作地址 -->
          <h3 class="text-[16px] text-[#222] font-semibold mb-[16px]">
            工作地址
          </h3>
          <AmapLocationView
            :address="mockJob.workplace"
            :lng="mockJob.lng"
            :lat="mockJob.lat"
          />
        </div>

        <!-- 公司信息卡片 -->
        <div class="rounded-[4px] bg-white" style="padding: 20px 24px; margin-top: 20px;">
          <h3 class="text-[16px] text-[#222] font-semibold mb-[20px]">
            公司信息
          </h3>

          <!-- 公司头部 -->
          <div class="mb-[12px] flex gap-[12px] items-center">
            <div class="rounded-[8px] bg-[#F7F8FA] flex shrink-0 h-[48px] w-[48px] items-center justify-center overflow-hidden">
              <span v-if="!mockCompany.logo" class="text-[20px] text-[#BBBDBF] font-bold">
                {{ mockCompany.name.charAt(0) }}
              </span>
              <img v-else :src="mockCompany.logo" class="h-full w-full object-cover" :alt="mockCompany.name">
            </div>
            <div class="flex gap-[8px] items-center">
              <span class="text-[16px] text-[#222] font-semibold">{{ mockCompany.name }}</span>
              <span v-if="mockCompany.verified" class="text-[12px] text-[#FFA500] flex gap-[2px] items-center">
                <span class="i-carbon-checkmark-filled text-[14px]" />
                已认证
              </span>
            </div>
          </div>

          <!-- 公司标签 -->
          <div class="mb-[20px] flex flex-wrap gap-[8px]">
            <span class="text-[13px] text-[#595959]">{{ mockCompany.industry }}</span>
            <span class="text-[13px] text-[#595959]">{{ mockCompany.scale }}</span>
            <span class="text-[13px] text-[#595959]">{{ mockCompany.nature }}</span>
            <span class="text-[13px] text-[#595959]">{{ mockCompany.funding_stage }}</span>
          </div>

          <!-- 公司介绍 -->
          <div class="mb-[24px]">
            <h4 class="text-[14px] text-[#222] font-semibold mb-[8px]">
              公司介绍
            </h4>
            <p class="text-[14px] text-[#595959] leading-[24px]">
              {{ mockCompany.introduction }}
            </p>
          </div>

          <!-- 工商信息 -->
          <div>
            <h4 class="text-[14px] text-[#222] font-semibold mb-[12px]">
              工商信息
            </h4>
            <div class="gap-x-[24px] gap-y-[16px] grid grid-cols-3">
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  公司名称
                </div>
                <div class="text-[14px] text-[#262626]">
                  {{ mockCompany.business_info.company_name }}
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  企业类型
                </div>
                <div class="text-[14px] text-[#262626]">
                  {{ mockCompany.business_info.enterprise_type }}
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  法人代表
                </div>
                <div class="text-[14px] text-[#262626]">
                  {{ mockCompany.business_info.legal_person }}
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  经营状态
                </div>
                <div class="text-[14px] text-[#262626]">
                  {{ mockCompany.business_info.business_status }}
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  成立时间
                </div>
                <div class="text-[14px] text-[#262626]">
                  {{ mockCompany.business_info.established_date }}
                </div>
              </div>
              <div>
                <div class="text-[13px] text-[#999] mb-[4px]">
                  注册资本
                </div>
                <div class="text-[14px] text-[#262626]">
                  {{ mockCompany.business_info.registered_capital }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
