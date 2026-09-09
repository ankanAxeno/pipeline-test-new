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
 * The video is authored with the Configurable Asset Picker (see
 * blocks/video/_video.json + tools/assets-selector/video.config.json), which
 * writes a companion MIME type so the backend emits an absolute Dynamic Media /
 * Media Bus delivery URL. The block uses that URL directly — no environment-
 * specific rewriting. See docs/video-asset-delivery-setup.md.
 */

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
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // 1. Extract configuration from the authored rows
  const rows = [...block.children];

  // The video source is the first link found in the block — the backend-provided
  // delivery URL from the asset picker.
  const sourceLink = block.querySelector('a[href]');
  const videoSrc = sourceLink ? sourceLink.getAttribute('href') : '';

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

  if (!videoSrc || !isVideoUrl(videoSrc)) {
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
