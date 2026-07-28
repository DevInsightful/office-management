import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }
  return url;
}

function getSupabaseKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set.");
  }
  return key;
}

export function getSupabaseBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "office";
}

export function getSupabaseClient() {
  return createClient(getSupabaseUrl(), getSupabaseKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function buildPublicStorageUrl(pathOrUrl: string) {
  const bucket = getSupabaseBucket();
  const baseUrl = getSupabaseUrl();
  const normalizedPath = extractStoragePath(pathOrUrl, bucket);
  return `${baseUrl}/storage/v1/object/public/${bucket}/${normalizedPath}`;
}

function extractStoragePath(pathOrUrl: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`;

  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    const index = pathOrUrl.indexOf(marker);
    if (index >= 0) {
      return pathOrUrl.slice(index + marker.length);
    }
  }

  return pathOrUrl.replace(/^\/+/, "");
}
