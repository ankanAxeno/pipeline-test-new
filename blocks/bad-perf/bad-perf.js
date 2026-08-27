/**
 * Block designed to intentionally degrade Core Web Vitals (LCP, FCP, CLS, TBT)
 * for testing Lighthouse CI failure thresholds in GitHub Actions.
 * @param {Element} block The bad-perf block element
 */
export default async function decorate(block) {
  // 1. Degrade TBT & FCP: Block the main thread synchronously for ~1.2s
  const start = Date.now();
  while (Date.now() - start < 1200) {
    Math.sin(Math.random());
  }

  // Initial content styling
  block.innerHTML = `
    <div class="bad-perf-content">
      <h2>Performance Testing Block</h2>
      <p>Simulating degraded Core Web Vitals metrics (LCP, FCP, CLS, TBT)...</p>
    </div>
  `;

  // 2. Degrade CLS: Dynamically inject a large element above content after 2s delay
  setTimeout(() => {
    const shiftBox = document.createElement('div');
    shiftBox.className = 'bad-perf-cls-box';
    shiftBox.innerHTML = `
      <h3>⚠️ Layout Shift Alert</h3>
      <p>Unexpected heavy element injected without pre-reserved dimensions.</p>
    `;
    block.prepend(shiftBox);
  }, 2000);

  // 3. Degrade LCP: Delay loading a massive unoptimized image for 3.5s
  setTimeout(() => {
    const lcpImage = document.createElement('img');
    lcpImage.className = 'bad-perf-lcp-image';
    lcpImage.src = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=4000&q=100';
    lcpImage.alt = 'Unoptimized Heavy LCP Image';
    block.appendChild(lcpImage);
  }, 3500);
}

