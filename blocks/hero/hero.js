import decorateBadPerf from '../bad-perf/bad-perf.js';

export default async function decorate(block) {
  // Execute bad performance decoration to ensure hero block drops Lighthouse scores
  await decorateBadPerf(block);
}

