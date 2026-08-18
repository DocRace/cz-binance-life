(() => {
  const DATA_URL = './data/proposal.json?v=3';
  let proposal = null;
  let observer = null;

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  async function init() {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('Failed to load proposal data');
    proposal = await res.json();
    document.title = proposal.meta?.title || document.title;
    $('#app').innerHTML = renderDeck();
    bindControls();
  }

  function renderDeck() {
    const meta = proposal.meta || {};
    const slides = proposal.slides || [];
    const pages = slides.map((slide, i) => renderSlide(slide, i, slides.length)).join('');
    const live = meta.liveHref
      ? `<a class="chrome-link" href="${esc(meta.liveHref)}" target="_blank" rel="noopener">打开测试活动</a>`
      : '';
    return `
      <div class="deck-chrome">
        <div class="chrome-left">
          <span class="chrome-brand">${esc(meta.brand || 'Book Club')}</span>
          <span class="chrome-title">${esc(meta.title || '')}</span>
        </div>
        <div class="chrome-right">
          ${live}
          <button type="button" class="chrome-btn pdf" id="pdfBtn">下载 PDF</button>
          <button type="button" class="chrome-btn" id="prevBtn" aria-label="上一页">↑</button>
          <button type="button" class="chrome-btn" id="nextBtn" aria-label="下一页">↓</button>
          <span class="chrome-progress" id="progress">1 / ${slides.length}</span>
        </div>
      </div>
      <div class="deck" id="deck">${pages}</div>
      <div class="pdf-host" id="pdfHost" aria-hidden="true"></div>
    `;
  }

  function bgLayers(image, heavy = false) {
    if (!image) return `<div class="page-bg"></div>`;
    return `
      <div class="page-bg"></div>
      <div class="page-photo" style="background-image:url('${esc(image)}')"></div>
      <div class="page-photo-veil" style="${heavy ? 'background:linear-gradient(110deg,rgba(26,23,20,.94) 0%,rgba(26,23,20,.78) 48%,rgba(26,23,20,.4) 100%),linear-gradient(to top,rgba(26,23,20,.8),transparent 42%);' : ''}"></div>
    `;
  }

  function renderBook3d(book) {
    if (!book) return '';
    const size = book.size || 'md';
    const faces = (book.faces && book.faces.length)
      ? book.faces
      : [{
          src: book.cover || '',
          byline: book.byline || '',
          corner: book.corner || '',
          keywords: book.keywords || '',
          dark: Boolean(book.darkByline),
        }];
    const first = faces[0] || {};
    const cycle = book.cycle || faces.length > 1;
    return `
      <div class="book3d book3d-${esc(size)}${cycle ? ' is-cycle' : ''}" data-faces="${esc(JSON.stringify(faces))}">
        <div class="book3d-shadow"></div>
        <div class="book3d-shell">
          <div class="book3d-spine" aria-hidden>
            <span class="book3d-spine-title">${esc(book.title || '我的币安人生')}</span>
            <span class="book3d-spine-by">${esc(first.byline || book.byline || '')}</span>
            <span class="book3d-spine-pub">${esc(book.publisher || '书友会 × DataDance')}</span>
          </div>
          <div class="book3d-edge" aria-hidden></div>
          <div class="book3d-top" aria-hidden></div>
          <div class="book3d-bottom" aria-hidden></div>
          <div class="book3d-front">
            <img class="book3d-art" src="${esc(first.src || '')}" alt="" />
            <div class="book3d-hinge"></div>
            <div class="book3d-sheen"></div>
            <div class="book3d-glare"></div>
            <p class="book3d-corner">${esc(first.corner || '')}</p>
            <div class="book3d-meta">
              <h3>${esc(book.title || '我的币安人生')}</h3>
              <p class="book3d-by${first.dark ? ' is-light' : ''}">${esc(first.byline || book.byline || '')}</p>
              <p class="book3d-kw${first.dark ? ' is-light' : ''}">${esc(first.keywords || book.keywords || '')}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPoints(points) {
    return `<div class="points">${(points || []).map((p) => `
      <div class="vpoint">
        <h3>${esc(p.title || '')}</h3>
        <p>${esc(p.text || '')}</p>
      </div>`).join('')}</div>`;
  }

  function renderPhone(phone) {
    if (!phone) return '';
    const kind = phone.kind || 'landing';
    let inner = '';

    if (kind === 'landing') {
      inner = `
        <p class="ph-kicker">${esc(phone.kicker || '')}</p>
        <h3 class="ph-title">${esc(phone.title || '')}</h3>
        <p class="ph-lead">${esc(phone.lead || '')}</p>
        <p class="ph-count">${esc(phone.count || '')}</p>
        ${phone.book ? renderBook3d({ ...phone.book, size: 'sm' }) : `
        <div class="ph-cover">
          <img src="${esc(phone.cover || '')}" alt="" />
          <div class="ph-cover-meta">
            <strong>${esc(phone.coverTitle || '')}</strong>
            <span>${esc(phone.coverByline || '')}</span>
          </div>
        </div>`}
        <div class="ph-cta">${esc(phone.cta || '')}</div>
        ${phone.ghost ? `<div class="ph-ghost">${esc(phone.ghost)}</div>` : ''}
        <p class="ph-credit">${esc(phone.credit || '')}</p>
      `;
    } else if (kind === 'author') {
      inner = `
        <h3 class="ph-title">${esc(phone.title || '')}</h3>
        <p class="ph-hint">${esc(phone.hint || '')}</p>
        <div class="ph-input">${esc(phone.name || '填写署名')}</div>
        <div class="ph-chips">${(phone.genders || []).map((g, i) =>
          `<span class="ph-chip${i === 0 ? ' on' : ''}">${esc(g)}</span>`).join('')}</div>
        <div class="role-mini">${(phone.roles || []).map((r) => `
          <figure>
            <img src="${esc(r.image || '')}" alt="${esc(r.name || '')}" />
            <figcaption>${esc(r.name || '')}</figcaption>
          </figure>`).join('')}</div>
        <div class="ph-cta">${esc(phone.cta || '开始书写')}</div>
      `;
    } else if (kind === 'timeline') {
      inner = `
        <h3 class="ph-title">${esc(phone.title || '')}</h3>
        <p class="ph-hint">${esc(phone.hint || '')}</p>
        ${(phone.nodes || []).map((n) => `
          <div class="node-row">
            <strong>${esc(n.year || '')}</strong>
            <span>${esc(n.title || '')}</span>
          </div>`).join('')}
        <div class="ph-cta">${esc(phone.cta || '生成我的币安人生')}</div>
      `;
    } else if (kind === 'node') {
      inner = `
        <p class="ph-kicker">${esc(phone.year || '')}</p>
        <h3 class="ph-title">${esc(phone.title || '')}</h3>
        <div class="dual">
          <div class="dual-card">
            <h4>${esc(phone.czLabel || 'CZ')}</h4>
            <p>${esc(phone.czText || '')}</p>
          </div>
          <div class="dual-card">
            <h4>${esc(phone.youLabel || 'YOU')}</h4>
            <p>${esc(phone.youText || '')}</p>
          </div>
        </div>
        <div class="ph-input">${esc(phone.placeholder || '')}</div>
        <div class="ph-cta">${esc(phone.cta || '保存')}</div>
      `;
    } else if (kind === 'result') {
      inner = `
        <h3 class="ph-title">${esc(phone.title || '')}</h3>
        <p class="ph-hint">${esc(phone.hint || '')}</p>
        <div class="ph-chips">${(phone.tags || []).map((t) =>
          `<span class="ph-chip on">${esc(t)}</span>`).join('')}</div>
        ${(phone.rows || []).map((r) => `
          <div class="node-row">
            <span>${esc(r.cz || '')}</span>
            <strong>${esc(r.year || '')}</strong>
            <span>${esc(r.me || '')}</span>
          </div>`).join('')}
        <p class="ph-hint">${esc(phone.principlesTitle || '')}</p>
        <div class="ph-chips">${(phone.principles || []).map((t) =>
          `<span class="ph-chip">${esc(t)}</span>`).join('')}</div>
        <div class="ph-cta">${esc(phone.cta || '装订成册')}</div>
      `;
    } else if (kind === 'book') {
      inner = `
        <p class="ph-kicker">${esc(phone.kicker || '')}</p>
        ${phone.book ? renderBook3d({ ...phone.book, size: 'sm' }) : `
        <div class="ph-cover">
          <img src="${esc(phone.cover || '')}" alt="" />
          <div class="ph-cover-meta">
            <strong>${esc(phone.coverTitle || '')}</strong>
            <span>${esc(phone.coverByline || '')}</span>
          </div>
        </div>`}
        <div class="price-hero">
          <b>${esc(phone.price || '')}</b>
          <span>${esc(phone.priceNote || '')}</span>
        </div>
        <div class="ph-cta">${esc(phone.cta || '封装胶囊')}</div>
        <div class="ph-ghost">${esc(phone.ghost || '公开「发售」')}</div>
        <p class="ph-credit">${esc(phone.credit || '')}</p>
      `;
    } else if (kind === 'share') {
      inner = `
        <h3 class="ph-title">${esc(phone.title || '')}</h3>
        <div class="share-box">${esc(phone.copy || '')}</div>
        <div class="ph-cta">${esc(phone.cta || '分享到 X')}</div>
        <div class="ph-ghost">${esc(phone.ghost || '复制文案到微信')}</div>
      `;
    } else if (kind === 'nft') {
      inner = `
        <p class="ph-kicker">${esc(phone.kicker || '')}</p>
        <h3 class="ph-title">${esc(phone.title || '')}</h3>
        ${phone.badge ? `<img class="nft-badge" src="${esc(phone.badge)}" alt="" />` : ''}
        <p class="ph-lead">${esc(phone.lead || '')}</p>
        <div class="ph-cta">${esc(phone.cta || '领取')}</div>
        <div class="ph-ghost">${esc(phone.ghost || '查看权益')}</div>
      `;
    }

    return `<div class="phone"><div class="phone-bar"></div><div class="phone-screen">${inner}</div></div>`;
  }

  function renderSlide(slide, index, total) {
    const type = slide.type || 'overview';
    let body = '';
    let layers = `<div class="page-bg"></div>`;

    if (type === 'cover') {
      layers = bgLayers(slide.image, true);
      body = `
        <div class="cover-grid">
          <div>
            <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
            <h1 class="title">${esc(slide.title || '')}</h1>
            <p class="subtitle">${esc(slide.subtitle || '')}</p>
            <div class="meta-row">${(slide.meta || []).map((m) => `<span class="meta-chip">${esc(m)}</span>`).join('')}</div>
            ${index === 0 ? '<p class="hint">向下滚动翻页 · 或按 ↓ / 空格 · 右上角可下载 PDF</p>' : ''}
          </div>
          ${slide.book ? renderBook3d({ ...slide.book, size: 'lg' }) : ''}
        </div>
      `;
    } else if (type === 'overview') {
      body = `
        <div class="overview-grid">
          <div>
            <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
            <h2 class="title">${esc(slide.title || '')}</h2>
            <p class="subtitle">${esc(slide.subtitle || '')}</p>
            <div class="facts">${(slide.facts || []).map((f) => `
              <div class="fact">
                <div class="fact-label">${esc(f.label || '')}</div>
                <div class="fact-value">${esc(f.value || '')}</div>
              </div>`).join('')}</div>
          </div>
          <div class="overview-visual">
            <img src="${esc(slide.image || '')}" alt="" />
          </div>
        </div>
      `;
    } else if (type === 'agenda') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <div class="agenda">${(slide.items || []).map((it) => `
          <div class="agenda-item">
            <div class="agenda-num">${esc(it.label || '')}</div>
            <div>
              <h3>${esc(it.title || '')}</h3>
              <p>${esc(it.desc || '')}</p>
            </div>
          </div>`).join('')}</div>
      `;
    } else if (type === 'owners') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <p class="subtitle">${esc(slide.subtitle || '')}</p>
        <div class="owner-grid">${(slide.items || []).map((it) => `
          <article class="owner-card">
            <p class="owner-who">${esc(it.who || '')}</p>
            <h3>${esc(it.title || '')}</h3>
            <p>${esc(it.text || '')}</p>
            ${it.status ? `<span class="status-chip">${esc(it.status)}</span>` : ''}
          </article>`).join('')}</div>
      `;
    } else if (type === 'flowchart') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <p class="subtitle">${esc(slide.subtitle || '')}</p>
        <div class="flow">${(slide.rows || []).map((row) => `
          <div class="flow-row">${(row.steps || []).map((st, i) => `
            ${i > 0 ? '<div class="flow-arrow" aria-hidden>→</div>' : ''}
            <article class="flow-step tone-${esc(st.tone || 'mid')}">
              <div class="flow-num">${esc(st.label || '')}</div>
              <h3>${esc(st.title || '')}</h3>
              <p>${esc(st.desc || '')}</p>
            </article>`).join('')}
          </div>`).join('')}
        </div>
      `;
    } else if (type === 'result') {
      const r = slide.result || {};
      body = `
        <div class="split-grid">
          <div>
            <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
            <h2 class="title">${esc(slide.title || '')}</h2>
            <p class="subtitle">${esc(slide.subtitle || '')}</p>
            ${renderPoints(slide.points)}
          </div>
          <div class="result-poster">
            <p class="result-kicker">${esc(r.kicker || '')}</p>
            ${r.book ? renderBook3d({ ...r.book, size: 'md' }) : `
            <div class="result-book">
              <img src="${esc(r.cover || '')}" alt="" />
              <div class="result-book-meta">
                <strong>${esc(r.bookTitle || '')}</strong>
                <span>${esc(r.byline || '')}</span>
              </div>
            </div>`}
            <div class="result-tags">${(r.tags || []).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
            <div class="result-price">${esc(r.price || '')}</div>
            <p class="result-vs">${esc(r.vs || '')}</p>
            <div class="result-loot">${(r.loot || []).map((x) => `<span>${esc(x)}</span>`).join('')}</div>
            <p class="result-pub">${esc(r.publisher || '')}</p>
          </div>
        </div>
      `;
    } else if (type === 'tweets') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <p class="subtitle">${esc(slide.subtitle || '')}</p>
        <div class="tweet-grid">${(slide.tweets || []).map((tw) => `
          <article class="tweet">
            <div class="tweet-head">
              <img class="tweet-avatar" src="${esc(tw.avatar || '')}" alt="" />
              <div class="tweet-who">
                <strong>${esc(tw.name || '')}</strong>
                <span>${esc(tw.handle || '')} · ${esc(tw.time || '')}</span>
              </div>
              <span class="tweet-x" aria-hidden>𝕏</span>
            </div>
            <p class="tweet-text">${esc(tw.text || '')}</p>
            <div class="tweet-media">
              <img src="${esc(tw.image || '')}" alt="" />
              <div class="tweet-media-cap">
                <b>${esc(tw.cardTitle || '')}</b>
                <span>${esc(tw.cardSub || '')}</span>
              </div>
            </div>
            <div class="tweet-stats">
              <span>💬 ${esc(tw.replies || '0')}</span>
              <span>🔁 ${esc(tw.reposts || '0')}</span>
              <span>❤ ${esc(tw.likes || '0')}</span>
              <span>↗ ${esc(tw.views || '')}</span>
            </div>
          </article>`).join('')}</div>
      `;
    } else if (type === 'book3d') {
      body = `
        <div class="split-grid">
          <div>
            <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
            <h2 class="title">${esc(slide.title || '')}</h2>
            <p class="subtitle">${esc(slide.subtitle || '')}</p>
            ${renderPoints(slide.points)}
          </div>
          <div class="book3d-stage">
            ${renderBook3d({ ...(slide.book || {}), size: slide.book?.size || 'lg' })}
          </div>
        </div>
      `;
    } else if (type === 'journey') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <p class="subtitle">${esc(slide.subtitle || '')}</p>
        <div class="journey">${(slide.items || []).map((it) => `
          <article class="journey-item">
            <div class="journey-num">${esc(it.label || '')}</div>
            <h3>${esc(it.title || '')}</h3>
            <p>${esc(it.desc || '')}</p>
          </article>`).join('')}</div>
      `;
    } else if (type === 'split') {
      body = `
        <div class="split-grid">
          <div>
            <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
            <h2 class="title">${esc(slide.title || '')}</h2>
            <p class="subtitle">${esc(slide.subtitle || '')}</p>
            ${renderPoints(slide.points)}
          </div>
          <div>${slide.phone ? renderPhone(slide.phone) : `
            <div class="visual-photo"><img src="${esc(slide.image || '')}" alt="" /></div>`}</div>
        </div>
      `;
    } else if (type === 'roles') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <p class="subtitle">${esc(slide.subtitle || '')}</p>
        <div class="roles-grid">${(slide.items || []).map((r) => `
          <article class="role-card">
            <img src="${esc(r.image || '')}" alt="${esc(r.name || '')}" />
            <p>${esc(r.name || '')}</p>
          </article>`).join('')}</div>
      `;
    } else if (type === 'timeline') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <p class="subtitle">${esc(slide.subtitle || '')}</p>
        <div class="sessions">${(slide.sessions || []).map((s) => `
          <article class="session">
            <div class="session-time">${esc(s.time || '')}</div>
            <div>
              <h3>${esc(s.title || '')}</h3>
              <p>${esc(s.concept || '')}</p>
            </div>
          </article>`).join('')}</div>
      `;
    } else if (type === 'gallery') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <p class="subtitle">${esc(slide.subtitle || '')}</p>
        <div class="gallery">${(slide.images || []).map((img) => `
          <figure>
            <img src="${esc(img.src || '')}" alt="${esc(img.caption || '')}" />
            ${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}
          </figure>`).join('')}</div>
      `;
    } else if (type === 'partners') {
      body = `
        <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
        <h2 class="title">${esc(slide.title || '')}</h2>
        <p class="subtitle">${esc(slide.subtitle || '')}</p>
        <div class="partner-grid">${(slide.items || []).map((it) => `
          <article class="partner-card">
            <p class="partner-role">${esc(it.role || '')}</p>
            <h3>${esc(it.name || '')}</h3>
            <p>${esc(it.text || '')}</p>
            ${it.status ? `<span class="status-chip">${esc(it.status)}</span>` : ''}
          </article>`).join('')}</div>
      `;
    } else if (type === 'closing') {
      layers = bgLayers(slide.image, true);
      body = `
        <div class="closing-wrap">
          <p class="eyebrow">${esc(slide.eyebrow || '')}</p>
          <h2 class="title">${esc(slide.title || '')}</h2>
          <p class="subtitle">${esc(slide.subtitle || '')}</p>
          <ul class="closing-lines">${(slide.lines || []).map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
          <p class="closing-mark">${esc(slide.mark || '')}</p>
        </div>
      `;
    }

    return `<section class="page" data-index="${index}" id="page-${index}">
      ${layers}
      <div class="page-inner">${body}</div>
      <div class="page-index">${index + 1} / ${total}</div>
    </section>`;
  }

  function updateProgress(index) {
    const total = proposal?.slides?.length || 0;
    const el = $('#progress');
    if (el) el.textContent = `${index + 1} / ${total}`;
  }

  function scrollBy(delta) {
    const deck = $('#deck');
    if (!deck) return;
    const pages = [...deck.querySelectorAll('.page')];
    if (!pages.length) return;
    const current = pages.findIndex((p) => {
      const rect = p.getBoundingClientRect();
      return rect.top >= -40 && rect.top < window.innerHeight * 0.55;
    });
    const idx = Math.max(0, Math.min(pages.length - 1, (current < 0 ? 0 : current) + delta));
    pages[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateProgress(idx);
  }

  function bindControls() {
    $('#prevBtn')?.addEventListener('click', () => scrollBy(-1));
    $('#nextBtn')?.addEventListener('click', () => scrollBy(1));
    $('#pdfBtn')?.addEventListener('click', () => {
      downloadPdf().catch((err) => {
        console.error(err);
        alert('PDF 生成失败，请稍后重试或换 Chrome 浏览器再试。');
        resetPdfButton();
      });
    });

    window.addEventListener('keydown', (e) => {
      if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        scrollBy(1);
      } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        scrollBy(-1);
      }
    });

    const deck = $('#deck');
    if (!deck) return;
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      updateProgress(Number(visible.target.dataset.index || 0));
    }, { root: deck, threshold: [0.45, 0.6] });
    deck.querySelectorAll('.page').forEach((page) => observer.observe(page));
    bindBook3d(deck);
  }

  function applyBookFace(root, face) {
    if (!root || !face) return;
    const art = root.querySelector('.book3d-art');
    const by = root.querySelector('.book3d-by');
    const kw = root.querySelector('.book3d-kw');
    const corner = root.querySelector('.book3d-corner');
    const spineBy = root.querySelector('.book3d-spine-by');
    if (art && face.src) art.src = face.src;
    if (by) {
      by.textContent = face.byline || '';
      by.classList.toggle('is-light', Boolean(face.dark));
    }
    if (kw) {
      kw.textContent = face.keywords || '';
      kw.classList.toggle('is-light', Boolean(face.dark));
    }
    if (corner) corner.textContent = face.corner || '';
    if (spineBy) spineBy.textContent = face.byline || '';
  }

  function bindBook3d(root) {
    root.querySelectorAll('.book3d').forEach((el) => {
      const shell = el.querySelector('.book3d-shell');
      const glare = el.querySelector('.book3d-glare');
      if (!shell) return;

      const setPose = (x = 2, y = 28) => {
        shell.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
      };

      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        el.classList.add('is-hold');
        setPose(2 - ny * 24, 28 + nx * 24);
        if (glare) {
          const gx = ((e.clientX - r.left) / r.width) * 100;
          const gy = ((e.clientY - r.top) / r.height) * 100;
          glare.style.background = `radial-gradient(120% 90% at ${gx}% ${gy}%, rgba(255,255,255,.36) 0%, rgba(255,255,255,.08) 28%, transparent 58%)`;
        }
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('is-hold');
        shell.style.transform = '';
        if (glare) glare.style.background = '';
      });

      let faces = [];
      try {
        faces = JSON.parse(el.dataset.faces || '[]');
      } catch {
        faces = [];
      }
      if (!el.classList.contains('is-cycle') || faces.length < 2) return;
      let idx = 0;
      window.setInterval(() => {
        if (el.classList.contains('is-hold')) return;
        idx = (idx + 1) % faces.length;
        applyBookFace(el, faces[idx]);
      }, 2600);
    });
  }

  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-lib-src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === '1') {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.dataset.libSrc = src;
      s.onload = () => {
        s.dataset.loaded = '1';
        resolve();
      };
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  async function ensurePdfLibs() {
    if (!window.html2canvas) {
      await loadScriptOnce('./assets/vendor/html2canvas.min.js');
    }
    if (!window.jspdf?.jsPDF) {
      await loadScriptOnce('./assets/vendor/jspdf.umd.min.js');
    }
    if (!window.html2canvas || !window.jspdf?.jsPDF) {
      throw new Error('PDF libraries unavailable');
    }
  }

  function resetPdfButton(label = '下载 PDF') {
    const btn = $('#pdfBtn');
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('is-busy');
    btn.textContent = label;
  }

  function prepareImages(root) {
    if (!root) return;
    root.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      img.decoding = 'sync';
      img.removeAttribute('loading');
      const src = img.currentSrc || img.getAttribute('src');
      if (src) img.src = src;
    });
  }

  async function inlineImages(root) {
    if (!root) return;
    const imgs = [...root.querySelectorAll('img')];
    await Promise.all(imgs.map(async (img) => {
      const src = img.currentSrc || img.getAttribute('src') || '';
      if (!src || src.startsWith('data:')) return;
      try {
        const abs = new URL(src, window.location.href);
        if (abs.origin !== window.location.origin) return;
        const resp = await fetch(abs.href, { cache: 'force-cache' });
        if (!resp.ok) return;
        const blob = await resp.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        img.src = dataUrl;
      } catch {
        /* keep original */
      }
    }));

    const bgEls = [...root.querySelectorAll('.page-photo')];
    await Promise.all(bgEls.map(async (el) => {
      const bg = getComputedStyle(el).backgroundImage;
      const match = /url\(["']?(.*?)["']?\)/.exec(bg || '');
      if (!match?.[1] || match[1].startsWith('data:')) return;
      try {
        const abs = new URL(match[1], window.location.href);
        if (abs.origin !== window.location.origin) return;
        const resp = await fetch(abs.href, { cache: 'force-cache' });
        if (!resp.ok) return;
        const blob = await resp.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        el.style.backgroundImage = `url("${dataUrl}")`;
      } catch {
        /* keep original */
      }
    }));
  }

  function hardenClone(doc, clonedEl) {
    const style = doc.createElement('style');
    style.textContent = `
      * {
        font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei",
          "Noto Sans SC", "Helvetica Neue", Arial, sans-serif !important;
      }
      .deck-chrome, .hint { display: none !important; }
      .page-photo { animation: none !important; transform: none !important; }
      .book3d-shell { animation: none !important; transform: rotateX(8deg) rotateY(28deg) !important; }
    `;
    doc.head.appendChild(style);
    if (clonedEl) prepareImages(clonedEl);
  }

  function waitForImages(root, timeoutMs = 5000) {
    if (!root) return Promise.resolve();
    const imgs = [...root.querySelectorAll('img')];
    return Promise.all(imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          resolve();
        };
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, timeoutMs);
      });
    }));
  }

  async function rasterizePage(pageEl, host) {
    const clone = pageEl.cloneNode(true);
    clone.classList.add('page-pdf');
    clone.querySelectorAll('.hint').forEach((el) => el.remove());
    prepareImages(clone);
    host.innerHTML = '';
    host.appendChild(clone);
    await inlineImages(clone);
    await waitForImages(clone, 5000);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    return window.html2canvas(clone, {
      backgroundColor: '#1a1714',
      scale: Math.min(1.35, window.devicePixelRatio || 1.2),
      useCORS: true,
      allowTaint: false,
      foreignObjectRendering: false,
      logging: false,
      imageTimeout: 4000,
      removeContainer: true,
      windowWidth: 1280,
      windowHeight: Math.max(clone.scrollHeight, 720),
      onclone: (clonedDoc, clonedEl) => hardenClone(clonedDoc, clonedEl),
    });
  }

  async function downloadPdf() {
    const btn = $('#pdfBtn');
    const pages = [...document.querySelectorAll('#deck .page')];
    if (!pages.length) {
      alert('没有可导出的页面。');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.classList.add('is-busy');
      btn.textContent = '准备中…';
    }

    await ensurePdfLibs();
    const { jsPDF } = window.jspdf;
    const host = $('#pdfHost');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
      compress: true,
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 16;

    try {
      const deck = $('#deck');
      prepareImages(deck);
      await inlineImages(deck);
      await waitForImages(deck, 8000);

      for (let i = 0; i < pages.length; i += 1) {
        if (btn) btn.textContent = `导出 ${i + 1}/${pages.length}`;
        const canvas = await rasterizePage(pages[i], host);
        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const maxW = pageW - margin * 2;
        const maxH = pageH - margin * 2;
        const ratio = Math.min(maxW / canvas.width, maxH / canvas.height);
        const drawW = canvas.width * ratio;
        const drawH = canvas.height * ratio;
        const x = (pageW - drawW) / 2;
        const y = (pageH - drawH) / 2;

        if (i > 0) pdf.addPage();
        pdf.setFillColor(26, 23, 20);
        pdf.rect(0, 0, pageW, pageH, 'F');
        pdf.addImage(imgData, 'JPEG', x, y, drawW, drawH, undefined, 'FAST');

        canvas.width = 0;
        canvas.height = 0;
        await new Promise((r) => setTimeout(r, 0));
      }

      if (btn) btn.textContent = '生成文件…';
      const name = proposal?.meta?.pdfName || 'my-binance-life-partner-deck';
      pdf.save(`${name}.pdf`);
    } finally {
      if (host) host.innerHTML = '';
      resetPdfButton();
    }
  }

  init().catch((err) => {
    console.error(err);
    $('#app').innerHTML = '<div class="boot">方案加载失败，请刷新重试。</div>';
  });
})();
