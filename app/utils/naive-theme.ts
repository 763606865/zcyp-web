import type { GlobalThemeOverrides } from 'naive-ui'
import { dateZhCN, zhCN } from 'naive-ui'

export const naiveThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#ffa500',
    primaryColorHover: '#eb9800',
    primaryColorPressed: '#d48900',
    primaryColorSuppl: '#ffa500',
    borderRadius: '12px',
    borderColor: '#ecd8a9',
    placeholderColor: '#b89243',
    textColor1: '#24180c',
    textColor2: '#6f5a31',
    textColor3: '#8a6b34',
  },
  Select: {
    menuBorderRadius: '12px',
    peers: {
      InternalSelection: {
        border: '1px solid #ecd8a9',
        borderRadius: '12px',
        paddingSingle: '0 12px',
        color: '#fffdf7',
        textColor: '#6f5a31',
        caretColor: '#ffa500',
        placeholderColor: '#b89243',
        borderHover: '1px solid #d8b96f',
        borderFocus: '1px solid #ffa500',
        boxShadowFocus: '0 0 0 3px rgba(255,165,0,0.14)',
      },
    },
  },
  Input: {
    border: '1px solid #ecd8a9',
    borderRadius: '12px',
    padding: '0 12px',
    color: '#fffdf7',
    textColor: '#6f5a31',
    caretColor: '#ffa500',
    placeholderColor: '#b89243',
    borderHover: '1px solid #d8b96f',
    borderFocus: '1px solid #ffa500',
    boxShadowFocus: '0 0 0 3px rgba(255,165,0,0.14)',
  },
}

export { dateZhCN, zhCN }
