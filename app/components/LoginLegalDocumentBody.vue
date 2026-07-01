<script setup lang="ts">
import type { VNode } from 'vue'
import { Comment, computed, Fragment, Text, useSlots } from 'vue'

type LegalTextBlockType = 'section' | 'subsection' | 'item' | 'toc' | 'info' | 'paragraph'

interface LegalTextBlock {
  id: string
  text: string
  type: LegalTextBlockType
}

const lineBreakPattern = /\r?\n/
const tocHeadingPattern = /^[一二三四五六七八九十]+、\s+/
const sectionHeadingPattern = /^[一二三四五六七八九十]+、/
const subsectionHeadingPattern = /^（[一二三四五六七八九十]+）/
const itemPattern = /^(?:\d+[.．]|（\d+）|\(\d+\))/
const infoPattern = /^(?:第三方名称|收集个人信息类型及目的|隐私政策链接|公司名称|注册地址|联系电话|联系邮箱)[:：]?/

const slots = useSlots()

const legalTextBlocks = computed<LegalTextBlock[]>(() => {
  const rawText = flattenSlotText(slots.default?.() ?? []).join('\n')

  return rawText
    .split(lineBreakPattern)
    .map(line => line.trim())
    .filter(Boolean)
    .map((text, index) => ({
      id: `${index}-${text.slice(0, 12)}`,
      text,
      type: getBlockType(text),
    }))
})

function flattenSlotText(nodes: VNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === Comment) {
      return []
    }

    if (node.type === Text && typeof node.children === 'string') {
      return [node.children]
    }

    if (node.type === Fragment && Array.isArray(node.children)) {
      return flattenSlotText(node.children as VNode[])
    }

    if (typeof node.children === 'string') {
      return [node.children]
    }

    if (Array.isArray(node.children)) {
      return flattenSlotText(node.children as VNode[])
    }

    return []
  })
}

function getBlockType(text: string): LegalTextBlockType {
  if (tocHeadingPattern.test(text)) {
    return 'toc'
  }

  if (sectionHeadingPattern.test(text)) {
    return 'section'
  }

  if (subsectionHeadingPattern.test(text)) {
    return 'subsection'
  }

  if (itemPattern.test(text)) {
    return 'item'
  }

  if (infoPattern.test(text)) {
    return 'info'
  }

  return 'paragraph'
}
</script>

<template>
  <div class="legal-document-text">
    <template v-for="block in legalTextBlocks" :key="block.id">
      <h2 v-if="block.type === 'section'" class="legal-document-text__section">
        {{ block.text }}
      </h2>
      <h3 v-else-if="block.type === 'subsection'" class="legal-document-text__subsection">
        {{ block.text }}
      </h3>
      <p v-else class="legal-document-text__paragraph" :class="`is-${block.type}`">
        {{ block.text }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.legal-document-text {
  color: rgba(58, 66, 82, 1);
  font-size: 14px;
  line-height: 1.9;
}

.legal-document-text__section {
  margin: 28px 0 12px;
  border-left: 4px solid rgba(255, 153, 0, 1);
  border-radius: 6px;
  background: rgba(255, 153, 0, 0.08);
  color: rgba(8, 24, 54, 1);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.55;
  padding: 9px 12px;
}

.legal-document-text__section:first-child {
  margin-top: 0;
}

.legal-document-text__subsection {
  margin: 18px 0 8px;
  color: rgba(22, 32, 50, 1);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.65;
}

.legal-document-text__paragraph {
  margin: 0 0 10px;
  color: rgba(58, 66, 82, 1);
  font-size: 14px;
  line-height: 1.9;
  text-align: justify;
}

.legal-document-text__paragraph.is-item,
.legal-document-text__paragraph.is-toc {
  padding-left: 1.6em;
  text-indent: -1.6em;
}

.legal-document-text__paragraph.is-item {
  color: rgba(70, 80, 98, 1);
}

.legal-document-text__paragraph.is-toc {
  margin-bottom: 6px;
  color: rgba(88, 99, 118, 1);
  font-weight: 600;
}

.legal-document-text__paragraph.is-info {
  margin-bottom: 6px;
  border-radius: 6px;
  background: rgba(245, 247, 251, 1);
  color: rgba(43, 52, 69, 1);
  font-weight: 600;
  padding: 7px 10px;
}

.legal-document-text__paragraph:last-child {
  margin-bottom: 0;
}
</style>
