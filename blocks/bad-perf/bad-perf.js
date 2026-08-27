/**
 * Block calibrated to target a Lighthouse / PSI score of ~85 (between 80 and 88).
 * Slightly exceeds thresholds to fail LHCI 90% target cleanly.
 * @param {Element} block The bad-perf block element
 */
export default async function decorate(block) {
  // 1. Moderate TBT (~280ms): Mild main-thread block to land PSI score around 85
  const start = Date.now();
  while (Date.now() - start < 280) {
    Math.sin(Math.random());
  }

  // Initial content styling
  block.innerHTML = `
    <div class="bad-perf-content">
      <h2>Performance Testing Block</h2>
      <p>Simulating mild performance degradation (Target PSI: ~85)...</p>
    </div>
  `;

  // 2. Controlled CLS (~0.12): Inject shift element after 1.5s
  setTimeout(() => {
    const shiftBox = document.createElement('div');
    shiftBox.className = 'bad-perf-cls-box';
    shiftBox.innerHTML = `
      <h3>⚠️ Layout Shift Alert</h3>
      <p>Unexpected element injected dynamically.</p>
    `;
    block.prepend(shiftBox);
  }, 1500);

  // 3. Moderate LCP (~2.7s): Delay image load slightly past 2.5s threshold
  setTimeout(() => {
    const lcpImage = document.createElement('img');
    lcpImage.className = 'bad-perf-lcp-image';
    lcpImage.src = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&q=80';
    lcpImage.alt = 'Mildly Delayed LCP Image';
    block.appendChild(lcpImage);
  }, 2600);
}
