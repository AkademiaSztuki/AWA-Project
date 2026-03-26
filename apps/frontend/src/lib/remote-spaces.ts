/**
 * Remote spaces & images – GCP backend only (Supabase removed).
 */

import { saveParticipantImage } from '@/lib/gcp-data';
import { gcpApi } from '@/lib/gcp-api-client';
import { isPersistenceDebugEnabled, shortHashForLog } from '@/lib/persistence-debug';

export type SpaceImageInput = {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'generated' | 'inspiration';
  tags?: any;
  isFavorite?: boolean;
  source?: string;
  generationSetId?: string;
};

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

export async function getOrCreateSpaceId(
  userHash: string,
  opts?: { spaceId?: string; name?: string; type?: string },
): Promise<string | null> {
  const isUuid = (id?: string) =>
    !!id &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      id,
    );

  const normalizeSpaceId = (id?: string): string | undefined => {
    if (!id) return undefined;
    return id.startsWith('space_') ? id.substring(6) : id;
  };

  if (!userHash) return null;

  const normalizedSpaceId = normalizeSpaceId(opts?.spaceId);
  if (normalizedSpaceId && isUuid(normalizedSpaceId)) return normalizedSpaceId;

  const name = opts?.name || 'Moja Przestrzeń';
  const type = opts?.type || 'personal';

  const created = await gcpApi.spaces.create(userHash, {
    name,
    type,
    is_default: false,
  });
  return created.ok ? ((created.data?.space as any)?.id ?? null) : null;
}

// ---------------------------------------------------------------------------
// Upload space image
// ---------------------------------------------------------------------------

export async function uploadSpaceImage(
  _userHash: string,
  _spaceId: string,
  _imageId: string,
  imageUrl: string,
): Promise<{ publicUrl: string; path: string } | null> {
  if (!imageUrl) return null;
  return { publicUrl: imageUrl, path: imageUrl };
}

// ---------------------------------------------------------------------------
// Save participant images
// ---------------------------------------------------------------------------

export type SaveParticipantImagesResult = {
  ok: boolean;
  saved: number;
  failed: number;
  /** `participant_images.id` (UUID) for each successful save, in order. */
  imageIds: string[];
};

export async function saveParticipantImages(
  userHash: string,
  images: Array<{
    url: string;
    thumbnail_url?: string;
    type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
    space_id?: string;
    tags?: any;
    description?: string;
    is_favorite?: boolean;
    source?: string;
    generation_id?: string;
  }>,
): Promise<SaveParticipantImagesResult> {
  if (!userHash || images.length === 0) {
    return { ok: true, saved: 0, failed: 0, imageIds: [] };
  }

  try {
    let savedCount = 0;
    let failedCount = 0;
    const imageIds: string[] = [];

    for (const img of images) {
      const tags = img.tags || {};
      const tagsStyles = Array.isArray(tags.styles)
        ? tags.styles
        : tags.style
          ? [tags.style]
          : [];
      const tagsColors = Array.isArray(tags.colors) ? tags.colors : [];
      const tagsMaterials = Array.isArray(tags.materials)
        ? tags.materials
        : [];
      const tagsBiophilia =
        typeof tags.biophilia === 'number' ? tags.biophilia : null;
      const descriptionToSave = img.description || tags.description || null;

      const result = img.url.startsWith('data:')
        ? await gcpApi.images.uploadAndRegister({
            userHash,
            type: img.type,
            base64Image: img.url,
            space_id: img.space_id,
            tags_styles: tagsStyles,
            tags_colors: tagsColors,
            tags_materials: tagsMaterials,
            tags_biophilia: tagsBiophilia,
            description: descriptionToSave || undefined,
            source: img.source || undefined,
            generation_id: img.generation_id || undefined,
          })
        : await gcpApi.images.register(userHash, {
            type: img.type,
            storage_path: img.url,
            public_url: img.url,
            thumbnail_url: img.thumbnail_url,
            is_favorite: img.is_favorite || false,
            space_id: img.space_id,
            tags_styles: tagsStyles,
            tags_colors: tagsColors,
            tags_materials: tagsMaterials,
            tags_biophilia: tagsBiophilia,
            description: descriptionToSave || undefined,
            source: img.source || undefined,
            generation_id: img.generation_id || undefined,
          });

      if (result.ok) {
        savedCount++;
        const body = result.data as { imageId?: string } | undefined;
        const id = body?.imageId;
        if (id) imageIds.push(String(id));
      } else {
        failedCount++;
        console.warn('[remote-spaces] GCP save failed', result.error);
      }
    }

    const ok = failedCount === 0 || savedCount > 0;
    if (isPersistenceDebugEnabled()) {
      console.log('[persistence:debug] participant images batch', {
        userHash: shortHashForLog(userHash),
        imagesInBatch: images.length,
        saved: savedCount,
        failed: failedCount,
        imageIdsReturned: imageIds.length,
      });
    }
    return { ok, saved: savedCount, failed: failedCount, imageIds };
  } catch (e) {
    console.warn('[remote-spaces] saveParticipantImages error', e);
    return { ok: false, saved: 0, failed: images.length, imageIds: [] };
  }
}

export async function saveSpaceImagesMetadata(
  userHash: string,
  _spaceId: string,
  images: Array<{
    url: string;
    thumbnail_url?: string;
    type: 'generated' | 'inspiration';
    tags?: any;
    is_favorite?: boolean;
    source?: string;
    generation_set_id?: string;
  }>,
): Promise<SaveParticipantImagesResult> {
  return saveParticipantImages(userHash, images);
}

// ---------------------------------------------------------------------------
// Toggle favorite
// ---------------------------------------------------------------------------

export async function toggleParticipantImageFavorite(
  userHash: string,
  imageId: string,
  isFavorite: boolean,
): Promise<boolean> {
  if (!userHash || !imageId) return false;

  const result = await gcpApi.images.update(imageId, {
    userHash,
    is_favorite: isFavorite,
  });
  return result.ok;
}

export async function toggleSpaceImageFavorite(
  userHash: string,
  imageId: string,
  isFavorite: boolean,
) {
  return toggleParticipantImageFavorite(userHash, imageId, isFavorite);
}

// ---------------------------------------------------------------------------
// Fetch participant images
// ---------------------------------------------------------------------------

export async function fetchParticipantImages(
  userHash: string,
): Promise<
  Array<{
    id: string;
    type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
    url: string;
    thumbnailUrl?: string;
    isFavorite: boolean;
    spaceId?: string | null;
    tags?: any;
    description?: string;
    source?: string;
    createdAt: string;
  }>
> {
  if (!userHash) return [];

  const gcpBase =
    process.env.NEXT_PUBLIC_GCP_API_BASE_URL &&
    process.env.NEXT_PUBLIC_GCP_API_BASE_URL.length > 0
      ? process.env.NEXT_PUBLIC_GCP_API_BASE_URL.replace(/\/$/, '')
      : null;

  try {
    const result = await gcpApi.images.list(userHash);
    if (!result.ok) {
      console.warn(
        '[remote-spaces] GCP fetchParticipantImages failed',
        result.error,
      );
      return [];
    }

    return ((result.data?.images as any[]) || []).map((img: any) => {
      const rawId = img.id as string | undefined;
      const backendImageUrl =
        gcpBase && rawId
          ? `${gcpBase}/api/images/${encodeURIComponent(rawId)}/raw`
          : null;

      return {
        id: img.id,
        type: img.type,
        // Prefer signed_url; if brak, użyj proxy w backendzie zamiast gołego public_url.
        url: img.signed_url || backendImageUrl || img.public_url || img.storage_path,
        thumbnailUrl: img.thumbnail_url,
        isFavorite: img.is_favorite || false,
        spaceId: img.space_id || null,
        tags: {
          styles: img.tags_styles || [],
          colors: img.tags_colors || [],
          materials: img.tags_materials || [],
          biophilia: img.tags_biophilia,
        },
        description: img.description || undefined,
        source: img.source,
        createdAt: img.created_at,
      };
    });
  } catch (e) {
    console.warn('[remote-spaces] fetchParticipantImages error', e);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Fetch / create spaces
// ---------------------------------------------------------------------------

export async function fetchParticipantSpaces(
  userHash: string,
): Promise<
  Array<{
    id: string;
    name: string;
    type: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }>
> {
  if (!userHash) return [];

  const result = await gcpApi.spaces.list(userHash);
  if (!result.ok) {
    console.warn(
      '[remote-spaces] GCP fetchParticipantSpaces failed',
      result.error,
    );
    return [];
  }

  return ((result.data?.spaces as any[]) || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    type: s.type || 'personal',
    isDefault: !!s.is_default,
    createdAt: s.created_at,
    updatedAt: s.updated_at || s.created_at,
  }));
}

