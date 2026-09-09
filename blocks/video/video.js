/**
 * Video block
 *
 * Expected authored structure (simple block, one field per row):
 *   row 1: video source — a reference to an approved video asset in AEM Assets,
 *          rendered by the backend as an <a href="…"> link.
 *   row 2: poster image (optional) — rendered as <picture><img></picture>.
 *   row 3: title (optional) — plain text used as an accessible label.
 *
 * Options (block classes): autoplay, loop, muted, no-controls.
 */

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v'];

/**
 * Delivery of the authored video.
 *
 * Primary path: the video is authored with the Configurable Asset Picker
 * (see blocks/video/_video.json + tools/assets-selector/video.config.json),
 * which writes a companion MIME type and makes the backend emit an absolute
 * Dynamic Media / Media Bus delivery URL. Such absolute URLs are used as-is.
 *
 * Legacy fallback: if a video is instead delivered as a raw DAM path
 * (/content/dam/.../my_video.mp4) — which the Edge Delivery host does not serve
 * and would 404 — it is rewritten to the Dynamic Media content endpoint. This
 * fallback is environment-specific; once every video is authored via the picker
 * it can be removed. See docs/video-asset-delivery-setup.md.
 */
const DM_HOST = 's7d1.scene7.com';
const DM_COMPANY = 'SolutionPartnerSandbox';

function isAbsoluteUrl(url) {
  return /^https?:\/\//i.test(url);
}

function isVideoUrl(url) {
  if (!url) return false;
  // Absolute delivery URLs (Dynamic Media / Media Bus) may carry no file
  // extension — trust them; the picker filter guarantees a video was selected.
  if (isAbsoluteUrl(url)) return true;
  try {
    const { pathname } = new URL(url, window.location.href);
    return VIDEO_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext));
  } catch (e) {
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().split('?')[0].endsWith(ext));
  }
}

/**
 * Resolves an authored video reference to a playable URL.
 * Absolute URLs (Dynamic Media / Media Bus / external) are returned as-is.
 * Raw DAM paths are rewritten to the Dynamic Media delivery URL as a fallback.
 * @param {string} url the authored reference
 * @returns {string} a playable video URL
 */
function resolveVideoSrc(url) {
  if (!url) return '';
  // Already an absolute URL (backend-provided delivery URL, or external) — leave it.
  if (isAbsoluteUrl(url)) return url;
  // Legacy fallback — raw DAM path: rewrite to Dynamic Media delivery.
  if (url.startsWith('/content/dam/')) {
    const fileName = url.split('/').pop().split('?')[0];
    const assetName = fileName.replace(/\.[^.]+$/, '');
    return `https://${DM_HOST}/is/content/${DM_COMPANY}/${assetName}`;
  }
  // Anything else (site-relative Media Bus redirect, etc.) — leave it.
  return url;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // 1. Extract configuration from the authored rows
  const rows = [...block.children];

  // The video source is the first link found in the block.
  const sourceLink = block.querySelector('a[href]');
  const videoRef = sourceLink ? sourceLink.getAttribute('href') : '';
  // Resolve raw DAM paths to their playable Dynamic Media delivery URL.
  const videoSrc = resolveVideoSrc(videoRef);

  // The poster is the first authored image, if any.
  const posterImg = block.querySelector('img');
  const posterSrc = posterImg ? posterImg.getAttribute('src') : '';

  // The title is any remaining, non-link/non-image text content.
  let title = '';
  rows.forEach((row) => {
    if (row.querySelector('a, picture, img')) return;
    const text = row.textContent.trim();
    if (text) title = text;
  });

  // 2. Read options from block classes
  const autoplay = block.classList.contains('autoplay');
  const loop = block.classList.contains('loop');
  const muted = block.classList.contains('muted') || autoplay; // autoplay requires muted
  const hideControls = block.classList.contains('no-controls');

  // 3. Transform DOM
  block.textContent = '';

  if (!videoSrc || !isVideoUrl(videoRef)) {
    // No approved/valid video was selected — render nothing rather than a broken player.
    block.setAttribute('data-video-empty', 'true');
    return;
  }

  const video = document.createElement('video');
  video.setAttribute('src', videoSrc);
  video.setAttribute('playsinline', '');
  if (posterSrc) video.setAttribute('poster', posterSrc);
  if (title) {
    video.setAttribute('title', title);
    video.setAttribute('aria-label', title);
  }
  if (!hideControls) video.setAttribute('controls', '');
  if (autoplay) video.setAttribute('autoplay', '');
  if (loop) video.setAttribute('loop', '');
  if (muted) {
    video.setAttribute('muted', '');
    video.muted = true;
  }
  // Defer loading of the media until it is needed.
  video.setAttribute('preload', posterSrc ? 'none' : 'metadata');

  block.append(video);
}
