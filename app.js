'use strict';

(function () {
  const STORAGE_KEY = 'hkledger.v1';

  const BUILTIN_CATEGORIES = [
    { id: 'dining', name: '餐饮', emoji: '🍜' },
    { id: 'transport', name: '交通', emoji: '🚇' },
    { id: 'housing', name: '住宿', emoji: '🏠' },
    { id: 'daily', name: '日用', emoji: '🧻' },
    { id: 'shopping', name: '购物', emoji: '🛍️' },
    { id: 'study', name: '学习', emoji: '📚' },
    { id: 'comm', name: '通讯', emoji: '📶' },
    { id: 'fun', name: '娱乐', emoji: '🎬' },
    { id: 'medical', name: '医疗', emoji: '💊' },
    { id: 'travel', name: '旅行', emoji: '✈️' },
    { id: 'other', name: '其他', emoji: '📦' }
  ];

  const EMOJI_CHOICES = [
    '🍜', '🥘', '🍱', '🧋', '☕', '🍞', '🍎', '🚇', '🚌', '🚕', '🚲', '🏠', '💡', '💧',
    '🧻', '🛍️', '👕', '👟', '💄', '📱', '📚', '✏️', '🖨️', '📶', '🎬', '🎮', '🎤', '🏞️',
    '🎫', '💊', '🏥', '✈️', '🏨', '🧳', '🎁', '💰', '📦', '🐱', '🏋️', '🎓'
  ];

  const PALETTE = [
    '#0f766e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981', '#f97316', '#14b8a6',
    '#e11d48', '#6366f1', '#84cc16', '#06b6d4', '#a855f7', '#f43f5e', '#22c55e', '#eab308',
    '#d946ef', '#0891b2'
  ];

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  let state = loadState();
  let selectedCategoryId = state.categories.length ? state.categories[0].id : null;
  let addCurrency = 'HKD';
  let statsPeriod = 'month';
  let deferredInstallPrompt = null;
  let toastTimer = null;

  function defaultState() {
    return {
      records: [],
      categories: BUILTIN_CATEGORIES.map((c) => ({ ...c })),
      settings: { displayCurrency: 'HKD', rate: 1.08 }
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const st = defaultState();
      if (Array.isArray(parsed.categories) && parsed.categories.length) st.categories = parsed.categories;
      if (Array.isArray(parsed.records)) st.records = parsed.records;
      if (parsed.settings) st.settings = { ...st.settings, ...parsed.settings };
      return st;
    } catch (err) {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function toDateStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function todayStr() {
    return toDateStr(new Date());
  }

  function parseDate(s) {
    const parts = s.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function lastDayOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
  }

  function mondayOf(d) {
    const x = new Date(d);
    const weekday = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - weekday);
    return x;
  }

  function amountHKD(rec) {
    return rec.currency === 'HKD' ? rec.amount : rec.amount * rec.rate;
  }

  function displayAmount(hkd) {
    return state.settings.displayCurrency === 'HKD' ? hkd : hkd / state.settings.rate;
  }

  function fmtMoney(hkd) {
    const v = displayAmount(hkd);
    const sym = state.settings.displayCurrency === 'HKD' ? 'HK$' : '¥';
    return sym + v.toLocaleString('zh-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function compactMoney(hkd) {
    if (!hkd) return '0';
    const v = displayAmount(hkd);
    const sym = state.settings.displayCurrency === 'HKD' ? 'HK$' : '¥';
    if (v >= 10000) return sym + (v / 10000).toFixed(1) + '万';
    return sym + Math.round(v).toLocaleString('zh-HK');
  }

  function fmtDateCN(s) {
    const d = parseDate(s);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 · ' + weekdays[d.getDay()];
  }

  function fmtDateTime(iso) {
    const d = new Date(iso);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  function categoryOf(id) {
    return state.categories.find((c) => c.id === id) || { id: '?', name: '未知', emoji: '❓' };
  }

  function colorOf(catId) {
    const idx = state.categories.findIndex((c) => c.id === catId);
    return PALETTE[(idx >= 0 ? idx : 0) % PALETTE.length];
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function emptyHtml(emoji, text) {
    return '<div class="empty"><div class="empty-emoji">' + emoji + '</div><p>' + esc(text) + '</p></div>';
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.hidden = true; }, 250);
    }, 1800);
  }

  function syncSeg(container, val) {
    $$('.seg-btn', container).forEach((b) => b.classList.toggle('active', b.dataset.cur === val));
  }

  function renderAll() {
    renderHome();
    renderHistory();
    renderStats();
    renderSettings();
  }

  function showView(name) {
    $$('.view').forEach((v) => { v.hidden = v.id !== 'view-' + name; });
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === name));
    const titles = { home: '记一笔', history: '明细', stats: '统计', settings: '我的' };
    $('#pageTitle').textContent = titles[name] || '';
    window.scrollTo(0, 0);
    if (name === 'home') renderHome();
    if (name === 'history') renderHistory();
    if (name === 'stats') renderStats();
    if (name === 'settings') renderSettings();
  }

  function recMoneyHtml(rec) {
    const own = rec.currency === 'HKD' ? 'HK$' : '¥';
    const conv = rec.currency !== state.settings.displayCurrency
      ? '<div class="rec-conv">≈ ' + fmtMoney(amountHKD(rec)) + '</div>'
      : '';
    return '<div class="rec-amount">' + own + Number(rec.amount).toFixed(2) + conv + '</div>';
  }

  function renderHome() {
    const dateInput = $('#dateInput');
    if (!dateInput.value) dateInput.value = todayStr();
    syncSeg($('#addCurrencySeg'), addCurrency);
    syncAmountSymbol();
    renderCategoryChips();
    renderRecent();
  }

  function syncAmountSymbol() {
    $('#amountSymbol').textContent = addCurrency === 'HKD' ? 'HK$' : '¥';
  }

  function renderCategoryChips() {
    if (!state.categories.some((c) => c.id === selectedCategoryId)) {
      selectedCategoryId = state.categories.length ? state.categories[0].id : null;
    }
    $('#categoryChips').innerHTML = state.categories.map((c) =>
      '<button type="button" class="chip ' + (c.id === selectedCategoryId ? 'active' : '') + '" data-id="' + c.id + '">' +
      '<span class="chip-emoji">' + c.emoji + '</span><span>' + esc(c.name) + '</span></button>'
    ).join('');
  }

  function renderRecent() {
    const list = $('#recentList');
    const recs = state.records.slice().sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created).slice(0, 12);
    if (!recs.length) {
      list.innerHTML = emptyHtml('🍜', '还没有记录，记下第一笔吧');
      return;
    }
    list.innerHTML = recs.map((r) => {
      const c = categoryOf(r.category);
      return '<div class="record-row" data-id="' + r.id + '">' +
        '<span class="rec-emoji">' + c.emoji + '</span>' +
        '<div class="rec-main"><div class="rec-cat">' + esc(c.name) + '</div><div class="rec-meta">' + fmtDateCN(r.date) + '</div></div>' +
        recMoneyHtml(r) +
        '</div>';
    }).join('');
  }

  function saveRecord(data, id) {
    const amount = Number(data.amount);
    if (!(amount > 0)) return '请输入大于 0 的金额';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) return '日期无效';
    if (!categoryOf(data.category)) return '请选择分类';
    const existing = id ? state.records.find((r) => r.id === id) : null;
    const rec = {
      id: existing ? existing.id : uid(),
      date: data.date,
      amount: amount,
      currency: data.currency === 'CNY' ? 'CNY' : 'HKD',
      rate: existing && existing.currency === 'CNY' && data.currency === 'CNY' ? existing.rate : state.settings.rate,
      category: data.category,
      note: (data.note || '').trim(),
      created: existing ? existing.created : Date.now()
    };
    if (existing) {
      state.records = state.records.map((r) => (r.id === id ? rec : r));
    } else {
      state.records.push(rec);
    }
    saveState();
    return null;
  }

  function onSaveHome() {
    const err = saveRecord({
      amount: parseFloat($('#amountInput').value),
      currency: addCurrency,
      date: $('#dateInput').value,
      category: selectedCategoryId,
      note: $('#noteInput').value
    }, null);
    if (err) {
      toast(err);
      $('#amountInput').focus();
      return;
    }
    $('#amountInput').value = '';
    $('#noteInput').value = '';
    toast('已保存');
    renderAll();
  }

  function renderHistory() {
    const month = $('#historyMonth').value || todayStr().slice(0, 7);
    const catSel = $('#historyCategory');
    const curSel = $('#historyCurrency');
    const prevCat = catSel.value;
    catSel.innerHTML = '<option value="all">全部分类</option>' + state.categories.map((c) =>
      '<option value="' + c.id + '">' + c.emoji + ' ' + esc(c.name) + '</option>'
    ).join('');
    catSel.value = state.categories.some((c) => c.id === prevCat) ? prevCat : 'all';

    const recs = state.records.filter((r) => {
      if (r.date.slice(0, 7) !== month) return false;
      if (catSel.value !== 'all' && r.category !== catSel.value) return false;
      if (curSel.value !== 'all' && r.currency !== curSel.value) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created);

    const list = $('#historyList');
    if (!recs.length) {
      list.innerHTML = emptyHtml('🔍', '这个月还没有符合条件的记录');
      return;
    }

    let html = '';
    let currentDate = null;
    let dayTotal = 0;
    recs.forEach((r) => {
      if (r.date !== currentDate) {
        if (currentDate !== null) {
          html += '<div class="day-total">当日合计 ' + fmtMoney(dayTotal) + '</div></div>';
        }
        currentDate = r.date;
        dayTotal = 0;
        html += '<div class="day-group"><div class="day-head">' + fmtDateCN(r.date) + '</div>';
      }
      dayTotal += amountHKD(r);
      const c = categoryOf(r.category);
      html += '<div class="record-row" data-id="' + r.id + '">' +
        '<span class="rec-emoji">' + c.emoji + '</span>' +
        '<div class="rec-main"><div class="rec-cat">' + esc(c.name) + (r.note ? '<span class="rec-note">' + esc(r.note) + '</span>' : '') + '</div>' +
        '<div class="rec-meta">' + (r.currency === 'HKD' ? '港币' : '人民币') + '</div></div>' +
        recMoneyHtml(r) +
        '<button type="button" class="row-del" data-del="' + r.id + '" title="删除">🗑️</button>' +
        '</div>';
    });
    html += '<div class="day-total">当日合计 ' + fmtMoney(dayTotal) + '</div></div>';
    list.innerHTML = html;
  }

  function onHistoryClick(e) {
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      if (!confirm('确定删除这条记录？')) return;
      const id = delBtn.dataset.del;
      state.records = state.records.filter((r) => r.id !== id);
      saveState();
      renderAll();
      toast('已删除');
      return;
    }
    const row = e.target.closest('.record-row');
    if (row) openEditModal(row.dataset.id);
  }

  function openEditModal(id) {
    const rec = state.records.find((r) => r.id === id);
    if (!rec) return;
    const body = openModal('编辑记录',
      '<div class="modal-amount">' +
      '<select id="mCurrency">' +
      '<option value="HKD"' + (rec.currency === 'HKD' ? ' selected' : '') + '>HK$ 港币</option>' +
      '<option value="CNY"' + (rec.currency === 'CNY' ? ' selected' : '') + '>¥ 人民币</option>' +
      '</select>' +
      '<input id="mAmount" type="number" step="0.01" min="0" inputmode="decimal" value="' + rec.amount + '" />' +
      '</div>' +
      '<label class="modal-label">分类</label><div class="chips small" id="mChips"></div>' +
      '<label class="modal-label">日期</label><input id="mDate" type="date" value="' + rec.date + '" />' +
      '<label class="modal-label">备注</label><input id="mNote" type="text" maxlength="60" value="' + esc(rec.note) + '" placeholder="可选" />' +
      '<div class="modal-actions">' +
      '<button type="button" class="btn-danger" id="mDelete">删除</button>' +
      '<button type="button" class="btn-primary" id="mSave">保存修改</button>' +
      '</div>'
    );

    let cat = rec.category;
    function renderChips() {
      $('#mChips').innerHTML = state.categories.map((c) =>
        '<button type="button" class="chip ' + (c.id === cat ? 'active' : '') + '" data-id="' + c.id + '">' +
        '<span class="chip-emoji">' + c.emoji + '</span><span>' + esc(c.name) + '</span></button>'
      ).join('');
    }
    renderChips();
    $('#mChips').addEventListener('click', function (e) {
      const b = e.target.closest('.chip');
      if (!b) return;
      cat = b.dataset.id;
      renderChips();
    });
    $('#mSave').addEventListener('click', function () {
      const err = saveRecord({
        amount: parseFloat($('#mAmount').value),
        currency: $('#mCurrency').value,
        date: $('#mDate').value,
        category: cat,
        note: $('#mNote').value
      }, id);
      if (err) {
        toast(err);
        return;
      }
      closeModal();
      renderAll();
      toast('已修改');
    });
    $('#mDelete').addEventListener('click', function () {
      if (!confirm('确定删除这条记录？')) return;
      state.records = state.records.filter((r) => r.id !== id);
      saveState();
      closeModal();
      renderAll();
      toast('已删除');
    });
  }

  function periodRange() {
    const now = new Date();
    const today = todayStr();
    let from;
    let to = today;
    switch (statsPeriod) {
      case 'week':
        from = toDateStr(mondayOf(now));
        break;
      case 'month':
        from = today.slice(0, 8) + '01';
        to = toDateStr(lastDayOfMonth(now));
        break;
      case 'lastMonth': {
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        from = toDateStr(first);
        to = toDateStr(lastDayOfMonth(first));
        break;
      }
      case '3months':
        from = toDateStr(new Date(now.getFullYear(), now.getMonth() - 2, 1));
        break;
      case '6months':
        from = toDateStr(new Date(now.getFullYear(), now.getMonth() - 5, 1));
        break;
      case 'custom':
        from = $('#rangeStart').value || today;
        to = $('#rangeEnd').value || today;
        if (from > to) {
          const tmp = from;
          from = to;
          to = tmp;
        }
        break;
      default:
        from = today.slice(0, 8) + '01';
    }
    return { from: from, to: to };
  }

  function prevPeriod(range) {
    const days = Math.round((parseDate(range.to) - parseDate(range.from)) / 86400000) + 1;
    return {
      from: toDateStr(addDays(parseDate(range.from), -days)),
      to: toDateStr(addDays(parseDate(range.from), -1))
    };
  }

  function inRange(rec, range) {
    return rec.date >= range.from && rec.date <= range.to;
  }

  function renderStats() {
    const range = periodRange();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const recs = state.records.filter((r) => inRange(r, range));
    const total = recs.reduce((s, r) => s + amountHKD(r), 0);
    const count = recs.length;
    const start = parseDate(range.from);
    const end = new Date(Math.min(parseDate(range.to).getTime(), today.getTime()));
    const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
    const daily = total / days;

    let maxRec = null;
    recs.forEach((r) => {
      const v = amountHKD(r);
      if (!maxRec || v > maxRec.value) maxRec = { rec: r, value: v };
    });

    $('#kpiTotal').textContent = fmtMoney(total);
    $('#kpiDaily').textContent = fmtMoney(daily);
    $('#kpiCount').textContent = String(count);
    $('#kpiMax').textContent = maxRec ? fmtMoney(maxRec.value) : fmtMoney(0);
    $('#kpiMaxSub').textContent = maxRec
      ? fmtDateCN(maxRec.rec.date) + ' · ' + categoryOf(maxRec.rec.category).name
      : '—';

    const prev = prevPeriod(range);
    const prevTotal = state.records.filter((r) => inRange(r, prev)).reduce((s, r) => s + amountHKD(r), 0);
    let trendText = '上期无数据';
    if (prevTotal > 0) {
      const pct = (total - prevTotal) / prevTotal * 100;
      trendText = '较上期 ' + (pct >= 0 ? '↑' : '↓') + ' ' + Math.abs(pct).toFixed(1) + '%';
    }
    $('#kpiTrend').textContent = trendText;

    const catTotals = new Map();
    recs.forEach((r) => catTotals.set(r.category, (catTotals.get(r.category) || 0) + amountHKD(r)));
    const sorted = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]);
    renderDonut(sorted, total);
    renderCatRank(sorted, total);
    renderMonthTrend();
    renderWeekday(recs);
  }

  function renderDonut(entries, total) {
    const box = $('#donutBox');
    if (!entries.length || total <= 0) {
      box.innerHTML = emptyHtml('📊', '该时段暂无记录');
      return;
    }
    let items = entries.map((entry) => ({
      name: categoryOf(entry[0]).name,
      value: entry[1],
      color: colorOf(entry[0])
    }));
    if (items.length > 7) {
      const top = items.slice(0, 6);
      const restValue = items.slice(6).reduce((s, it) => s + it.value, 0);
      top.push({ name: '其他', value: restValue, color: PALETTE[6] });
      items = top;
    }
    const size = 224;
    const radius = 78;
    const stroke = 30;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    let circles = '';
    items.forEach((item) => {
      const frac = item.value / total;
      const len = Math.max(frac * circumference - 1.2, 0.5);
      circles += '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="' + item.color + '" stroke-width="' + stroke + '" stroke-dasharray="' + len + ' ' + (circumference - len) + '" stroke-dashoffset="' + (-offset) + '" transform="rotate(-90 ' + center + ' ' + center + ')"></circle>';
      offset += len + 1.2;
    });
    box.innerHTML =
      '<svg viewBox="0 0 ' + size + ' ' + size + '" class="donut">' +
      '<circle cx="' + center + '" cy="' + center + '" r="' + radius + '" fill="none" stroke="#eef2f1" stroke-width="' + stroke + '"></circle>' +
      circles +
      '<text x="' + center + '" y="' + (center - 2) + '" text-anchor="middle" class="donut-total">' + compactMoney(total) + '</text>' +
      '<text x="' + center + '" y="' + (center + 22) + '" text-anchor="middle" class="donut-sub">总支出</text>' +
      '</svg>';
  }

  function renderCatRank(entries, total) {
    const box = $('#catRank');
    if (!entries.length || total <= 0) {
      box.innerHTML = '';
      return;
    }
    box.innerHTML = entries.map((entry) => {
      const c = categoryOf(entry[0]);
      const pct = entry[1] / total * 100;
      return '<div class="rank-row">' +
        '<span class="rank-emoji">' + c.emoji + '</span>' +
        '<div class="rank-main"><div class="rank-head"><span class="rank-name">' + esc(c.name) + '</span><span class="rank-pct">' + pct.toFixed(1) + '%</span></div>' +
        '<div class="rank-track"><div class="rank-fill" style="width:' + Math.max(pct, 1.5).toFixed(1) + '%;background:' + colorOf(entry[0]) + '"></div></div></div>' +
        '<div class="rank-amt">' + fmtMoney(entry[1]) + '</div>' +
        '</div>';
    }).join('');
  }

  function renderMonthTrend() {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: toDateStr(d).slice(0, 7), label: (d.getMonth() + 1) + '月' });
    }
    const sums = months.map((m) => ({
      label: m.label,
      total: state.records.filter((r) => r.date.slice(0, 7) === m.key).reduce((s, r) => s + amountHKD(r), 0)
    }));
    const max = Math.max.apply(null, sums.map((s) => s.total).concat([1]));
    $('#monthBars').innerHTML = sums.map((s) =>
      '<div class="vbar" title="' + fmtMoney(s.total) + '">' +
      '<div class="vbar-val">' + compactMoney(s.total) + '</div>' +
      '<div class="vbar-track"><div class="vbar-fill" style="height:' + (s.total > 0 ? Math.max(s.total / max * 100, 8) : 0) + '%"></div></div>' +
      '<div class="vbar-label">' + s.label + '</div>' +
      '</div>'
    ).join('');
  }

  function renderWeekday(recs) {
    const labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const sums = new Array(7).fill(0);
    recs.forEach((r) => {
      sums[(parseDate(r.date).getDay() + 6) % 7] += amountHKD(r);
    });
    const max = Math.max.apply(null, sums.concat([1]));
    $('#weekdayBars').innerHTML = labels.map((label, i) =>
      '<div class="hbar">' +
      '<span class="hbar-label">' + label + '</span>' +
      '<div class="hbar-track"><div class="hbar-fill" style="width:' + (sums[i] / max * 100) + '%"></div></div>' +
      '<span class="hbar-val">' + compactMoney(sums[i]) + '</span>' +
      '</div>'
    ).join('');
  }

  function renderSettings() {
    syncSeg($('#displayCurSeg'), state.settings.displayCurrency);
    $('#rateInput').value = String(state.settings.rate);
    updateRateStatus();
    renderCategoryManager();
    $('#dataInfo').textContent = '共 ' + state.records.length + ' 笔记录。数据保存在本机浏览器中，清除浏览器数据会丢失，建议定期导出备份。';
  }

  function updateRateStatus() {
    const el = $('#rateStatus');
    if (!el) return;
    const t = state.settings.rateUpdatedAt;
    el.textContent = t ? '上次更新 ' + fmtDateTime(t) : '尚未联网更新（当前为默认值）';
  }

  function renderCategoryManager() {
    const box = $('#categoryManager');
    box.innerHTML = state.categories.map((c) => {
      const n = state.records.filter((r) => r.category === c.id).length;
      return '<div class="cat-row">' +
        '<span class="cat-emoji">' + c.emoji + '</span>' +
        '<div class="cat-main"><div class="cat-name">' + esc(c.name) + '</div><div class="cat-count">' + n + ' 笔记录</div></div>' +
        '<button type="button" class="icon-btn" data-act="edit" data-id="' + c.id + '" title="编辑">✏️</button>' +
        '<button type="button" class="icon-btn" data-act="del" data-id="' + c.id + '" title="删除">🗑️</button>' +
        '</div>';
    }).join('');
  }

  function onCategoryManagerClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    if (btn.dataset.act === 'edit') openCategoryModal(id);
    else deleteCategory(id);
  }

  function deleteCategory(id) {
    const c = categoryOf(id);
    if (c.id === 'other') {
      toast('「其他」分类不可删除');
      return;
    }
    const n = state.records.filter((r) => r.category === id).length;
    const msg = n
      ? '「' + c.name + '」有 ' + n + ' 笔记录，删除后这些记录会归入「其他」。确定删除？'
      : '确定删除分类「' + c.name + '」？';
    if (!confirm(msg)) return;
    state.categories = state.categories.filter((x) => x.id !== id);
    state.records.forEach((r) => {
      if (r.category === id) r.category = 'other';
    });
    saveState();
    renderAll();
    toast('已删除');
  }

  function openCategoryModal(id) {
    const c = id ? categoryOf(id) : null;
    const body = openModal(c ? '编辑分类' : '新增分类',
      '<label class="modal-label">名称</label>' +
      '<input id="cName" type="text" maxlength="8" value="' + (c ? esc(c.name) : '') + '" placeholder="如：护肤品" />' +
      '<label class="modal-label">图标</label><div class="emoji-grid" id="emojiGrid"></div>' +
      '<button type="button" class="btn-primary" id="cSave">' + (c ? '保存修改' : '添加') + '</button>'
    );

    let emoji = c ? c.emoji : EMOJI_CHOICES[0];
    function renderGrid() {
      $('#emojiGrid').innerHTML = EMOJI_CHOICES.map((e) =>
        '<button type="button" class="emoji-btn ' + (e === emoji ? 'active' : '') + '" data-e="' + e + '">' + e + '</button>'
      ).join('');
    }
    renderGrid();
    $('#emojiGrid').addEventListener('click', function (e) {
      const b = e.target.closest('.emoji-btn');
      if (!b) return;
      emoji = b.dataset.e;
      renderGrid();
    });
    $('#cSave').addEventListener('click', function () {
      const name = $('#cName').value.trim();
      if (!name) {
        toast('请输入名称');
        return;
      }
      if (!emoji) {
        toast('请选择图标');
        return;
      }
      if (state.categories.some((x) => x.id !== id && x.name === name)) {
        toast('已有同名分类');
        return;
      }
      if (c) {
        const i = state.categories.findIndex((x) => x.id === id);
        state.categories[i] = { ...state.categories[i], name: name, emoji: emoji };
      } else {
        state.categories.push({ id: uid(), name: name, emoji: emoji });
      }
      saveState();
      closeModal();
      renderAll();
      toast('已保存');
    });
  }

  function openModal(title, bodyHtml) {
    const root = $('#modalRoot');
    root.innerHTML =
      '<div class="overlay"><div class="modal">' +
      '<div class="modal-head"><h3>' + esc(title) + '</h3><button type="button" class="icon-btn" data-close>✕</button></div>' +
      '<div class="modal-body">' + bodyHtml + '</div>' +
      '</div></div>';
    root.hidden = false;
    root.querySelector('[data-close]').addEventListener('click', closeModal);
    root.querySelector('.overlay').addEventListener('click', function (e) {
      if (e.target.classList.contains('overlay')) closeModal();
    });
    return root.querySelector('.modal-body');
  }

  function closeModal() {
    const root = $('#modalRoot');
    root.hidden = true;
    root.innerHTML = '';
  }

  function onRateSave() {
    const v = parseFloat($('#rateInput').value);
    if (!(v > 0)) {
      toast('请输入大于 0 的汇率');
      $('#rateInput').value = String(state.settings.rate);
      return;
    }
    state.settings.rate = v;
    saveState();
    renderAll();
    toast('汇率已更新');
  }

  async function fetchRate(silent) {
    const btn = $('#fetchRateBtn');
    if (btn) btn.disabled = true;
    try {
      const controller = new AbortController();
      const timer = setTimeout(function () { controller.abort(); }, 10000);
      const resp = await fetch('https://open.er-api.com/v6/latest/CNY', { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!resp.ok) throw new Error('bad status');
      const data = await resp.json();
      const hkd = Number(data && data.rates && data.rates.HKD);
      if (!(hkd > 0)) throw new Error('bad rate');
      state.settings.rate = hkd;
      state.settings.rateUpdatedAt = new Date().toISOString();
      saveState();
      renderAll();
      if (!silent) toast('汇率已更新：1 CNY = ' + hkd.toFixed(4) + ' HKD');
    } catch (err) {
      if (!silent) toast('联网刷新失败，请手动输入');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function exportData() {
    const payload = { app: 'hkledger', version: 1, exportedAt: new Date().toISOString(), data: state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '香江小账本备份-' + todayStr() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('已导出备份');
  }

  function importData() {
    const file = $('#importFile').files[0];
    $('#importFile').value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const obj = JSON.parse(reader.result);
        const data = obj && obj.data ? obj.data : obj;
        if (!data || !Array.isArray(data.records) || !Array.isArray(data.categories)) {
          toast('文件格式不正确');
          return;
        }
        if (!confirm('将用备份中的 ' + data.records.length + ' 笔记录替换当前数据，确定导入？')) return;
        state = defaultState();
        state.records = data.records;
        if (data.categories.length) state.categories = data.categories;
        if (data.settings) state.settings = { ...state.settings, ...data.settings };
        if (!state.categories.some((c) => c.id === 'other')) {
          state.categories.push({ id: 'other', name: '其他', emoji: '📦' });
        }
        saveState();
        renderAll();
        toast('导入成功');
      } catch (err) {
        toast('文件解析失败');
      }
    };
    reader.readAsText(file);
  }

  function clearData() {
    if (!confirm('确定清空全部数据？此操作不可恢复。')) return;
    if (!confirm('再次确认：所有记录、分类和设置都会被删除。')) return;
    state = defaultState();
    saveState();
    renderAll();
    toast('已清空');
  }

  async function onInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice && choice.outcome === 'accepted') toast('安装中…');
    deferredInstallPrompt = null;
    $('#installBtn').hidden = true;
  }

  function init() {
    $('#historyMonth').value = todayStr().slice(0, 7);

    $$('.tab').forEach((b) => b.addEventListener('click', function () { showView(b.dataset.view); }));
    $('#gotoHistory').addEventListener('click', function () { showView('history'); });

    $('#saveBtn').addEventListener('click', onSaveHome);
    $('#addCurrencySeg').addEventListener('click', function (e) {
      const b = e.target.closest('[data-cur]');
      if (!b) return;
      addCurrency = b.dataset.cur;
      syncSeg($('#addCurrencySeg'), addCurrency);
      syncAmountSymbol();
    });
    $('#categoryChips').addEventListener('click', function (e) {
      const b = e.target.closest('.chip');
      if (!b) return;
      selectedCategoryId = b.dataset.id;
      renderCategoryChips();
    });
    $('#recentList').addEventListener('click', function (e) {
      const row = e.target.closest('.record-row');
      if (row) openEditModal(row.dataset.id);
    });

    $('#historyMonth').addEventListener('change', renderHistory);
    $('#historyCategory').addEventListener('change', renderHistory);
    $('#historyCurrency').addEventListener('change', renderHistory);
    $('#historyList').addEventListener('click', onHistoryClick);

    $('#periodRow').addEventListener('click', function (e) {
      const b = e.target.closest('[data-period]');
      if (!b) return;
      statsPeriod = b.dataset.period;
      $('#customRange').hidden = statsPeriod !== 'custom';
      $$('#periodRow button').forEach((x) => x.classList.toggle('active', x === b));
      renderStats();
    });
    $('#rangeStart').addEventListener('change', renderStats);
    $('#rangeEnd').addEventListener('change', renderStats);

    $('#displayCurSeg').addEventListener('click', function (e) {
      const b = e.target.closest('[data-cur]');
      if (!b) return;
      state.settings.displayCurrency = b.dataset.cur;
      saveState();
      renderAll();
    });
    $('#rateInput').addEventListener('change', onRateSave);
    $('#fetchRateBtn').addEventListener('click', function () { fetchRate(false); });
    $('#addCategoryBtn').addEventListener('click', function () { openCategoryModal(null); });
    $('#categoryManager').addEventListener('click', onCategoryManagerClick);
    $('#exportBtn').addEventListener('click', exportData);
    $('#importBtn').addEventListener('click', function () { $('#importFile').click(); });
    $('#importFile').addEventListener('change', importData);
    $('#clearBtn').addEventListener('click', clearData);
    $('#installBtn').addEventListener('click', onInstall);

    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      deferredInstallPrompt = e;
      $('#installBtn').hidden = false;
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function () {});
      });
    }

    window.addEventListener('online', function () { fetchRate(true); });

    showView('home');
    if (navigator.onLine) fetchRate(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
