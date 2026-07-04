<script setup lang="ts">
import { NInputNumber, NSelect } from 'naive-ui'

interface SelectOption {
  label: string
  value: string | number
}

defineProps<{
  displayedCityFilters: string[]
  selectedCityFilter: string
  salaryFilters: string[]
  selectedSalaryFilter: string
  customSalaryMin: number | null
  customSalaryMax: number | null
  customSalaryMinValue: number
  customSalaryMaxValue: number
  customSalaryStep: number
  experienceFilters: SelectOption[]
  selectedExperienceFilter: number
  employmentTypeFilters: SelectOption[]
  selectedEmploymentTypeFilter: number
  educationLevelSelectOptions: SelectOption[]
  selectedEducationLevelFilter: number
  companySizeSelectOptions: SelectOption[]
  selectedCompanySizeFilter: number
}>()

defineEmits<{
  selectCity: [value: string]
  moreCity: []
  selectSalary: [value: string]
  updateCustomSalaryMin: [value: number | null]
  updateCustomSalaryMax: [value: number | null]
  selectExperience: [value: number]
  selectEmploymentType: [value: number]
  selectEducation: [value: string | number | null]
  selectCompanySize: [value: string | number | null]
}>()
</script>

<template>
  <div class="job-list-filter-body">
    <div class="filter-row">
      <div class="filter-label">
        工作地点
      </div>
      <div class="filter-options is-city-options">
        <button v-for="item in displayedCityFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': selectedCityFilter === item }" @click="$emit('selectCity', item)">
          {{ item }}
        </button>
        <button type="button" class="filter-option is-more" @click="$emit('moreCity')">
          更多城市 <span class="i-carbon-caret-right" />
        </button>
      </div>
    </div>

    <div class="filter-row">
      <div class="filter-label">
        薪资待遇
      </div>
      <div class="filter-options">
        <button v-for="item in salaryFilters" :key="item" type="button" class="filter-option" :class="{ 'is-selected': selectedSalaryFilter === item }" @click="$emit('selectSalary', item)">
          {{ item }}
        </button>
        <div v-if="selectedSalaryFilter === '自定义'" class="salary-range-filter">
          <ClientOnly>
            <NInputNumber
              :value="customSalaryMin"
              class="salary-range-input"
              size="small"
              placeholder="最低"
              :min="customSalaryMinValue"
              :max="customSalaryMaxValue"
              :step="customSalaryStep"
              :show-button="false"
              @update:value="$emit('updateCustomSalaryMin', $event)"
            />
            <span>至</span>
            <NInputNumber
              :value="customSalaryMax"
              class="salary-range-input"
              size="small"
              placeholder="最高"
              :min="customSalaryMinValue"
              :max="customSalaryMaxValue"
              :step="customSalaryStep"
              :show-button="false"
              @update:value="$emit('updateCustomSalaryMax', $event)"
            />
            <template #fallback>
              <span class="salary-range-placeholder">最低</span>
              <span>至</span>
              <span class="salary-range-placeholder">最高</span>
            </template>
          </ClientOnly>
        </div>
      </div>
    </div>

    <div class="filter-row">
      <div class="filter-label">
        经验要求
      </div>
      <div class="filter-options">
        <button v-for="item in experienceFilters" :key="item.value" type="button" class="filter-option" :class="{ 'is-selected': selectedExperienceFilter === item.value }" @click="$emit('selectExperience', Number(item.value))">
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="filter-row">
      <div class="filter-label">
        工作性质
      </div>
      <div class="filter-options is-employment-options">
        <button v-for="item in employmentTypeFilters" :key="item.value" type="button" class="filter-option" :class="{ 'is-selected': selectedEmploymentTypeFilter === item.value }" @click="$emit('selectEmploymentType', Number(item.value))">
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="filter-row">
      <div class="filter-label">
        其他筛选
      </div>
      <div class="filter-options is-extra-options">
        <ClientOnly>
          <NSelect
            class="filter-select"
            :class="{ 'is-selected': selectedEducationLevelFilter !== 0 }"
            :value="selectedEducationLevelFilter"
            :options="educationLevelSelectOptions"
            size="small"
            :consistent-menu-width="false"
            @update:value="$emit('selectEducation', $event)"
          />
          <NSelect
            class="filter-select"
            :class="{ 'is-selected': selectedCompanySizeFilter !== 0 }"
            :value="selectedCompanySizeFilter"
            :options="companySizeSelectOptions"
            size="small"
            :consistent-menu-width="false"
            @update:value="$emit('selectCompanySize', $event)"
          />
          <template #fallback>
            <span class="filter-select-placeholder">学历要求</span>
            <span class="filter-select-placeholder">公司规模</span>
          </template>
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<style scoped>
.job-list-filter-body {
  padding: 14px 30px 22px;
}

