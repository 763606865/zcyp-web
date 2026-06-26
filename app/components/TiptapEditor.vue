<script setup lang="ts">
import { upload } from '~/services/upload'

const props = withDefaults(defineProps<{
  modelValue?: string | null
  placeholder?: string
}>(), {
  modelValue: '',
  placeholder: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const userStore = useUserStore()
const editorEl = ref<HTMLDivElement>()
let editorInstance: any = null

async function initEditor() {
  if (editorInstance || import.meta.server || !editorEl.value)
    return
  const { Editor } = await import('@tiptap/core')
  const { default: StarterKit } = await import('@tiptap/starter-kit')
  const { default: Image } = await import('@tiptap/extension-image')
  const { default: Link } = await import('@tiptap/extension-link')
  const { default: Placeholder } = await import('@tiptap/extension-placeholder')

  editorInstance = new Editor({
    element: editorEl.value,
    content: props.modelValue,
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: props.placeholder }),
    ],
    onUpdate({ editor }: any) {
      emit('update:modelValue', editor.getHTML())
    },
  })
}

watch(() => props.modelValue, (val) => {
  if (editorInstance && val !== editorInstance.getHTML())
      editorInstance.commands.setContent(val || '', false)
})

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
})

function execCmd(command: string, value?: string) {
  if (!editorInstance)
    return
  const chain = editorInstance.chain().focus()
  switch (command) {
    case 'bold':
      chain.toggleBold().run()
      break
    case 'italic':
      chain.toggleItalic().run()
      break
    case 'strike':
      chain.toggleStrike().run()
      break
    case 'heading':
      chain.toggleHeading({ level: Number(value) || 2 }).run()
      break
    case 'bulletList':
      chain.toggleBulletList().run()
      break
    case 'orderedList':
      chain.toggleOrderedList().run()
      break
    case 'blockquote':
      chain.toggleBlockquote().run()
      break
    case 'codeBlock':
      chain.toggleCodeBlock().run()
      break
    case 'horizontalRule':
      chain.setHorizontalRule().run()
      break
    case 'undo':
      chain.undo().run()
      break
    case 'redo':
      chain.redo().run()
      break
  }
}

function setLink() {
  if (!editorInstance)
    return
  // eslint-disable-next-line no-alert
  const url = window.prompt('输入链接地址')
  if (url)
    editorInstance.chain().focus().setLink({ href: url }).run()
}

async function uploadImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file || !userStore.authHeader)
      return
    try {
      const res = await upload(file, 'file', userStore.authHeader)
      editorInstance?.chain().focus().setImage({ src: res.url }).run()
    }
    catch { }
  }
  input.click()
}

function isActive(command: string, value?: string): boolean {
  if (!editorInstance)
    return false
  switch (command) {
    case 'bold':
      return editorInstance.isActive('bold')
    case 'italic':
      return editorInstance.isActive('italic')
    case 'strike':
      return editorInstance.isActive('strike')
    case 'heading':
      return editorInstance.isActive('heading', { level: Number(value) || 2 })
    case 'bulletList':
      return editorInstance.isActive('bulletList')
    case 'orderedList':
      return editorInstance.isActive('orderedList')
    case 'blockquote':
      return editorInstance.isActive('blockquote')
    case 'codeBlock':
      return editorInstance.isActive('codeBlock')
    case 'link':
      return editorInstance.isActive('link')
    default:
      return false
  }
}
</script>

