import { render, screen } from '@testing-library/react-native';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renders the title and message', async () => {
    await render(<EmptyState icon="chatbubble-outline" title="No chats yet" message="Add a contact to start messaging." />);
    expect(screen.getByText('No chats yet')).toBeTruthy();
    expect(screen.getByText('Add a contact to start messaging.')).toBeTruthy();
  });
});
