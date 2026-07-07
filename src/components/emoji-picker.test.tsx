import { render, screen, fireEvent } from '@testing-library/react-native';
import { EmojiPicker } from './emoji-picker';
import { COMMON_EMOJI } from '@/constants/emoji';

describe('EmojiPicker', () => {
  it('renders nothing interactive when not visible', async () => {
    await render(<EmojiPicker visible={false} onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.queryByText(COMMON_EMOJI[0])).toBeNull();
  });

  it('calls onSelect with the tapped emoji and stays open', async () => {
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<EmojiPicker visible onClose={onClose} onSelect={onSelect} />);

    fireEvent.press(screen.getByText(COMMON_EMOJI[0]));

    expect(onSelect).toHaveBeenCalledWith(COMMON_EMOJI[0]);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the scrim behind the sheet is pressed', async () => {
    const onClose = jest.fn();
    await render(<EmojiPicker visible onClose={onClose} onSelect={jest.fn()} />);

    fireEvent.press(screen.getByTestId('emoji-picker-scrim'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
