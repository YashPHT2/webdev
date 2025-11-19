(function () {
  const U = window.DashboardUtils || {};

  function collectTimeData() {
    const items = document.querySelectorAll('[data-stat-item]');
    const labels = [];
    const values = [];
    const colors = [];
    items.forEach((el) => {
      const label = el.querySelector('.time-stats__label')?.textContent?.trim() || '—';
      const vText = el.querySelector('[data-stat-value]')?.textContent || '0';
      const hours = parseFloat(vText.replace(/[^0-9.]/g, '')) || 0;
      labels.push(label); values.push(hours);
      const color = el.querySelector('.time-stats__color')?.style?.backgroundColor || '#2563EB';
      colors.push(color);
    });
    return { labels, values, colors };
  }

  function ensureCanvasSize(c, h) {
    if (!c) return;
    c.width = c.clientWidth || c.offsetWidth || 300;
    c.height = h || 180;
  }

  function initTimeChart() {
    const canvas = document.getElementById('timeChartCanvas');
    if (!canvas) return null;
    const { labels, values, colors } = collectTimeData();
    if (window.smartMentor && window.smartMentor.updateTimeChart) {
      // Let core handle it
      window.smartMentor.updateTimeChart();
      return null;
    }
    if (window.Chart) {
      const ctx = canvas.getContext('2d');
      return new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Hours', data: values, backgroundColor: colors }] },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.formattedValue} hrs`
              }
            }
          },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${v}h` } } }
        }
      });
    } else {
      // Fallback simple bars
      const ctx = canvas.getContext('2d');
      ensureCanvasSize(canvas, 180);
      const max = Math.max(1, ...values);
      const barW = (canvas.width) / Math.max(1, values.length * 1.5);
      values.forEach((v, i) => {
        const x = 20 + i * barW * 1.5;
        const bh = (v / max) * (canvas.height - 40);
        ctx.fillStyle = colors[i] || '#2563EB';
        ctx.fillRect(x, canvas.height - bh - 20, barW, bh);
        ctx.fillStyle = '#6b7280'; ctx.font = '12px system-ui';
        ctx.fillText(labels[i] || '', x, canvas.height - 5);
      });
      return null;
    }
  }

  function initProgressLine() {
    const canvas = document.getElementById('progressGraphCanvas');
    if (!canvas) return null;
    if (window.smartMentor && window.smartMentor.drawLineChart) {
      window.smartMentor.drawLineChart(window.smartMentor.currentProgressView || 'weekly');
      bindProgressToggle();
      return null;
    }
    // Fallback synthetic data
    const data = Array.from({ length: 7 }, (_, i) => 40 + Math.round(Math.sin(i/2) * 30 + Math.random() * 10));
    ensureCanvasSize(canvas, 180);
    const ctx = canvas.getContext('2d');
    const max = Math.max(100, ...data);
    const pts = data.map((v, i) => [i / Math.max(1, data.length - 1) * (canvas.width - 40) + 20, canvas.height - 20 - (v / max) * (canvas.height - 40)]);
    U.rafTween({ duration: 420, onUpdate: (_, t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#2563EB'; ctx.lineWidth = 2; ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const iy = canvas.height - 20 - (1 - t) * (canvas.height - 20 - y);
        if (i === 0) ctx.moveTo(x, iy); else ctx.lineTo(x, iy);
      });
      ctx.stroke();
    }});
    bindProgressToggle();
    return null;
  }

  function bindProgressToggle() {
    document.querySelectorAll('.progress-view-toggle__button').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (window.smartMentor && window.smartMentor.handleProgressViewToggle) {
          window.smartMentor.handleProgressViewToggle(btn);
        } else {
          document.querySelectorAll('.progress-view-toggle__button').forEach(b => b.classList.remove('progress-view-toggle__button--active'));
          btn.classList.add('progress-view-toggle__button--active');
          // Re-run fallback line animation
          initProgressLine();
        }
      });
    });
  }

  function initProgressRing() {
    const container = document.querySelector('#progressGraph .progress-summary');
    if (!container) return;
    if (container.querySelector('.progress-ring')) return;
    // If core has analytics, let it handle
    if (window.smartMentor && window.smartMentor.renderProgressRing) {
      window.smartMentor.renderProgressRing();
      return;
    }
    const avg = 72; // fallback avg
    const size = 72; const stroke = 8; const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
    const el = document.createElement('div');
    el.className = 'progress-ring';
    el.style.display = 'flex'; el.style.alignItems = 'center'; el.style.gap = '12px';
    el.innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${size/2}" cy="${size/2}" r="${r}" stroke="#e5e7eb" stroke-width="${stroke}" fill="none" />
        <circle class="progress-ring-bar" cx="${size/2}" cy="${size/2}" r="${r}" stroke="#10B981" stroke-width="${stroke}" fill="none" stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})" stroke-dasharray="${c}" stroke-dashoffset="${c}" />
      </svg>
      <div>
        <div style="font-size:20px;font-weight:600;">${avg}%</div>
        <div class="progress-summary__label">Avg Progress</div>
      </div>`;
    container.prepend(el);
    const bar = el.querySelector('.progress-ring-bar');
    U.rafTween({ from: c, to: c * (1 - avg / 100), duration: 400, onUpdate: (val) => {
      bar.setAttribute('stroke-dashoffset', String(val));
    }});
  }

  function init() {
    initTimeChart();
    initProgressLine();
    initProgressRing();
  }

  window.DashboardCharts = { init };
})();
