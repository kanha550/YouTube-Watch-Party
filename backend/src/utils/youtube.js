/**
 * Extracts an 11-character YouTube video ID from various URL formats or raw ID.
 * Supports:
 * - standard watch: https://www.youtube.com/watch?v=VIDEO_ID
 * - short link: https://youtu.be/VIDEO_ID
 * - embed: https://www.youtube.com/embed/VIDEO_ID
 * - shorts: https://www.youtube.com/shorts/VIDEO_ID
 * - raw 11-character video ID
 * 
 * @param {string} input 
 * @returns {string|null} 11-character videoId or null if invalid
 */
export function parseYouTubeVideoId(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();

  // Check if directly a valid 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();

    // youtu.be/VIDEO_ID
    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      const match = url.pathname.slice(1).match(/^[a-zA-Z0-9_-]{11}/);
      if (match) return match[0];
    }

    // youtube.com
    if (host.includes('youtube.com')) {
      // /watch?v=VIDEO_ID
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }

      // /embed/VIDEO_ID
      const embedMatch = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
      if (embedMatch) return embedMatch[1];

      // /shorts/VIDEO_ID
      const shortsMatch = url.pathname.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
      if (shortsMatch) return shortsMatch[1];
    }
  } catch {
    // Fallback regex match for common youtube link patterns even without protocol
    const regexMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (regexMatch && regexMatch[1]) {
      return regexMatch[1];
    }
  }

  return null;
}
