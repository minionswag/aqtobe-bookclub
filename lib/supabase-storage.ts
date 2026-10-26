type SupabaseStorageSettings = {
  baseUrl: string;
  serviceRoleKey: string;
  bucket: string;
};

const DEFAULT_BUCKET = "book-photos";

function getSettings(): SupabaseStorageSettings {
  const configuredUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;

  if (!configuredUrl || !serviceRoleKey) {
    throw new Error("Supabase image storage is not configured.");
  }

  const url = new URL(configuredUrl);
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SUPABASE_URL must contain only the Supabase project origin.");
  }
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Supabase image storage must use HTTPS.");
  }

  if (!/^[a-z0-9_-]+$/i.test(bucket)) {
    throw new Error("Supabase storage bucket name is invalid.");
  }

  return {
    baseUrl: url.origin,
    serviceRoleKey,
    bucket,
  };
}

function storageRequest(
  settings: SupabaseStorageSettings,
  pathname: string,
  init: RequestInit,
): Promise<Response> {
  return fetch(`${settings.baseUrl}/storage/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: settings.serviceRoleKey,
      Authorization: `Bearer ${settings.serviceRoleKey}`,
      ...init.headers,
    },
  });
}

export async function uploadBookImageToSupabase(
  fileName: string,
  bytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  const settings = getSettings();
  const objectPath = `books/${fileName}`;
  const imageBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(imageBuffer).set(bytes);
  const response = await storageRequest(
    settings,
    `object/${encodeURIComponent(settings.bucket)}/${objectPath}`,
    {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-upsert": "false",
      },
      body: new Blob([imageBuffer], { type: mimeType }),
    },
  );

  if (!response.ok) {
    throw new Error(`Supabase image upload failed with status ${response.status}.`);
  }

  return `${settings.baseUrl}/storage/v1/object/public/${encodeURIComponent(settings.bucket)}/${objectPath}`;
}

export async function removeBookImageFromSupabase(imageUrl: string): Promise<void> {
  const settings = getSettings();
  const publicPrefix = `/storage/v1/object/public/${encodeURIComponent(settings.bucket)}/`;
  let url: URL;

  try {
    url = new URL(imageUrl);
  } catch {
    return;
  }

  if (url.origin !== settings.baseUrl || !url.pathname.startsWith(publicPrefix)) return;

  const objectPath = url.pathname.slice(publicPrefix.length);
  if (!/^books\/[\da-f-]+\.(?:jpg|png|webp)$/i.test(objectPath)) return;

  const response = await storageRequest(
    settings,
    `object/${encodeURIComponent(settings.bucket)}/${objectPath}`,
    { method: "DELETE" },
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Supabase image deletion failed with status ${response.status}.`);
  }
}