<template>
  <div class="tiptap-editor overflow-hidden border border-[#e0d6cc] rounded-xl bg-white">
    <div class="flex flex-wrap items-center gap-0.5 border-b border-[#e0d6cc] bg-[#faf8f5] px-2 py-1.5">
      <button type="button" class="tiptap-btn" :class="{ 'is-active': isActive('bold') }" title="加粗" @click="execCmd('bold')">
        <span class="i-carbon-text-bold text-[15px]" />
      </button>
      <button type="button" class="tiptap-btn" :class="{ 'is-active': isActive('italic') }" title="斜体" @click="execCmd('italic')">
        <span class="i-carbon-text-italic text-[15px]" />
      </button>
      <button type="button" class="tiptap-btn" :class="{ 'is-active': isActive('strike') }" title="删除线" @click="execCmd('strike')">
        <span class="i-carbon-text-strikethrough text-[15px]" />
      </button>
      <span class="mx-1 h-5 w-px bg-[#e0d6cc]" />
      <button type="button" class="tiptap-btn" :class="{ 'is-active': isActive('heading', '2') }" title="标题" @click="execCmd('heading', '2')">
        <span class="i-carbon-header text-[15px]" />
      </button>
      <button type="button" class="tiptap-btn" :class="{ 'is-active': isActive('bulletList') }" title="无序列表" @click="execCmd('bulletList')">
        <span class="i-carbon-list text-[15px]" />
      </button>
      <button type="button" class="tiptap-btn" :class="{ 'is-active': isActive('orderedList') }" title="有序列表" @click="execCmd('orderedList')">
        <span class="i-carbon-numbered-list text-[15px]" />
      </button>
      <button type="button" class="tiptap-btn" :class="{ 'is-active': isActive('blockquote') }" title="引用" @click="execCmd('blockquote')">
        <span class="i-carbon-quotes text-[15px]" />
      </button>
      <button type="button" class="tiptap-btn" :class="{ 'is-active': isActive('codeBlock') }" title="代码块" @click="execCmd('codeBlock')">
        <span class="i-carbon-code text-[15px]" />
      </button>
      <span class="mx-1 h-5 w-px bg-[#e0d6cc]" />
      <button type="button" class="tiptap-btn" title="插入链接" :class="{ 'is-active': isActive('link') }" @click="setLink">
        <span class="i-carbon-link text-[15px]" />
      </button>
      <button type="button" class="tiptap-btn" title="插入图片" @click="uploadImage">
        <span class="i-carbon-image text-[15px]" />
      </button>
      <span class="mx-1 h-5 w-px bg-[#e0d6cc]" />
      <button type="button" class="tiptap-btn" title="分割线" @click="execCmd('horizontalRule')">
        <span class="i-carbon-radio-button text-[15px]" />
      </button>
      <span class="mx-1 h-5 w-px bg-[#e0d6cc]" />
      <button type="button" class="tiptap-btn" title="撤销" @click="execCmd('undo')">
        <span class="i-carbon-undo text-[15px]" />
      </button>
      <button type="button" class="tiptap-btn" title="重做" @click="execCmd('redo')">
        <span class="i-carbon-redo text-[15px]" />
      </button>
    </div>
    <div ref="editorEl" class="tiptap-content" />
  </div>
</template>

<style scoped>
.tiptap-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  color: #5a4a3a;
  transition: background 0.15s;
}
.tiptap-btn:hover {
  background: #f0e8d8;
}
.tiptap-btn.is-active {
  background: #fdeece;
  color: #d79a19;
}
.tiptap-content {
  padding: 12px 16px;
  min-height: 160px;
}
.tiptap-content :deep(.ProseMirror) {
  outline: none;
  min-height: 160px;
  font-size: 14px;
  line-height: 1.7;
  color: #24180c;
}
.tiptap-content :deep(.ProseMirror p) {
  margin: 0;
}
.tiptap-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #b6a27a;
  pointer-events: none;
  height: 0;
}
.tiptap-content :deep(.ProseMirror h1),
.tiptap-content :deep(.ProseMirror h2),
.tiptap-content :deep(.ProseMirror h3) {
  margin: 0.5em 0 0.2em;
  font-weight: 600;
  line-height: 1.4;
}
.tiptap-content :deep(.ProseMirror h1) {
  font-size: 22px;
}
.tiptap-content :deep(.ProseMirror h2) {
  font-size: 18px;
}
.tiptap-content :deep(.ProseMirror h3) {
  font-size: 16px;
}
.tiptap-content :deep(.ProseMirror ul),
.tiptap-content :deep(.ProseMirror ol) {
  padding-left: 1.5em;
}
.tiptap-content :deep(.ProseMirror li) {
  margin: 0.2em 0;
}
.tiptap-content :deep(.ProseMirror blockquote) {
  border-left: 3px solid #f0c674;
  padding-left: 1em;
  margin: 0.5em 0;
  color: #6f5a31;
}
.tiptap-content :deep(.ProseMirror pre) {
  background: #1f1a14;
  color: #f0e8d8;
  border-radius: 8px;
  padding: 12px;
  overflow-x: auto;
  font-size: 13px;
}
.tiptap-content :deep(.ProseMirror code) {
  background: #f5f0eb;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 13px;
}
.tiptap-content :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.5em 0;
}
.tiptap-content :deep(.ProseMirror a) {
  color: #d79a19;
  text-decoration: underline;
}
.tiptap-content :deep(.ProseMirror hr) {
  border: none;
  border-top: 1px solid #e0d6cc;
  margin: 1em 0;
}
</style>
