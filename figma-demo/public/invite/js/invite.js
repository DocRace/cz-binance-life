(() => {
  const DATA_URL = './data/invites.json?v=20';
  const PORTRAIT = { w: 1080, h: 2200 };
  const WIDE = { w: 1920, h: 1080 };
  const SITE_URL = 'https://czlife.club';

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const nl = (s) => esc(s).replace(/\n/g, '<br>');

  let data = null;
  let typeId = 'guest';
  let guestName = '';
  let yafangVariant = 'media';

  async function init() {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error('Failed to load invite copy');
    data = await res.json();
    render();
    bind();
    fitBoard();
    window.addEventListener('resize', fitBoard);
  }

  function isYafangPack() {
    return typeId === 'yafang';
  }

  function currentType() {
    const pack = data.types.yafang;
    if (isYafangPack() && pack) {
      const variant = data.types[yafangVariant] || data.types.media;
      return {
        ...variant,
        id: 'yafang',
        label: pack.label,
        nameLockedBlank: true,
        contact: pack.contact,
      };
    }
    return data.types[typeId] || data.types.guest;
  }

  function boardSize() {
    return typeId === 'blast' ? WIDE : PORTRAIT;
  }

  function applyBoardMetrics() {
    const { w, h } = boardSize();
    const wide = typeId === 'blast';
    document.documentElement.style.setProperty('--board-w', `${w}px`);
    document.documentElement.style.setProperty('--board-h', `${h}px`);
    $('#artboard')?.classList.toggle('is-wide', wide);
    $('#boardSlot')?.classList.toggle('is-wide', wide);
    $('#stage')?.classList.toggle('is-wide', wide);
  }

  function render() {
    const types = Object.values(data.types);
    $('#app').innerHTML = `
      <div class="page-bg" aria-hidden></div>
      <div class="page-photo" aria-hidden>
        <span class="photo-tile"></span>
        <span class="photo-tile"></span>
      </div>
      <div class="page-veil" aria-hidden></div>
      <div class="page-mesh" aria-hidden></div>
      <header class="studio">
        <p class="studio-kicker">Invitation</p>
        <p class="studio-brand">BINANCE LIFE BOOK CLUB  ×  DATADANCE</p>
        <h1 class="studio-title">書友見面會邀請函</h1>
        <p class="studio-lead">媒體／嘉賓為 21:9 手機豎版；郵件推送為 16:9 橫版。「亞芳對外」為人名留空模板，並印上亞芳聯絡方式。</p>
        <div class="studio-bar">
          <div class="tabs" id="tabs">
            ${types.map((t) => `
              <button type="button" class="tab${t.id === typeId ? ' is-on' : ''}" data-type="${esc(t.id)}">${esc(t.label)}</button>
            `).join('')}
          </div>
          <div class="yafang-bar" id="yafangBar" hidden>
            <button type="button" class="tab" data-yafang-variant="media">媒體邀請函</button>
            <button type="button" class="tab" data-yafang-variant="guest">嘉賓邀請函</button>
          </div>
          <div class="name-field" id="nameField" hidden>
            <label for="nameInput"></label>
            <input id="nameInput" type="text" autocomplete="name" />
          </div>
          <div class="actions">
            <button type="button" class="chrome-btn" id="copyBtn">複製正文</button>
            <button type="button" class="chrome-btn gold" id="pngBtn">下載 PNG</button>
            <button type="button" class="chrome-btn" id="mediaBatchBtn" title="${esc((data.mediaBatch || []).join('、'))}">批量下載媒體邀請函</button>
            <button type="button" class="chrome-btn gold" id="yafangPackBtn" hidden>下載亞芳媒體+嘉賓空白模板</button>
          </div>
        </div>
      </header>
      <div class="stage" id="stage">
        <div class="board-slot" id="boardSlot">
          <div class="artboard" id="artboard"></div>
        </div>
      </div>
    `;
    paintCard();
    syncNameField();
    syncYafangBar();
  }

  function syncYafangBar() {
    const bar = $('#yafangBar');
    const packBtn = $('#yafangPackBtn');
    const batchBtn = $('#mediaBatchBtn');
    const on = isYafangPack();
    if (bar) {
      bar.hidden = !on;
      bar.querySelectorAll('[data-yafang-variant]').forEach((el) => {
        el.classList.toggle('is-on', el.getAttribute('data-yafang-variant') === yafangVariant);
      });
    }
    if (packBtn) packBtn.hidden = !on;
    if (batchBtn) batchBtn.hidden = on;
  }

  function syncNameField() {
    const t = currentType();
    const field = $('#nameField');
    const input = $('#nameInput');
    const label = field?.querySelector('label');
    if (!field || !input) return;
    const show = Boolean(t.greetingPrefix) && !t.nameLockedBlank;
    field.hidden = !show;
    if (label) label.textContent = t.nameLabel || '姓名';
    input.placeholder = t.namePlaceholder || '';
    input.value = guestName;
  }

  function paintCard() {
    applyBoardMetrics();
    const board = $('#artboard');
    if (!board) return;
    if (typeId === 'blast') {
      paintBlastCard(board);
      fitBoard();
      return;
    }
    const ev = data.event;
    const t = currentType();
    const name = t.nameLockedBlank ? '' : guestName.trim();
    const greeting = t.greetingPrefix
      ? `<p class="greeting">${esc(t.greetingPrefix)}<span class="greeting-name${name ? ' is-filled' : ' is-blank'}">${name ? esc(name) : ''}</span>：</p>`
      : '';
    const extra = t.closing ? `<p>${nl(t.closing)}</p>` : '';
    const note = t.note ? `<p class="note">${esc(t.note)}</p>` : '';
    const contact = renderYafangContact(t.contact);

    board.innerHTML = `
      <div class="card">
        <div class="card-bg"></div>
        <div class="card-photo">
          <span class="photo-tile"></span>
          <span class="photo-tile"></span>
        </div>
        <div class="card-veil"></div>
        <div class="card-gold"></div>
        <div class="card-mesh"></div>
        <canvas class="card-baked-bg" aria-hidden></canvas>
        <p class="card-mark" aria-hidden>幣安人生</p>
        <div class="card-inner">
          <div class="card-head">
            <h1 class="card-title">${esc(ev.book)}書友會</h1>
            <p class="card-sub">${esc(ev.meeting)}　${esc(ev.inviteSuffix || '邀請函')}</p>
            ${greeting}
          </div>
          <div class="card-gap" aria-hidden="true"></div>
          <div class="card-copy">
            <div class="prose">
              <p>${nl(t.lead)}</p>
              <p>${nl(t.body)}</p>
              ${extra}
            </div>
            <div class="details">
              <p><span>${esc(ev.dateLabel)}</span>${esc(ev.date)}</p>
              <p><span>${esc(ev.timeLabel)}</span>${esc(ev.time)}</p>
              <p><span>${esc(ev.venueLabel)}</span>${esc(ev.venue)}</p>
              <p><span>${esc(ev.formatLabel)}</span>${esc(t.format)}</p>
            </div>
            ${note}
            ${contact}
          </div>
          <footer class="partners">
            ${renderPartnerMarks({ venue: false })}
            <div class="partners-foot">
              ${renderEcoSupport()}
              <div class="qr-block">
                <div class="qr-frame">
                  <img src="./assets/czlife-home-qr.png" alt="${esc(ev.qrUrl || SITE_URL)}" />
                </div>
                <p class="qr-url">${esc((ev.qrUrl || SITE_URL).replace(/^https?:\/\//, ''))}</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    `;
    fitBoard();
  }

  function paintBlastCard(board) {
    const ev = data.event;
    const t = currentType();
    board.innerHTML = `
      <div class="card is-blast">
        <div class="card-bg"></div>
        <div class="card-photo is-cover"></div>
        <div class="card-veil blast-veil"></div>
        <div class="card-gold"></div>
        <div class="card-mesh"></div>
        <canvas class="card-baked-bg" aria-hidden></canvas>
        <div class="blast-inner">
          <div class="blast-copy">
            <h1 class="blast-title">${esc(ev.book)}書友會</h1>
            <p class="blast-sub">${esc(ev.meeting)}　${esc(ev.inviteSuffix || '邀請函')}</p>
            <p class="blast-lead">${esc(t.lead)}</p>
            <p class="blast-body">${nl(t.body)}</p>
            <p class="blast-speakers">${esc(ev.speakers)}</p>
            <div class="blast-details">
              <p><span>${esc(ev.dateLabel)}</span>${esc(ev.date)}</p>
              <p><span>${esc(ev.timeLabel)}</span>${esc(ev.time)}</p>
              <p><span>${esc(ev.venueLabel)}</span>${esc(ev.venue)}</p>
            </div>
            <div class="blast-foot">
              ${renderPartnerMarks({ compact: true })}
            </div>
          </div>
          <div class="blast-book">
            <div class="hero-book">
              <span class="hero-book-shadow" aria-hidden="true"></span>
              <span class="hero-book-shadow-soft" aria-hidden="true"></span>
              <div class="hero-book-tilt">
                <img src="./assets/book-cover-hero.png" alt="《幣安人生》" />
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderYafangContact(contact) {
    if (!contact) return '';
    return `
      <div class="contact-block">
        <h3>${esc(contact.title)}</h3>
        <p><span>${esc(contact.wechatLabel)}</span>${esc(contact.wechat)}</p>
        <p><span>${esc(contact.emailLabel)}</span>${esc(contact.email)}</p>
        ${contact.note ? `<p class="contact-note">${esc(contact.note)}</p>` : ''}
      </div>
    `;
  }

  function renderEcoSupport(opts = {}) {
    const ev = data.event;
    const compact = Boolean(opts.compact);
    const venue = compact
      ? (data.blastVenuePartners || data.venuePartners || [])
      : (data.venuePartners || []);
    if (!venue.length) return '';
    const label = compact
      ? (ev.blastVenueSupportLabel || '場地支持')
      : (ev.venueSupportLabel || '生態夥伴');
    const labelClass = compact ? 'blast-partners-label' : '';
    const gridExtra = compact ? ' is-compact' : '';
    return `
      <div class="venue-support${compact ? ' is-compact' : ''}">
        <h3 class="${labelClass}">${esc(label)}</h3>
        <div class="logo-grid logo-grid-venue${gridExtra}">${venue.map(renderLogo).join('')}</div>
      </div>
    `;
  }

  function renderPartnerMarks(opts = {}) {
    const ev = data.event;
    const compact = Boolean(opts.compact);
    const main = compact
      ? (data.blastPartners || data.partners || [])
      : (data.partners || []);
    const row1 = main.slice(0, 4);
    const row2 = compact ? main.slice(4, 8) : main.slice(4, 7);
    const labelClass = compact ? 'blast-partners-label' : '';
    const gridExtra = compact ? ' is-compact' : '';
    const showVenue = opts.venue !== false && !compact;
    const venue = showVenue ? renderEcoSupport(opts) : '';
    const row2Class = compact ? `logo-grid logo-grid-4${gridExtra}` : `logo-grid logo-grid-3${gridExtra}`;
    return `
      <h3 class="${labelClass}">${esc(ev.partnersLabel)}</h3>
      <div class="logo-grid logo-grid-4${gridExtra}">${row1.map(renderLogo).join('')}</div>
      ${row2.length ? `<div class="${row2Class}">${row2.map(renderLogo).join('')}</div>` : ''}
      ${venue}
    `;
  }

  function renderLogo(p) {
    if (p.id === 'bnb') {
      return `<div class="logo-cell logo-cell-img" title="${esc(p.name)}"><img class="logo-img logo-img-bnb" src="./assets/bnb-chain.png?v=gold" alt="${esc(p.name)}" /></div>`;
    }
    if (p.id === 'press') {
      return `<div class="logo-cell logo-cell-img" title="${esc(p.name)}"><img class="logo-img logo-img-press" src="./assets/commercial-press.png?v=gold" alt="${esc(p.name)}" /></div>`;
    }
    if (p.id === 'datadance') {
      return `<div class="logo-cell" title="DataDance">${datadanceSvg()}</div>`;
    }
    if (p.id === 'hku') {
      return `<div class="logo-cell logo-cell-img" title="${esc(p.name)}"><img class="logo-img logo-img-hku" src="./assets/hku-icube.png?v=gold" alt="${esc(p.name)}" /></div>`;
    }
    if (p.id === 'yafang') {
      return `<div class="logo-cell logo-cell-img" title="${esc(p.name)}"><img class="logo-img logo-img-yafang" src="./assets/yafang.png?v=gold" alt="${esc(p.name)}" /></div>`;
    }
    if (p.id === 'hash') {
      return `<div class="logo-cell logo-cell-img" title="${esc(p.name)}"><img class="logo-img logo-img-hash" src="./assets/hash-global.png?v=gold" alt="${esc(p.name)}" /></div>`;
    }
    if (p.id === 'ipdex') {
      return `<div class="logo-cell logo-cell-img" title="${esc(p.name)}"><img class="logo-img logo-img-ipdex" src="./assets/ipdex.png?v=icon-gold" alt="${esc(p.name)}" /></div>`;
    }
    if (p.id === 'onebook') {
      return `<div class="logo-cell logo-cell-img" title="${esc(p.name)}"><img class="logo-img logo-img-onebook" src="./assets/onebook.png?v=gold" alt="${esc(p.name)}" /></div>`;
    }
    return `<div class="logo-cell" title="${esc(p.name)}"><span class="logo-word">${esc(p.name)}</span></div>`;
  }

  function datadanceSvg() {
    return `<svg class="logo-datadance" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 25" width="210" height="36" fill="none" aria-label="DataDance">
      <path d="M42.4885 19.2667V5.56667H44.7935V19.2667H42.4885ZM44.0479 19.2667V17.2H47.7087C48.6579 17.2 49.5055 17 50.2173 16.6C50.9291 16.2 51.5053 15.6334 51.912 14.9C52.3189 14.1667 52.5223 13.3333 52.5223 12.3667C52.5223 11.4333 52.3189 10.6 51.912 9.86668C51.5053 9.13333 50.9291 8.6 50.2173 8.16667C49.5055 7.76667 48.6579 7.56667 47.7087 7.56667H44.0479V5.5H47.7765C48.7934 5.5 49.7088 5.66667 50.5902 6.03333C51.4713 6.4 52.2172 6.86667 52.8612 7.46667C53.5052 8.1 54.0137 8.8 54.3528 9.63333C54.7257 10.4667 54.8951 11.3667 54.8951 12.3333C54.8951 13.3 54.7257 14.2 54.3528 15.0333C53.9799 15.8667 53.5052 16.6 52.8612 17.2334C52.2172 17.8667 51.4713 18.3333 50.624 18.6667C49.7766 19 48.8274 19.2 47.8443 19.2H44.0479V19.2667Z" fill="#ddc48e"/>
      <path d="M60.9289 19.4667C60.0815 19.4667 59.3019 19.2667 58.5899 18.8333C57.8781 18.4 57.3358 17.8333 56.9289 17.0667C56.5222 16.3333 56.3189 15.5 56.3189 14.6C56.3189 13.6666 56.5222 12.8333 56.9289 12.1C57.3358 11.3666 57.8781 10.7667 58.5899 10.3333C59.3019 9.9 60.0815 9.66667 60.9289 9.66667C61.6747 9.66667 62.3187 9.83332 62.8612 10.1333C63.4375 10.4333 63.8782 10.8667 64.2171 11.4C64.556 11.9333 64.7255 12.5333 64.7255 13.2333V15.9333C64.7255 16.6 64.556 17.2333 64.2511 17.7666C63.9119 18.3 63.4712 18.7333 62.895 19.0333C62.3187 19.3 61.6747 19.4667 60.9289 19.4667ZM61.3018 17.4333C62.1154 17.4333 62.7594 17.1667 63.2679 16.6333C63.7764 16.1 64.0137 15.4 64.0137 14.5667C64.0137 14 63.9119 13.5 63.6746 13.0667C63.4375 12.6333 63.1323 12.3 62.7257 12.0667C62.3187 11.8333 61.8443 11.7 61.3018 11.7C60.7596 11.7 60.3189 11.8333 59.912 12.0667C59.5053 12.3 59.2001 12.6333 58.9628 13.0667C58.7257 13.5 58.6239 14 58.6239 14.5667C58.6239 15.1333 58.7257 15.6333 58.9628 16.0667C59.2001 16.5 59.5053 16.8333 59.912 17.0667C60.2849 17.3 60.7596 17.4333 61.3018 17.4333ZM63.8442 19.2666V16.7333L64.2171 14.4333L63.8442 12.1667V9.86667H66.0476V19.2666H63.8442Z" fill="#ddc48e"/>
      <path d="M67.4712 11.8V9.83333H74.2509V11.8H67.4712ZM69.7762 19.2667V5.93333H71.9796V19.2667H69.7762Z" fill="#ddc48e"/>
      <path d="M79.5729 19.4667C78.7253 19.4667 77.9457 19.2667 77.2339 18.8333C76.5221 18.4 75.9796 17.8333 75.5729 17.0667C75.166 16.3333 74.9626 15.5 74.9626 14.6C74.9626 13.6666 75.166 12.8333 75.5729 12.1C75.9796 11.3666 76.5221 10.7667 77.2339 10.3333C77.9457 9.9 78.7253 9.66667 79.5729 9.66667C80.3185 9.66667 80.9625 9.83332 81.505 10.1333C82.0812 10.4333 82.5219 10.8667 82.8608 11.4C83.1999 11.9333 83.3693 12.5333 83.3693 13.2333V15.9333C83.3693 16.6 83.1999 17.2333 82.8948 17.7666C82.5559 18.3 82.1152 18.7333 81.539 19.0333C80.9625 19.3 80.3185 19.4667 79.5729 19.4667ZM79.9455 17.4333C80.7591 17.4333 81.4032 17.1667 81.9116 16.6333C82.4201 16.1 82.6575 15.4 82.6575 14.5667C82.6575 14 82.5559 13.5 82.3186 13.0667C82.0812 12.6333 81.7761 12.3 81.3694 12.0667C80.9625 11.8333 80.488 11.7 79.9455 11.7C79.4033 11.7 78.9626 11.8333 78.5559 12.0667C78.149 12.3 77.8439 12.6333 77.6068 13.0667C77.3694 13.5 77.2676 14 77.2676 14.5667C77.2676 15.1333 77.3694 15.6333 77.6068 16.0667C77.8439 16.5 78.149 16.8333 78.5559 17.0667C78.9286 17.3 79.4033 17.4333 79.9455 17.4333ZM82.4879 19.2666V16.7333L82.8608 14.4333L82.4879 12.1667V9.86667H84.6913V19.2666H82.4879Z" fill="#ddc48e"/>
      <path d="M87.4371 19.2667V5.56667H89.7423V19.2667H87.4371ZM88.9965 19.2667V17.2H92.6573C93.6065 17.2 94.4541 17 95.1659 16.6C95.8777 16.2 96.454 15.6334 96.8609 14.9C97.2676 14.1667 97.4709 13.3333 97.4709 12.3667C97.4709 11.4333 97.2676 10.6 96.8609 9.86668C96.454 9.13333 95.8777 8.6 95.1659 8.16667C94.4541 7.76667 93.6065 7.56667 92.6573 7.56667H88.9965V5.5H92.7253C93.7423 5.5 94.6574 5.66667 95.5388 6.03333C96.3862 6.36667 97.1658 6.86667 97.81 7.46667C98.4541 8.1 98.9625 8.8 99.3014 9.63333C99.6743 10.4667 99.8439 11.3667 99.8439 12.3333C99.8439 13.3 99.6743 14.2 99.3014 15.0333C98.9285 15.8667 98.4541 16.6 97.81 17.2334C97.1658 17.8667 96.4202 18.3333 95.5726 18.6667C94.7252 19 93.7761 19.2 92.7931 19.2H88.9965V19.2667Z" fill="#ddc48e"/>
      <path d="M105.877 19.4667C105.03 19.4667 104.251 19.2667 103.539 18.8333C102.827 18.4 102.284 17.8333 101.878 17.0667C101.471 16.3333 101.268 15.5 101.268 14.6C101.268 13.6666 101.471 12.8333 101.878 12.1C102.284 11.3666 102.827 10.7667 103.539 10.3333C104.251 9.9 105.03 9.66667 105.877 9.66667C106.623 9.66667 107.267 9.83332 107.81 10.1333C108.386 10.4333 108.827 10.8667 109.166 11.4C109.505 11.9333 109.674 12.5333 109.674 13.2333V15.9333C109.674 16.6 109.505 17.2333 109.2 17.7666C108.861 18.3 108.42 18.7333 107.844 19.0333C107.267 19.3 106.59 19.4667 105.877 19.4667ZM106.217 17.4333C107.03 17.4333 107.674 17.1667 108.183 16.6333C108.691 16.1 108.928 15.4 108.928 14.5667C108.928 14 108.827 13.5 108.589 13.0667C108.352 12.6333 108.047 12.3 107.64 12.0667C107.234 11.8333 106.759 11.7 106.217 11.7C105.674 11.7 105.233 11.8333 104.827 12.0667C104.42 12.3 104.115 12.6333 103.878 13.0667C103.64 13.5 103.539 14 103.539 14.5667C103.539 15.1333 103.64 15.6333 103.878 16.0667C104.115 16.5 104.42 16.8333 104.827 17.0667C105.233 17.3 105.708 17.4333 106.217 17.4333ZM108.793 19.2666V16.7333L109.166 14.4333L108.793 12.1667V9.86667H110.996V19.2666H108.793Z" fill="#ddc48e"/>
      <path d="M113.437 19.2666V9.86667H115.64V19.2666H113.437ZM119.979 19.2666V13.8333C119.979 13.2 119.776 12.7 119.369 12.3C118.962 11.9 118.454 11.7 117.81 11.7C117.369 11.7 116.996 11.8 116.657 11.9667C116.318 12.1333 116.081 12.4 115.878 12.7333C115.708 13.0667 115.606 13.4333 115.606 13.8333L114.759 13.3667C114.759 12.6333 114.928 12 115.234 11.4667C115.538 10.9 115.979 10.4667 116.555 10.1667C117.132 9.83332 117.742 9.7 118.454 9.7C119.166 9.7 119.81 9.86667 120.352 10.2333C120.894 10.6 121.335 11.0667 121.674 11.6333C121.979 12.2 122.149 12.8 122.149 13.4V19.3H119.979V19.2666Z" fill="#ddc48e"/>
      <path d="M128.793 19.4667C127.843 19.4667 126.996 19.2667 126.216 18.8333C125.437 18.4 124.86 17.8 124.42 17.0667C123.979 16.3333 123.776 15.5 123.776 14.5667C123.776 13.6333 123.979 12.8 124.42 12.0667C124.86 11.3333 125.471 10.7333 126.216 10.3C126.996 9.86667 127.843 9.66667 128.793 9.66667C129.538 9.66667 130.216 9.8 130.86 10.1C131.505 10.3666 132.047 10.7667 132.487 11.3L131.064 12.7333C130.792 12.4 130.454 12.1667 130.047 12C129.64 11.8333 129.233 11.7666 128.759 11.7666C128.216 11.7666 127.742 11.9 127.301 12.1333C126.894 12.3667 126.555 12.7 126.318 13.1333C126.081 13.5667 125.979 14.0333 125.979 14.6C125.979 15.1333 126.081 15.6333 126.318 16.0667C126.555 16.5 126.861 16.8333 127.301 17.0667C127.708 17.3 128.216 17.4333 128.759 17.4333C129.233 17.4333 129.64 17.3667 130.047 17.2C130.454 17.0333 130.759 16.8 131.064 16.4667L132.487 17.9C132.047 18.4333 131.505 18.8333 130.86 19.1C130.25 19.3 129.538 19.4667 128.793 19.4667Z" fill="#ddc48e"/>
      <path d="M138.352 19.4667C137.403 19.4667 136.521 19.2667 135.776 18.8333C134.996 18.4 134.42 17.8333 133.979 17.0667C133.538 16.3333 133.301 15.5 133.301 14.5667C133.301 13.6333 133.504 12.8 133.945 12.0667C134.386 11.3333 134.962 10.7333 135.742 10.3C136.487 9.86667 137.335 9.66667 138.25 9.66667C139.132 9.66667 139.911 9.86665 140.623 10.2666C141.301 10.6666 141.843 11.2333 142.25 11.9333C142.657 12.6333 142.826 13.4333 142.826 14.3333C142.826 14.5 142.826 14.6667 142.792 14.8C142.759 14.9667 142.759 15.1333 142.691 15.3333H134.826V13.5667H141.538L140.725 14.2666C140.691 13.7 140.589 13.2 140.386 12.8333C140.182 12.4333 139.911 12.1333 139.538 11.9333C139.165 11.7333 138.725 11.6333 138.182 11.6333C137.64 11.6333 137.131 11.7667 136.725 12C136.318 12.2333 135.979 12.5667 135.776 13C135.538 13.4333 135.437 13.9333 135.437 14.5333C135.437 15.1333 135.572 15.6333 135.809 16.0667C136.047 16.5 136.386 16.8666 136.826 17.1C137.267 17.3333 137.775 17.4667 138.352 17.4667C138.826 17.4667 139.301 17.3667 139.708 17.2C140.114 17.0333 140.487 16.7667 140.758 16.4667L142.148 17.8667C141.674 18.4 141.131 18.8 140.453 19.0667C139.809 19.3333 139.098 19.4667 138.352 19.4667Z" fill="#ddc48e"/>
      <path d="M19.3362 0H13.3702V13H19.4718V6C23.0311 6.1 25.9123 8.96667 25.9123 12.5C25.9123 16.0333 23.0311 18.9 19.4718 19H13.3702V25H19.3023C26.3193 25 32.014 19.4 32.014 12.5C32.014 5.6 26.3193 0 19.3362 0Z" fill="#ddc48e"/>
      <path d="M13.3702 13H7.26855V19H13.3702V13Z" fill="#ddc48e"/>
      <path opacity="0.3" d="M7.2685 7H1.16687V13H7.2685V7Z" fill="#ddc48e"/>
      <path opacity="0.3" d="M7.2685 19H1.16687V25H7.2685V19Z" fill="#ddc48e"/>
    </svg>`;
  }

  function plainText() {
    const ev = data.event;
    const t = currentType();
    const name = t.nameLockedBlank ? '________' : (guestName.trim() || '________');
    const lines = [ev.book + ev.meeting];
    if (t.greetingPrefix) lines.push(`${t.greetingPrefix}${name}：`);
    lines.push(t.lead, t.body);
    if (t.closing) lines.push(t.closing);
    if (typeId === 'blast') lines.push(ev.speakers);
    lines.push(`日期：${ev.date}`, `時間：${ev.time}`, `地點：${ev.venue}`, `形式：${t.format}`);
    if (t.note) lines.push(t.note);
    if (t.contact) {
      lines.push(t.contact.title);
      lines.push(`${t.contact.wechatLabel}：${t.contact.wechat}`);
      lines.push(`${t.contact.emailLabel}：${t.contact.email}`);
      if (t.contact.note) lines.push(t.contact.note);
    }
    return lines.filter(Boolean).join('\n');
  }

  function bind() {
    $('#tabs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-type]');
      if (!btn) return;
      typeId = btn.getAttribute('data-type');
      document.querySelectorAll('#tabs .tab').forEach((el) => {
        el.classList.toggle('is-on', el.getAttribute('data-type') === typeId);
      });
      paintCard();
      syncNameField();
      syncYafangBar();
    });
    $('#yafangBar')?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-yafang-variant]');
      if (!btn) return;
      yafangVariant = btn.getAttribute('data-yafang-variant') || 'media';
      paintCard();
      syncYafangBar();
    });
    $('#nameInput')?.addEventListener('input', (e) => {
      guestName = e.target.value;
      paintCard();
    });
    $('#copyBtn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(plainText());
        flash('#copyBtn', '已複製');
      } catch {
        window.prompt('複製以下正文', plainText());
      }
    });
    $('#pngBtn')?.addEventListener('click', () => {
      downloadPng().catch((err) => {
        console.error(err);
        alert('PNG 匯出失敗，請截圖使用。');
      });
    });
    $('#mediaBatchBtn')?.addEventListener('click', () => {
      downloadMediaBatch().catch((err) => {
        console.error(err);
        alert('批量匯出失敗，請稍後再試或改為逐張下載。');
      });
    });
    $('#yafangPackBtn')?.addEventListener('click', () => {
      downloadYafangPack().catch((err) => {
        console.error(err);
        alert('亞芳模板匯出失敗，請稍後再試或改為逐張下載。');
      });
    });
  }

  function flash(sel, text) {
    const el = $(sel);
    if (!el) return;
    const prev = el.textContent;
    el.textContent = text;
    window.setTimeout(() => { el.textContent = prev; }, 1200);
  }

  function fitBoard() {
    const stage = $('#stage');
    const board = $('#artboard');
    const slot = $('#boardSlot');
    if (!stage || !board || !slot) return;
    const { w, h } = boardSize();
    const pad = typeId === 'blast' ? 8 : 8;
    const s = Math.max(0.18, Math.min((stage.clientWidth - pad) / w, 1));
    slot.style.width = `${w * s}px`;
    slot.style.height = `${h * s}px`;
    board.style.width = `${w}px`;
    board.style.height = `${h}px`;
    board.style.transform = `scale(${s})`;
    board.style.transformOrigin = 'top left';
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
      s.onload = () => { s.dataset.loaded = '1'; resolve(); };
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  }

  function drawMaskedTile(ctx, img, y, w, h, stops) {
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    octx.filter = 'grayscale(0.06) contrast(1.08)';
    octx.drawImage(img, 0, 0, w, h);
    octx.filter = 'none';
    octx.globalCompositeOperation = 'destination-in';
    const mask = octx.createLinearGradient(0, 0, 0, h);
    stops.forEach(([pos, alpha]) => {
      mask.addColorStop(pos, `rgba(0,0,0,${alpha})`);
    });
    octx.fillStyle = mask;
    octx.fillRect(0, 0, w, h);
    ctx.drawImage(off, 0, y);
  }

  async function bakeCardBackdrop(canvas) {
    const { w, h } = boardSize();
    const dpr = 2;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const base = ctx.createLinearGradient(0, 0, w * 0.35, h);
    base.addColorStop(0, '#1a1714');
    base.addColorStop(0.48, '#2c2824');
    base.addColorStop(1, '#3d3832');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    const goldGlow = ctx.createRadialGradient(w * 0.8, h * 0.08, 0, w * 0.8, h * 0.08, w * 0.7);
    goldGlow.addColorStop(0, 'rgba(201,167,106,0.2)');
    goldGlow.addColorStop(0.55, 'rgba(201,167,106,0)');
    ctx.fillStyle = goldGlow;
    ctx.fillRect(0, 0, w, h);

    const corner = ctx.createRadialGradient(w * 0.08, h * 0.92, 0, w * 0.08, h * 0.92, w * 0.75);
    corner.addColorStop(0, 'rgba(92,84,76,0.55)');
    corner.addColorStop(0.5, 'rgba(92,84,76,0)');
    ctx.fillStyle = corner;
    ctx.fillRect(0, 0, w, h);

    if (typeId === 'blast') {
      const cover = await loadImage('/invite/assets/book-cover-hero.png');
      const scale = Math.max(w / cover.width, h / cover.height) * 1.06;
      const dw = cover.width * scale;
      const dh = cover.height * scale;
      ctx.globalAlpha = 0.42;
      ctx.drawImage(cover, (w - dw) / 2 - w * 0.04, (h - dh) / 2, dw, dh);
      ctx.globalAlpha = 1;
    } else {
      const hero = await loadImage('/invite/assets/invite-hero.png');
      const tileW = w;
      const tileH = Math.round(tileW * (1000 / 625));
      const overlap = 180;
      ctx.globalAlpha = 0.78;
      drawMaskedTile(ctx, hero, 0, tileW, tileH, [
        [0, 0], [0.08, 0.35], [0.16, 1], [0.58, 1], [0.72, 0.45], [0.86, 0.12], [1, 0],
      ]);
      drawMaskedTile(ctx, hero, tileH - overlap, tileW, tileH, [
        [0, 0], [0.08, 0.35], [0.18, 1], [0.82, 1], [0.92, 0.35], [1, 0],
      ]);
      ctx.globalAlpha = 1;
    }

    const diag = ctx.createLinearGradient(0, 0, w, h * 0.28);
    diag.addColorStop(0, 'rgba(26,23,20,0.72)');
    diag.addColorStop(0.46, 'rgba(26,23,20,0.48)');
    diag.addColorStop(1, 'rgba(26,23,20,0.28)');
    ctx.fillStyle = diag;
    ctx.fillRect(0, 0, w, h);

    const veil = ctx.createLinearGradient(0, 0, 0, h);
    if (typeId === 'blast') {
      veil.addColorStop(0, 'rgba(26,23,20,0.55)');
      veil.addColorStop(0.42, 'rgba(26,23,20,0.72)');
      veil.addColorStop(1, 'rgba(26,23,20,0.88)');
    } else {
      veil.addColorStop(0, 'rgba(26,23,20,0.16)');
      veil.addColorStop(0.18, 'rgba(26,23,20,0.38)');
      veil.addColorStop(0.38, 'rgba(26,23,20,0.72)');
      veil.addColorStop(0.56, 'rgba(26,23,20,0.9)');
      veil.addColorStop(0.72, '#1a1714');
      veil.addColorStop(1, '#1a1714');
    }
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);

    const goldTop = ctx.createRadialGradient(w * 0.5, h * 0.08, 0, w * 0.5, h * 0.08, w * 0.62);
    goldTop.addColorStop(0, 'rgba(201,167,106,0.22)');
    goldTop.addColorStop(0.58, 'rgba(201,167,106,0)');
    ctx.fillStyle = goldTop;
    ctx.fillRect(0, 0, w, h);

    const goldWash = ctx.createLinearGradient(0, 0, w * 0.7, h * 0.45);
    goldWash.addColorStop(0, 'rgba(201,167,106,0.1)');
    goldWash.addColorStop(0.36, 'rgba(201,167,106,0)');
    ctx.fillStyle = goldWash;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    const meshFade = ctx.createLinearGradient(0, 0, 0, h);
    meshFade.addColorStop(0, 'rgba(255,255,255,0.19)');
    meshFade.addColorStop(0.7, 'rgba(255,255,255,0)');
    ctx.strokeStyle = meshFade;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.38;
    for (let y = 0.5; y < h * 0.72; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0.5; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h * 0.72);
      ctx.stroke();
    }
    ctx.restore();
  }

  function lockLogoLayout(root) {
    const nodes = [...(root?.querySelectorAll('.logo-img, .logo-datadance') || [])];
    const prev = nodes.map((el) => ({
      el,
      style: el.getAttribute('style'),
      canvas: null,
    }));
    prev.forEach((item) => {
      const el = item.el;
      const cell = el.closest('.logo-cell');
      const cellW = cell?.clientWidth || el.clientWidth;
      if (el.tagName === 'IMG') {
        const nw = el.naturalWidth;
        const nh = el.naturalHeight;
        if (!nw || !nh || !cellW) return;
        const boxW = Math.min(el.clientWidth || cellW, cellW);
        const boxH = el.clientHeight || nh;
        const scale = Math.min(boxW / nw, boxH / nh);
        const w = Math.max(1, Math.round(nw * scale));
        const h = Math.max(1, Math.round(nh * scale));
        const dpr = 2;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.className = el.className;
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        canvas.style.maxWidth = '100%';
        canvas.style.flex = 'none';
        canvas.getContext('2d').drawImage(el, 0, 0, canvas.width, canvas.height);
        el.replaceWith(canvas);
        item.canvas = canvas;
        return;
      }
      const w = Math.min(el.clientWidth || el.getBoundingClientRect().width, cellW || Infinity);
      const h = el.clientHeight || el.getBoundingClientRect().height;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.maxWidth = '100%';
      el.style.flex = 'none';
    });
    return () => {
      prev.forEach((item) => {
        if (item.canvas) item.canvas.replaceWith(item.el);
        if (item.style == null) item.el.removeAttribute('style');
        else item.el.setAttribute('style', item.style);
      });
    };
  }

  function waitForImages(root) {
    const imgs = [...(root?.querySelectorAll('img') || [])];
    return Promise.all(imgs.map((img) => {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      });
    }));
  }

  function sleep(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function fileSlug(name) {
    return String(name || '').replace(/[\\/:*?"<>|]+/g, '').trim();
  }

  function saveCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('PNG blob failed'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 2500);
        resolve();
      }, 'image/png');
    });
  }

  let bakedBgCache = { key: '', canvas: null };

  async function ensureBakedBg(canvas) {
    const { w, h } = boardSize();
    const key = `${typeId}:${w}x${h}`;
    if (bakedBgCache.canvas && bakedBgCache.key === key) {
      canvas.width = bakedBgCache.canvas.width;
      canvas.height = bakedBgCache.canvas.height;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.getContext('2d').drawImage(bakedBgCache.canvas, 0, 0);
      return;
    }
    await bakeCardBackdrop(canvas);
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    bakedBgCache = { key, canvas: copy };
  }

  function setExportBusy(busy, label) {
    const pngBtn = $('#pngBtn');
    const batchBtn = $('#mediaBatchBtn');
    const packBtn = $('#yafangPackBtn');
    const copyBtn = $('#copyBtn');
    [pngBtn, batchBtn, packBtn, copyBtn].forEach((btn) => {
      if (btn) btn.disabled = busy;
    });
    if (batchBtn && label && !isYafangPack()) batchBtn.textContent = label;
    if (packBtn && label && isYafangPack()) packBtn.textContent = label;
    if (!busy && batchBtn) batchBtn.textContent = '批量下載媒體邀請函';
    if (!busy && packBtn) packBtn.textContent = '下載亞芳媒體+嘉賓空白模板';
    if (pngBtn && !busy) pngBtn.textContent = '下載 PNG';
    if (pngBtn && busy && !label) pngBtn.textContent = '匯出中…';
  }

  async function captureBoard() {
    if (!window.html2canvas) {
      await loadScriptOnce('/partner-deck/assets/vendor/html2canvas.min.js');
    }
    const board = $('#artboard');
    const card = board?.querySelector('.card');
    const baked = card?.querySelector('.card-baked-bg');
    if (!board || !card || !baked) throw new Error('Invite board not ready');
    const prev = board.style.transform;
    board.style.transform = 'none';
    let unlockLogos = () => {};
    try {
      await waitForImages(card);
      if (document.fonts?.ready) await document.fonts.ready;
      await ensureBakedBg(baked);
      card.classList.add('is-exporting');
      unlockLogos = lockLogoLayout(card);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const { w, h } = boardSize();
      return await window.html2canvas(board, {
        backgroundColor: '#1a1714',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: w,
        height: h,
        windowWidth: w,
        windowHeight: h,
      });
    } finally {
      unlockLogos();
      card.classList.remove('is-exporting');
      board.style.transform = prev;
    }
  }

  async function downloadPng() {
    setExportBusy(true);
    try {
      const canvas = await captureBoard();
      const slug = fileSlug(guestName);
      const yafangLabels = { media: '媒體', guest: '嘉賓' };
      const name = isYafangPack()
        ? `亞芳-${yafangLabels[yafangVariant] || yafangVariant}邀請函-空白.png`
        : (slug ? `binance-life-invite-${typeId}-${slug}.png` : `binance-life-invite-${typeId}.png`);
      await saveCanvas(canvas, name);
    } finally {
      setExportBusy(false);
      fitBoard();
    }
  }

  function setType(id) {
    typeId = id;
    document.querySelectorAll('#tabs .tab').forEach((el) => {
      el.classList.toggle('is-on', el.getAttribute('data-type') === typeId);
    });
    paintCard();
    syncNameField();
    syncYafangBar();
  }

  async function downloadYafangPack() {
    const prevType = typeId;
    const prevVariant = yafangVariant;
    const prevName = guestName;
    const variants = ['media', 'guest'];
    const labels = { media: '媒體', guest: '嘉賓' };
    setExportBusy(true, `匯出中 0/${variants.length}`);
    try {
      typeId = 'yafang';
      guestName = '';
      for (let i = 0; i < variants.length; i += 1) {
        yafangVariant = variants[i];
        paintCard();
        syncNameField();
        syncYafangBar();
        setExportBusy(true, `匯出中 ${i + 1}/${variants.length}　亞芳${labels[yafangVariant]}`);
        const canvas = await captureBoard();
        await saveCanvas(canvas, `亞芳-${labels[yafangVariant]}邀請函-空白.png`);
        await sleep(450);
      }
    } finally {
      guestName = prevName;
      yafangVariant = prevVariant;
      setType(prevType);
      setExportBusy(false);
      fitBoard();
    }
  }

  async function downloadMediaBatch() {
    const names = (data.mediaBatch || []).map((n) => String(n).trim()).filter(Boolean);
    if (!names.length) throw new Error('No media list');
    const prevType = typeId;
    const prevName = guestName;
    setExportBusy(true, `匯出中 0/${names.length}`);
    try {
      setType('media');
      for (let i = 0; i < names.length; i += 1) {
        const name = names[i];
        guestName = name;
        paintCard();
        syncNameField();
        setExportBusy(true, `匯出中 ${i + 1}/${names.length}　${name}`);
        const canvas = await captureBoard();
        await saveCanvas(canvas, `媒體邀請函-${fileSlug(name)}.png`);
        await sleep(450);
      }
    } finally {
      guestName = prevName;
      setType(prevType);
      setExportBusy(false);
      fitBoard();
    }
  }

  init().catch((err) => {
    console.error(err);
    $('#app').innerHTML = '<div class="boot">邀請函載入失敗，請重新整理再試。</div>';
  });
})();
