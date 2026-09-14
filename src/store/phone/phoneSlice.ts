import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { PhoneService } from '@/features/phone/phoneService';
import { softphoneClient } from '@/features/phone/softphoneClient';
import type { PhoneRuntimeState } from '@/features/phone/phoneTypes';

export type PhoneState = PhoneRuntimeState;

const initialState: PhoneState = {
  inboxId: null,
  status: 'idle',
  direction: null,
  remoteNumber: '',
  muted: false,
  error: '',
};

const runtimeUpdated = (state: PhoneState, action: PayloadAction<Partial<PhoneRuntimeState>>) => {
  Object.assign(state, action.payload);
};

export const phoneActions = {
  connect: createAsyncThunk<void, { inboxId: number }>(
    'phone/connect',
    async ({ inboxId }, { dispatch, rejectWithValue }) => {
      try {
        const credentials = await PhoneService.credentials(inboxId);
        softphoneClient.connect(credentials, update =>
          dispatch(phoneSlice.actions.runtimeUpdated(update)),
        );
      } catch (error) {
        return rejectWithValue(
          error instanceof Error ? error.message : 'Unable to initialize phone',
        );
      }
    },
  ),
  disconnect: createAsyncThunk<void, void>('phone/disconnect', async (_, { dispatch }) => {
    softphoneClient.disconnect();
    dispatch(phoneSlice.actions.reset());
  }),
  call: createAsyncThunk<void, { number: string }>('phone/call', async ({ number }) => {
    softphoneClient.call(number);
  }),
  answer: createAsyncThunk<void, void>('phone/answer', async () => {
    await softphoneClient.answer();
  }),
  reject: createAsyncThunk<void, void>('phone/reject', async () => {
    softphoneClient.reject();
  }),
  hangup: createAsyncThunk<void, void>('phone/hangup', async () => {
    softphoneClient.hangup();
  }),
  setMuted: createAsyncThunk<void, { muted: boolean }>('phone/setMuted', async ({ muted }) => {
    if (muted) softphoneClient.toggleMute();
    else softphoneClient.unmute();
  }),
  sendDTMF: createAsyncThunk<void, { tone: string }>('phone/sendDTMF', async ({ tone }) => {
    softphoneClient.sendDTMF(tone);
  }),
};

const phoneSlice = createSlice({
  name: 'phone',
  initialState,
  reducers: {
    runtimeUpdated,
    reset: () => initialState,
  },
  extraReducers: builder => {
    builder
      .addCase(phoneActions.connect.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) || 'Unable to initialize phone';
      })
      .addCase(phoneActions.disconnect.fulfilled, () => initialState);
  },
});

export default phoneSlice.reducer;
