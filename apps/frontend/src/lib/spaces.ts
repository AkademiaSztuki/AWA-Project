// Spaces Management Utilities
// Functions to manage spaces and their images

import { SessionData } from '@/types';

export interface SpaceImage {
  id: string;
  url: string;
  type: 'generated' | 'inspiration';
  addedAt: string;
  thumbnailUrl?: string;
  tags?: string[];
}

export interface Space {
  id: string;
  name: string;
  type: string;
  images: SpaceImage[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Get or create default space for a user
 * Returns the first space or creates a new one if none exist
 */
export function getOrCreateDefaultSpace(sessionData: SessionData): Space {
  const spaces = sessionData.spaces || [];
  
  if (spaces.length > 0) {
    return spaces[0] as Space;
  }
  
  // Create a default space
  const defaultSpace: Space = {
    id: `space_${Date.now()}`,
    name: 'Moja Główna Przestrzeń',
    type: 'personal',
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  return defaultSpace;
}

/**
 * Add a generated image to a space
 */
export function addGeneratedImageToSpace(
  spaces: Space[],
  spaceId: string | undefined,
  imageUrl: string,
  thumbnailUrl?: string,
  tags?: string[]
): Space[] {
  // If no spaceId, use the first space or create one
  let targetSpaceId = spaceId;
  let updatedSpaces = [...spaces];
  
  if (!targetSpaceId) {
    if (spaces.length === 0) {
      // Create default space
      const defaultSpace: Space = {
        id: `space_${Date.now()}`,
        name: 'Moja Główna Przestrzeń',
        type: 'personal',
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedSpaces = [defaultSpace];
      targetSpaceId = defaultSpace.id;
    } else {
      targetSpaceId = spaces[0].id;
    }
  }
  
  // Add image to the target space
  return updatedSpaces.map(space => {
    if (space.id === targetSpaceId) {
      const newImage: SpaceImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: imageUrl,
        type: 'generated',
        addedAt: new Date().toISOString(),
        thumbnailUrl,
        tags
      };
      
      return {
        ...space,
        images: [...space.images, newImage],
        updatedAt: new Date().toISOString()
      };
    }
    return space;
  });
}

/**
 * Add an inspiration image to a space
 */
export function addInspirationImageToSpace(
  spaces: Space[],
  spaceId: string | undefined,
  imageUrl: string,
  thumbnailUrl?: string,
  tags?: string[]
): Space[] {
  // If no spaceId, use the first space or create one
  let targetSpaceId = spaceId;
  let updatedSpaces = [...spaces];
  
  if (!targetSpaceId) {
    if (spaces.length === 0) {
      // Create default space
      const defaultSpace: Space = {
        id: `space_${Date.now()}`,
        name: 'Moja Główna Przestrzeń',
        type: 'personal',
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedSpaces = [defaultSpace];
      targetSpaceId = defaultSpace.id;
    } else {
      targetSpaceId = spaces[0].id;
    }
  }
  
  // Add image to the target space
  return updatedSpaces.map(space => {
    if (space.id === targetSpaceId) {
      const newImage: SpaceImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: imageUrl,
        type: 'inspiration',
        addedAt: new Date().toISOString(),
        thumbnailUrl,
        tags
      };
      
      return {
        ...space,
        images: [...space.images, newImage],
        updatedAt: new Date().toISOString()
      };
    }
    return space;
  });
}

/**
 * Add multiple inspiration images to a space at once
 */
export function addMultipleInspirationsToSpace(
  spaces: Space[],
  spaceId: string | undefined,
  inspirations: Array<{ url: string; thumbnailUrl?: string; tags?: string[] }>
): Space[] {
  // If no spaceId, use the first space or create one
  let targetSpaceId = spaceId;
  let updatedSpaces = [...spaces];
  
  if (!targetSpaceId) {
    if (spaces.length === 0) {
      // Create default space
      const defaultSpace: Space = {
        id: `space_${Date.now()}`,
        name: 'Moja Główna Przestrzeń',
        type: 'personal',
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      updatedSpaces = [defaultSpace];
      targetSpaceId = defaultSpace.id;
    } else {
      targetSpaceId = spaces[0].id;
    }
  }
  
  // Add images to the target space
  return updatedSpaces.map(space => {
    if (space.id === targetSpaceId) {
      const newImages: SpaceImage[] = inspirations.map(insp => ({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: insp.url,
        type: 'inspiration' as const,
        addedAt: new Date().toISOString(),
        thumbnailUrl: insp.thumbnailUrl,
        tags: insp.tags
      }));
      
      return {
        ...space,
        images: [...space.images, ...newImages],
        updatedAt: new Date().toISOString()
      };
    }
    return space;
  });
}

/**
 * Remove an image from a space
 */
export function removeImageFromSpace(
  spaces: Space[],
  spaceId: string,
  imageId: string
): Space[] {
  return spaces.map(space => {
    if (space.id === spaceId) {
      return {
        ...space,
        images: space.images.filter(img => img.id !== imageId),
        updatedAt: new Date().toISOString()
      };
    }
    return space;
  });
}

/**
 * Get all images from a space
 */
export function getSpaceImages(
  spaces: Space[],
  spaceId: string,
  type?: 'generated' | 'inspiration'
): SpaceImage[] {
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return [];
  
  if (type) {
    return space.images.filter(img => img.type === type);
  }
  
  return space.images;
}
