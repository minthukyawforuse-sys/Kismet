(function () {
    if (window.__kismetAllLoaded) return;
    window.__kismetAllLoaded = true;

    const getCap = (n) => (window.Capacitor && window.Capacitor.Plugins) ? window.Capacitor.Plugins[n] : null;
    const haptic = () => { try { const H = getCap('Haptics'); if (H && H.impact) H.impact({ style: 'LIGHT' }); else if (navigator.vibrate) navigator.vibrate(25); } catch (e) {} };
    const blobToB64 = (b) => new Promise((res, rej) => { const f = new FileReader(); f.onloadend = () => res(f.result); f.onerror = rej; f.readAsDataURL(b); });

    // 1. INJECT STYLES (ORANGE & BLACK THEME)
    const style = document.createElement('style');
    style.textContent = `
        #kismetRouteAnimPanel { background:#141416; border:1px solid #2a2a2e; border-radius:22px; padding:12px; color:#fff; box-shadow:0 8px 24px rgba(0,0,0,0.45); }
        .kra-tab { padding:4px 9px; border-radius:10px; font-size:10px; font-weight:800; color:#a3a3a3; background:#0a0a0c; border:1px solid #262629; }
        .kra-tab.kra-active { background:linear-gradient(135deg,#f26419,#c4420a); color:#fff; border-color:rgba(255,255,255,0.2); }
        .kra-track-wrap { position:relative; height:38px; margin:6px 12px 2px 12px; }
        .kra-rail { position:absolute; top:50%; left:0; right:0; height:3px; transform:translateY(-50%); background:repeating-linear-gradient(90deg,#323238 0 6px,transparent 6px 11px); }
        .kra-trail { position:absolute; top:50%; left:0; height:3px; width:0%; transform:translateY(-50%); background:linear-gradient(90deg,#9a3412,#f26419,#ff853b); box-shadow:0 0 10px rgba(242,100,25,0.75); animation:kraMove 6s ease-in-out infinite; }
        .kra-node { position:absolute; top:50%; width:10px; height:10px; border-radius:99px; background:#141416; border:2.5px solid #f26419; transform:translate(-50%,-50%); z-index:2; }
        .kra-vehicle { position:absolute; top:50%; left:0%; width:26px; height:26px; border-radius:99px; background:linear-gradient(135deg,#ff7a29,#ea580c); border:1.5px solid rgba(255,255,255,0.6); box-shadow:0 0 12px rgba(242,100,25,0.85); display:flex; align-items:center; justify-content:center; z-index:4; transform:translate(-50%,-50%); animation:kraVeh 6s ease-in-out infinite; }
        @keyframes kraVeh { 0%{left:0%;opacity:0} 8%{left:0%;opacity:1} 45%{left:50%;opacity:1} 55%{left:50%;opacity:1} 90%{left:100%;opacity:1} 100%{left:100%;opacity:0} }
        @keyframes kraMove { 0%{width:0%;opacity:0} 8%{width:0%;opacity:1} 45%{width:50%;opacity:1} 55%{width:50%;opacity:1} 90%{width:100%;opacity:1} 100%{width:100%;opacity:0} }
        @keyframes kgPop { 0%{opacity:0.35;transform:rotate(-115deg) scale(0.88)} 100%{opacity:1;transform:rotate(-90deg) scale(1)} }
        #kgDonutSvg.kg-pop { animation:kgPop 0.7s cubic-bezier(0.22,1,0.36,1) forwards; }
        #kismetTrackModal { position:fixed; inset:0; background:rgba(0,0,0,0.84); backdrop-filter:blur(8px); z-index:80; display:none; align-items:flex-end; justify-content:center; padding:10px; }
        #kismetTrackModal.open { display:flex; }
        .ktm-sheet { width:100%; max-width:28rem; max-height:92vh; overflow-y:auto; background:#141416; border:1px solid #2a2a2e; border-radius:28px; box-shadow:0 24px 60px rgba(0,0,0,0.85); }
        .ktm-dot { width:14px; height:14px; border-radius:99px; border:2px solid #3f3f46; background:#0a0a0c; flex-shrink:0; }
        .ktm-dot.done { border-color:#f26419; background:#f26419; box-shadow:0 0 8px rgba(242,100,25,0.6); }
        .ktm-line { flex:1; height:2px; border-top:2px dashed #3f3f46; }
        .ktm-line.done { border-top:2px solid #f26419; }
    `;
    document.head.appendChild(style);

    // 2. NATIVE ANDROID GALLERY & EXCEL SAVER
    function interceptSave(a) {
        try {
            const saver = getCap('KismetSaver'); if (!saver || !a) return false;
            const href = a.href || a.getAttribute('href') || '';
            const dl = a.download || a.getAttribute('download') || ('KISMET_' + Date.now() + '.png');
            if (!href) return false;
            if (href.startsWith('data:image/')) {
                saver.saveImage({ base64: href, filename: dl })
                    .then(() => { if (typeof showToast === 'function') showToast('✅ Gallery (Pictures/KISMET) ထဲ သိမ်းပြီးပါပြီ'); haptic(); })
                    .catch(e => { if (typeof showToast === 'function') showToast('⚠️ Gallery Error: ' + (e && e.message ? e.message : 'Failed')); });
                return true;
            }
            if (href.startsWith('blob:')) {
                fetch(href).then(r => r.blob()).then(b => {
                    if ((b.type && b.type.startsWith('image/')) || /\.(png|jpg|jpeg|webp)$/i.test(dl)) {
                        return blobToB64(b).then(url => saver.saveImage({ base64: url, filename: dl }))
                            .then(() => { if (typeof showToast === 'function') showToast('✅ Gallery (Pictures/KISMET) ထဲ သိမ်းပြီးပါပြီ'); haptic(); });
                    }
                    return b.text().then(t => saver.saveFile({ text: t, filename: dl, mime: b.type || 'text/csv' }))
                        .then(() => { if (typeof showToast === 'function') showToast('✅ Download/KISMET ထဲ သိမ်းပြီးပါပြီ'); haptic(); });
                }).catch(e => { if (typeof showToast === 'function') showToast('⚠️ Save Error: ' + (e && e.message ? e.message : 'Failed')); });
                return true;
            }
        } catch (e) {}
        return false;
    }
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { if (interceptSave(this)) return; return origClick.apply(this, arguments); };

    // 3. VEHICLE ILLUSTRATIONS (PLANE / TRUCK / POSTBOX)
    const MINI_SVGS = {
        Air: '<svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(90 12 12)"/></svg>',
        Land: '<svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M18 18.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm-12 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM20 8h-3V4H3a1 1 0 0 0-1 1v11h2a3 3 0 0 0 6 0h4a3 3 0 0 0 6 0h2v-5l-2-3zm-3 1.5h2.2l1.3 2H17v-2z"/></svg>',
        Post: '<svg viewBox="0 0 24 24" fill="white" width="14" height="14"><path d="M12 2C8.69 2 6 4.69 6 8v10h4v4h4v-4h4V8c0-3.31-2.69-6-6-6zm3 7H9V7h6v2zm-5 3h4v1.5h-4V12z"/></svg>'
    };
    const BIG_ART = {
        Air: '<svg viewBox="0 0 96 96" width="76" height="76"><rect width="96" height="96" rx="22" fill="#1c1410" stroke="#f26419" stroke-opacity="0.45"/><path d="M78 48L50 38V21a4 4 0 0 0-8 0v17L16 48v7l26-5v16l-8 5v5l12-3 12 3v-5l-8-5V50l28 5v-7z" fill="#f26419" transform="rotate(45 48 48)"/></svg>',
        Land: '<svg viewBox="0 0 96 96" width="76" height="76"><rect width="96" height="96" rx="22" fill="#1c1410" stroke="#f26419" stroke-opacity="0.45"/><rect x="14" y="32" width="42" height="28" rx="6" fill="#f26419"/><path d="M56 40h15l10 10v10H56V40z" fill="#ea580c"/><rect x="60" y="44" width="11" height="7" rx="2" fill="#0a0a0c"/><circle cx="28" cy="64" r="7" fill="#0a0a0c" stroke="#fff" stroke-width="2.5"/><circle cx="68" cy="64" r="7" fill="#0a0a0c" stroke="#fff" stroke-width="2.5"/></svg>',
        Post: '<svg viewBox="0 0 96 96" width="76" height="76"><rect width="96" height="96" rx="22" fill="#1c1410" stroke="#f26419" stroke-opacity="0.45"/><path d="M48 18c-13 0-22 9-22 21v28h14v11h16V67h14V39c0-12-9-21-22-21z" fill="#f26419"/><rect x="34" y="34" width="28" height="6" rx="3" fill="#0a0a0c"/><rect x="38" y="47" width="20" height="5" rx="2.5" fill="#fff"/></svg>'
    };

    // 4. LOCATION TRACKING MODAL (SECOND IMAGE UI IN ORANGE & BLACK)
    const modal = document.createElement('div');
    modal.id = 'kismetTrackModal';
    modal.onclick = (e) => { if (e.target === modal) modal.classList.remove('open'); };
    modal.innerHTML = `
        <div class="ktm-sheet text-white">
            <div style="position:relative;height:185px;background:radial-gradient(circle at 76% 24%,#29170f 0%,#121215 58%,#09090b 100%);border-bottom:1px solid #262629;overflow:hidden;">
                <svg viewBox="0 0 400 185" style="width:100%;height:100%;display:block;">
                    <path d="M 335 36 C 285 62, 245 78, 200 100 C 150 124, 115 132, 65 152" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3.5" stroke-dasharray="5 5"/>
                    <path id="ktmActivePath" d="M 335 36 C 285 62, 245 78, 200 100 C 150 124, 115 132, 65 152" fill="none" stroke="#f26419" stroke-width="4" stroke-linecap="round"/>
                    <circle cx="335" cy="36" r="6" fill="#0a0a0c" stroke="#f26419" stroke-width="2.5"/><text x="335" y="54" text-anchor="middle" fill="#fff" font-size="10" font-weight="800">တရုတ်</text>
                    <circle cx="200" cy="100" r="6" fill="#0a0a0c" stroke="#f26419" stroke-width="2.5"/><text x="200" y="118" text-anchor="middle" fill="#fdba74" font-size="10" font-weight="800">လားရှိုး</text>
                    <circle cx="65" cy="152" r="7" fill="#f26419" stroke="#fff" stroke-width="2"/><text x="65" y="170" text-anchor="middle" fill="#fff" font-size="10" font-weight="800">ရန်ကုန်</text>
                    <g id="ktmMapVeh" transform="translate(200,100)"><circle r="11" fill="#0a0a0c" stroke="#f26419" stroke-width="2"/><text id="ktmMapEmoji" x="0" y="4" text-anchor="middle" font-size="11">✈️</text></g>
                </svg>
                <div style="position:absolute;top:12px;left:12px;background:rgba(10,10,12,0.88);border:1px solid rgba(242,100,25,0.45);padding:5px 10px;border-radius:12px;">
                    <div style="font-size:11px;font-weight:800;">Location Tracking</div>
                    <div style="font-size:9px;color:#fb923c;font-weight:700;">တရုတ် ➔ လားရှိုး ➔ ရန်ကုန်</div>
                </div>
                <button type="button" id="ktmCloseBtn" style="position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:99px;background:rgba(10,10,12,0.9);border:1px solid #3f3f46;color:#fff;font-size:13px;">✕</button>
            </div>
            <div style="padding:14px;" class="space-y-3">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <div><div style="font-size:10px;color:#a3a3a3;">Tracking / Booking ID</div><div id="ktmId" style="font-size:15px;font-weight:800;font-family:monospace;">-</div></div>
                    <span id="ktmStatus" style="padding:4px 10px;border-radius:99px;background:rgba(242,100,25,0.18);border:1px solid rgba(242,100,25,0.45);color:#fb923c;font-size:10px;font-weight:800;">Transit</span>
                </div>
                <div style="display:flex;align-items:center;gap:4px;">
                    <span id="ktmD1" class="ktm-dot done"></span><span id="ktmL1" class="ktm-line"></span>
                    <span id="ktmD2" class="ktm-dot"></span><span id="ktmL2" class="ktm-line"></span>
                    <span id="ktmD3" class="ktm-dot"></span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;color:#d4d4d8;">
                    <span>တရုတ်</span><span style="color:#fb923c;">လားရှိုး</span><span>ရန်ကုန်</span>
                </div>
                <div style="display:flex;gap:10px;align-items:center;background:#0a0a0c;border:1px solid #262629;border-radius:18px;padding:12px;">
                    <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;">
                        <div><div style="font-size:9px;color:#71717a;">Item</div><div id="ktmName" style="font-weight:800;">-</div></div>
                        <div><div style="font-size:9px;color:#71717a;">Method</div><div id="ktmMethod" style="font-weight:800;color:#fb923c;">Air</div></div>
                        <div><div style="font-size:9px;color:#71717a;">Customer</div><div id="ktmBuyer" style="font-weight:700;">-</div></div>
                        <div><div style="font-size:9px;color:#71717a;">Order Cost</div><div id="ktmCost" style="font-weight:800;color:#fb923c;">0 Ks</div></div>
                        <div><div style="font-size:9px;color:#71717a;">Quantity</div><div id="ktmQty" style="font-weight:700;">1 ခု</div></div>
                        <div><div style="font-size:9px;color:#71717a;">Weight</div><div id="ktmKg" style="font-weight:700;">0 Kg</div></div>
                    </div>
                    <div id="ktmBigArt" style="flex-shrink:0;">${BIG_ART.Air}</div>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                    <button type="button" id="ktm17Btn" class="burnt-orange-btn" style="padding:9px;border-radius:12px;font-size:11px;font-weight:800;">17TRACK စစ်မည်</button>
                    <button type="button" id="ktmKdBtn" style="padding:9px;border-radius:12px;background:#0a0a0c;border:1px solid rgba(242,100,25,0.45);color:#fb923c;font-size:11px;font-weight:800;">Kuaidi100</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modal);
    document.getElementById('ktmCloseBtn').onclick = () => modal.classList.remove('open');

    let activeTrackCode = '';
    document.getElementById('ktm17Btn').onclick = () => { if (activeTrackCode) window.open('https://t.17track.net/en#nums=' + encodeURIComponent(activeTrackCode), '_blank'); else if (typeof showToast === 'function') showToast('Tracking ID မရှိသေးပါ'); };
    document.getElementById('ktmKdBtn').onclick = () => { if (activeTrackCode) window.open('https://m.kuaidi100.com/result.jsp?nu=' + encodeURIComponent(activeTrackCode), '_blank'); else if (typeof showToast === 'function') showToast('Tracking ID မရှိသေးပါ'); };

    window.openKismetTrackModal = function (item) {
        const it = item || { name: 'တရုတ် - လားရှိုး - ရန်ကုန်', qty: 1, method: 'Air', kg: 0, fee: 0, price: 0, buyer: '-', note: '' };
        const m = it.method || 'Air';
        const pct = it.arrived ? 55 : 22;
        activeTrackCode = (String(it.note || '').match(/\b([A-Za-z]{1,4}\d{7,22}|\d{9,22})\b/) || [])[1] || String(it.note || '').trim();
        document.getElementById('ktmId').innerText = activeTrackCode || 'No Tracking ID';
        document.getElementById('ktmStatus').innerText = it.arrived ? 'Lashio Arrived' : 'In Transit';
        document.getElementById('ktmName').innerText = it.name || '-';
        document.getElementById('ktmMethod').innerText = m;
        document.getElementById('ktmBuyer').innerText = it.buyer || '-';
        document.getElementById('ktmCost').innerText = (parseFloat(it.price || it.fee) || 0).toLocaleString() + ' Ks';
        document.getElementById('ktmQty').innerText = (it.qty || 1) + ' ခု';
        document.getElementById('ktmKg').innerText = (parseFloat(it.kg) || 0) + ' Kg';
        document.getElementById('ktmBigArt').innerHTML = BIG_ART[m] || BIG_ART.Air;
        document.getElementById('ktmMapEmoji').textContent = m === 'Air' ? '✈️' : (m === 'Post' ? '📮' : '🚚');
        document.getElementById('ktmL1').className = 'ktm-line ' + (it.arrived ? 'done' : '');
        document.getElementById('ktmD2').className = 'ktm-dot ' + (it.arrived ? 'done' : '');
        const ap = document.getElementById('ktmActivePath'), vg = document.getElementById('ktmMapVeh');
        if (ap && vg && ap.getTotalLength) {
            const len = ap.getTotalLength(), pt = ap.getPointAtLength(len * (pct / 100));
            ap.style.strokeDasharray = len + ' ' + len;
            ap.style.strokeDashoffset = String(len - len * (pct / 100));
            vg.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
        }
        modal.classList.add('open');
    };

    // 5. CHINA - LASHIO - YANGON PANEL RIGHT BELOW #globalSearch
    let panelMethod = 'Air';
    function mountPanel() {
        const searchEl = document.getElementById('globalSearch');
        if (!searchEl || !searchEl.parentElement) return;
        let p = document.getElementById('kismetRouteAnimPanel');
        if (!p) {
            p = document.createElement('div');
            p.id = 'kismetRouteAnimPanel';
            p.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">
                    <span style="font-size:12px;font-weight:800;">🟠 တရုတ် - လားရှိုး - ရန်ကုန်</span>
                    <div style="display:flex;gap:4px;">
                        <button type="button" data-m="Air" class="kra-tab kra-active">✈️ Air</button>
                        <button type="button" data-m="Land" class="kra-tab">🚚 Land</button>
                        <button type="button" data-m="Post" class="kra-tab">📮 Post</button>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;background:#0a0a0c;border:1px solid #262629;border-radius:16px;padding:10px;">
                    <div style="flex:1;min-width:0;">
                        <div class="kra-track-wrap">
                            <div class="kra-rail"></div><div class="kra-trail"></div>
                            <span class="kra-node" style="left:0%"></span><span class="kra-node" style="left:50%"></span><span class="kra-node" style="left:100%"></span>
                            <div class="kra-vehicle"><span id="kraVehIn">${MINI_SVGS.Air}</span></div>
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;">
                            <span>တရုတ်</span><span style="color:#fb923c;">လားရှိုး</span><span>ရန်ကုန်</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
                            <span id="kraStat" style="font-size:10px;color:#a3a3a3;">Air • 0 မျိုး</span>
                            <button type="button" id="kraMapBtn" style="padding:3px 9px;border-radius:8px;background:rgba(242,100,25,0.2);border:1px solid rgba(242,100,25,0.5);color:#fb923c;font-size:10px;font-weight:800;">📍 Track မြေပုံ</button>
                        </div>
                    </div>
                    <button type="button" id="kraKgBtn" style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;padding-left:10px;border-left:1px solid #262629;">
                        <div style="position:relative;width:52px;height:52px;">
                            <svg viewBox="0 0 42 42" style="width:100%;height:100%;transform:rotate(-90deg);">
                                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#262629" stroke-width="4.5"></circle>
                                <circle id="kraRing" cx="21" cy="21" r="15.915" fill="transparent" stroke="#f26419" stroke-width="4.5" stroke-dasharray="100 100" stroke-dashoffset="100" style="transition:stroke-dashoffset 0.7s ease;"></circle>
                            </svg>
                            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
                                <span id="kraPct" style="font-size:11px;font-weight:800;">0%</span>
                                <span style="font-size:8px;color:#fb923c;font-weight:700;">Kg %</span>
                            </div>
                        </div>
                        <span id="kraKgTxt" style="font-size:9px;color:#a3a3a3;font-weight:700;">0.0 Kg</span>
                    </button>
                </div>`;
            p.querySelectorAll('.kra-tab').forEach(b => b.onclick = () => {
                panelMethod = b.getAttribute('data-m');
                p.querySelectorAll('.kra-tab').forEach(x => x.classList.toggle('kra-active', x === b));
                document.getElementById('kraVehIn').innerHTML = MINI_SVGS[panelMethod];
                syncPanel();
            });
       setTimeout(() => { mountPanel(); bindItemCards(); }, 250);
})();

