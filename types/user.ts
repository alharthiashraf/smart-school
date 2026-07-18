import type { RoleKey } from "@/constants/roles";

export type AppUser = {
  id: string;

  auth_user_id?: string;

  school_id?: string | null;

  full_name: string;

  email: string;

  role: RoleKey;

  avatar_url?: string | null;

  is_active: boolean;

  created_at?: string;
};
