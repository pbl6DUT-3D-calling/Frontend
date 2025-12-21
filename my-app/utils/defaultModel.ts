/**
 * Default VRM Model Configuration
 * Shared across vrm-studio, avatar-selector, and other components
 */

export const DEFAULT_MODEL = {
  id: "local-default-1",
  name: "Default Model",
  vrmUrl: "models/7667029464206216702.vrm",
  thumbnailUrl: "https://placehold.co/150x150/06b6d4/ffffff?text=Default"
} as const;

export const THUMBNAIL_CACHE_KEY = 'pbl6_default_thumbnail' as const;

/**
 * Get default model thumbnail (with caching)
 * @returns {Promise<string>} - Base64 data URL or placeholder
 */
export async function getDefaultModelThumbnail(): Promise<string> {
  // Check cache first
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(THUMBNAIL_CACHE_KEY);
    if (cached) {
      console.log('✅ Using cached default thumbnail');
      return cached;
    }
  }

  // Generate new thumbnail
  try {
    console.log('📸 Generating default model thumbnail...');
    const { generateVrmThumbnail } = await import('@/utils/generateVrmThumbnail');
    const thumbnail = await generateVrmThumbnail(DEFAULT_MODEL.vrmUrl, {
      size: 512,
      padding: 1.3
    });
    
    // Cache for future use
    if (typeof window !== 'undefined') {
      localStorage.setItem(THUMBNAIL_CACHE_KEY, thumbnail);
      console.log('✅ Default thumbnail cached');
    }
    
    return thumbnail;
  } catch (error) {
    console.warn('⚠️ Thumbnail generation failed:', error);
    return DEFAULT_MODEL.thumbnailUrl; // Fallback to placeholder
  }
}
