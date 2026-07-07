import { render, screen } from '@testing-library/react-native';
import { ThemedText } from './themed-text';

describe('ThemedText', () => {
  it('renders its children', async () => {
    await render(<ThemedText>Hello WhatsApp</ThemedText>);
    expect(screen.getByText('Hello WhatsApp')).toBeTruthy();
  });
});
