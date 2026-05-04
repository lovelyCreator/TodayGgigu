import { configureStore } from '@reduxjs/toolkit'
import i18nReducer from './slices/i18nSlice'

export const store = configureStore({
  reducer: {
    i18n: i18nReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch