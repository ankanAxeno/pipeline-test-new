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
 * Dynamic Media (Scene7) delivery configuration.
 *
 * Videos authored via the AEM asset picker arrive as raw DAM paths
 * (e.g. /content/dam/.../my_video.mp4). The Edge Delivery host does not serve
 * DAM binaries at that path, so the raw reference 404s. The same asset is
 * delivered by Dynamic Media as:
 *   https://<DM_HOST>/is/content/<DM_COMPANY>/<asset-name>
 * (matching how images on this site resolve to s7d1.scene7.com/is/image/...).
 */
const DM_HOST = 's7d1.scene7.com';
const DM_COMPANY = 'SolutionPartnerSandbox';

function isVideoUrl(url) {
  if (!url) return false;
  try {
    const { pathname } = new URL(url, window.location.href);
    return VIDEO_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext));
  } catch (e) {
    return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().split('?')[0].endsWith(ext));
  }
}

/**
 * Resolves an authored video reference to a playable URL.
 * Raw DAM paths are rewritten to the Dynamic Media delivery URL; absolute
 * URLs (external hosts or already-Dynamic-Media links) are returned as-is.
 * @param {string} url the authored reference
 * @returns {string} a playable video URL
 */
function resolveVideoSrc(url) {
  if (!url) return '';
  // Already an absolute URL (external, or already a Dynamic Media link) — leave it.
  if (/^https?:\/\//i.test(url)) return url;
  // Raw DAM path: rewrite to Dynamic Media delivery using the asset's base name.
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
