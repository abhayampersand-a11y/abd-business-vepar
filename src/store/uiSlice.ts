import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { DateRangeKey } from '@/lib/format';

export type Toast = {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
};

type UIState = {
  sidebarCollapsed: boolean;
  activeFirmId: number | null;
  /** Remembered per screen so a user's filter survives navigation and reloads. */
  dateRange: Record<string, { key: DateRangeKey; from?: string; to?: string }>;
  toasts: Toast[];
  /** Recently opened documents, for the quick-jump bar. */
  recent: Array<{ label: string; href: string }>;
};

const initialState: UIState = {
  sidebarCollapsed: false,
  activeFirmId: null,
  dateRange: {},
  toasts: [],
  recent: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebar(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    setActiveFirm(state, action: PayloadAction<number | null>) {
      state.activeFirmId = action.payload;
    },
    setDateRange(
      state,
      action: PayloadAction<{ scope: string; key: DateRangeKey; from?: string; to?: string }>,
    ) {
      const { scope, key, from, to } = action.payload;
      state.dateRange[scope] = { key, from, to };
    },
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
        if (state.toasts.length > 4) state.toasts.shift();
      },
      prepare(message: string, tone: Toast['tone'] = 'success') {
        return { payload: { id: crypto.randomUUID(), message, tone } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    pushRecent(state, action: PayloadAction<{ label: string; href: string }>) {
      state.recent = [
        action.payload,
        ...state.recent.filter((r) => r.href !== action.payload.href),
      ].slice(0, 8);
    },
  },
});

export const {
  toggleSidebar,
  setSidebar,
  setActiveFirm,
  setDateRange,
  pushToast,
  dismissToast,
  pushRecent,
} = uiSlice.actions;

export default uiSlice.reducer;
