export type Role = "brand" | "creator" | "admin";

export type CampaignPlatform = "instagram" | "tiktok";
export type CampaignStatus = "draft" | "live" | "closed";
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  created_at: string;
}

export interface CreatorProfile {
  profile_id: string;
  gender: string | null;
  age: number | null;
  portfolio_url: string | null;
  bio: string | null;
  instagram_handle: string | null;
  tiktok_handle: string | null;
}

export interface BrandProfile {
  profile_id: string;
  company_name: string | null;
  website: string | null;
}

export interface Campaign {
  id: string;
  brand_id: string;
  platform: CampaignPlatform;
  title: string;
  description: string;
  num_posts_required: number;
  start_date: string | null;
  end_date: string | null;
  status: CampaignStatus;
  created_at: string;
}

export interface Application {
  id: string;
  campaign_id: string;
  creator_id: string;
  price_per_post: number | null;
  pitch: string | null;
  status: ApplicationStatus;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "application_received" | "application_approved" | "application_rejected";
  message: string;
  related_application_id: string | null;
  is_read: boolean;
  created_at: string;
}
