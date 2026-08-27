/**
 * Block calibrated to lower Lighthouse / PSI score from ~94 down to ~85 (80-88 range).
 * @param {Element} block The bad-perf block element
 */
export default async function decorate(block) {
  // 1. TBT (~350ms measured): Main thread sync block for 550ms during decoration
  const start = Date.now();
  while (Date.now() - start < 550) {
    Math.sin(Math.random());
  }

  // Initial content styling
  block.innerHTML = `
    <div class="bad-perf-content">
      <h2>Performance Testing Block</h2>
      <p>Simulating moderate performance degradation (Target PSI: ~85)...</p>
    </div>
  `;

  // 2. Controlled CLS (~0.15): Inject 120px element at 800ms
  setTimeout(() => {
    const shiftBox = document.createElement('div');
    shiftBox.className = 'bad-perf-cls-box';
    shiftBox.innerHTML = `
      <h3>⚠️ Layout Shift Alert</h3>
      <p>Unexpected element injected dynamically.</p>
    `;
    block.prepend(shiftBox);
  }, 800);

  // 3. LCP (~2.8s): Inject heavy image at 1200ms within primary audit window
  setTimeout(() => {
    const lcpImage = document.createElement('img');
    lcpImage.className = 'bad-perf-lcp-image';
    lcpImage.src = 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=2400&q=90';
    lcpImage.alt = 'Delayed Heavy LCP Image';
    block.appendChild(lcpImage);
  }, 1200);
}