.filter-row {
  display: flex;
  min-height: 48px;
  align-items: center;
}

.filter-label {
  width: 88px;
  flex: 0 0 88px;
  color: #222;
  font-size: 14px;
  font-weight: 500;
}

.filter-options {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 20px;
}

.filter-options.is-city-options,
.filter-options.is-employment-options {
  flex-wrap: nowrap;
  gap: 8px 20px;
  overflow: hidden;
}

.filter-options.is-city-options .filter-option,
.filter-options.is-employment-options .filter-option {
  flex: 0 0 auto;
}

.filter-options:not(.is-extra-options) .filter-option:first-child {
  width: 74px;
  padding-right: 0;
  padding-left: 0;
  text-align: center;
}

.filter-options.is-extra-options {
  flex-wrap: nowrap;
  gap: 8px 16px;
}

.filter-option {
  height: 32px;
  padding: 0 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  color: #222;
  cursor: pointer;
  font-size: 14px;
  line-height: 30px;
  white-space: nowrap;
}

.filter-option.is-selected {
  border-color: #ff9700;
  color: #ff9700;
}

.filter-option.is-more {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #aaa;
}

.filter-select {
  width: 156px;
  --n-border: 1px solid transparent !important;
  --n-border-active: 1px solid #ff9700 !important;
  --n-border-focus: 1px solid #ff9700 !important;
  --n-border-hover: 1px solid transparent !important;
  --n-border-radius: 999px !important;
  --n-box-shadow-active: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: #f4f5f8 !important;
  --n-color-active: #f4f5f8 !important;
  --n-color-disabled: #f4f5f8 !important;
  --n-font-size: 14px !important;
  --n-height: 32px !important;
  --n-placeholder-color: #6f737c !important;
  --n-text-color: #6f737c !important;
}

.filter-select.is-selected {
  --n-border: 1px solid #ff9700 !important;
  --n-border-hover: 1px solid #ff9700 !important;
  --n-text-color: #ff9700 !important;
}

.filter-select :deep(.n-base-selection-label) {
  padding-right: 26px;
  padding-left: 14px;
}

.filter-select :deep(.n-base-selection-input) {
  cursor: pointer;
}

.filter-select-placeholder {
  display: inline-flex;
  width: 156px;
  height: 32px;
  align-items: center;
  padding: 0 14px;
  border-radius: 999px;
  background: #f4f5f8;
  color: #6f737c;
  font-size: 14px;
}

.salary-range-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6f737c;
  font-size: 14px;
}

.salary-range-input {
  width: 82px;
  --n-border: 1px solid #eef0f4 !important;
  --n-border-active: 1px solid #ff9700 !important;
  --n-border-focus: 1px solid #ff9700 !important;
  --n-border-hover: 1px solid #ff9700 !important;
  --n-border-radius: 999px !important;
  --n-box-shadow-active: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: #f4f5f8 !important;
  --n-color-active: #fff !important;
  --n-font-size: 14px !important;
  --n-height: 32px !important;
  --n-placeholder-color: #9aa0aa !important;
  --n-text-color: #222 !important;
}

.salary-range-input :deep(.n-input__input-el) {
  text-align: center;
}

.salary-range-placeholder {
  display: inline-flex;
  width: 82px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border: 1px solid #eef0f4;
  border-radius: 999px;
  background: #f4f5f8;
  color: #9aa0aa;
  font-size: 14px;
}

@media (max-width: 720px) {
  .job-list-filter-body {
    padding-right: 18px;
    padding-left: 18px;
  }

  .filter-row {
    align-items: flex-start;
  }

  .filter-label {
    width: 74px;
    flex-basis: 74px;
    padding-top: 7px;
  }

  .filter-options {
    gap: 8px 13px;
  }

  .filter-options,
  .filter-options.is-city-options,
  .filter-options.is-employment-options,
  .filter-options.is-extra-options {
    flex-wrap: wrap;
    overflow: visible;
  }
}
</style>
