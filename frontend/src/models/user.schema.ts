import { z } from 'zod';
import { IsoDate, PhoneNumber } from './types';

export const Username = z
  .string()
  .min(3)
  .max(50)
  .regex(/^\w+$/, 'Letters, numbers and underscores only');

export const AccountType = z.literal(['standard', 'organizer', 'admin']);

export const SignupRequest = z.object({
  username: Username,
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const LoginRequest = z.object({
  email: z.email(),
  password: z.string().min(1).max(128),
});

export const RoleUpdate = z.object({
  account_type: AccountType,
});

export const UserMe = z.object({
  id: z.guid(),
  username: z.string(),
  email: z.string(),
  phone_number: z.string().nullable(),
  account_type: z.string(),
  spark_rating: z.number().int(),
  created_at: IsoDate,
});

export const AuthResponse = z.object({
  access_token: z.string(),
  token_type: z.string().default('bearer'),
  user: UserMe,
});

export const ProfileUpdate = z.strictObject({
  username: Username.optional(),
  phone_number: PhoneNumber,
});

export const PreferredTagsUpdate = z.strictObject({
  tag_ids: z.array(z.guid()).max(50),
});

export type AccountType = z.infer<typeof AccountType>;
export type SignupRequest = z.infer<typeof SignupRequest>;
export type LoginRequest = z.infer<typeof LoginRequest>;
export type RoleUpdate = z.infer<typeof RoleUpdate>;
export type UserMe = z.infer<typeof UserMe>;
export type AuthResponse = z.infer<typeof AuthResponse>;
export type ProfileUpdate = z.input<typeof ProfileUpdate>;
export type PreferredTagsUpdate = z.infer<typeof PreferredTagsUpdate>;
