import { supabase, saveParticipantImage } from '@/lib/supabase';

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
  
  // Normalize spaceId: remove "space_" prefix if present
  const normalizeSpaceId = (id?: string): string | undefined => {
    if (!id) return undefined;
    return id.startsWith('space_') ? id.substring(6) : id;
  };

  if (!userHash) return null;
  
  const normalizedSpaceId = normalizeSpaceId(opts?.spaceId);
  // Only reuse provided spaceId if it is a valid uuid; otherwise create a proper space record
  if (normalizedSpaceId && isUuid(normalizedSpaceId)) return normalizedSpaceId;

  const name = opts?.name || 'Moja Przestrzeń';
  const type = opts?.type || 'personal';

  // After radical refactor we do NOT persist spaces in Supabase.
  // Return a stable local-only id.
  try {
    return normalizedSpaceId || (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `space_${Date.now()}`);
  } catch {
    return `space_${Date.now()}`;
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

// NEW: Save images to participant_images (replaces saveSpaceImagesMetadata)
export async function saveParticipantImages(
  userHash: string,
  images: Array<{
    url: string;
    thumbnail_url?: string;
    type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
    space_id?: string;
    tags?: any;
    is_favorite?: boolean;
    source?: string;
    generation_id?: string;
  }>
): Promise<boolean> {
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-entry',message:'Saving participant images',data:{userHash,imageCount:images.length,imageTypes:images.map(i=>i.type)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
  // #endregion
  
  if (!userHash || images.length === 0) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-skipped',message:'No userHash or images',data:{hasUserHash:!!userHash,imageCount:images.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return true;
  }
  
  try {
    let savedCount = 0;
    let failedCount = 0;
    
    // Upload images to Storage and save metadata
    for (const img of images) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-processing',message:'Processing image',data:{imageType:img.type,urlStartsWith:img.url.substring(0,20),hasTags:!!img.tags},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      let storagePath = '';
      let publicUrl = img.url;
      
      // If image is base64, upload to Storage
      if (img.url.startsWith('data:')) {
        try {
          const response = await fetch(img.url);
          const blob = await response.blob();
          const ext = blob.type?.split('/')[1] || 'png';
          const imageId = `img_${Date.now()}_${Math.random().toString(36).substring(2)}`;
          storagePath = `${userHash}/${img.type}/${imageId}.${ext}`;
          
          const { error: uploadError } = await supabase.storage
            .from('participant-images')
            .upload(storagePath, blob, {
              cacheControl: '3600',
              upsert: true,
              contentType: blob.type || 'image/png'
            });
          
          if (uploadError) {
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-upload-error',message:'Upload failed',data:{imageType:img.type,error:uploadError.message,errorCode:(uploadError as any).statusCode || 'unknown'},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
            // #endregion
            console.warn('[remote-spaces] Upload failed for', img.type, uploadError);
            failedCount++;
            continue;
          }
          
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-upload-success',message:'Upload succeeded',data:{imageType:img.type,storagePath,blobType:blob.type||null,blobSize:blob.size||0},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion

          const { data: publicData } = supabase.storage.from('participant-images').getPublicUrl(storagePath);
          publicUrl = publicData?.publicUrl || img.url;
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-publicUrl',message:'Computed public URL',data:{imageType:img.type,storagePath,publicUrlStartsWith:publicUrl.substring(0,30)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
        } catch (e) {
          // #region agent log
          void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-upload-exception',message:'Exception during upload',data:{imageType:img.type,error:e instanceof Error?e.message:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
          // #endregion
          console.warn('[remote-spaces] Failed to upload image', e);
          failedCount++;
          continue;
        }
      } else if (img.url.startsWith('http')) {
        // Already a URL, use as storage path
        storagePath = img.url;
      } else {
        storagePath = img.url;
      }
      
      // Extract tags from image.tags
      const tags = img.tags || {};
      const tagsStyles = Array.isArray(tags.styles) ? tags.styles : (tags.style ? [tags.style] : []);
      const tagsColors = Array.isArray(tags.colors) ? tags.colors : [];
      const tagsMaterials = Array.isArray(tags.materials) ? tags.materials : [];
      const tagsBiophilia = typeof tags.biophilia === 'number' ? tags.biophilia : null;
      
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-before-save',message:'About to call saveParticipantImage',data:{imageType:img.type,hasStoragePath:!!storagePath,hasPublicUrl:!!publicUrl,storagePathLength:storagePath.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      
      const imageId = await saveParticipantImage(userHash, {
        type: img.type,
        space_id: img.space_id,
        storage_path: storagePath,
        public_url: publicUrl,
        thumbnail_url: img.thumbnail_url,
        is_favorite: img.is_favorite || false,
        tags_styles: tagsStyles,
        tags_colors: tagsColors,
        tags_materials: tagsMaterials,
        tags_biophilia: tagsBiophilia,
        description: tags.description || null,
        source: img.source || undefined,
        generation_id: img.generation_id || undefined
      });
      
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-after-save',message:'After saveParticipantImage call',data:{imageId,imageType:img.type,hasImageId:!!imageId},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      
      if (imageId) {
        savedCount++;
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-saved',message:'Image saved successfully',data:{imageId,imageType:img.type},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
      } else {
        failedCount++;
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-failed',message:'Image save failed (saveParticipantImage returned null)',data:{imageType:img.type,storagePath,publicUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
        // #endregion
      }
    }
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-complete',message:'Finished saving images',data:{totalImages:images.length,savedCount,failedCount},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    
    return true;
  } catch (e) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:saveParticipantImages-exception',message:'Exception in saveParticipantImages',data:{error:e instanceof Error?e.message:String(e),imageCount:images.length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    console.warn('[remote-spaces] saveParticipantImages error', e);
    return false;
  }
}

