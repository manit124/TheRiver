export interface UserProfile {
  id: string;
  email: string;
  username: string;
  profile_pic?: string;
  chips: number;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

