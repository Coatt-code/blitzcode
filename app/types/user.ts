export type User = {
  id: string,
  aud?: string | null,
  role?: string | null,
  email?: string | null,
  email_confirmed_at?: string | null,
  phone?: string | null,
  confirmed_at?: string | null,
  last_sign_in_at?: string | null,
  app_metadata?: object | null,
  user_metadata?: UserMetadata | null
}

export type UserMetadata = {
  avatar_url?: string,
  email?: string,
  email_verified?: boolean,
  full_name?: string,
  iss?: string,
  name?: string,
  phone_verified?: boolean,
  preferred_username?: string,
  provider_id?: string,
  sub?: string,
  user_name?: string,
}
