import { Palette, Colors } from './theme';

describe('theme palette', () => {
  it('exposes the Champagne & Thyme colors used across the app', () => {
    expect(Palette.primary).toBe('#3c4429');
    expect(Palette.primaryContainer).toBe('#535c3f');
    expect(Palette.secondary).toBe('#8c4b55');
    expect(Palette.peachBubble).toBe('#E5BCA9');
    expect(Palette.background).toBe('#fff8f3');
  });

  it('still exposes the light/dark Colors map used by ThemedText/ThemedView', () => {
    expect(Colors.light.background).toBe(Palette.background);
    expect(Colors.dark.background).toBe(Palette.background);
  });
});