// LEGACY: Keep for backward compatibility (will be removed after migration)
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
  // Redirect to new function
  return saveParticipantImages(userHash, images);
}

// NEW: Toggle favorite in participant_images
export async function toggleParticipantImageFavorite(
  userHash: string,
  imageId: string,
  isFavorite: boolean
): Promise<boolean> {
  if (!userHash || !imageId) return false;
  
  const { error } = await supabase
    .from('participant_images')
    .update({ is_favorite: isFavorite })
    .eq('id', imageId)
    .eq('user_hash', userHash);
  
  if (error) {
    console.warn('[remote-spaces] toggleParticipantImageFavorite failed', error);
    return false;
  }
  return true;
}

// LEGACY: Keep for backward compatibility
export async function toggleSpaceImageFavorite(
  userHash: string,
  imageId: string,
  isFavorite: boolean
) {
  return toggleParticipantImageFavorite(userHash, imageId, isFavorite);
}

// NEW: Fetch images from participant_images (replaces fetchSpacesWithImages)
export async function fetchParticipantImages(userHash: string): Promise<Array<{
  id: string;
  type: 'generated' | 'inspiration' | 'room_photo' | 'room_photo_empty';
  url: string;
  thumbnailUrl?: string;
  isFavorite: boolean;
  spaceId?: string | null;
  tags?: any;
  source?: string;
  createdAt: string;
}>> {
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:fetchParticipantImages-entry',message:'Fetching participant images',data:{userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H6'})}).catch(()=>{});
  // #endregion
  
  if (!userHash) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:fetchParticipantImages-no-hash',message:'No userHash provided',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
    return [];
  }
  
  try {
    const { data, error } = await supabase
      .from('participant_images')
      .select('*')
      .eq('user_hash', userHash)
      .order('created_at', { ascending: false });
    
    if (error) {
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:fetchParticipantImages-error',message:'Error fetching images',data:{error:error.message,errorCode:error.code,userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H6'})}).catch(()=>{});
      // #endregion
      console.warn('[remote-spaces] fetchParticipantImages failed', error);
      return [];
    }
    
    const mapped = (data || []).map(img => ({
      id: img.id,
      type: img.type,
      url: img.public_url || img.storage_path,
      thumbnailUrl: img.thumbnail_url,
      isFavorite: img.is_favorite || false,
      spaceId: img.space_id || null,
      tags: {
        styles: img.tags_styles || [],
        colors: img.tags_colors || [],
        materials: img.tags_materials || [],
        biophilia: img.tags_biophilia
      },
      source: img.source,
      createdAt: img.created_at
    }));
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:fetchParticipantImages-success',message:'Successfully fetched images',data:{imageCount:mapped.length,generatedCount:mapped.filter(i=>i.type==='generated').length,inspirationCount:mapped.filter(i=>i.type==='inspiration').length,roomPhotoCount:mapped.filter(i=>i.type==='room_photo').length},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
    
    return mapped;
  } catch (e) {
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'remote-spaces.ts:fetchParticipantImages-exception',message:'Exception fetching images',data:{error:e instanceof Error?e.message:String(e),userHash},timestamp:Date.now(),sessionId:'debug-session',runId:'flow-debug',hypothesisId:'H6'})}).catch(()=>{});
    // #endregion
    console.warn('[remote-spaces] fetchParticipantImages error', e);
    return [];
  }
}

