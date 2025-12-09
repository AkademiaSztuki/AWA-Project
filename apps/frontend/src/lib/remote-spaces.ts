import { supabase } from '@/lib/supabase';
import { ensureUserProfileExists } from '@/lib/supabase-deep-personalization';

export type SpaceImageInput = {
  id: string;
  url: string; // data URL or remote URL
  thumbnailUrl?: string;
  type: 'generated' | 'inspiration';
  tags?: any;
  isFavorite?: boolean;
  source?: string;
  generationSetId?: string;
};

const SPACE_BUCKET = 'space-images';

export async function getOrCreateSpaceId(
  userHash: string,
  opts?: { spaceId?: string; name?: string; type?: string }
): Promise<string | null> {
  // Basic UUID v4 pattern guard to avoid passing placeholder ids (e.g. "household-123")
  const isUuid = (id?: string) => !!id && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id);

  if (!userHash) return null;
  // Only reuse provided spaceId if it is a valid uuid; otherwise create a proper space record
  if (opts?.spaceId && isUuid(opts.spaceId)) return opts.spaceId;

  const name = opts?.name || 'Moja Przestrzeń';
  const type = opts?.type || 'personal';

  try {
    await ensureUserProfileExists(userHash);
    const { data, error } = await supabase.rpc('add_space', {
      p_user_hash: userHash,
      p_name: name,
      p_type: type
    });
    if (error) {
      console.warn('[remote-spaces] add_space failed', error);
      return null;
    }
    return (data as any)?.id || null;
  } catch (e) {
    console.warn('[remote-spaces] getOrCreateSpaceId error', e);
    return null;
  }
}

export async function uploadSpaceImage(
  userHash: string,
  spaceId: string,
  imageId: string,
  imageUrl: string
): Promise<{ publicUrl: string; path: string } | null> {
  if (!userHash || !spaceId || !imageUrl) return null;

  // If already an http(s) URL, skip upload
  if (imageUrl.startsWith('http')) {
    return { publicUrl: imageUrl, path: imageUrl };
  }

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const ext = blob.type?.split('/')[1] || 'png';
    const path = `${userHash}/spaces/${spaceId}/${imageId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(SPACE_BUCKET)
      .upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: blob.type || 'image/png'
      });

    if (uploadError) {
      console.warn('[remote-spaces] upload failed', uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage.from(SPACE_BUCKET).getPublicUrl(path);
    if (!publicData?.publicUrl) {
      console.warn('[remote-spaces] no publicUrl returned');
      return null;
    }
    return { publicUrl: publicData.publicUrl, path };
  } catch (e) {
    console.warn('[remote-spaces] uploadSpaceImage error', e);
    return null;
  }
}

export async function saveSpaceImagesMetadata(
  userHash: string,
  spaceId: string,
  images: Array<{
    url: string;
    thumbnail_url?: string;
    type: 'generated' | 'inspiration';
    tags?: any;
    is_favorite?: boolean;
    source?: string;
    generation_set_id?: string;
  }>
): Promise<boolean> {
  if (!userHash || !spaceId || images.length === 0) return true;
  try {
    const { error } = await supabase.rpc('add_space_images', {
      p_user_hash: userHash,
      p_space_id: spaceId,
      p_images: images
    });
    if (error) {
      console.warn('[remote-spaces] add_space_images failed', error);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[remote-spaces] saveSpaceImagesMetadata error', e);
    return false;
  }
}

export async function toggleSpaceImageFavorite(
  userHash: string,
  imageId: string,
  isFavorite: boolean
) {
  if (!userHash || !imageId) return null;
  const { data, error } = await supabase.rpc('toggle_space_image_favorite', {
    p_user_hash: userHash,
    p_image_id: imageId,
    p_is_favorite: isFavorite
  });
  if (error) {
    console.warn('[remote-spaces] toggle favorite failed', error);
    return null;
  }
  return data;
}

export async function fetchSpacesWithImages(
  userHash: string,
  limitPerSpace = 6,
  offset = 0
) {
  if (!userHash) return [];
  const { data, error } = await supabase.rpc('get_spaces_with_images', {
    p_user_hash: userHash,
    p_limit_per_space: limitPerSpace,
    p_offset: offset
  });
  if (error) {
    console.warn('[remote-spaces] get_spaces_with_images failed', error);
    return [];
  }
  return (data as any) || [];
}

export async function fetchSpaceImages(
  userHash: string,
  spaceId: string,
  params?: { limit?: number; offset?: number }
) {
  if (!userHash || !spaceId) return [];
  const { data, error } = await supabase
    .from('space_images')
    .select('*')
    .eq('user_hash', userHash)
    .eq('space_id', spaceId)
    .order('created_at', { ascending: false })
    .limit(params?.limit ?? 100)
    .range(params?.offset ?? 0, (params?.offset ?? 0) + (params?.limit ?? 100) - 1);

  if (error) {
    console.warn('[remote-spaces] fetchSpaceImages failed', error);
    return [];
  }
  return data || [];
}
