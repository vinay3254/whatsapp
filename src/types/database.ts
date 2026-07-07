export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status_message: string | null;
  read_receipts_enabled: boolean;
  last_seen_visibility: 'everyone' | 'contacts' | 'nobody';
  profile_photo_visibility: 'everyone' | 'contacts' | 'nobody';
  notifications_enabled: boolean;
  created_at: string;
}

export interface Contact {
  owner_id: string;
  contact_id: string;
  created_at: string;
}

export interface ContactWithProfile extends Contact {
  profile: Profile;
}

export interface Conversation {
  id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  text: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  media_size_bytes: number | null;
  created_at: string;
  read_at: string | null;
}

export interface Call {
  id: string;
  caller_id: string;
  callee_id: string;
  direction: 'incoming' | 'outgoing' | 'missed';
  created_at: string;
}

export interface UpdatePost {
  id: string;
  user_id: string;
  text: string | null;
  image_url: string | null;
  created_at: string;
}

export interface ChatListItem {
  conversationId: string;
  contact: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}