export async function fetchParticipantSpaces(userHash: string): Promise<Array<{
  id: string;
  name: string;
  type: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}>> {
  if (!userHash) return [];
  const { data, error } = await supabase
    .from('participant_spaces')
    .select('*')
    .eq('user_hash', userHash)
    .order('updated_at', { ascending: false });
  if (error) {
    console.warn('[remote-spaces] fetchParticipantSpaces failed', error);
    return [];
  }
  return (data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    type: s.type || 'personal',
    isDefault: !!s.is_default,
    createdAt: s.created_at,
    updatedAt: s.updated_at || s.created_at
  }));
}

export async function createParticipantSpace(
  userHash: string,
  space: { name: string; type?: string; is_default?: boolean }
): Promise<{ id: string } | null> {
  if (!userHash || !space?.name) return null;
  const { data, error } = await supabase
    .from('participant_spaces')
    .insert({
      user_hash: userHash,
      name: space.name,
      type: space.type || 'personal',
      is_default: !!space.is_default
    })
    .select('id')
    .single();
  if (error) {
    console.warn('[remote-spaces] createParticipantSpace failed', error);
    return null;
  }
  return { id: data.id };
}

// LEGACY: Keep for backward compatibility (will be removed after migration)
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
  // Legacy table removed after radical refactor
  return [];
}

export async function updateSpaceName(
  userHash: string,
  spaceId: string,
  name: string
) {
  // Legacy table removed after radical refactor (spaces are local-only).
  if (!userHash || !spaceId || !name.trim()) return null;
  return { id: spaceId, user_hash: userHash, name: name.trim() } as any;
}

export async function deleteSpace(userHash: string, spaceId: string): Promise<boolean> {
  if (!userHash || !spaceId) return false;
  
  try {
    const { error } = await supabase
      .from('participant_spaces')
      .delete()
      .eq('id', spaceId)
      .eq('user_hash', userHash);
    
    if (error) {
      console.warn('[remote-spaces] deleteSpace failed', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.warn('[remote-spaces] deleteSpace error', e);
    return false;
  }
}

// NEW: Delete image from participant_images
export async function deleteParticipantImage(
  userHash: string,
  imageId: string
): Promise<boolean> {
  if (!userHash || !imageId) return false;
  
  try {
    // First, get the image to find storage path
    const { data: image, error: fetchError } = await supabase
      .from('participant_images')
      .select('storage_path')
      .eq('id', imageId)
      .eq('user_hash', userHash)
      .single();
    
    if (fetchError || !image) {
      console.warn('[remote-spaces] Image not found for deletion');
      return false;
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('participant_images')
      .delete()
      .eq('id', imageId)
      .eq('user_hash', userHash);
    
    if (deleteError) {
      console.warn('[remote-spaces] deleteParticipantImage failed', deleteError);
      return false;
    }
    
    // Try to delete from storage (non-critical)
    if (image.storage_path && !image.storage_path.startsWith('http')) {
      try {
        const { error: storageError } = await supabase.storage
          .from('participant-images')
          .remove([image.storage_path]);
        
        if (storageError) {
          console.warn('[remote-spaces] Failed to delete from storage (non-critical)', storageError);
        }
      } catch (storageErr) {
        console.warn('[remote-spaces] Storage deletion error (non-critical)', storageErr);
      }
    }
    
    return true;
  } catch (e) {
    console.warn('[remote-spaces] deleteParticipantImage error', e);
    return false;
  }
}

// LEGACY: Keep for backward compatibility
export async function deleteSpaceImage(
  userHash: string,
  imageId: string
): Promise<boolean> {
  // Legacy compatibility: treat imageId as participant_images.id if possible
  return deleteParticipantImage(userHash, imageId);
}