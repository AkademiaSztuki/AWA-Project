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
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'sync-check',
      hypothesisId: 'H2',
      location: 'remote-spaces.ts:saveSpaceImagesMetadata',
      message: 'Saving space images to Supabase',
      data: {
        userHash,
        spaceId,
        imageCount: images.length,
        generatedCount: images.filter(img => img.type === 'generated').length,
        inspirationCount: images.filter(img => img.type === 'inspiration').length
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
  
  try {
    const { error } = await supabase.rpc('add_space_images', {
      p_user_hash: userHash,
      p_space_id: spaceId,
      p_images: images
    });
    if (error) {
      console.warn('[remote-spaces] add_space_images failed', error);
      
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'sync-check',
          hypothesisId: 'H2',
          location: 'remote-spaces.ts:saveSpaceImagesMetadata-error',
          message: 'Failed to save space images',
          data: {
            error: error.message,
            errorCode: error.code
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      
      return false;
    }
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H2',
        location: 'remote-spaces.ts:saveSpaceImagesMetadata-success',
        message: 'Space images saved successfully',
        data: {
          success: true,
          imageCount: images.length
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    return true;
  } catch (e) {
    console.warn('[remote-spaces] saveSpaceImagesMetadata error', e);
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H2',
        location: 'remote-spaces.ts:saveSpaceImagesMetadata-exception',
        message: 'Exception saving space images',
        data: {
          error: e instanceof Error ? e.message : String(e)
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
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
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'sync-check',
      hypothesisId: 'H3',
      location: 'remote-spaces.ts:fetchSpacesWithImages',
      message: 'Fetching spaces with images from Supabase',
      data: {
        userHash,
        limitPerSpace,
        offset
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
  
  const { data, error } = await supabase.rpc('get_spaces_with_images', {
    p_user_hash: userHash,
    p_limit_per_space: limitPerSpace,
    p_offset: offset
  });
  if (error) {
    console.warn('[remote-spaces] get_spaces_with_images failed', error);
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H3',
        location: 'remote-spaces.ts:fetchSpacesWithImages-error',
        message: 'Failed to fetch spaces with images',
        data: {
          error: error.message,
          errorCode: error.code
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    return [];
  }
  
  const spaces = (data as any) || [];
  const totalImages = spaces.reduce((sum: number, space: any) => {
    const images = space.images || [];
    return sum + images.length;
  }, 0);
  const generatedImages = spaces.reduce((sum: number, space: any) => {
    const images = space.images || [];
    return sum + images.filter((img: any) => img.type === 'generated').length;
  }, 0);
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'sync-check',
      hypothesisId: 'H3',
      location: 'remote-spaces.ts:fetchSpacesWithImages-success',
      message: 'Fetched spaces with images from Supabase',
      data: {
        spaceCount: spaces.length,
        totalImages,
        generatedImages,
        inspirationImages: totalImages - generatedImages
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion
  
  return spaces;
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

export async function updateSpaceName(
  userHash: string,
  spaceId: string,
  name: string
) {
  if (!userHash || !spaceId || !name.trim()) return null;
  const trimmed = name.trim();
  const { data, error } = await supabase
    .from('spaces')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', spaceId)
    .eq('user_hash', userHash)
    .select('*')
    .maybeSingle();

  if (error) {
    console.warn('[remote-spaces] updateSpaceName failed', error);
    return null;
  }

  return data;
}

export async function deleteSpace(userHash: string, spaceId: string) {
  if (!userHash || !spaceId) return false;
  const { error } = await supabase
    .from('spaces')
    .delete()
    .eq('id', spaceId)
    .eq('user_hash', userHash);

  if (error) {
    console.warn('[remote-spaces] deleteSpace failed', error);
    return false;
  }

  return true;
}

export async function deleteSpaceImage(
  userHash: string,
  imageId: string
): Promise<boolean> {
  if (!userHash || !imageId) return false;
  
  try {
    // First, get the image to check if it exists and get the URL for storage cleanup
    const { data: imageData, error: fetchError } = await supabase
      .from('space_images')
      .select('url')
      .eq('id', imageId)
      .eq('user_hash', userHash)
      .maybeSingle();

    if (fetchError) {
      console.warn('[remote-spaces] Failed to fetch image for deletion', fetchError);
      return false;
    }

    if (!imageData) {
      console.warn('[remote-spaces] Image not found for deletion');
      return false;
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('space_images')
      .delete()
      .eq('id', imageId)
      .eq('user_hash', userHash);

    if (deleteError) {
      console.warn('[remote-spaces] deleteSpaceImage failed', deleteError);
      return false;
    }

    // Try to delete from storage if it's a storage URL
    const imageUrl = imageData.url;
    if (imageUrl && imageUrl.includes('/storage/v1/object/public/space-images/')) {
      try {
        // Extract path from URL: https://...supabase.co/storage/v1/object/public/space-images/{path}
        const urlParts = imageUrl.split('/space-images/');
        if (urlParts.length > 1) {
          const storagePath = urlParts[1];
          const { error: storageError } = await supabase.storage
            .from(SPACE_BUCKET)
            .remove([storagePath]);

          if (storageError) {
            console.warn('[remote-spaces] Failed to delete from storage (non-critical)', storageError);
            // Don't fail the whole operation if storage deletion fails
          }
        }
      } catch (storageErr) {
        console.warn('[remote-spaces] Storage deletion error (non-critical)', storageErr);
        // Don't fail the whole operation
      }
    }

    return true;
  } catch (e) {
    console.warn('[remote-spaces] deleteSpaceImage error', e);
    return false;
  }
}