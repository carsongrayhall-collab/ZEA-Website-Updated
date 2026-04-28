
/* ================================================================
   main-exact.js
   Rebuilt to be downloadable and to preserve the template-matching
   interactions for the J A Andrews site:
     1. Top slider
     2. Bottom slider
     3. Partner logo carousel
     4. Network visualization
     5. Donut portfolio chart
     6. Portfolio calculator integration
   ================================================================ */

(function () {
  'use strict';

  const RED = '#640a0e';
  const PIE_COLORS = ['#6d060b', '#7f0f14', '#a22a31'];
  let currentWeights = [0.42, 0.23, 0.35];
  let currentLabels = ['Stock 1', 'Stock 2', 'US Treasury 10y'];

  document.addEventListener('DOMContentLoaded', () => {
    initNetworkViz();
    initSlider({
      trackId: 'topSlidesTrack',
      pillId: 'topProgressPill',
      prevId: 'topPrev',
      nextId: 'topNext',
      total: 3,
      pillWidthPct: 33.3333
    });
    initSlider({
      trackId: 'bottomSlidesTrack',
      pillId: 'bottomProgressPill',
      prevId: 'bottomPrev',
      nextId: 'bottomNext',
      total: 4,
      pillWidthPct: 25
    });
    initPartnersCarousel();
    initPieChart();
    initCalculator();
  });

  window.addEventListener('resize', debounce(() => {
    drawPieChart(currentWeights);
  }, 100));

  /* ================================================================
     1. NETWORK VISUALIZATION
     ================================================================ */
  function initNetworkViz() {
    const container = document.getElementById('networkViz');
    if (!container) return;

    container.innerHTML = generateNetworkSVG(560, 560, 40);
  }

  function generateNetworkSVG(width, height, count) {
    const PHI = Math.PI * (3 - Math.sqrt(5));
    const nodes = [];
    const edges = [];
    const connectDistance = 0.5;

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = PHI * i;
      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      const px = width * (0.58 + x * 0.36);
      const py = height * (0.58 - y * 0.42);
      const visible = z >= -0.28;
      const depth = (z + 1) / 2;

      nodes.push({
        x: px,
        y: py,
        z,
        visible,
        nodeRadius: visible ? (2 + depth * 6) : 0,
        opacity: visible ? (0.28 + depth * 0.72) : 0,
        xyz: [x, y, z]
      });
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        if (!a.visible || !b.visible) continue;

        const d = Math.sqrt(
          Math.pow(a.xyz[0] - b.xyz[0], 2) +
          Math.pow(a.xyz[1] - b.xyz[1], 2) +
          Math.pow(a.xyz[2] - b.xyz[2], 2)
        );

        if (d <= connectDistance) {
          const avgDepth = ((a.z + 1) / 2 + (b.z + 1) / 2) / 2;
          edges.push({
            i,
            j,
            opacity: 0.10 + avgDepth * 0.55
          });
        }
      }
    }

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-hidden="true">`;

    for (const edge of edges) {
      const a = nodes[edge.i];
      const b = nodes[edge.j];
      svg += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="${RED}" stroke-width="1" stroke-opacity="${edge.opacity.toFixed(2)}" />`;
    }

    for (const node of nodes) {
      if (!node.visible) continue;
      svg += `<circle cx="${node.x.toFixed(1)}" cy="${node.y.toFixed(1)}" r="${node.nodeRadius.toFixed(1)}" fill="${RED}" fill-opacity="${node.opacity.toFixed(2)}" />`;
    }

    svg += '</svg>';
    return svg;
  }

  /* ================================================================
     2. SLIDERS
     ================================================================ */
  function initSlider(config) {
    const track = document.getElementById(config.trackId);
    const pill = document.getElementById(config.pillId);
    const prev = document.getElementById(config.prevId);
    const next = document.getElementById(config.nextId);

    if (!track || !pill || !prev || !next) return;

    let index = 0;
    const total = config.total;

    pill.style.width = `${config.pillWidthPct}%`;

    function render() {
      track.style.transform = `translateX(-${index * 100}%)`;
      const travel = 100 - config.pillWidthPct;
      const left = total > 1 ? (index / (total - 1)) * travel : 0;
      pill.style.left = `${left}%`;
    }

    function goTo(newIndex) {
      index = ((newIndex % total) + total) % total;
      render();
    }

    prev.addEventListener('click', () => goTo(index - 1));
    next.addEventListener('click', () => goTo(index + 1));

    let startX = 0;
    let dragging = false;

    track.addEventListener('touchstart', (event) => {
      if (!event.touches || !event.touches.length) return;
      startX = event.touches[0].clientX;
      dragging = true;
    }, { passive: true });

    track.addEventListener('touchend', (event) => {
      if (!dragging || !event.changedTouches || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - startX;
      dragging = false;
      if (Math.abs(dx) > 40) {
        goTo(index + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });

    render();
  }

  /* ================================================================
     3. PARTNER CAROUSEL
     ================================================================ */
  function initPartnersCarousel() {
    const track = document.getElementById('partnersTrack');
    if (!track) return;

    const defaultPartners = [
      { text: 'HADRON', alt: 'Hadron Insurance' },
      { text: 'HALO', alt: 'Halo Underwriting' },
      { text: 'A', alt: 'Amwins' },
      { text: 'DU', alt: 'Dale Underwriting' }
    ];

    const partners = Array.isArray(window.PARTNER_LOGOS) && window.PARTNER_LOGOS.length
      ? window.PARTNER_LOGOS
      : defaultPartners;

    track.innerHTML = '';

    const items = partners.map(createPartnerEl);
    const clones = items.map((item) => item.cloneNode(true));
    [...items, ...clones].forEach((item) => track.appendChild(item));

    track.classList.add('animate');
  }

  function createPartnerEl(entry) {
    const wrap = document.createElement('div');
    wrap.className = 'partner-logo-wrap';

    if (entry && entry.src) {
      const img = document.createElement('img');
      img.src = entry.src;
      img.alt = entry.alt || '';
      img.loading = 'lazy';
      wrap.appendChild(img);
      return wrap;
    }

    const span = document.createElement('span');
    span.className = 'partner-text';
    span.textContent = entry && entry.text ? entry.text : '';
    wrap.appendChild(span);
    return wrap;
  }

  /* ================================================================
     4. DONUT / PIE CHART
     ================================================================ */
  function initPieChart() {
    updateLegend(currentLabels, currentWeights);
    drawPieChart(currentWeights);
  }

  function drawPieChart(weights) {
    const canvas = document.getElementById('pieChart');
    if (!canvas) return;

    const parent = canvas.parentElement || canvas;
    const rect = parent.getBoundingClientRect();
    const dpr = Math.max(window.devicePixelRatio || 1, 1);

    const cssWidth = Math.max(Math.round(rect.width), 280);
    const cssHeight = Math.max(Math.round(rect.height), 280);

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const outerR = Math.min(cssWidth, cssHeight) * 0.40;
    const innerR = outerR * 0.57;
    const lineWidth = outerR - innerR;

    let start = -Math.PI * 0.75;

    weights.forEach((weight, i) => {
      const angle = Math.max(0, weight) * Math.PI * 2;
      const end = start + angle;

      ctx.beginPath();
      ctx.arc(cx, cy, (outerR + innerR) / 2, start, end);
      ctx.strokeStyle = PIE_COLORS[i % PIE_COLORS.length];
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'butt';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, start, start + 0.004);
      ctx.strokeStyle = RED;
      ctx.lineWidth = 3;
      ctx.stroke();

      start = end;
    });

    // Outer ring accent to match template outline feel
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function updateLegend(labels, weights) {
    const legend = document.getElementById('pieLegend');
    if (!legend) return;

    legend.innerHTML = '';
    labels.forEach((label, i) => {
      const item = document.createElement('div');
      item.className = 'legend-item';

      const dot = document.createElement('span');
      dot.className = 'legend-dot';
      dot.style.background = PIE_COLORS[i % PIE_COLORS.length];

      const text = document.createElement('span');
      const pct = `${Math.round((weights[i] || 0) * 100)}%`;
      text.textContent = `${label} ${pct}`;

      item.appendChild(dot);
      item.appendChild(text);
      legend.appendChild(item);
    });
  }

  /* ================================================================
     5. CALCULATOR
     ================================================================ */
  function initCalculator() {
    const input1 = document.getElementById('stockInput1');
    const input2 = document.getElementById('stockInput2');
    const button = document.getElementById('calcBtn');
    const results = document.getElementById('calcResults');

    if (!input1 || !input2 || !button || !results) return;

    const normalizeTicker = (value) => String(value || '')
      .toUpperCase()
      .replace(/[^A-Z.\-]/g, '')
      .slice(0, 10);

    [input1, input2].forEach((input) => {
      input.addEventListener('input', () => {
        const normalized = normalizeTicker(input.value);
        if (normalized !== input.value) {
          input.value = normalized;
        }
      });
    });

    button.addEventListener('click', async () => {
      const ticker1 = normalizeTicker(input1.value);
      const ticker2 = normalizeTicker(input2.value);
      const mode = document.querySelector('input[name="portfolioMode"]:checked');
      const longOnly = !mode || mode.value === 'long';

      results.innerHTML = '<div class="calc-loading">Calculating portfolio...</div>';
      button.disabled = true;

      try {
        if (!ticker1 || !ticker2) {
          throw new Error('Please enter both stock tickers.');
        }

        if (ticker1 === ticker2) {
          throw new Error('Please enter two different stock tickers.');
        }

        let output;
        if (window.PORTFOLIO && typeof window.PORTFOLIO.compute === 'function') {
          output = await window.PORTFOLIO.compute(ticker1, ticker2, longOnly);
        } else {
          output = {
            tickers: [ticker1, ticker2, 'US Treasury 10y'],
            weights: longOnly ? [0.38, 0.24, 0.38] : [0.52, -0.08, 0.56]
          };
        }

        const tickers = Array.isArray(output.tickers) ? output.tickers : [ticker1, ticker2, 'US Treasury 10y'];
        const weights = Array.isArray(output.weights) ? output.weights : [0.33, 0.33, 0.34];

        currentLabels = tickers.slice(0, 3);
        currentWeights = normalizeWeightsForChart(weights);
        updateLegend(currentLabels, currentWeights);
        drawPieChart(currentWeights);
        renderResults(results, tickers, weights, longOnly);
      } catch (error) {
        results.innerHTML = `<div class="calc-error">${escapeHtml(error && error.message ? error.message : 'Unable to calculate portfolio.')}</div>`;
      } finally {
        button.disabled = false;
      }
    });
  }

  function normalizeWeightsForChart(weights) {
    const safe = (weights || []).slice(0, 3).map((w) => Math.abs(Number(w) || 0));
    while (safe.length < 3) safe.push(0);
    const total = safe.reduce((sum, value) => sum + value, 0);
    if (total <= 0) return [0.33, 0.33, 0.34];
    return safe.map((value) => value / total);
  }

  function renderResults(container, tickers, weights, longOnly) {
    const rows = tickers.slice(0, 3).map((ticker, i) => {
      const weight = Number(weights[i] || 0);
      return `
        <div class="result-row">
          <span class="result-label">${escapeHtml(ticker)}</span>
          <span class="result-value">${formatPct(weight)}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="result-row">
        <span class="result-label">Mode</span>
        <span class="result-value">${longOnly ? 'Long only' : 'Short selling enabled'}</span>
      </div>
      ${rows}
    `;
  }

  /* ================================================================
     HELPERS
     ================================================================ */
  function formatPct(value) {
    const num = Number(value) || 0;
    return `${(num * 100).toFixed(1)}%`;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }