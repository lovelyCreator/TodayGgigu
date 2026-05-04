import { createSlice, PayloadAction } from '@reduxjs/toolkit'

type Locale = 'en' | 'zh' | 'ko'

type I18nState = {
  locale: Locale
}

const initialState: I18nState = {
  locale: 'ko',
}

const i18nSlice = createSlice({
  name: 'i18n',
  initialState,
  reducers: {
    setLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload
    },
  },
})

export const { setLocale } = i18nSlice.actions
export default i18nSlice.reducer