export async function createParticipantSpace(
  userHash: string,
  space: { name: string; type?: string; is_default?: boolean },
): Promise<{ id: string } | null> {
  if (!userHash || !space?.name) return null;

  const result = await gcpApi.spaces.create(userHash, space);
  if (!result.ok) {
    console.error('[GCP] createParticipantSpace failed', result.error);
    return null;
  }
  const id = (result.data?.space as any)?.id || null;
  return id ? { id } : null;
}

// ---------------------------------------------------------------------------
// Legacy fetch
// ---------------------------------------------------------------------------

export async function fetchSpacesWithImages(
  _userHash: string,
  _limitPerSpace = 6,
  _offset = 0,
) {
  return [];
}

export async function fetchSpaceImages(
  _userHash: string,
  _spaceId: string,
  _params?: { limit?: number; offset?: number },
) {
  return [];
}

// ---------------------------------------------------------------------------
// Update / delete
// ---------------------------------------------------------------------------

export async function updateSpaceName(
  userHash: string,
  spaceId: string,
  name: string,
) {
  if (!userHash || !spaceId || !name.trim()) return null;
  const result = await gcpApi.spaces.update(spaceId, {
    userHash,
    name: name.trim(),
  });
  if (!result.ok) {
    console.warn('[remote-spaces] updateSpaceName failed', result.error);
    return null;
  }
  return { id: spaceId, user_hash: userHash, name: name.trim() } as any;
}

export async function deleteSpace(
  userHash: string,
  spaceId: string,
): Promise<boolean> {
  if (!userHash || !spaceId) return false;

  try {
    const result = await gcpApi.spaces.delete(spaceId, userHash);
    return result.ok;
  } catch (e) {
    console.error('[remote-spaces] deleteSpace error', e);
    return false;
  }
}

export async function deleteParticipantImage(
  userHash: string,
  imageId: string,
): Promise<boolean> {
  if (!userHash || !imageId) return false;

  const result = await gcpApi.images.delete(imageId, userHash);
  return result.ok;
}

export async function updateParticipantImageMetadata(
  userHash: string,
  imageId: string,
  patch: {
    tags?: any;
    description?: string | null;
    space_id?: string | null;
  },
): Promise<boolean> {
  if (!userHash || !imageId) return false;

  try {
    const tags = patch.tags || {};
    const result = await gcpApi.images.update(imageId, {
      userHash,
      tags_styles: Array.isArray(tags.styles)
        ? tags.styles
        : tags.style
          ? [tags.style]
          : [],
      tags_colors: Array.isArray(tags.colors) ? tags.colors : [],
      tags_materials: Array.isArray(tags.materials) ? tags.materials : [],
      tags_biophilia:
        typeof tags.biophilia === 'number' ? tags.biophilia : null,
      description: patch.description ?? (tags.description || null),
      space_id: patch.space_id,
    });
    return result.ok;
  } catch (e) {
    console.warn('[remote-spaces] updateParticipantImageMetadata error', e);
    return false;
  }
}

export async function deleteSpaceImage(
  userHash: string,
  imageId: string,
): Promise<boolean> {
  return deleteParticipantImage(userHash, imageId);
}
