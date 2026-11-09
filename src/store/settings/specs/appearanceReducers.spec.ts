import reducer, {
  applyThemePreset,
  resetAppearance,
  setThemeMode,
  updateAppearance,
} from '../settingsSlice';
import { selectAppearance } from '../settingsSelectors';
import { CUSTOM_PRESET_ID, DEFAULT_APPEARANCE } from '@/theme/appearanceConfig';

type State = ReturnType<typeof reducer>;
const initial = (): State => reducer(undefined, { type: 'INIT' });
const appearanceOf = (settings: State) =>
  selectAppearance({ settings } as unknown as Parameters<typeof selectAppearance>[0]);

describe('appearance reducers', () => {
  it('starts with the stock look following the system', () => {
    expect(appearanceOf(initial())).toEqual(DEFAULT_APPEARANCE);
  });

  it('stores the colour mode in the existing theme field', () => {
    const state = reducer(initial(), setThemeMode('dark'));
    expect(state.theme).toBe('dark');
    expect(appearanceOf(state).mode).toBe('dark');
  });

  it('ignores an unknown mode', () => {
    const state = reducer(initial(), setThemeMode('neon' as never));
    expect(state.theme).toBe('system');
  });

  it('marks the look custom after a manual change and normalizes the accent', () => {
    const state = reducer(initial(), updateAppearance({ accent: '#ABC' }));
    expect(appearanceOf(state)).toMatchObject({ accent: '#aabbcc', presetId: CUSTOM_PRESET_ID });
  });

  it('keeps earlier choices when changing one value', () => {
    let state = reducer(initial(), updateAppearance({ corners: 'round' }));
    state = reducer(state, updateAppearance({ fontScale: 'large' }));
    expect(appearanceOf(state)).toMatchObject({ corners: 'round', fontScale: 'large' });
  });

  it('applies a preset in one go and remembers its id', () => {
    const state = reducer(initial(), applyThemePreset('violet'));
    expect(appearanceOf(state)).toMatchObject({
      presetId: 'violet',
      accent: '#7c5cfc',
      corners: 'round',
    });
  });

  it('keeps the workspace choice and the colour mode when applying a preset', () => {
    let state = reducer(initial(), setThemeMode('dark'));
    state = reducer(state, updateAppearance({ followWorkspace: false }));
    state = reducer(state, applyThemePreset('emerald'));
    expect(appearanceOf(state)).toMatchObject({ mode: 'dark', followWorkspace: false });
  });

  it('ignores an unknown preset', () => {
    const before = initial();
    expect(reducer(before, applyThemePreset('nope'))).toEqual(before);
  });

  it('resets everything', () => {
    let state = reducer(initial(), setThemeMode('dark'));
    state = reducer(state, applyThemePreset('sunset'));
    expect(appearanceOf(reducer(state, resetAppearance()))).toEqual(DEFAULT_APPEARANCE);
  });

  it('copes with state saved before appearance existed', () => {
    const legacy = { ...initial(), appearance: undefined };
    expect(appearanceOf(legacy)).toEqual(DEFAULT_APPEARANCE);
    expect(appearanceOf(reducer(legacy, updateAppearance({ corners: 'sharp' }))).corners).toBe(
      'sharp',
    );
  });
});
