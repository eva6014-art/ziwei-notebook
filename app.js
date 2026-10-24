(() => {
'use strict';
if (!window.iztro) {
  document.querySelector('main').innerHTML = '<div class="empty-state"><h2>排盤程式沒有載入</h2><p>請確認 iztro.min.js 和 index.html 放在同一個資料夾，然後重新整理。</p></div>';
  return;
}
const { astro } = iztro;

/* ---------- 常數 ---------- */
const TIMES = ['早子時 00:00–00:59','丑時 01–03','寅時 03–05','卯時 05–07','辰時 07–09','巳時 09–11','午時 11–13','未時 13–15','申時 15–17','酉時 17–19','戌時 19–21','亥時 21–23','晚子時 23:00–23:59'];
const PALACES = ['命宮','兄弟','夫妻','子女','財帛','疾厄','遷移','僕役','官祿','田宅','福德','父母'];
const GROUPS = [
  ['十四主星', ['紫微','天機','太陽','武曲','天同','廉貞','天府','太陰','貪狼','巨門','天相','天梁','七殺','破軍']],
  ['六煞', ['擎羊','陀羅','火星','鈴星','地空','地劫']],
  ['六吉', ['左輔','右弼','文昌','文曲','天魁','天鉞']],
  ['祿馬', ['祿存','天馬']],
  ['生年四化', ['化祿','化權','化科','化忌']],
];
// 盤面位置：地支 → [row, col]
const POS = {'巳':[1,1],'午':[1,2],'未':[1,3],'申':[1,4],'辰':[2,1],'酉':[2,4],'卯':[3,1],'戌':[3,4],'寅':[4,1],'丑':[4,2],'子':[4,3],'亥':[4,4]};

/* ---------- 儲存 ---------- */
const KEY_P = 'ziwei.people.v1', KEY_N = 'ziwei.notes.v1', KEY_UI = 'ziwei.ui.v1', KEY_E = 'ziwei.events.v1', KEY_M = 'ziwei.meta.v1', KEY_S = 'ziwei.settings.v1';
const KEY_PN = 'ziwei.pnotes.v1';
const KEY_C = 'ziwei.cards.v1';
const KEY_A = 'ziwei.anns.v1';
const DATA_KEYS = [KEY_P, KEY_N, KEY_E, KEY_S, KEY_PN, KEY_C, KEY_A];
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    if (DATA_KEYS.includes(k)) { meta.lastChange = Date.now(); localStorage.setItem(KEY_M, JSON.stringify(meta)); if (bannerReady) renderBackupBanner(); }
  } catch { toast('無法儲存到瀏覽器，請記得匯出備份'); }
};
let meta = load(KEY_M, {});
let bannerReady = false;
let people = load(KEY_P, []);
let notes = load(KEY_N, {});
let events = load(KEY_E, {});
let pnotes = load(KEY_PN, {});
/* ---------- 星曜卡：原創圖示＋課程關鍵字（關鍵字可自行修改） ---------- */
const CARD_GROUPS = [
  ['北斗星系','north',[['紫微','👑','皇帝'],['貪狼','🍷','慾望'],['巨門','🌑','暗星'],['廉貞','📏','廉潔、規則'],['武曲','💰','錢、武力'],['破軍','💥','破壞']]],
  ['南斗星系','south',[['天府','🏯','王爺'],['天梁','📖','教育'],['天機','⚙️','思考'],['天同','🎶','享樂'],['天相','🔏','宰相'],['七殺','🗡️','勇往直前']]],
  ['中天星系','mid',[['太陽','☀️','太陽'],['太陰','🌙','月亮']]],
  ['六吉星','good',[['文昌','✍️','寫字'],['文曲','🎼','藝術、才華'],['天魁','👴','男性長輩'],['天鉞','👵','女性長輩'],['左輔','🙋‍♂️','男性貴人'],['右弼','🙋‍♀️','女性貴人']]],
  ['四煞星','bad',[['火星','🌋','瞬間爆炸'],['鈴星','💣','壓抑後爆炸'],['擎羊','🔪','衝動、像刀一樣'],['陀羅','⛓️','拖延、折磨']]],
  ['空星','void',[['地空','🌫️','忽然斷掉消失'],['地劫','🌊','忽然被搶走']]],
  ['雜曜','misc',[['紅鸞','💍','正緣'],['天喜','🎉','喜事'],['天姚','🌸','風流、野桃花'],['祿存','🪙','多一個'],['天馬','🐎','奔波'],['天刑','🚨','官非']]],
];
const CARD = {};
CARD_GROUPS.forEach(([g, cls, list]) => list.forEach(([n, icon, kw]) => { CARD[n] = { g, cls, icon, kw }; }));
let cards = load(KEY_C, {});   // { 星名: { kw:自訂關鍵字, img:自己的圖片, ok:記得次數, miss:不熟次數 } }
const cardKw = n => (cards[n] && cards[n].kw != null) ? cards[n].kw : (CARD[n] ? CARD[n].kw : '');
/* ---------- 註解：星曜（五行、化氣）與宮位，皆可自行修改 ---------- */
// 預設採常見說法；各派略有差異，標「一說」處可依課程改寫
const STAR_ANN = {
  紫微:'陰土，化氣為尊（一說貴）', 天機:'陰木，化氣為善', 太陽:'陽火，化氣為貴', 武曲:'陰金，化氣為財', 天同:'陽水，化氣為福', 廉貞:'陰火，化氣為囚',
  天府:'陽土，化氣為令（一說權福）', 太陰:'陰水，化氣為富', 貪狼:'陽木、陽水，化氣為桃花', 巨門:'陰水，化氣為暗', 天相:'陽水，化氣為印', 天梁:'陽土，化氣為蔭',
  七殺:'陽金、陽火，化氣為將（一說殺）', 破軍:'陰水，化氣為耗',
  文昌:'陽金，化氣為科甲', 文曲:'陰水，化氣為科甲', 天魁:'陽火，化氣為陽貴', 天鉞:'陰火，化氣為陰貴', 左輔:'陽土，化氣為陽助', 右弼:'陰水，化氣為陰助',
  火星:'陽火，化氣為殺', 鈴星:'陰火，化氣為耗', 擎羊:'陽金、陽火，化氣為刑', 陀羅:'陰金，化氣為忌', 地空:'陰火，化氣為空亡', 地劫:'陽火，化氣為劫殺',
  祿存:'陰土，化氣為財祿', 天馬:'陽火', 紅鸞:'陰水', 天喜:'陽水', 天姚:'陰水', 天刑:'陽火',
};
let anns = load(KEY_A, {});   // { '星:武曲': 註解, '宮:命宮': 註解 }
const starAnn = n => anns['星:' + n] != null ? anns['星:' + n] : (STAR_ANN[n] || '');
const palAnn = n => anns['宮:' + n] != null ? anns['宮:' + n] : (PAL_HINT[n] || '');
// 宮位的固定結構：依十二宮排列順序，對宮相隔 6、三合相隔 4 與 8
const PAL_RING = ['命宮','父母','福德','田宅','官祿','僕役','遷移','疾厄','財帛','子女','夫妻','兄弟'];
function palStruct(n) {
  const i = PAL_RING.indexOf(n); if (i < 0) return '';
  const at = d => palName(PAL_RING[(i + d) % 12]);
  return `對宮${at(6)}・三合${at(4)}、${at(8)}`;
}   // { 朋友id: { _summary: 整體印象, 命宮: 實際狀況, ... } }
const DEFAULT_SETTINGS = { geng:'陰同', wu:'右弼', ren:'左輔', dayDivide:'forward', yearDivide:'normal', fixLeap:true, algorithm:'default' };
let settings = Object.assign({}, DEFAULT_SETTINGS, load(KEY_S, {}));
let ui = Object.assign({ view:'compare', mode:'star', star:'紫微', palace:'命宮', person:null }, load(KEY_UI, {}));
const saveUI = () => save(KEY_UI, ui);

/* ---------- 出生地與真太陽時 ---------- */
const PLACES = [
  ['台北',121.56,8],['新北',121.46,8],['基隆',121.74,8],['桃園',121.30,8],['新竹',120.97,8],['苗栗',120.82,8],
  ['台中',120.68,8],['彰化',120.54,8],['南投',120.69,8],['雲林',120.53,8],['嘉義',120.45,8],['台南',120.21,8],
  ['高雄',120.30,8],['屏東',120.49,8],['宜蘭',121.75,8],['花蓮',121.60,8],['台東',121.14,8],['澎湖',119.58,8],
  ['金門',118.32,8],['馬祖',119.95,8],['香港',114.17,8],['澳門',113.54,8],['北京',116.40,8],['上海',121.47,8],
  ['廣州',113.26,8],['深圳',114.06,8],['吉隆坡',101.69,8],['新加坡',103.82,8],['東京',139.69,9],['首爾',126.98,9],
];
function placeOf(p) {
  if (p.place === '其他') return { lon: +p.lon, tz: +p.tz };
  const f = PLACES.find(x => x[0] === p.place) || PLACES[0];
  return { lon: f[1], tz: f[2] };
}
const pad = n => String(n).padStart(2, '0');
// 均時差（分鐘），NOAA 近似公式
function eqTime(y, m, d) {
  const doy = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 864e5);
  const g = 2 * Math.PI / 365 * doy;
  return 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
}
const hourToIndex = h => h === 0 ? 0 : h === 23 ? 12 : Math.floor((h + 1) / 2);
// 國曆日期 + 鐘錶時間 → 真太陽時
function trueSolar(y, m, d, clock, p) {
  const [hh, mm] = clock.split(':').map(Number);
  const { lon, tz } = placeOf(p);
  const offset = (p.dst ? -60 : 0) + (lon - tz * 15) * 4 + eqTime(y, m, d);
  const t = new Date(Date.UTC(y, m - 1, d, hh, mm) + Math.round(offset) * 6e4);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), h: t.getUTCHours(), mi: t.getUTCMinutes(), offset };
}
// 算出實際拿去排盤的國曆日期與時辰
function birthOf(p) {
  if (p.timeMode !== 'clock') return { mode:'hour' };
  let y = p.y, m = p.m, d = p.d;
  if (p.calendar === 'lunar') {
    const s = astro.byLunar(`${y}-${m}-${d}`, 0, p.gender, !!p.leap, settings.fixLeap, 'zh-TW').solarDate.split('-').map(Number);
    [y, m, d] = s;
  }
  const t = trueSolar(y, m, d, p.clock, p);
  return { mode:'clock', solar:`${t.y}-${t.m}-${t.d}`, time: hourToIndex(t.h), label:`${t.y}-${pad(t.m)}-${pad(t.d)} ${pad(t.h)}:${pad(t.mi)}` };
}

/* ---------- 宮干四化（飛化） ---------- */
const SIHUA = {甲:['廉貞','破軍','武曲','太陽'],乙:['天機','天梁','紫微','太陰'],丙:['天同','天機','文昌','廉貞'],丁:['太陰','天同','天機','巨門'],戊:['貪狼','太陰','右弼','天機'],己:['武曲','貪狼','天梁','文曲'],庚:['太陽','武曲','太陰','天同'],辛:['巨門','太陽','文曲','文昌'],壬:['天梁','紫微','左輔','武曲'],癸:['破軍','巨門','太陰','貪狼']};
const HN = ['祿','權','科','忌'];
const SIHUA_BASE = JSON.parse(JSON.stringify(SIHUA));
function applySettings() {
  const geng = settings.geng === '同陰' ? ['太陽','武曲','天同','太陰'] : ['太陽','武曲','太陰','天同'];
  const wu = ['貪狼','太陰', settings.wu === '太陽' ? '太陽' : '右弼', '天機'];
  const ren = ['天梁','紫微', settings.ren === '天府' ? '天府' : '左輔', '武曲'];
  Object.assign(SIHUA, SIHUA_BASE, { 庚: geng, 戊: wu, 壬: ren });
  astro.config({
    mutagens: { 庚: geng, 戊: wu, 壬: ren },
    dayDivide: settings.dayDivide, yearDivide: settings.yearDivide, horoscopeDivide: settings.yearDivide,
    algorithm: settings.algorithm,
  });
  cache.clear(); todayLunar = null;
}
const BR = '子丑寅卯辰巳午未申酉戌亥';
// 回傳 { 地支: { 星名: [{dir:'out'|'in', hua}] } }
function flyMarks(a) {
  const byBr = Object.fromEntries(a.palaces.map(p => [p.earthlyBranch, p]));
  const marks = {};
  const add = (br, star, m) => (((marks[br] ||= {})[star]) ||= []).push(m);
  a.palaces.forEach(pal => {
    const opp = byBr[BR[(BR.indexOf(pal.earthlyBranch) + 6) % 12]];
    (SIHUA[pal.heavenlyStem] || []).forEach((star, i) => {
      if (allStars(pal).some(s => s.name === star)) add(pal.earthlyBranch, star, { dir:'out', hua:HN[i] });
      if (opp && allStars(opp).some(s => s.name === star)) add(opp.earthlyBranch, star, { dir:'in', hua:HN[i] });
    });
  });
  return marks;
}
const godName = n => n === '官府' ? '官符' : n;
/* ---------- 運限（大限・流年・流月） ---------- */
const LAYERS = ['decadal','age','yearly','monthly','daily','hourly'];
const LNAME = { decadal:'大限', age:'小限', yearly:'流年', monthly:'流月', daily:'流日', hourly:'流時' };
const LPFX = { decadal:'大', age:'小', yearly:'年', monthly:'月', daily:'日', hourly:'時' };
const DEFAULT_LAYERS = { decadal:true, age:false, yearly:true, monthly:false, daily:false, hourly:false };
const DAYS = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十'];
const HOURS = ['早子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥','晚子'];
const ABBR = { 命宮:'命', 兄弟:'兄', 夫妻:'夫', 子女:'子', 財帛:'財', 疾厄:'疾', 遷移:'遷', 僕役:'友', 交友:'友', 官祿:'官', 田宅:'田', 福德:'福', 父母:'父' };
const MONTHS = ['正月','二月','三月','四月','五月','六月','七月','八月','九月','十月','冬月','臘月'];
const yearGZ = y => '甲乙丙丁戊己庚辛壬癸'[((y - 4) % 10 + 10) % 10] + BR[((y - 4) % 12 + 12) % 12];
let todayLunar = null;
function getTodayLunar() {
  if (todayLunar) return todayLunar;
  const d = new Date();
  const r = astro.bySolar(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, 6, '女', true, 'zh-TW').rawDates.lunarDate;
  return (todayLunar = { y: r.lunarYear, m: r.lunarMonth, d: r.lunarDay, t: hourToIndex(d.getHours()) });
}
function horOf(a) {
  if (!ui.horOn) return null;
  const t = getTodayLunar();
  const by = a.rawDates.lunarDate.lunarYear;
  const y = Math.max(ui.horY || t.y, by), m = ui.horM || t.m;
  let d = ui.horD || t.d; const ti = ui.horT ?? t.t;
  let sd = null;
  while (d >= 1 && !sd) { try { sd = astro.byLunar(`${y}-${m}-${d}`, ti, '女', false, true, 'zh-TW').solarDate; } catch { d--; } }
  if (!sd) return null;
  try {
    const h = a.horoscope(sd, ti);
    h._y = y; h._m = m; h._d = d; h._t = ti;
    return h;
  } catch (e) { console.error(e); return null; }
}
const EV_CATS = ['感情婚姻','工作事業','財務','健康','學業考試','家庭親人','搬家置產','人際','其他'];
// 事件發生時的運限：月份不確定時取國曆 7 月 1 日（必定落在該農曆年）
function eventInfo(a, ev) {
  try {
    const sd = `${ev.y}-${ev.m || 7}-${ev.m ? 15 : 1}`;
    const lun = astro.bySolar(sd, 6, '女', true, 'zh-TW').rawDates.lunarDate;
    if (lun.lunarYear < a.rawDates.lunarDate.lunarYear) return null;
    const h = a.horoscope(sd, 6);
    const natal = idx => a.palaces.find(p => p.index === idx);
    const yhua = h.yearly.mutagen.map((star, i) => { const p = palOfStar(a, star); return { hua:HN[i], star, natal:p, yname:h.yearly.palaceNames[p.index] }; });
    return { h, lun, age: lun.lunarYear - a.rawDates.lunarDate.lunarYear + 1, dec: natal(h.decadal.index), yr: natal(h.yearly.index), yhua };
  } catch (e) { console.error(e); return null; }
}
function eventsPanel(p, a) {
  const list = (events[p.id] || []).slice().sort((x, y) => x.y - y.y || (x.m || 0) - (y.m || 0));
  const thisY = new Date().getFullYear();
  const rows = list.map(ev => {
    const info = eventInfo(a, ev);
    const an = info ? `虛歲 ${info.age}・大限 ${info.h.decadal.heavenlyStem}${info.h.decadal.earthlyBranch} 命宮在本命${palName(info.dec.name)}・流年 ${yearGZ(info.lun.lunarYear)} 命宮在本命${palName(info.yr.name)}
        <div class="ev-hua">${info.yhua.map(x => `<span><span class="hua ${x.hua}">${x.hua}</span> ${x.star} → 本命${palName(x.natal.name)}<span class="with">（流年${palName(x.yname)}）</span></span>`).join('')}</div>` : '<span class="err">這個時間早於出生年</span>';
    return `<div class="ev"><div class="ev-h"><b>${ev.y} 年${ev.m ? ` ${ev.m} 月` : ''}</b><span class="evcat">${esc(ev.cat)}</span><span class="ev-t">${esc(ev.text)}</span>
      <span class="ev-acts">${info ? `<button class="btn" data-ev-view="${esc(ev.id)}">在盤上看</button>` : ''}<button class="btn danger" data-ev-del="${esc(ev.id)}">刪除</button></span></div>
      <div class="ev-a">${an}</div></div>`;
  }).join('');
  return `<section class="events"><h3>事件紀錄 <small>${list.length} 筆</small></h3>
    <p class="with" style="margin:0 0 8px;font-size:13px">記下這位朋友實際發生的事，網頁會算出當年的大限、流年與流年四化落點。月份不確定可以留空。</p>
    <form class="evform" id="evForm" autocomplete="off">
      <input type="number" id="evY" min="1900" max="2100" placeholder="${thisY}" required aria-label="年（國曆）">
      <select id="evM" aria-label="月（國曆）"><option value="">月份不確定</option>${Array.from({ length:12 }, (_, i) => `<option value="${i + 1}">${i + 1} 月</option>`).join('')}</select>
      <select id="evCat" aria-label="類別">${EV_CATS.map(c => `<option>${c}</option>`).join('')}</select>
      <input type="text" id="evText" maxlength="60" placeholder="例如：結婚、換工作、開刀" required aria-label="事件描述">
      <button class="btn primary" type="submit">新增事件</button>
    </form>
    ${rows || '<p class="with">還沒有事件。</p>'}</section>`;
}
const activeLayers = () => LAYERS.filter(L => Object.assign({}, DEFAULT_LAYERS, ui.layers)[L]);
function horBar(a, h) {
  const t = getTodayLunar();
  const by = a.rawDates.lunarDate.lunarYear;
  const on = !!ui.horOn;
  const lay = Object.assign({}, DEFAULT_LAYERS, ui.layers);
  let html = `<div class="horbox"><div class="top">
    <label class="lyr"><input type="checkbox" data-hor-on ${on ? 'checked' : ''}> <b>顯示運限</b></label>`;
  if (!on) return html + `<span class="with">打開後可以選大限、小限、流年、流月、流日、流時，盤上會疊出運限宮位與四化。</span></div></div>`;
  html += LAYERS.map(L => `<label class="lyr ${L}"><input type="checkbox" data-layer="${L}" ${lay[L] ? 'checked' : ''}> <i>${LNAME[L]}</i></label>`).join('')
    + `<button class="btn" data-hor-today style="padding:3px 10px">回到現在</button></div>`;
  const age = h._y - by + 1;
  const decs = [...a.palaces].sort((p, q) => p.decadal.range[0] - q.decadal.range[0]);
  const curDec = decs.find(p => age >= p.decadal.range[0] && age <= p.decadal.range[1]) || decs[0];
  html += `<div class="hrow decadal"><span class="rl">大限</span>${decs.map(p => `<button class="chip" data-dec="${p.decadal.range[0]}" aria-pressed="${p === curDec}">${p.decadal.range.join('–')}<small>${p.decadal.heavenlyStem}${p.decadal.earthlyBranch} ${palName(p.name)}</small></button>`).join('')}</div>`;
  const years = []; for (let g = curDec.decadal.range[0]; g <= curDec.decadal.range[1]; g++) years.push(by + g - 1);
  html += `<div class="hrow yearly"><span class="rl">流年</span>${years.map(y => `<button class="chip" data-year="${y}" aria-pressed="${y === h._y}">${y}<small>${yearGZ(y)} ${y - by + 1}歲</small></button>`).join('')}</div>`;
  html += `<div class="hrow monthly"><span class="rl">流月</span>${MONTHS.map((n, i) => `<button class="chip" data-month="${i + 1}" aria-pressed="${i + 1 === h._m}">${n}</button>`).join('')}</div>`;
  if (lay.daily || lay.hourly) html += `<div class="hrow daily"><span class="rl">流日</span>${DAYS.map((n, i) => `<button class="chip" data-day="${i + 1}" aria-pressed="${i + 1 === h._d}">${n}</button>`).join('')}</div>`;
  if (lay.hourly) html += `<div class="hrow hourly"><span class="rl">流時</span>${HOURS.map((n, i) => `<button class="chip" data-hour="${i}" aria-pressed="${i === h._t}">${n}</button>`).join('')}</div>`;
  html += `<div class="hsum">${activeLayers().map(L => {
    const x = h[L], idx = x.index;
    const natal = a.palaces.find(p => p.index === idx);
    return `<div class="${L}"><span class="k">${LNAME[L]} ${L === 'age' ? x.nominalAge + '歲' : x.heavenlyStem + x.earthlyBranch}</span>命宮在${palName(natal.name)}（本命）　${x.mutagen.map((n, i) => `${n}<span class="hua ${HN[i]}">${HN[i]}</span>`).join(' ')}</div>`;
  }).join('')}<div class="with" style="font-size:12px">流年、流月、流日以農曆計；${t.y === h._y && t.m === h._m ? '目前顯示的是今年本月。' : ''}</div></div>`;
  return html + '</div>';
}
const palOfStar = (a, star) => a.palaces.find(p => allStars(p).some(s => s.name === star));
// 連鎖：從某宮開始，宮干化X飛入哪一宮，再從那一宮繼續
function flyChain(a, startBr, hi) {
  const steps = []; let cur = a.palaces.find(p => p.earthlyBranch === startBr);
  const seen = new Set([cur.earthlyBranch]); let end = '';
  for (let k = 0; k < 12; k++) {
    const star = SIHUA[cur.heavenlyStem][hi]; const to = palOfStar(a, star);
    steps.push({ from: cur, star, to });
    if (to === cur) { end = `${palName(cur.name)}自化${HN[hi]}，連鎖結束。`; break; }
    if (seen.has(to.earthlyBranch)) { end = `回到${palName(to.name)}，形成循環。`; break; }
    seen.add(to.earthlyBranch); cur = to;
  }
  return { steps, end };
}

/* ---------- 排盤 ---------- */
const cache = new Map();
function chartOf(p) {
  const key = [p.calendar, p.y, p.m, p.d, p.leap, p.time, p.gender, p.timeMode, p.clock, p.place, p.lon, p.tz, p.dst].join('|');
  const c = cache.get(p.id);
  if (c && c.key === key) return c.a;
  const ds = `${p.y}-${p.m}-${p.d}`;
  let a = null;
  try {
    const b = birthOf(p);
    if (b.mode === 'clock') { a = astro.bySolar(b.solar, b.time, p.gender, true, 'zh-TW'); a._tst = b.label; }
    else a = p.calendar === 'lunar'
      ? astro.byLunar(ds, p.time, p.gender, !!p.leap, settings.fixLeap, 'zh-TW')
      : astro.bySolar(ds, p.time, p.gender, true, 'zh-TW');
  } catch (e) { console.error(e); }
  cache.set(p.id, { key, a });
  return a;
}
const palName = n => n === '僕役' ? '交友宮' : (n.endsWith('宮') ? n : n + '宮');
const shortPal = n => n.replace(/宮$/, '') || n;
const allStars = pal => [
  ...pal.majorStars.map(s => ({...s, kind:'major'})),
  ...pal.minorStars.map(s => ({...s, kind: s.type === 'tough' ? 'tough' : 'soft'})),
  ...pal.adjectiveStars.map(s => ({...s, kind:'adj'})),
];
function findStar(a, starName) {
  const hua = starName.startsWith('化') ? starName.slice(1) : null;
  for (const pal of a.palaces) {
    for (const s of allStars(pal)) {
      if (hua ? s.mutagen === hua : s.name === starName) return { pal, s };
    }
  }
  return null;
}

/* ---------- 小工具 ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function starHTML(s, clickable = true) {
  const b = s.brightness ? `<span class="b">${esc(s.brightness)}</span>` : '';
  const h = s.mutagen ? `<span class="hua ${esc(s.mutagen)}">${esc(s.mutagen)}</span>` : '';
  const c = clickable ? ' clickable' : '';
  const card = CARD[s.name];
  const ic = card && ui.icons !== false ? `<i class="si" aria-hidden="true">${card.icon}</i>` : '';
  return `<span class="s ${s.kind}${c}" data-star="${esc(s.name)}"${card ? ` title="${esc(s.name)}：${esc(cardKw(s.name))}${starAnn(s.name) ? '｜' + esc(starAnn(s.name)) : ''}"` : ''}>${ic}${esc(s.name)}${b}${h}</span>`;
}
let tt;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2200); }
function noteBlock(key, label, ph) {
  const v = notes[key] || '';
  ph = ph || '寫下你觀察到的共通點、書上的解釋…';
  return `<details class="note"${v ? '' : ''}><summary class="${v ? 'has' : ''}">${v ? '我的筆記：' + esc(v.slice(0, 30)) + (v.length > 30 ? '…' : '') : label}</summary>
    <textarea data-note="${esc(key)}" placeholder="${esc(ph)}">${esc(v)}</textarea>
    <div class="note-tools"><button type="button" class="note-expand" data-expand="${esc(key)}" data-ph="${esc(ph)}" data-title="${esc(label.replace(/^寫筆記：/, ''))}">⤢ 放大編輯</button></div></details>`;
}

/* ---------- 對照 ---------- */
function fillSelectors() {
  const extra = new Set();
  people.forEach(p => { const a = chartOf(p); a && a.palaces.forEach(pal => pal.adjectiveStars.forEach(s => extra.add(s.name))); });
  const groups = [...GROUPS];
  if (extra.size) groups.push(['雜曜', [...extra]]);
  $('#starSel').innerHTML = groups.map(([g, list]) =>
    `<optgroup label="${g}">${list.map(n => `<option${n === ui.star ? ' selected' : ''}>${n}</option>`).join('')}</optgroup>`).join('');
  $('#palSel').innerHTML = PALACES.map(n => `<option value="${n}"${n === ui.palace ? ' selected' : ''}>${palName(n)}</option>`).join('');
}

function renderCompare() {
  document.querySelectorAll('#v-compare [data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === ui.mode));
  $('#starSel').hidden = ui.mode !== 'star';
  $('#palSel').hidden = ui.mode !== 'palace';
  $('#evCatSel').hidden = ui.mode !== 'event';
  $('#layerCtl').hidden = ui.mode === 'event';
  const L = ui.cLayer || 'natal';
  $('#layerSel').value = L;
  $('#yearPick').hidden = L === 'natal';
  $('#cYear').value = ui.cYear || getTodayLunar().y;
  $('#evCatSel').innerHTML = ['全部', ...EV_CATS].map(c => `<option${c === (ui.evCat || '全部') ? ' selected' : ''}>${c}</option>`).join('');
  const out = $('#compareOut');
  if (!people.length) { out.innerHTML = emptyState(); return; }
  out.innerHTML = ui.mode === 'star' ? renderByStar() : ui.mode === 'palace' ? renderByPalace() : renderByEvent();
}

// 某年（農曆）的運限資料
const yearHorCache = new Map();
function horYear(a, p, Y) {
  const k = p.id + '|' + Y + '|' + JSON.stringify(settings);
  if (yearHorCache.has(k)) return yearHorCache.get(k);
  let h = null;
  if (Y >= a.rawDates.lunarDate.lunarYear) { try { h = a.horoscope(`${Y}-7-1`, 6); } catch { } }
  yearHorCache.set(k, h); return h;
}
const normPal = n => (n === '命宮' || n === '命') ? '命宮' : shortPal(n);
function renderByStar() {
  const star = ui.star;
  const L = ui.cLayer || 'natal', Y = ui.cYear || getTodayLunar().y;
  const LN = L === 'natal' ? '' : LNAME[L];
  const buckets = Object.fromEntries(PALACES.map(n => [n, []]));
  const missing = [];
  people.forEach(p => {
    const a = chartOf(p); if (!a) return;
    let f, key, h = null;
    if (L === 'natal') {
      f = findStar(a, star);
      if (!f) { missing.push(p.name); return; }
      key = normPal(f.pal.name);
    } else {
      h = horYear(a, p, Y);
      if (!h) { missing.push(p.name + '（尚未出生）'); return; }
      if (star.startsWith('化')) {
        const name = h[L].mutagen[HN.indexOf(star.slice(1))];
        const pal = palOfStar(a, name);
        f = { pal, s: allStars(pal).find(x => x.name === name), hua: star.slice(1) };
      } else {
        f = findStar(a, star);
        if (!f) { missing.push(p.name); return; }
      }
      key = normPal(h[L].palaceNames[f.pal.index]);
    }
    (buckets[key] ||= []).push({ p, h, ...f });
  });
  const isHua = star.startsWith('化');
  const rows = PALACES.map(n => {
    const list = buckets[n];
    const hits = list.map(({ p, pal, s, hua }) => {
      const others = allStars(pal).filter(x => x.name !== s.name && x.kind !== 'adj');
      const shown = hua ? starHTML({ ...s, mutagen:null }, false) + `<span class="lh ${hua}">${LPFX[L]}${hua}</span>` : starHTML(s, false);
      return `<div class="hit"><span class="who" data-person="${esc(p.id)}" data-hyear="${L === 'natal' ? '' : Y}">${esc(p.name)}</span>
        ${shown}
        <span class="with">${L !== 'natal' ? `本命${palName(pal.name)}・` : ''}${pal.heavenlyStem}${pal.earthlyBranch}${pal.isBodyPalace ? '・身宮' : ''}　同宮：${others.length ? others.map(x => starHTML(x)).join('、') : '（空宮）'}</span>
        ${(() => { const t = pn(p.id, normPal(pal.name)); return t ? `<div class="pn-snip" title="點一下展開">實際：${esc(t)}</div>` : ''; })()}</div>`;
    }).join('');
    const nk = L === 'natal' ? `${star}@${n}` : `L:${L}|${star}@${n}`;
    return `<div class="row${list.length ? '' : ' empty'}">
      <div class="pname">${LN ? `<small class="lname ${L}">${LN}</small>` : ''}${palName(n)}<span>${list.length} 人</span>${L === 'natal' ? `<em class="phint">${esc(palAnn(n))}<br>${palStruct(n)}</em>` : ''}</div>
      <div class="hits">${hits || '<span class="with">—</span>'}
        ${noteBlock(nk, `寫筆記：${LN}${star}在${LN}${palName(n)}`, CARD[star] && L === 'natal' ? derivePrompt(star, n) : '')}</div></div>`;
  }).join('');
  const sa = CARD[star] ? `<span class="sann">${esc(cardKw(star))}${starAnn(star) ? '｜' + esc(starAnn(star)) : ''}</span><br>` : '';
  const desc = sa + (L === 'natal' ? `${people.length} 位朋友的${esc(star)}分別落在哪一宮。`
    : `${Y} 年（${yearGZ(Y)}）的${LN}盤：每位朋友的${star.startsWith('化') ? `${LN}${esc(star)}` : esc(star)}落在${LN}的哪一宮，括號內是本命宮位。`);
  return `<div class="focus">${CARD[star] ? miniCard(star) : ''}<h2>${LN ? `<span class="lname-big ${L}">${LN}</span>` : ''}${esc(star)}</h2>
    <p>${desc}${missing.length ? '<br>沒有列入：' + missing.map(esc).join('、') : ''}</p></div>
    <div class="rows">${rows}</div>`;
}

function renderByPalace() {
  const n = ui.palace;
  const L = ui.cLayer || 'natal', Y = ui.cYear || getTodayLunar().y;
  const LN = L === 'natal' ? '' : LNAME[L];
  const rows = people.map(p => {
    const a = chartOf(p); if (!a) return '';
    let pal, h = null;
    if (L === 'natal') pal = a.palaces.find(x => normPal(x.name) === n);
    else {
      h = horYear(a, p, Y); if (!h) return '';
      const idx = h[L].palaceNames.findIndex(x => normPal(x) === n);
      pal = a.palaces.find(x => x.index === idx);
    }
    if (!pal) return '';
    const st = allStars(pal);
    const lh = s => { if (!h) return ''; const i = h[L].mutagen.indexOf(s.name); return i < 0 ? '' : `<span class="lh ${HN[i]}">${LPFX[L]}${HN[i]}</span>`; };
    const pick = k => st.filter(s => s.kind === k).map(s => starHTML(s) + lh(s)).join('、') || '—';
    const flow = h ? (h[L].stars?.[pal.index] || []).map(x => `<span class="${L}">${esc(x.name)}</span>`).join('、') || '—' : '';
    return `<tr><td class="name" data-l=""><span class="who" data-person="${esc(p.id)}" data-hyear="${h ? Y : ''}">${esc(p.name)}</span></td>
      <td data-l="宮位">${h ? `本命${palName(pal.name)}<br>` : ''}${pal.heavenlyStem}${pal.earthlyBranch}${pal.isBodyPalace ? '<span class="tag">身</span>' : ''}</td>
      <td data-l="主星">${st.some(s => s.kind === 'major') ? pick('major') : '<span class="with">空宮</span>'}</td>
      <td data-l="吉星">${pick('soft')}</td><td data-l="煞星">${pick('tough')}</td>
      ${h ? `<td data-l="流曜" class="hstars">${flow}</td>` : ''}
      <td data-l="雜曜" style="font-size:13px">${pick('adj')}</td></tr>`;
  }).join('');
  const nk = L === 'natal' ? `宮:${n}` : `L:${L}|宮:${n}`;
  return `<div class="focus"><h2>${LN ? `<span class="lname-big ${L}">${LN}</span>` : ''}${palName(n)}</h2><p>${L === 'natal' ? `每位朋友的${palName(n)}裡有哪些星。` : `${Y} 年（${yearGZ(Y)}）每位朋友的${LN}${palName(n)}落在本命哪一宮、裡面有哪些星。`}點星名可以切到「以星找宮」。</p></div>
    <div class="tbl-wrap"><table><thead><tr><th>朋友</th><th>宮位</th><th>主星</th><th>吉星・祿馬</th><th>煞星</th>${L !== 'natal' ? '<th>流曜</th>' : ''}<th>雜曜</th></tr></thead>
    <tbody>${rows}</tbody></table></div>${noteBlock(nk, `寫筆記：${LN}${palName(n)}`)}`;
}

/* ---------- 以事件看 ---------- */
function renderByEvent() {
  const cat = ui.evCat || '全部';
  const rows = [];
  people.forEach(p => {
    const a = chartOf(p); if (!a) return;
    (events[p.id] || []).filter(ev => cat === '全部' || ev.cat === cat).forEach(ev => {
      const info = eventInfo(a, ev); if (!info) return;
      rows.push({ p, ev, info });
    });
  });
  if (!rows.length) return `<div class="empty-state"><h2>還沒有${cat === '全部' ? '' : '「' + esc(cat) + '」'}事件</h2><p>到「命盤」頁選一位朋友，在命盤下方的「事件紀錄」加入他發生過的事，例如結婚、換工作、搬家。累積幾筆之後，這裡會整理出每件事發生時的運限，方便你找共通點。</p><button class="btn primary" data-go="chart">去命盤頁</button></div>`;
  rows.sort((x, y) => EV_CATS.indexOf(x.ev.cat) - EV_CATS.indexOf(y.ev.cat) || x.ev.y - y.ev.y || (x.ev.m || 0) - (y.ev.m || 0));
  const count = f => { const m = new Map(); rows.forEach(r => { const k = f(r); m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const stat = (title, arr) => `<div class="stat"><b>${title}</b>${arr.map(([k, v]) => `<span class="chip-s">${esc(k)} <i>${v}</i></span>`).join('')}</div>`;
  const stats = stat('流年命宮落在本命：', count(r => palName(r.info.yr.name)))
    + stat('流年化忌落在本命：', count(r => palName(r.info.yhua[3].natal.name)))
    + stat('流年化祿落在本命：', count(r => palName(r.info.yhua[0].natal.name)))
    + stat('大限命宮落在本命：', count(r => palName(r.info.dec.name)));
  const tr = rows.map(({ p, ev, info }) => `<tr>
      <td class="name" data-l=""><span class="who" data-person="${esc(p.id)}" data-hyear="${info.lun.lunarYear}">${esc(p.name)}</span></td>
      <td data-l="時間">${ev.y}${ev.m ? '/' + ev.m : ''}<br><span class="with">${yearGZ(info.lun.lunarYear)}・${info.age}歲</span></td>
      <td data-l="事件"><span class="evcat">${esc(ev.cat)}</span> ${esc(ev.text)}</td>
      <td data-l="大限命宮">本命${palName(info.dec.name)}</td>
      <td data-l="流年命宮">本命${palName(info.yr.name)}</td>
      <td data-l="流年祿">${info.yhua[0].star} → ${palName(info.yhua[0].natal.name)}</td>
      <td data-l="流年忌">${info.yhua[3].star} → ${palName(info.yhua[3].natal.name)}</td></tr>`).join('');
  return `<div class="focus"><h2>${cat === '全部' ? '所有事件' : esc(cat)}</h2><p>共 ${rows.length} 筆。每件事發生那一年的大限、流年命宮與流年四化落點（以本命宮位表示）。次數多的落點，可能就是值得注意的規律。</p></div>
    <div class="stats">${stats}</div>
    <div class="tbl-wrap"><table><thead><tr><th>朋友</th><th>時間</th><th>事件</th><th>大限命宮</th><th>流年命宮</th><th>流年化祿</th><th>流年化忌</th></tr></thead><tbody>${tr}</tbody></table></div>
    ${cat === '全部' ? '' : noteBlock(`事件:${cat}`, `寫筆記：${cat}類事件的觀察`)}`;
}

function emptyState() {
  return `<div class="empty-state"><h2>先加入第一位朋友</h2>
    <p>輸入出生年月日、時辰和性別，網頁會自動排出命盤，接著就能在這裡一次比較所有人的同一顆星。</p>
    <button class="btn primary" data-go="people">去新增朋友</button></div>`;
}

/* ---------- 命盤 ---------- */
function renderChart() {
  const sel = $('#personSel');
  const out = $('#chartOut');
  if (!people.length) { sel.hidden = true; out.innerHTML = emptyState(); return; }
  sel.hidden = false;
  document.querySelectorAll('#detailSeg button').forEach(b => b.setAttribute('aria-pressed', b.dataset.detail === (ui.detail || 'full')));
  if (!people.some(p => p.id === ui.person)) ui.person = people[0].id;
  sel.innerHTML = people.map(p => `<option value="${esc(p.id)}"${p.id === ui.person ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  const p = people.find(x => x.id === ui.person);
  const a = chartOf(p);
  if (!a) { out.innerHTML = '<p class="err">這組生日排不出盤，請到「朋友」檢查日期是否正確。</p>'; return; }
  // 合盤對象
  const ps = $('#partnerSel');
  ps.innerHTML = '<option value="">不合盤</option>' + people.filter(x => x.id !== p.id).map(x => `<option value="${esc(x.id)}"${x.id === ui.partner ? ' selected' : ''}>合盤：${esc(x.name)}</option>`).join('');
  const pp = ui.partner && ui.partner !== p.id ? people.find(x => x.id === ui.partner) : null;
  const b = pp ? chartOf(pp) : null;
  $('#swapBtn').hidden = !b;
  const bHua = b ? natalHua(b) : [];
  const bAt = br => b && b.palaces.find(x => x.earthlyBranch === br);
  const marks = flyMarks(a);
  const h = horOf(a);
  const lays = h ? activeLayers() : [];
  const lhua = name => lays.map(L => { const i = h[L].mutagen.indexOf(name); return i < 0 ? '' : `<span class="lh ${HN[i]}" title="${LNAME[L]}化${HN[i]}">${LPFX[L]}${HN[i]}</span>`; }).join('')
    + (b ? (i => i < 0 ? '' : `<span class="lh ${HN[i]} pl" title="${esc(pp.name)}的生年化${HN[i]}">他${HN[i]}</span>`)(bHua.indexOf(name)) : '');
  const yb = BR.indexOf(a.rawDates.chineseDate.yearly[1]);
  if (!a.palaces.some(x => x.earthlyBranch === ui.selBr)) ui.selBr = a.palaces.find(x => x.name === '命宮').earthlyBranch;
  const star2 = (s, br) => '<span class="sw">' + starHTML(s) + ((marks[br] || {})[s.name] || []).map(m =>
    `<span class="fly ${m.hua}${m.dir === 'in' ? ' in' : ''}" title="${m.dir === 'in' ? '對宮宮干化入（向心）' : '本宮宮干自化（離心）'}">${m.dir === 'in' ? '←' : '→'}${m.hua}</span>`).join('') + lhua(s.name) + '</span>';
  const cells = a.palaces.map(pal => {
    const [r, c] = POS[pal.earthlyBranch];
    const st = allStars(pal);
    const br = pal.earthlyBranch;
    const s0 = (BR.indexOf(br) - yb + 12) % 12 + 1;
    const flow = [0,1,2,3,4].map(k => s0 + 12 * k).join(', ');
    const hl = findStar({ palaces:[pal] }, ui.star) ? ' hl' : '';
    const isMing = pal.name === '命宮';
    const rel = (BR.indexOf(br) - BR.indexOf(ui.selBr) + 12) % 12;
    const sf = ui.sf === false ? '' : rel === 6 ? ' sf sf-opp' : (rel === 4 || rel === 8) ? ' sf sf-tri' : '';
    const sel = sf + (br === ui.selBr ? ' sel' : '') + lays.filter(L => h[L].index === pal.index).slice(-1).map(L => ' lming-' + L).join('');
    const bp = bAt(br);
    const ptag = bp ? `<span class="ht partner" title="${esc(pp.name)}的${palName(bp.name)}">他${ABBR[bp.name] || bp.name}</span>` : '';
    const pstars = bp ? `<div class="pstars">他：${bp.majorStars.map(x => esc(x.name)).join(' ') || '空宮'}</div>` : '';
    const htags = ptag + lays.map(L => `<span class="ht ${L}" title="${LNAME[L]}${h[L].palaceNames[pal.index]}">${LPFX[L]}${ABBR[h[L].palaceNames[pal.index]] || h[L].palaceNames[pal.index]}</span>`).join('');
    const hst = pstars + lays.map(L => (h[L].stars?.[pal.index] || []).map(x => `<span class="${L}">${esc(x.name)}</span>`).join('')).join('');
    return `<div class="cell${hl}${sel}" data-br="${br}" style="grid-row:${r};grid-column:${c}">${sf ? `<span class="sflabel">${rel === 6 ? '對宮' : '三合'}</span>` : ''}
      <div class="majors">${st.filter(s => s.kind === 'major').map(s => star2(s, br)).join('')}</div>
      <div class="minors">${st.filter(s => s.kind === 'soft' || s.kind === 'tough').map(s => star2(s, br)).join('')}</div>
      <div class="adjs">${st.filter(s => s.kind === 'adj').map(s => starHTML(s)).join('')}</div>
      ${ui.anns ? `<div class="cann">${pal.majorStars.filter(x => starAnn(x.name)).map(x => `<div>${esc(x.name)}：${esc(starAnn(x.name))}</div>`).join('')}</div>` : ''}
      ${hst.replace(pstars, '') ? `<div class="hstars">${hst.replace(pstars, '')}</div>` : ''}${pstars}
      <div class="ages">流年 ${flow}<br>小限 ${pal.ages.slice(0, 5).join(', ')}</div>
      ${htags ? `<div class="htags">${htags}</div>` : ''}
      <div class="foot3">
        <div class="gods"><span class="bs">${esc(godName(pal.boshi12))}</span><br>${esc(pal.jiangqian12)}<br>${esc(pal.suiqian12)}</div>
        <div class="dec">${pal.decadal.range.join('–')}</div>
        <div class="rt"><span class="cs">${esc(pal.changsheng12)}</span><span class="pal${isMing ? ' ming' : ''}" title="${esc(palAnn(normPal(pal.name)))}｜${palStruct(normPal(pal.name))}">${palName(pal.name)}${pal.isBodyPalace ? '<span class="tag">身</span>' : ''}</span><span class="gz2">${pal.heavenlyStem}${pal.earthlyBranch}</span></div>
      </div></div>`;
  }).join('');
  const yh = SIHUA[a.rawDates.chineseDate.yearly[0]] || [];
  const lines = ui.lines || [];
  const flybar = `<div class="flybar"><span class="lbl">飛化連線</span>
    ${HN.map(h => `<button class="hb ${h}" data-line="${h}" aria-pressed="${lines.includes(h)}">${h}</button>`).join('')}
    <label class="lyr"><input type="checkbox" data-sf ${ui.sf === false ? '' : 'checked'}> 三方四正</label>
    <label class="lyr"><input type="checkbox" data-icons ${ui.icons === false ? '' : 'checked'}> 星曜圖示</label>
    <label class="lyr"><input type="checkbox" data-anns ${ui.anns ? 'checked' : ''}> 盤上註解</label>
    <div class="seg" role="group" aria-label="連線範圍">
      <button data-scope="sel" aria-pressed="${(ui.scope || 'sel') === 'sel'}">選取的宮</button>
      <button data-scope="all" aria-pressed="${ui.scope === 'all'}">全盤</button>
    </div></div>`;
  out.innerHTML = horBar(a, h) + flybar + `<div class="chart-wrap"><div class="chart${ui.detail === 'simple' ? ' simple' : ''}">${cells}
    <div class="center"><h3>${esc(p.name)}</h3><dl>
      <dt>性別</dt><dd>${esc(a.gender)}</dd>
      <dt>國曆</dt><dd>${esc(a.solarDate)}</dd>
      ${p.timeMode === 'clock' ? `<dt>鐘錶時間</dt><dd>${p.y}/${p.m}/${p.d} ${esc(p.clock)}（${esc(p.place)}${p.dst ? '，夏令時間' : ''}）</dd><dt>真太陽時</dt><dd>${esc(a._tst || '')}</dd>` : ''}
      <dt>農曆</dt><dd>${esc(a.lunarDate)}　${esc(a.time)}</dd>
      <dt>四柱</dt><dd>${esc(a.chineseDate)}</dd>
      <dt>生年四化</dt><dd>${yh.map((n, i) => `${n}<span class="hua ${HN[i]}">${HN[i]}</span>`).join('　')}</dd>
      <dt>五行局</dt><dd>${esc(a.fiveElementsClass)}</dd>
      <dt>命主／身主</dt><dd>${esc(a.soul)}／${esc(a.body)}</dd>
      ${p.note ? `<dt>備註</dt><dd>${esc(p.note)}</dd>` : ''}</dl></div></div></div>
    ${palDetail(a, marks, yb, h, lays, b, pp)}
    <p class="legend">淡紫色格子：目前在「對照」選的「${esc(ui.star)}」所在的宮。<span class="s tough">紅字</span>為煞星，<span class="s soft">藍字</span>為吉星。實心標籤是生年四化；<span class="fly 祿">→祿</span> 是本宮宮干自化（離心），<span class="fly 祿 in">←祿</span> 是對宮宮干化入（向心）。宮位左下三行依序為博士、將前、歲前十二神，右下小字為長生十二神。飛化連線：從宮干所在的宮，畫到被化的星所在的宮（自化不畫線）。</p>`;
  if (b) out.insertAdjacentHTML('beforeend', pairPanel(a, b, p, pp));
  out.insertAdjacentHTML('beforeend', chartNotesPanel(p, a, h));
  out.insertAdjacentHTML('beforeend', eventsPanel(p, a));
  if (ui.lastEvCat && $('#evCat')) $('#evCat').value = ui.lastEvCat;
  document.querySelectorAll('.hrow').forEach(row => { const c = row.querySelector('[aria-pressed="true"]'); if (c) row.scrollLeft = c.offsetLeft - row.clientWidth / 2 + c.offsetWidth / 2; });
  drawSF();
  drawLines(a);
  setTimeout(growAll, 0);
}

// 三方四正虛線：像文墨天機一樣，從各宮靠近中宮的那一點連線
const SF_ANCHOR = { 巳:['r','b'], 午:['m','b'], 未:['m','b'], 申:['l','b'], 辰:['r','m'], 酉:['l','m'], 卯:['r','m'], 戌:['l','m'], 寅:['r','t'], 丑:['m','t'], 子:['m','t'], 亥:['l','t'] };
function drawSF() {
  const chart = document.querySelector('#chartOut .chart'); if (!chart) return;
  chart.querySelector('svg.sflines')?.remove();
  if (ui.sf === false || !ui.selBr) return;
  const cr = chart.getBoundingClientRect();
  const pt = br => {
    const el = chart.querySelector(`.cell[data-br="${br}"]`); if (!el) return null;
    const r = el.getBoundingClientRect(), [hx, vy] = SF_ANCHOR[br];
    const x = hx === 'l' ? r.left : hx === 'r' ? r.right : r.left + r.width / 2;
    const y = vy === 't' ? r.top : vy === 'b' ? r.bottom : r.top + r.height / 2;
    return [x - cr.left, y - cr.top];
  };
  const i = BR.indexOf(ui.selBr);
  const me = pt(ui.selBr), opp = pt(BR[(i + 6) % 12]), t1 = pt(BR[(i + 4) % 12]), t2 = pt(BR[(i + 8) % 12]);
  if (!me || !opp || !t1 || !t2) return;
  const P = p => p.map(n => n.toFixed(1)).join(',');
  chart.insertAdjacentHTML('beforeend', `<svg class="sflines" aria-hidden="true">
    <polygon points="${P(me)} ${P(t1)} ${P(t2)}" />
    <line x1="${me[0]}" y1="${me[1]}" x2="${opp[0]}" y2="${opp[1]}" /></svg>`);
}

function drawLines(a) {
  const chart = document.querySelector('#chartOut .chart'); if (!chart) return;
  chart.querySelector('svg.flylines')?.remove();
  const lines = ui.lines || []; if (!lines.length) return;
  const cr = chart.getBoundingClientRect();
  const ctr = br => { const r = chart.querySelector(`.cell[data-br="${br}"]`).getBoundingClientRect(); return [r.left - cr.left + r.width / 2, r.top - cr.top + r.height / 2]; };
  const COLOR = { 祿:'var(--lu)', 權:'var(--quan)', 科:'var(--ke)', 忌:'var(--ji)' };
  const srcs = ui.scope === 'all' ? a.palaces : a.palaces.filter(p => p.earthlyBranch === ui.selBr);
  const label = ui.scope !== 'all';
  let body = '<defs>' + HN.map(h => `<marker id="ah-${h}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" style="fill:${COLOR[h]}"/></marker>`).join('') + '</defs>';
  srcs.forEach(pal => {
    SIHUA[pal.heavenlyStem].forEach((star, i) => {
      const h = HN[i]; if (!lines.includes(h)) return;
      const to = palOfStar(a, star); if (!to || to === pal) return;
      let [x1, y1] = ctr(pal.earthlyBranch), [x2, y2] = ctr(to.earthlyBranch);
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const off = (i - 1.5) * 5, px = -uy * off, py = ux * off;
      x1 += ux * 14 + px; y1 += uy * 14 + py; x2 -= ux * 26 - px; y2 -= uy * 26 - py;
      body += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:${COLOR[h]}" stroke-width="2" stroke-opacity=".85" marker-end="url(#ah-${h})"/>`;
      if (label) body += `<text x="${x1 + (x2 - x1) * .62}" y="${y1 + (y2 - y1) * .62}" text-anchor="middle" dominant-baseline="middle" style="fill:${COLOR[h]}">${star}${h}</text>`;
    });
  });
  chart.insertAdjacentHTML('beforeend', `<svg class="flylines" aria-hidden="true">${body}</svg>`);
}

// 本命生年四化的四顆星（依祿權科忌）
function natalHua(a) {
  const r = ['', '', '', ''];
  a.palaces.forEach(p => [...p.majorStars, ...p.minorStars].forEach(s => { const i = HN.indexOf(s.mutagen); if (i >= 0) r[i] = s.name; }));
  return r;
}
function pairPanel(a, b, pa, pb) {
  const A = esc(pa.name), B = esc(pb.name);
  const order = [...a.palaces].sort((x, y) => PALACES.indexOf(normPal(x.name)) - PALACES.indexOf(normPal(y.name)));
  const majors = p => p.majorStars.map(s => starHTML(s)).join('、') || '<span class="with">空宮</span>';
  const rows = order.map(ap => {
    const bp = b.palaces.find(x => x.earthlyBranch === ap.earthlyBranch);
    const key = ['命宮','夫妻'].includes(normPal(ap.name)) || ['命宮','夫妻'].includes(normPal(bp.name));
    return `<tr${key ? ' class="pkey"' : ''}><td data-l="地支">${ap.earthlyBranch}</td>
      <td data-l="${A}"><b>${palName(ap.name)}</b> ${majors(ap)}</td>
      <td data-l="${B}"><b class="pl-name">${palName(bp.name)}</b> ${majors(bp)}</td></tr>`;
  }).join('');
  const cross = (src, dst, S, D) => natalHua(src).map((star, i) => {
    if (!star) return '';
    const sp = palOfStar(src, star), dp = palOfStar(dst, star);
    return `<li><span class="hua ${HN[i]}">${HN[i]}</span> ${S}的生年化${HN[i]}是<b>${star}</b>（在${S}的${palName(sp.name)}）→ 落在${D}的<b>${palName(dp.name)}</b></li>`;
  }).join('');
  return `<section class="pair"><div class="pair-h"><h3>合盤：${A} × <span class="pl-name">${B}</span></h3><button class="btn" data-swap>對調兩人</button></div>
    <p class="with" style="margin:0 0 10px;font-size:13px">兩張盤的十二地支位置相同，所以同一格就是「我的某宮對到他的某宮」。盤上橘色「他夫、他命」標籤是 ${B} 的宮位，「他祿、他忌」是 ${B} 的生年四化落在你盤上的星。點任一宮可在下方詳情看到兩人該宮的星曜與宮干互飛。</p>
    <h4>生年四化互入</h4>
    <ul class="cross">${cross(a, b, A, B)}</ul>
    <ul class="cross">${cross(b, a, B, A)}</ul>
    <h4>宮位對照</h4>
    <div class="tbl-wrap"><table class="ptable"><thead><tr><th>地支</th><th>${A}</th><th>${B}</th></tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
}
/* ---------- 這張盤的筆記整合 ---------- */
const CORE_STARS = new Set(GROUPS.flatMap(g => g[1]));
// 依本命十二宮，找出這張盤每一宮對應到的所有筆記（含寫過與尚未寫的組合）
function chartNotes(a, h) {
  const tLayers = h ? activeLayers().filter(L => L === 'decadal' || L === 'yearly') : [];
  const order = [...a.palaces].sort((x, y) => PALACES.indexOf(normPal(x.name)) - PALACES.indexOf(normPal(y.name)));
  return order.map(pal => {
    const n = normPal(pal.name);
    const items = [];
    const add = (key, title, kind, core) => items.push({ key, title, kind, text: notes[key] || '', core });
    add(`宮:${n}`, `${palName(n)}（宮位筆記）`, 'pal', true);
    allStars(pal).forEach(s => {
      add(`${s.name}@${n}`, `${s.name}在${palName(n)}`, s.kind, CORE_STARS.has(s.name));
      if (s.mutagen) add(`化${s.mutagen}@${n}`, `生年化${s.mutagen}（${s.name}）在${palName(n)}`, 'hua', true);
    });
    tLayers.forEach(L => {
      const ln = normPal(h[L].palaceNames[pal.index]), LN = LNAME[L];
      add(`L:${L}|宮:${ln}`, `${LN}${palName(ln)}（宮位筆記）`, 'layer', true);
      allStars(pal).forEach(s => {
        const i = h[L].mutagen.indexOf(s.name);
        if (i >= 0) add(`L:${L}|化${HN[i]}@${ln}`, `${LN}化${HN[i]}（${s.name}）在${LN}${palName(ln)}`, 'layer', true);
        if (s.kind === 'major' || CORE_STARS.has(s.name)) { const k = `L:${L}|${s.name}@${ln}`; if (notes[k]) add(k, `${LN}${s.name}在${LN}${palName(ln)}`, 'layer', false); }
      });
    });
    return { pal, n, items };
  });
}
const pn = (pid, k) => (pnotes[pid] || {})[k] || '';
function personTerms(p) {
  const t = (p.alias || '').split(/[,，、\s]+/).map(x => x.trim()).filter(Boolean);
  if (p.name && p.name.length >= 2) t.unshift(p.name);
  return [...new Set(t)];
}
function mentionsOf(p) {
  const terms = personTerms(p); if (!terms.length) return null;
  const hits = parseNotes().filter(n => terms.some(t => n.text.includes(t))).map(n => ({ ...n, src:'note' }));
  people.forEach(o => { if (o.id === p.id) return; Object.entries(pnotes[o.id] || {}).forEach(([k, v]) => {
    if (terms.some(t => v.includes(t))) hits.push({ key:`${o.id}|${k}`, text:v, title:`${o.name}的${k === '_summary' ? '整體印象' : palName(k) + '實際狀況'}`, src:'pnote', pal: k === '_summary' ? null : k });
  }); });
  return { terms, hits };
}
function pnoteBox(pid, k, label, ph, big) {
  return `<div class="pn-box${big ? ' big' : ''}"><div class="pn-l"><b>${esc(label)}</b><button type="button" class="note-expand" data-expand-p="${esc(pid)}|${esc(k)}" data-title="${esc(label)}">⤢ 放大</button></div>
    <textarea data-pnote="${esc(pid)}|${esc(k)}" placeholder="${esc(ph)}">${esc(pn(pid, k))}</textarea></div>`;
}
const PAL_HINT = { 命宮:'個性、外貌、給人的感覺', 兄弟:'兄弟姊妹、合夥人、平輩相處', 夫妻:'感情、婚姻、另一半的樣子', 子女:'小孩、晚輩、桃花、性生活', 財帛:'賺錢方式、理財習慣、花錢觀念', 疾厄:'體質、病痛、開過刀', 遷移:'外出、出國、在外的人緣', 僕役:'朋友、同事、部屬', 官祿:'職業、工作態度、學業', 田宅:'住家、搬家、置產、家庭氣氛', 福德:'興趣、精神狀態、享受', 父母:'父母、長輩、上司、文書' };
function chartNotesPanel(p, a, h) {
  const groups = chartNotes(a, h);
  const all = groups.flatMap(g => g.items.filter(x => x.core || x.text));
  const done = all.filter(x => x.text).length;
  const mode = ui.cnMode || 'all';
  const showEmpty = ui.cnEmpty !== false;
  const mineCount = PALACES.filter(n => pn(p.id, n)).length;
  const body = groups.map(({ pal, n, items }) => {
    const written = items.filter(x => x.text);
    const empty = items.filter(x => !x.text && x.core);
    const gen = mode === 'person' ? '' : `
      ${written.length ? `<div class="cn-gen-l">通用筆記（星曜落在這一宮的解釋）</div>` : ''}
      ${written.map(x => `<div class="cn-item"><div class="cn-t">${esc(x.title)}<button type="button" class="note-expand" data-expand="${esc(x.key)}" data-title="${esc(x.title)}">編輯</button></div><div class="cn-x">${esc(x.text)}</div></div>`).join('')}
      ${showEmpty && empty.length ? `<div class="cn-empty"><span class="with">還沒寫：</span>${empty.map(x => `<button type="button" class="cn-add" data-expand="${esc(x.key)}" data-title="${esc(x.title)}">＋${esc(x.title.replace(/在.+$/, '').replace('（宮位筆記）', '宮位'))}</button>`).join('')}</div>` : ''}`;
    const mine = mode === 'generic' ? '' : pnoteBox(p.id, n, `${p.name}的${palName(n)}・實際狀況`, `只屬於${p.name}的觀察：${palAnn(n)}`);
    if (mode === 'generic' && !written.length && !showEmpty) return '';
    return `<div class="cn-pal" data-cn-br="${pal.earthlyBranch}"><div class="cn-h"><b title="${esc(palAnn(n))}">${palName(pal.name)}</b><span class="with">${pal.heavenlyStem}${pal.earthlyBranch}・${pal.majorStars.map(s => s.name).join('') || '空宮'}</span><span class="with cn-c">${mode === 'person' ? '' : `通用 ${written.length} 則`}</span></div>
      ${mine}${gen}</div>`;
  }).join('');
  const m = mode === 'generic' ? null : mentionsOf(p);
  const ment = !m ? (mode === 'generic' ? '' : `<div class="cn-ment"><h4>其他筆記中提到${esc(p.name)}的地方</h4><p class="with">名字只有一個字時不會自動搜尋。到「朋友」頁編輯${esc(p.name)}，在「筆記中的稱呼」填你寫筆記時怎麼叫他（例如：均姐、阿均），就能自動找出來。</p></div>`)
    : `<div class="cn-ment"><h4>其他筆記中提到${esc(p.name)}的地方 <small class="with">搜尋：${m.terms.map(esc).join('、')}</small></h4>
      ${m.hits.length ? m.hits.map(x => {
        const t = esc(x.text).replace(new RegExp(m.terms.map(t => esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'), mm => `<mark>${mm}</mark>`);
        const to = x.pal && PALACES.includes(x.pal) ? x.pal : '_summary';
        return `<div class="cn-item"><div class="cn-t">${esc(x.title)}<button type="button" class="note-expand" data-copy-to="${esc(p.id)}|${esc(to)}|${esc(x.src)}|${esc(x.key)}">複製到${esc(p.name)}的${to === '_summary' ? '整體印象' : palName(to)}</button></div><div class="cn-x">${t}</div></div>`;
      }).join('') : '<p class="with">目前沒有筆記提到這些稱呼。</p>'}</div>`;
  return `<section class="cnotes" id="cnotes"><div class="cn-top"><h3>${esc(p.name)} 的命例檔案</h3>
      <div class="seg" role="group" aria-label="顯示內容">
        <button data-cn-mode="all" aria-pressed="${mode === 'all'}">全部</button>
        <button data-cn-mode="person" aria-pressed="${mode === 'person'}">只看${esc(p.name)}的資料</button>
        <button data-cn-mode="generic" aria-pressed="${mode === 'generic'}">只看通用筆記</button>
      </div>
      ${mode === 'person' ? '' : `<label class="lyr"><input type="checkbox" data-cn-empty ${showEmpty ? 'checked' : ''}> 顯示還沒寫的組合</label>`}
      <button class="btn" type="button" data-cn-md>下載${esc(p.name)}的命例檔案</button></div>
    <p class="with cn-stat">實際狀況已寫 <b>${mineCount}</b> / 12 宮　・　通用筆記涵蓋這張盤 ${done} / ${all.length} 個組合　・　事件 ${(events[p.id] || []).length} 筆</p>
    <p class="with" style="margin:0 0 10px;font-size:13px">「實際狀況」只屬於${esc(p.name)}，寫他真實的樣子；「通用筆記」是星曜在某宮的解釋，所有符合的朋友共用。兩者分開寫，之後在對照頁比較時，就能看出書上的說法跟每個人的實際情況差在哪。</p>
    ${mode === 'generic' ? '' : pnoteBox(p.id, '_summary', `${p.name}的整體印象`, '個性、職業、人生大事、你對這張盤的總結…', true)}
    ${body}${ment}</section>`;
}
function chartNotesMarkdown(p, a, h) {
  const pal0 = a.palaces.find(x => x.isBodyPalace);
  let md = `# ${p.name} 的命例檔案\n\n- 性別：${a.gender}\n- 國曆：${a.solarDate}　農曆：${a.lunarDate} ${a.time}\n- 四柱：${a.chineseDate}\n- 五行局：${a.fiveElementsClass}　命主${a.soul}／身主${a.body}　身宮在${pal0 ? palName(pal0.name) : ''}\n- 生年四化：${natalHua(a).map((n, i) => n + '化' + HN[i]).join('、')}\n`;
  if (p.note) md += `- 備註：${p.note}\n`;
  if (pn(p.id, '_summary')) md += `\n## 整體印象\n\n${pn(p.id, '_summary')}\n`;
  const evs = (events[p.id] || []).slice().sort((x, y) => x.y - y.y || (x.m || 0) - (y.m || 0));
  if (evs.length) {
    md += `\n## 事件紀錄\n`;
    evs.forEach(ev => { const i = eventInfo(a, ev); md += `\n- **${ev.y}${ev.m ? '/' + ev.m : ''}**［${ev.cat}］${ev.text}` + (i ? `（${i.age}歲・大限命宮在${palName(i.dec.name)}・流年命宮在${palName(i.yr.name)}・流年忌${i.yhua[3].star}入${palName(i.yhua[3].natal.name)}）` : ''); });
    md += '\n';
  }
  chartNotes(a, h).forEach(({ pal, n, items }) => {
    const w = items.filter(x => x.text), mine = pn(p.id, n);
    md += `\n## ${palName(pal.name)}（${pal.heavenlyStem}${pal.earthlyBranch}）${pal.majorStars.map(s => s.name).join('、') || '空宮'}\n`;
    md += mine ? `\n### 實際狀況\n\n${mine}\n` : `\n（實際狀況尚未記錄）\n`;
    w.forEach(x => { md += `\n### ${x.title}\n\n${x.text}\n`; });
  });
  return md;
}
function palDetail(a, marks, yb, h, lays, b, pp) {
  const pal = a.palaces.find(x => x.earthlyBranch === ui.selBr);
  const br = pal.earthlyBranch, st = allStars(pal);
  const s0 = (BR.indexOf(br) - yb + 12) % 12 + 1;
  const withFly = s => starHTML(s) + ((marks[br] || {})[s.name] || []).map(m =>
    `<span class="fly ${m.hua}${m.dir === 'in' ? ' in' : ''}">${m.dir === 'in' ? '←' : '→'}${m.hua}</span>`).join('')
    + (lays || []).map(L => { const i = h[L].mutagen.indexOf(s.name); return i < 0 ? '' : `<span class="lh ${HN[i]}">${LPFX[L]}${HN[i]}</span>`; }).join('');
  const list = k => st.filter(s => s.kind === k).map(withFly).join('、') || '—';
  return `<div class="pdetail">
    <div class="pd-head"><b>${palName(pal.name)}</b>${pal.isBodyPalace ? '<span class="tag">身</span>' : ''}<span>${pal.heavenlyStem}${pal.earthlyBranch}・大限 ${pal.decadal.range.join('–')}</span>
      <div class="pd-ann">${esc(palAnn(normPal(pal.name)))}<button type="button" class="note-expand" data-expand-a="宮:${normPal(pal.name)}" data-title="${palName(pal.name)}的註解">改註解</button></div></div>
    <dl>
      ${(lays || []).length ? `<dt>運限</dt><dd>${lays.map(L => `<span class="ht ${L}" style="font-size:12px;padding:1px 5px">${LNAME[L]}${palName(h[L].palaceNames[pal.index])}</span>`).join(' ')}
        ${lays.some(L => (h[L].stars?.[pal.index] || []).length) ? `<div class="hstars" style="font-size:13px;margin-top:2px">${lays.map(L => (h[L].stars?.[pal.index] || []).map(x => `<span class="${L}">${esc(x.name)}</span>`).join('')).join('')}</div>` : ''}</dd>` : ''}
      ${b ? (() => {
        const bp = b.palaces.find(x => x.earthlyBranch === br);
        const bl = k => allStars(bp).filter(s => s.kind === k).map(s => starHTML(s)).join('、');
        const flyTo = (src, dst, who) => SIHUA[src.heavenlyStem].map((star, i) => { const t = palOfStar(dst, star); return `<span><span class="hua ${HN[i]}">${HN[i]}</span> ${star} → ${who}${palName(t.name)}</span>`; }).join('');
        return `<dt class="pl-t">合盤</dt><dd><b class="pl-name">${esc(pp.name)}的${palName(bp.name)}</b>（${bp.heavenlyStem}${bp.earthlyBranch}）
          <div>${bl('major') || '空宮'}${bl('soft') ? '、' + bl('soft') : ''}${bl('tough') ? '、' + bl('tough') : ''}</div></dd>
          <dt class="pl-t">飛入對方</dt><dd><div class="flist">我的${pal.heavenlyStem}干：${flyTo(pal, b, '他的')}</div><div class="flist">他的${bp.heavenlyStem}干：${flyTo(bp, a, '我的')}</div></dd>`;
      })() : ''}
      <dt>三方四正</dt><dd>${(() => { const at = d => a.palaces.find(x => x.earthlyBranch === BR[(BR.indexOf(br) + d) % 12]); return `對宮 ${palName(at(6).name)}・三合 ${palName(at(4).name)}、${palName(at(8).name)}`; })()}</dd>
      ${st.some(s => CARD[s.name]) ? `<dt>星性</dt><dd class="xing">${st.filter(s => CARD[s.name]).map(s => `<span class="g-${CARD[s.name].cls}"><i>${CARD[s.name].icon}</i><b>${esc(s.name)}</b>＝${esc(cardKw(s.name))}${starAnn(s.name) ? `<small>（${esc(starAnn(s.name))}）</small>` : ''}</span>`).join('')}<div class="with" style="font-size:12px;margin-top:2px">把這幾個特質放進「${esc(palAnn(normPal(pal.name)) || palName(pal.name))}」的場景裡想一想。</div></dd>` : ''}
      <dt>主星</dt><dd class="big">${st.some(s => s.kind === 'major') ? list('major') : '空宮'}</dd>
      <dt>吉星</dt><dd>${list('soft')}</dd>
      <dt>煞星</dt><dd>${list('tough')}</dd>
      <dt>雜曜</dt><dd>${list('adj')}</dd>
      <dt>流年</dt><dd>${[0,1,2,3,4,5,6].map(k => s0 + 12 * k).join(', ')}</dd>
      <dt>小限</dt><dd>${pal.ages.join(', ')}</dd>
      <dt>十二神</dt><dd>博士 ${esc(godName(pal.boshi12))}・將前 ${esc(pal.jiangqian12)}・歲前 ${esc(pal.suiqian12)}・長生 ${esc(pal.changsheng12)}</dd>
    </dl>
    ${(() => { const g = chartNotes(a, h).find(x => x.pal === pal); const w = g ? g.items.filter(x => x.text) : [];
      const pp0 = people.find(x => x.id === ui.person); const mine = pn(ui.person, normPal(pal.name));
      return `<div class="pd-notes">${pnoteBox(ui.person, normPal(pal.name), `${pp0.name}的${palName(pal.name)}・實際狀況`, `只屬於${pp0.name}的觀察：${palAnn(normPal(pal.name))}`)}<div class="ch-head">通用筆記 <span class="with">${w.length} 則</span>${w.length ? '' : '<span class="with">（還沒寫，可以在下方「命例檔案」補寫）</span>'}</div>${w.map(x => `<div class="cn-item"><div class="cn-t">${esc(x.title)}<button type="button" class="note-expand" data-expand="${esc(x.key)}" data-title="${esc(x.title)}">編輯</button></div><div class="cn-x">${esc(x.text)}</div></div>`).join('')}</div>`; })()}
    ${flyInfo(a, pal)}
    <p class="pd-tip">點盤上任一格可切換宮位；點這裡的星名可以看所有朋友的這顆星。</p></div>`;
}

function flyInfo(a, pal) {
  const fl = SIHUA[pal.heavenlyStem].map((star, i) => {
    const to = palOfStar(a, star);
    return `<span><span class="hua ${HN[i]}">${HN[i]}</span> ${star} → ${to === pal ? '自化' : palName(to.name)}</span>`;
  }).join('');
  const hi = ui.chainHua ?? 3;
  const { steps, end } = flyChain(a, pal.earthlyBranch, hi);
  let chain = `<div class="node" data-chain-br="${steps[0].from.earthlyBranch}">${palName(steps[0].from.name)}</div>`;
  steps.forEach(st => {
    if (st.to === st.from) return;
    chain += `<div class="edge">${st.from.heavenlyStem}干 <b>${st.star}</b> 化${HN[hi]}</div><div class="node" data-chain-br="${st.to.earthlyBranch}">${palName(st.to.name)}</div>`;
  });
  return `<dl style="margin-top:4px"><dt>宮干飛化</dt><dd><div class="flist">${pal.heavenlyStem}干：${fl}</div></dd></dl>
    <div class="chain-sec"><div class="ch-head">連鎖追蹤
      ${HN.map((h, i) => `<button class="hb mini ${h}" data-chain="${i}" aria-pressed="${i === hi}">${h}</button>`).join('')}
      <span class="with">（${HN[hi]}追${HN[hi]}：一宮宮干化${HN[hi]}入某宮，再看那宮宮干化${HN[hi]}飛到哪）</span></div>
      <div class="chain">${chain}<div class="end">${esc(end)}</div></div></div>`;
}

/* ---------- 筆記總覽 ---------- */
const STAR_ORDER = GROUPS.flatMap(g => g[1]);
const LRANK = { natal:0, decadal:1, yearly:2, monthly:3 };
function parseNotes() {
  return Object.entries(notes).filter(([, v]) => v && v.trim()).map(([key, text]) => {
    let rest = key, layer = null;
    if (rest.startsWith('事件:')) {
      const cat = rest.slice(3);
      return { key, text, ev:cat, title:`事件：${cat}`, gStar:'事件筆記', gPal:'事件筆記', rank:9500 };
    }
    if (rest.startsWith('L:')) { const i = rest.indexOf('|'); layer = rest.slice(2, i); rest = rest.slice(i + 1); }
    const LN = layer ? LNAME[layer] : '';
    if (rest.startsWith('宮:')) {
      const pal = rest.slice(2);
      return { key, text, pal, layer, title:`${LN}${palName(pal)}（宮位筆記）`, gStar:'宮位筆記', gPal:pal, rank:9000 };
    }
    const [star, pal] = rest.split('@');
    return { key, text, star, pal, layer, title: layer ? `${LN}${star}在${LN}${palName(pal)}` : `${star}在${palName(pal)}`,
      gStar: layer ? `${LN}・${star}` : star, gPal:pal, rank: (LRANK[layer || 'natal'] * 1000) + starRank(star), rowKey: layer ? `L:${layer}|${star}` : star, rowLabel: layer ? `${LN}${star}` : star };
  });
}
function whoHas(star, pal) {
  return people.filter(p => {
    const a = chartOf(p); if (!a) return false;
    const f = findStar(a, star); if (!f) return false;
    return (f.pal.name === '命宮' ? '命宮' : shortPal(f.pal.name)) === pal;
  });
}
const starRank = n => { const i = STAR_ORDER.indexOf(n); return i < 0 ? 999 : i; };
function groupNotes(list, byStar) {
  const groups = new Map();
  list.forEach(n => { const g = byStar ? n.gStar : n.gPal; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(n); });
  const gRank = g => byStar ? Math.min(...groups.get(g).map(n => n.rank)) : (g === '事件筆記' ? 99 : PALACES.indexOf(g));
  const keys = [...groups.keys()].sort((a, b) => gRank(a) - gRank(b) || a.localeCompare(b));
  return keys.map(g => [g, groups.get(g).sort((a, b) => byStar
    ? (PALACES.indexOf(a.pal) - PALACES.indexOf(b.pal)) || (LRANK[a.layer || 'natal'] - LRANK[b.layer || 'natal'])
    : a.rank - b.rank)]);
}
function renderPersonNotes(out, q) {
  const hl = t => { const e = esc(t); return q ? e.split(esc(q)).join(`<mark>${esc(q)}</mark>`) : e; };
  const blocks = people.map(p => {
    const obj = pnotes[p.id] || {};
    const keys = ['_summary', ...PALACES].filter(k => obj[k] && (!q || obj[k].includes(q) || p.name.includes(q)));
    if (!keys.length) return '';
    const a = chartOf(p);
    return `<div class="ngroup"><h3><span class="who" data-person="${esc(p.id)}">${esc(p.name)}</span><small>${keys.length} 則</small><button class="go" data-cnopen="${esc(p.id)}">開啟命例檔案</button></h3>
      ${keys.map(k => {
        const pal = a && k !== '_summary' ? a.palaces.find(x => normPal(x.name) === k) : null;
        const title = k === '_summary' ? '整體印象' : `${palName(k)}${pal ? `（${pal.majorStars.map(s => s.name).join('') || '空宮'}）` : ''}`;
        return `<div class="ncard"><div class="nh"><b>${esc(title)}</b></div>${q ? `<div style="white-space:pre-wrap">${hl(obj[k])}</div>` : `<textarea data-pnote="${esc(p.id)}|${esc(k)}">${esc(obj[k])}</textarea>`}</div>`;
      }).join('')}</div>`;
  }).join('');
  setTimeout(growAll, 0);
  out.innerHTML = `<p class="with" style="margin:0 0 12px">每位朋友的「整體印象」與各宮「實際狀況」。要新增，請到命盤頁下方的命例檔案。</p>` + (blocks || `<div class="empty-state"><h2>${q ? '沒有符合的內容' : '還沒有朋友的實際狀況'}</h2><p>到「命盤」頁，在命盤下方的「命例檔案」，替這位朋友寫下他每一宮的真實樣子。</p><button class="btn primary" data-go="chart">去命盤頁</button></div>`);
}
function renderNotes() {
  document.querySelectorAll('[data-ngroup]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ngroup === (ui.ngroup || 'star')));
  const out = $('#notesOut');
  if (ui.ngroup === 'person') { renderPersonNotes(out, ($('#noteSearch').value || '').trim()); return; }
  const all = parseNotes();
  if (!all.length) {
    out.innerHTML = `<div class="empty-state"><h2>還沒有筆記</h2><p>到「對照」頁選一顆星，每個宮位下方都有「寫筆記」，寫下的內容會集中整理在這裡。</p><button class="btn primary" data-go="compare">去對照頁</button></div>`;
    return;
  }
  const q = ($('#noteSearch').value || '').trim();
  const list = q ? all.filter(n => (n.text + n.title).includes(q)) : all;
  const hl = t => { const e = esc(t); return q ? e.split(esc(q)).join(`<mark>${esc(q)}</mark>`) : e; };
  const byStar = (ui.ngroup || 'star') === 'star';

  let map = '';
  if (byStar && !q) {
    const rows = []; const seen = new Set();
    all.filter(n => n.star).sort((a, b) => a.rank - b.rank).forEach(n => { if (!seen.has(n.rowKey)) { seen.add(n.rowKey); rows.push(n); } });
    if (rows.length) {
      const has = new Set(all.map(n => n.key));
      map = `<p class="with" style="margin:0 0 4px;font-size:13px">筆記地圖：紫色圓點代表寫過筆記，點一下跳到那一則。</p><div class="nmap-wrap"><table class="nmap"><thead><tr><th></th>${PALACES.map(p => `<th>${shortPal(p) === '命' ? '命' : shortPal(p === '僕役' ? '交友' : p)}</th>`).join('')}</tr></thead><tbody>
        ${rows.map(r => `<tr><th class="rh">${esc(r.rowLabel)}</th>${PALACES.map(p => { const k = `${r.rowKey}@${p}`; return `<td>${has.has(k) ? `<button class="dot" data-jump="${esc(k)}" title="${esc(r.rowLabel)}在${palName(p)}" aria-label="${esc(r.rowLabel)}在${palName(p)}的筆記"></button>` : '<span class="nil"></span>'}</td>`; }).join('')}</tr>`).join('')}
        </tbody></table></div>`;
    }
  }

  const html = groupNotes(list, byStar).map(([g, items]) => `<div class="ngroup"><h3>${byStar || g === '事件筆記' ? esc(g) : palName(g)}<small>${items.length} 則</small></h3>
      ${items.map(n => {
        const ppl = n.star && !n.layer ? whoHas(n.star, n.pal) : [];
        const go = n.ev ? `<button class="go" data-goevcat="${esc(n.ev)}">看所有朋友的這類事件</button>`
          : n.star ? `<button class="go" data-gostar="${esc(n.star)}" data-golayer="${n.layer || 'natal'}">看所有朋友的${n.layer ? LNAME[n.layer] : ''}${esc(n.star)}</button>`
          : `<button class="go" data-gopal="${esc(n.pal)}" data-golayer="${n.layer || 'natal'}">看所有朋友的${n.layer ? LNAME[n.layer] : ''}${palName(n.pal)}</button>`;
        return `<div class="ncard" id="n-${encodeURIComponent(n.key)}"><div class="nh"><b>${hl(n.title)}</b>${go}</div>
          ${q ? `<div style="white-space:pre-wrap">${hl(n.text)}</div>` : `<textarea data-note="${esc(n.key)}">${esc(n.text)}</textarea><div class="note-tools"><button type="button" class="note-expand" data-expand="${esc(n.key)}" data-title="${esc(n.title)}">⤢ 放大編輯</button></div>`}
          ${n.star && !n.layer ? `<div class="ppl">${ppl.length ? '目前符合的朋友：' + ppl.map(p => `<span class="who" data-person="${esc(p.id)}">${esc(p.name)}</span>`).join('、') : '目前沒有朋友是這個組合'}</div>` : ''}</div>`;
      }).join('')}</div>`).join('');
  setTimeout(growAll, 0);
  out.innerHTML = `<p class="with" style="margin:0 0 12px">共 ${all.length} 則筆記${q ? `，符合「${esc(q)}」的有 ${list.length} 則` : ''}。${!q ? '直接在這裡修改也會自動儲存。' : ''}</p>` + map + (html || '<p class="with">沒有符合的筆記。</p>');
}
function notesMarkdown() {
  const all = parseNotes();
  let md = `# 紫微斗數學習筆記\n\n匯出日期：${new Date().toISOString().slice(0, 10)}，共 ${all.length} 則\n`;
  const pm = people.filter(p => pnotes[p.id]).map(p => {
    const o = pnotes[p.id]; let t = `\n### ${p.name}\n`;
    ['_summary', ...PALACES].filter(k => o[k]).forEach(k => { t += `\n**${k === '_summary' ? '整體印象' : palName(k)}**：${o[k]}\n`; });
    return t;
  }).join('');
  if (pm) md += `\n## 朋友的實際狀況\n` + pm;
  groupNotes(all, true).forEach(([g, items]) => {
    md += `\n## ${g}\n`;
    items.forEach(n => {
      md += `\n### ${n.title}\n\n${n.text}\n`;
      if (n.star && !n.layer) { const ppl = whoHas(n.star, n.pal); if (ppl.length) md += `\n> 符合的朋友：${ppl.map(p => p.name).join('、')}\n`; }
    });
  });
  return md;
}
$('#noteSearch').addEventListener('input', () => renderNotes());
document.querySelector('#v-notes .seg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ui.ngroup = b.dataset.ngroup; saveUI(); renderNotes(); } });
$('#noteMdBtn').addEventListener('click', () => {
  if (!parseNotes().length && !Object.keys(pnotes).length) { toast('還沒有筆記可以下載'); return; }
  saveFile(`紫微筆記-${new Date().toISOString().slice(0, 10)}.md`, notesMarkdown(), 'text/markdown;charset=utf-8');
});
$('#notesOut').addEventListener('click', e => {
  const j = e.target.closest('[data-jump]'), gs = e.target.closest('[data-gostar]'), gp = e.target.closest('[data-gopal]');
  if (j) { const el = document.getElementById('n-' + encodeURIComponent(j.dataset.jump)); if (el) { el.scrollIntoView({ behavior:'smooth', block:'start' }); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } }
  const ge = e.target.closest('[data-goevcat]');
  if (gs) { ui.star = gs.dataset.gostar; ui.mode = 'star'; ui.cLayer = gs.dataset.golayer; go('compare'); }
  if (gp) { ui.palace = gp.dataset.gopal; ui.mode = 'palace'; ui.cLayer = gp.dataset.golayer; go('compare'); }
  const co = e.target.closest('[data-cnopen]');
  if (co) { ui.person = co.dataset.cnopen; go('chart'); setTimeout(() => document.getElementById('cnotes')?.scrollIntoView({ block:'start' }), 50); }
  if (ge) { ui.evCat = ge.dataset.goevcat; ui.mode = 'event'; go('compare'); }
});

/* ---------- 星曜卡 ---------- */
function cardArt(n, big) {
  const img = cards[n] && cards[n].img;
  return img ? `<img src="${img}" alt="">` : `<span class="emo${big ? ' big' : ''}" aria-hidden="true">${CARD[n].icon}</span>`;
}
function miniCard(n) {
  return `<div class="fcard g-${CARD[n].cls}" data-opencard="${esc(n)}" title="打開${esc(n)}的星曜卡">${cardArt(n)}<span>${esc(cardKw(n))}</span></div>`;
}
function derivePrompt(star, n) {
  return `推推看：${star}（${cardKw(star)}）落在${palName(n)}（${palAnn(n)}），會是什麼樣子？先寫下你的推論，再對照課程筆記。`;
}
const noteCount = n => PALACES.filter(p => notes[`${n}@${p}`]).length;
function renderCards() {
  const mode = ui.cardMode || 'grid';
  document.querySelectorAll('#v-cards [data-cardmode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cardmode === mode));
  $('#cardGroup').innerHTML = ['全部', ...CARD_GROUPS.map(g => g[0]), '不熟的'].map(g => `<option${g === (ui.cardGroup || '全部') ? ' selected' : ''}>${g}</option>`).join('');
  $('#quizDir').hidden = mode !== 'quiz';
  document.querySelectorAll('#v-cards [data-quizdir]').forEach(b => b.setAttribute('aria-pressed', b.dataset.quizdir === (ui.quizDir || 'kw')));
  const out = $('#cardsOut');
  $('#cardGroup').hidden = mode === 'pal';
  if (mode === 'quiz') { renderQuiz(out); return; }
  if (mode === 'pal') { renderPalCards(out); return; }
  const pick = ui.cardGroup || '全部';
  const groups = CARD_GROUPS.filter(g => pick === '全部' || pick === '不熟的' || g[0] === pick);
  out.innerHTML = `<p class="with" style="margin:0 0 12px">每顆星先記住一個核心特質，再放進宮位的場景裡推。點卡片可以看這顆星在十二宮的筆記，也可以改關鍵字、放自己的圖。</p>` + groups.map(([g, cls, list]) => {
    const items = list.filter(([n]) => pick !== '不熟的' || (cards[n]?.miss || 0) > (cards[n]?.ok || 0));
    if (!items.length) return '';
    return `<h3 class="cg-h">${g}</h3><div class="cgrid">${items.map(([n]) => {
      const nc = noteCount(n), inMing = whoHas(n, '命宮').length;
      return `<button type="button" class="scard g-${cls}" data-opencard="${esc(n)}"><div class="art">${cardArt(n, true)}</div><div class="nm">${esc(n)}</div><div class="kw">${esc(cardKw(n))}</div>${starAnn(n) ? `<div class="ann">${esc(starAnn(n))}</div>` : ''}<div class="ft">筆記 ${nc}/12 宮${inMing ? `・命宮 ${inMing} 人` : ''}</div></button>`;
    }).join('')}</div>`;
  }).join('') || '<p class="with">目前沒有標記為不熟的星。到「練習」模式按「不熟」，這裡就會列出來。</p>';
}
function renderPalCards(out) {
  out.innerHTML = `<p class="with" style="margin:0 0 12px">每一宮的註解會出現在命盤、對照頁和「推推看」提示裡。改成課堂上學到的說法，看盤時就能隨時對照。</p>
    <div class="pgrid">${PALACES.map(n => {
      const gk = `宮:${n}`, nc = parseNotes().filter(x => x.pal === n && !x.layer).length;
      return `<div class="pcard"><div class="pc-h"><b>${palName(n)}</b><span class="with">${palStruct(n)}</span></div>
        <textarea data-ann="宮:${n}" rows="3" maxlength="300" placeholder="這一宮管什麼？">${esc(palAnn(n))}</textarea>
        <div class="pc-f"><span class="with">相關筆記 ${nc} 則</span>
          ${anns[gk] != null ? `<button class="go" type="button" data-ann-reset="${gk}">恢復預設</button>` : ''}
          <button class="go" type="button" data-gopal="${esc(n)}">看所有朋友的${palName(n)}</button></div></div>`;
    }).join('')}</div>`;
}
let annT;
function setAnn(key, value) {
  anns[key] = value.trim();
  clearTimeout(annT); annT = setTimeout(() => save(KEY_A, anns), 400);
}
// 註解在任何頁面都可以編輯（星卡、宮位卡、命盤詳情）
document.addEventListener('input', e => { const t = e.target.closest('[data-ann]'); if (t) setAnn(t.dataset.ann, t.value); });
document.addEventListener('click', e => {
  const r = e.target.closest('[data-ann-reset]');
  if (r) { delete anns[r.dataset.annReset]; save(KEY_A, anns); if (cardDlgEl.open) renderCardDetail(cardDlgEl.dataset.star); refresh(); toast('已恢復預設註解'); return; }
});
const cardDlgEl = $('#cardDlg');
function renderCardDetail(n) {
  const c = CARD[n];
  cardDlgEl.dataset.star = n;
  const rows = PALACES.map(p => {
    const k = `${n}@${p}`, v = notes[k] || '', ppl = whoHas(n, p);
    return `<div class="cd-row"><div class="cd-p"><b>${palName(p)}</b><small>${esc(palAnn(p))}</small></div>
      <div class="cd-n">${v ? `<div class="cn-x">${esc(v)}</div>` : ''}
        <button type="button" class="note-expand" data-expand="${esc(k)}" data-title="${esc(n)}在${palName(p)}" data-ph="${esc(derivePrompt(n, p))}">${v ? '編輯' : '＋ 推推看'}</button>
        ${ppl.length ? `<span class="ppl">符合：${ppl.map(x => esc(x.name)).join('、')}</span>` : ''}</div></div>`;
  }).join('');
  $('#cardDlgBody').innerHTML = `<div class="cd-top g-${c.cls}">
      <div class="scard big g-${c.cls}"><div class="art">${cardArt(n, true)}</div><div class="nm">${esc(n)}</div><div class="kw">${esc(cardKw(n))}</div></div>
      <div class="cd-meta">
        <div class="with">${c.g}</div>
        <label class="f">核心特質（可以改成你自己的話）<input type="text" data-card-kw="${esc(n)}" value="${esc(cardKw(n))}" maxlength="30"></label>
        <label class="f">註解（五行、化氣、課堂補充…）<textarea data-ann="星:${esc(n)}" rows="2" maxlength="300">${esc(starAnn(n))}</textarea></label>
        <div class="inline">
          <label class="btn">放自己的圖片<input type="file" accept="image/*" data-card-img="${esc(n)}" hidden></label>
          ${cards[n]?.img ? `<button class="btn" type="button" data-card-imgdel="${esc(n)}">移除圖片</button>` : ''}
          ${cards[n]?.kw != null ? `<button class="btn" type="button" data-card-kwreset="${esc(n)}">恢復原本關鍵字</button>` : ''}
          ${anns['星:' + n] != null ? `<button class="btn" type="button" data-ann-reset="星:${esc(n)}">恢復預設註解</button>` : ''}
        </div>
        <p class="hint">圖片只存在這台裝置的瀏覽器，不會上傳到網站，可以放你自己畫的圖或手寫筆記的照片。</p>
        <div class="inline"><button class="btn primary" type="button" data-card-compare="${esc(n)}">到對照頁看所有朋友的${esc(n)}</button></div>
      </div></div>
    <h4 class="cd-h">${esc(n)}在十二宮（已寫 ${noteCount(n)} 宮）</h4>${rows}`;
}
function openCard(n) {
  if (!CARD[n]) return;
  renderCardDetail(n);
  $('#cardDlgTitle').textContent = `${n}・星曜卡`;
  if (cardDlgEl.showModal) cardDlgEl.showModal(); else cardDlgEl.setAttribute('open', '');
}
// 練習：不熟的星出現機率較高
let quizCur = null, quizShown = false, quizScore = { ok:0, all:0 };
function quizPool() {
  const pick = ui.cardGroup || '全部';
  return CARD_GROUPS.filter(g => pick === '全部' || pick === '不熟的' || g[0] === pick).flatMap(g => g[2].map(x => x[0]))
    .filter(n => pick !== '不熟的' || (cards[n]?.miss || 0) > (cards[n]?.ok || 0));
}
function quizNext() {
  const pool = quizPool(); if (!pool.length) { quizCur = null; return; }
  const w = pool.map(n => 1 + 2 * Math.max(0, (cards[n]?.miss || 0) - (cards[n]?.ok || 0)) + (n === quizCur ? -1 : 0));
  let r = Math.random() * w.reduce((x, y) => x + Math.max(y, 0.01), 0);
  quizCur = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) { r -= Math.max(w[i], 0.01); if (r <= 0) { quizCur = pool[i]; break; } }
  quizShown = false;
}
function renderQuiz(out) {
  if (!quizCur || !quizPool().includes(quizCur)) quizNext();
  if (!quizCur) { out.innerHTML = '<p class="with">這個分類目前沒有卡片。</p>'; return; }
  const n = quizCur, c = CARD[n], dir = ui.quizDir || 'kw';
  const front = dir === 'kw'
    ? `<div class="art">${cardArt(n, true)}</div><div class="nm">${esc(n)}</div><div class="kw${quizShown ? '' : ' q'}">${quizShown ? esc(cardKw(n)) : '？'}</div>${quizShown && starAnn(n) ? `<div class="ann">${esc(starAnn(n))}</div>` : ''}`
    : `<div class="art">${quizShown ? cardArt(n, true) : '<span class="emo big">？</span>'}</div><div class="nm">${quizShown ? esc(n) : '這是哪顆星？'}</div><div class="kw">${esc(cardKw(n))}</div>`;
  const notesList = quizShown ? PALACES.filter(p => notes[`${n}@${p}`]).slice(0, 3).map(p => `<div class="cn-item"><div class="cn-t">${esc(n)}在${palName(p)}</div><div class="cn-x">${esc(notes[`${n}@${p}`])}</div></div>`).join('') : '';
  out.innerHTML = `<div class="quiz">
    <p class="with">本輪 ${quizScore.ok} / ${quizScore.all}　・　${dir === 'kw' ? '看星，想想它的核心特質' : '看特質，想想是哪顆星'}</p>
    <div class="scard qcard g-${c.cls}">${front}</div>
    ${quizShown ? `<div class="qbtns"><button class="btn primary" data-quiz="ok">記得</button><button class="btn" data-quiz="miss">不熟</button></div>
      ${notesList ? `<div class="qnotes"><div class="with" style="font-size:13px">你寫過的筆記：</div>${notesList}</div>` : `<p class="with">你還沒寫過${esc(n)}的筆記。<button class="go" data-opencard="${esc(n)}">打開星曜卡寫一則</button></p>`}`
      : `<div class="qbtns"><button class="btn primary" data-quiz="show">翻牌</button><button class="btn" data-quiz="skip">跳過</button></div>`}
  </div>`;
}
let ckw;
document.getElementById('v-cards').addEventListener('click', e => {
  const m = e.target.closest('[data-cardmode]'); if (m) { ui.cardMode = m.dataset.cardmode; saveUI(); renderCards(); return; }
  const qd = e.target.closest('[data-quizdir]'); if (qd) { ui.quizDir = qd.dataset.quizdir; saveUI(); quizShown = false; renderCards(); return; }
  const q = e.target.closest('[data-quiz]');
  if (q) {
    const act = q.dataset.quiz;
    if (act === 'show') quizShown = true;
    else if (act === 'skip') quizNext();
    else {
      cards[quizCur] = Object.assign({}, cards[quizCur]); cards[quizCur][act] = (cards[quizCur][act] || 0) + 1; save(KEY_C, cards);
      quizScore.all++; if (act === 'ok') quizScore.ok++; quizNext();
    }
    renderCards(); return;
  }
  const del = e.target.closest('[data-card-imgdel]');
  if (del) { const n = del.dataset.cardImgdel; if (cards[n]) { delete cards[n].img; save(KEY_C, cards); } renderCardDetail(n); renderCards(); return; }
  const rs = e.target.closest('[data-card-kwreset]');
  if (rs) { const n = rs.dataset.cardKwreset; if (cards[n]) { delete cards[n].kw; save(KEY_C, cards); } renderCardDetail(n); renderCards(); return; }
  const cmp = e.target.closest('[data-card-compare]');
  if (cmp) { save(KEY_A, anns); cardDlgEl.close(); ui.star = cmp.dataset.cardCompare; ui.mode = 'star'; ui.cLayer = 'natal'; go('compare'); return; }
});
document.getElementById('v-cards').addEventListener('click', e => { const gp = e.target.closest('[data-gopal]'); if (gp) { ui.palace = gp.dataset.gopal; ui.mode = 'palace'; ui.cLayer = 'natal'; go('compare'); } });
$('#cardGroup').addEventListener('change', e => { ui.cardGroup = e.target.value; saveUI(); quizCur = null; renderCards(); });
document.getElementById('v-cards').addEventListener('input', e => {
  const k = e.target.closest('[data-card-kw]'); if (!k) return;
  const n = k.dataset.cardKw; cards[n] = Object.assign({}, cards[n], { kw: k.value.trim() });
  clearTimeout(ckw); ckw = setTimeout(() => { save(KEY_C, cards); renderCards(); }, 400);
  cardDlgEl.querySelector('.scard.big .kw').textContent = k.value.trim();
});
async function fileToThumb(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
    const sc = Math.min(1, 360 / Math.max(img.width, img.height));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}
document.getElementById('v-cards').addEventListener('change', async e => {
  const inp = e.target.closest('[data-card-img]'); if (!inp || !inp.files[0]) return;
  const n = inp.dataset.cardImg;
  try { cards[n] = Object.assign({}, cards[n], { img: await fileToThumb(inp.files[0]) }); save(KEY_C, cards); renderCardDetail(n); renderCards(); toast('已放上圖片'); }
  catch { toast('這個檔案無法當作圖片使用'); }
});
$('#cardDlgClose').addEventListener('click', () => { save(KEY_A, anns); cardDlgEl.close(); });
cardDlgEl.addEventListener('close', () => { if (ui.view === 'cards') renderCards(); if (ui.view === 'compare') renderCompare(); });
// 任何頁面點小卡片都能打開星曜卡
document.querySelector('main').addEventListener('click', e => { const oc = e.target.closest('[data-opencard]'); if (oc) openCard(oc.dataset.opencard); });

/* ---------- 朋友 ---------- */
function renderPeople() {
  $('#plist').innerHTML = people.length ? people.map(p => {
    const a = chartOf(p);
    const ming = a && a.palaces.find(x => x.name === '命宮');
    const mj = ming ? (ming.majorStars.map(s => s.name).join('') || '命無主星') : '排盤失敗';
    return `<div class="pitem"><div class="meta"><b>${esc(p.name)}</b>
      <div>${p.gender}・${p.calendar === 'lunar' ? '農曆' : '國曆'} ${p.y}/${p.m}/${p.d}${p.leap ? '（閏）' : ''}・${p.timeMode === 'clock' ? esc(p.clock) + ' ' + esc(p.place) : TIMES[p.time].split(' ')[0]}・${esc(mj)}</div></div>
      <button class="btn" data-edit="${esc(p.id)}">編輯</button>
      <button class="btn danger" data-del="${esc(p.id)}">刪除</button></div>`;
  }).join('') : '<p class="with" style="padding:12px 0">還沒有朋友。用右邊的表單新增，或先加入範例試試看。</p>';
}
$('#fTime').innerHTML = TIMES.map((t, i) => `<option value="${i}">${t}</option>`).join('');
$('#fPlace').innerHTML = PLACES.map(x => `<option>${x[0]}</option>`).join('') + '<option>其他</option>';
const tmVal = () => document.querySelector('input[name=tm]:checked').value;
function syncTimeUI() {
  const clock = tmVal() === 'clock';
  $('#clockWrap').hidden = !clock; $('#hourWrap').hidden = clock;
  $('#lonWrap').hidden = $('#fPlace').value !== '其他';
  previewTST();
}
function formPerson() {
  return {
    name: $('#fName').value.trim(),
    gender: document.querySelector('input[name=g]:checked').value,
    calendar: document.querySelector('input[name=cal]:checked').value,
    y: +$('#fY').value, m: +$('#fM').value, d: +$('#fD').value,
    leap: $('#fLeap').checked && document.querySelector('input[name=cal]:checked').value === 'lunar',
    timeMode: tmVal(), clock: $('#fClock').value || '12:00',
    place: $('#fPlace').value, lon: $('#fLon').value, tz: $('#fTz').value, dst: $('#fDst').checked,
    time: +$('#fTime').value, note: $('#fNote').value.trim(), alias: $('#fAlias').value.trim(),
  };
}
function previewTST() {
  const el = $('#tstPreview'); el.textContent = '';
  const p = formPerson();
  if (p.timeMode !== 'clock' || !p.y || !p.m || !p.d) return;
  if (p.place === '其他' && (!p.lon || !p.tz)) { el.textContent = '請填經度與時區'; return; }
  try {
    const b = birthOf(p);
    el.textContent = `真太陽時 ${b.label}　→　${TIMES[b.time].split(' ')[0]}`;
  } catch { }
}
document.querySelectorAll('input[name=tm]').forEach(r => r.addEventListener('change', syncTimeUI));
['#fPlace','#fClock','#fY','#fM','#fD','#fLon','#fTz','#fDst','#fLeap'].forEach(id => $(id).addEventListener('input', syncTimeUI));
document.querySelectorAll('input[name=cal]').forEach(r => r.addEventListener('change', previewTST));

function resetForm() {
  $('#pform').reset(); $('#fId').value = ''; $('#fErr').textContent = '';
  $('#formTitle').textContent = '新增朋友'; $('#cancelBtn').hidden = true; $('#leapWrap').hidden = true;
  $('#fClock').value = '12:00'; syncTimeUI();
}
function fillForm(p) {
  $('#fId').value = p.id; $('#fName').value = p.name;
  document.querySelector(`input[name=g][value="${p.gender}"]`).checked = true;
  document.querySelector(`input[name=cal][value="${p.calendar}"]`).checked = true;
  $('#fY').value = p.y; $('#fM').value = p.m; $('#fD').value = p.d; $('#fLeap').checked = !!p.leap;
  $('#leapWrap').hidden = p.calendar !== 'lunar';
  $('#fTime').value = p.time; $('#fNote').value = p.note || ''; $('#fAlias').value = p.alias || '';
  const mode = p.timeMode === 'clock' ? 'clock' : 'hour';
  document.querySelector(`input[name=tm][value="${mode}"]`).checked = true;
  $('#fClock').value = p.clock || '12:00'; $('#fPlace').value = p.place || '台北';
  $('#fLon').value = p.lon || ''; $('#fTz').value = p.tz || 8; $('#fDst').checked = !!p.dst;
  syncTimeUI();
  $('#formTitle').textContent = '編輯：' + p.name; $('#cancelBtn').hidden = false;
  $('#fName').focus();
}
document.querySelectorAll('input[name=cal]').forEach(r => r.addEventListener('change', () => {
  $('#leapWrap').hidden = document.querySelector('input[name=cal]:checked').value !== 'lunar';
}));
$('#cancelBtn').addEventListener('click', resetForm);
$('#pform').addEventListener('submit', e => {
  e.preventDefault();
  const p = Object.assign({ id: $('#fId').value || 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }, formPerson());
  if (p.timeMode === 'clock' && p.place === '其他' && (!p.lon || !p.tz)) { $('#fErr').textContent = '選「其他」時請填出生地的經度與時區。'; return; }
  if (p.calendar === 'solar') {
    const dt = new Date(p.y, p.m - 1, p.d);
    if (dt.getMonth() !== p.m - 1) { $('#fErr').textContent = `${p.y} 年 ${p.m} 月沒有 ${p.d} 日，請檢查日期。`; return; }
  }
  cache.delete(p.id);
  if (!chartOf(p)) { $('#fErr').textContent = '這組生日排不出盤。農曆請確認月份與閏月是否正確。'; return; }
  const i = people.findIndex(x => x.id === p.id);
  if (i >= 0) people[i] = p; else people.push(p);
  save(KEY_P, people); resetForm(); refresh(); toast(i >= 0 ? '已更新' : `已新增 ${p.name}`);
});

$('#plist').addEventListener('click', e => {
  const ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
  if (ed) fillForm(people.find(p => p.id === ed.dataset.edit));
  if (del) {
    const p = people.find(x => x.id === del.dataset.del);
    if (confirm(`確定刪除「${p.name}」？他的事件紀錄和實際狀況筆記也會一起刪除。`)) { people = people.filter(x => x !== p); delete events[p.id]; delete pnotes[p.id]; save(KEY_P, people); save(KEY_E, events); save(KEY_PN, pnotes); refresh(); toast('已刪除'); }
  }
});

/* 匯出／匯入 */
async function saveFile(name, text, type) {
  const blob = new Blob([text], { type });
  const touch = window.matchMedia('(pointer:coarse)').matches;
  if (touch && window.File && navigator.canShare) {
    const file = new File([blob], name, { type });
    if (navigator.canShare({ files:[file] })) {
      try { await navigator.share({ files:[file], title:name }); return true; }
      catch (e) { if (e.name === 'AbortError') return false; }
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}
async function doBackup() {
  const data = { version:4, exportedAt:new Date().toISOString(), people, notes, events, pnotes, cards, anns, settings };
  const ok = await saveFile(`ziwei-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), 'application/json');
  if (ok) { meta.lastBackup = Date.now(); save(KEY_M, meta); renderBackupBanner(); toast('已匯出備份'); }
}
$('#exportBtn').addEventListener('click', doBackup);
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.people)) throw 0;
    const ids = new Set(people.map(p => p.id));
    const add = data.people.filter(p => !ids.has(p.id));
    people = people.concat(add);
    notes = Object.assign({}, data.notes || {}, notes);
    let ev = 0;
    Object.entries(data.events || {}).forEach(([pid, list]) => {
      const have = new Set((events[pid] || []).map(x => x.id));
      const nw = (list || []).filter(x => !have.has(x.id)); ev += nw.length;
      events[pid] = (events[pid] || []).concat(nw);
    });
    Object.entries(data.pnotes || {}).forEach(([pid, obj]) => { pnotes[pid] = Object.assign({}, obj, pnotes[pid] || {}); });
    Object.entries(data.cards || {}).forEach(([n, obj]) => { cards[n] = Object.assign({}, obj, cards[n] || {}); }); save(KEY_C, cards);
    anns = Object.assign({}, data.anns || {}, anns); save(KEY_A, anns);
    save(KEY_P, people); save(KEY_N, notes); save(KEY_E, events); save(KEY_PN, pnotes); refresh();
    toast(`匯入 ${add.length} 位朋友${ev ? `、${ev} 筆事件` : ''}`);
  } catch { toast('這個檔案不是本網頁匯出的備份'); }
  e.target.value = '';
});
$('#sampleBtn').addEventListener('click', () => {
  people.push(
    { id:'demoA', name:'範例・小安', gender:'女', calendar:'solar', y:1992, m:3, d:14, leap:false, time:6, note:'範例資料，可刪除' },
    { id:'demoB', name:'範例・阿哲', gender:'男', calendar:'solar', y:1988, m:11, d:2, leap:false, time:9, note:'範例資料，可刪除' });
  people = people.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);
  save(KEY_P, people); refresh(); toast('已加入範例');
});

/* ---------- 導覽與事件 ---------- */
function go(view) {
  ui.view = view; saveUI();
  document.querySelectorAll('nav button').forEach(b => b.setAttribute('aria-current', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + view));
  refresh(); window.scrollTo(0, 0);
}
function refresh() {
  if (ui.view === 'compare') { fillSelectors(); renderCompare(); }
  if (ui.view === 'chart') renderChart();
  if (ui.view === 'people') renderPeople();
  if (ui.view === 'notes') renderNotes();
  if (ui.view === 'cards') renderCards();
}
document.querySelector('nav').addEventListener('click', e => { const b = e.target.closest('button'); if (b) go(b.dataset.view); });
document.querySelector('.seg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { ui.mode = b.dataset.mode; saveUI(); renderCompare(); } });
$('#starSel').addEventListener('change', e => { ui.star = e.target.value; saveUI(); renderCompare(); });
$('#palSel').addEventListener('change', e => { ui.palace = e.target.value; saveUI(); renderCompare(); });
$('#evCatSel').addEventListener('change', e => { ui.evCat = e.target.value; saveUI(); renderCompare(); });
$('#layerSel').addEventListener('change', e => { ui.cLayer = e.target.value; saveUI(); renderCompare(); });
$('#cYear').addEventListener('change', e => { const v = +e.target.value; if (v >= 1900 && v <= 2100) { ui.cYear = v; saveUI(); renderCompare(); } });
$('#personSel').addEventListener('change', e => { ui.person = e.target.value; saveUI(); renderChart(); });
$('#partnerSel').addEventListener('change', e => { ui.partner = e.target.value || null; saveUI(); renderChart(); });
function swapPair() { if (!ui.partner) return; const t = ui.person; ui.person = ui.partner; ui.partner = t; saveUI(); renderChart(); }
$('#swapBtn').addEventListener('click', swapPair);
$('#toNotesBtn').addEventListener('click', () => document.getElementById('cnotes')?.scrollIntoView({ behavior:'smooth', block:'start' }));
$('#detailSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ui.detail = b.dataset.detail; saveUI(); renderChart(); });

document.querySelector('main').addEventListener('click', e => {
  if (e.target.closest('[data-swap]')) { swapPair(); return; }
  const cm = e.target.closest('[data-cn-mode]');
  if (cm) { ui.cnMode = cm.dataset.cnMode; saveUI(); const y = window.scrollY; renderChart(); window.scrollTo(0, y); return; }
  const cp = e.target.closest('[data-copy-to]');
  if (cp) {
    const [pid, to, src, ...rest] = cp.dataset.copyTo.split('|'); const key = rest.join('|');
    let text = '';
    if (src === 'note') text = notes[key] || '';
    else { const [oid, ...kk] = key.split('|'); text = pn(oid, kk.join('|')); }
    const cur = pn(pid, to);
    if (cur.includes(text)) { toast('已經複製過了'); return; }
    setPNote(pid, to, cur ? cur + '\n\n' + text : text);
    save(KEY_PN, pnotes); toast('已複製，可以再修改成只屬於他的內容');
    const y = window.scrollY; renderChart(); window.scrollTo(0, y); return;
  }
  const cne = e.target.closest('[data-cn-empty]');
  if (cne) { ui.cnEmpty = cne.checked; saveUI(); renderChart(); document.getElementById('cnotes')?.scrollIntoView({ block:'start' }); return; }
  if (e.target.closest('[data-cn-md]')) { const p = people.find(x => x.id === ui.person); const a = chartOf(p); saveFile(`${p.name}-命例檔案.md`, chartNotesMarkdown(p, a, horOf(a)), 'text/markdown;charset=utf-8'); return; }
  const evv = e.target.closest('[data-ev-view]'), evd = e.target.closest('[data-ev-del]'), sfc = e.target.closest('[data-sf]');
  if (sfc) { ui.sf = sfc.checked; saveUI(); renderChart(); return; }
  const anc = e.target.closest('[data-anns]');
  if (anc) { ui.anns = anc.checked; saveUI(); renderChart(); return; }
  const icc = e.target.closest('[data-icons]');
  if (icc) { ui.icons = icc.checked; saveUI(); renderChart(); return; }
  if (evd) {
    const list = events[ui.person] || []; const ev = list.find(x => x.id === evd.dataset.evDel);
    if (ev && confirm(`刪除「${ev.y} ${ev.text}」？`)) { events[ui.person] = list.filter(x => x !== ev); save(KEY_E, events); renderChart(); toast('已刪除事件'); }
    return;
  }
  if (evv) {
    const ev = (events[ui.person] || []).find(x => x.id === evv.dataset.evView);
    const a = chartOf(people.find(x => x.id === ui.person)); const info = ev && eventInfo(a, ev);
    if (info) {
      ui.horOn = true; ui.horY = info.lun.lunarYear; if (ev.m) ui.horM = info.lun.lunarMonth;
      ui.layers = Object.assign({}, DEFAULT_LAYERS, { monthly:!!ev.m });
      ui.selBr = info.yr.earthlyBranch; saveUI(); renderChart();
      document.querySelector('.horbox')?.scrollIntoView({ behavior:'smooth', block:'start' });
    }
    return;
  }
  const hon = e.target.closest('[data-hor-on]'), lyr = e.target.closest('[data-layer]'), ht = e.target.closest('[data-hor-today]');
  const dc = e.target.closest('[data-dec]'), yr = e.target.closest('[data-year]'), mo = e.target.closest('[data-month]');
  const dy = e.target.closest('[data-day]'), hr = e.target.closest('[data-hour]');
  if (dy) { ui.horD = +dy.dataset.day; saveUI(); renderChart(); return; }
  if (hr) { ui.horT = +hr.dataset.hour; saveUI(); renderChart(); return; }
  if (hon) { ui.horOn = hon.checked; saveUI(); renderChart(); return; }
  if (lyr) { ui.layers = Object.assign({}, DEFAULT_LAYERS, ui.layers, { [lyr.dataset.layer]: lyr.checked }); saveUI(); renderChart(); return; }
  if (ht) { ui.horY = null; ui.horM = null; ui.horD = null; ui.horT = null; todayLunar = null; saveUI(); renderChart(); return; }
  if (dc) { const p = people.find(x => x.id === ui.person); const a = chartOf(p); ui.horY = a.rawDates.lunarDate.lunarYear + (+dc.dataset.dec) - 1; saveUI(); renderChart(); return; }
  if (yr) { ui.horY = +yr.dataset.year; saveUI(); renderChart(); return; }
  if (mo) { ui.horM = +mo.dataset.month; if (!ui.horY) ui.horY = getTodayLunar().y; saveUI(); renderChart(); return; }
  const lb = e.target.closest('[data-line]'), sc = e.target.closest('[data-scope]'), chb = e.target.closest('[data-chain]'), cn = e.target.closest('[data-chain-br]');
  if (lb) { const h = lb.dataset.line; ui.lines = (ui.lines || []).includes(h) ? ui.lines.filter(x => x !== h) : [...(ui.lines || []), h]; saveUI(); renderChart(); return; }
  if (sc) { ui.scope = sc.dataset.scope; saveUI(); renderChart(); return; }
  if (chb) { ui.chainHua = +chb.dataset.chain; saveUI(); renderChart(); return; }
  if (cn) { ui.selBr = cn.dataset.chainBr; saveUI(); renderChart(); return; }
  const cell = e.target.closest('.cell[data-br]');
  const narrow = window.matchMedia('(max-width:700px)').matches;
  if (cell && (narrow || !e.target.closest('.s.clickable'))) {
    ui.selBr = cell.dataset.br; saveUI(); renderChart();
    if (narrow) document.querySelector('.pdetail')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    return;
  }
  const s = e.target.closest('.s.clickable');
  const w = e.target.closest('.who');
  const g = e.target.closest('[data-go]');
  if (s) { ui.star = s.dataset.star; ui.mode = 'star'; go('compare'); }
  else if (w) {
    ui.person = w.dataset.person;
    if (w.dataset.hyear) { ui.horOn = true; ui.horY = +w.dataset.hyear; ui.layers = Object.assign({}, DEFAULT_LAYERS, ui.layers, { decadal:true, yearly:true }); }
    go('chart');
  }
  else if (g) go(g.dataset.go);
});
document.querySelector('main').addEventListener('submit', e => {
  if (e.target.id !== 'evForm') return;
  e.preventDefault();
  const y = +$('#evY').value, m = +$('#evM').value || null, cat = $('#evCat').value, text = $('#evText').value.trim();
  if (!y || !text) return;
  const ev = { id:'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), y, m, cat, text };
  (events[ui.person] ||= []).push(ev); save(KEY_E, events);
  ui.lastEvCat = cat; saveUI(); renderChart(); toast('已新增事件');
  const c = $('#evCat'); if (c) c.value = cat;
});
let nt;
/* ---------- 筆記編輯：自動長高、放大編輯 ---------- */
function autoGrow(t) {
  if (!t || !t.offsetParent) return;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight + 4, Math.max(260, window.innerHeight * 0.6)) + 'px';
}
function setNote(key, value) {
  const v = value.trim();
  if (v) notes[key] = v; else delete notes[key];
  clearTimeout(nt); nt = setTimeout(() => save(KEY_N, notes), 400);
  // 同步頁面上其他相同筆記的欄位與摘要
  document.querySelectorAll('textarea[data-note]').forEach(t => { if (t.dataset.note === key && t.value !== value) { t.value = value; autoGrow(t); } });
  document.querySelectorAll('details.note').forEach(d => {
    const t = d.querySelector('textarea[data-note]'); if (!t || t.dataset.note !== key) return;
    const sm = d.querySelector('summary');
    if (v) { sm.classList.add('has'); sm.textContent = '我的筆記：' + v.slice(0, 30) + (v.length > 30 ? '…' : ''); }
  });
}
let pnt;
function setPNote(pid, k, value) {
  const v = value.trim();
  pnotes[pid] ||= {};
  if (v) pnotes[pid][k] = v; else delete pnotes[pid][k];
  if (!Object.keys(pnotes[pid]).length) delete pnotes[pid];
  clearTimeout(pnt); pnt = setTimeout(() => save(KEY_PN, pnotes), 400);
  document.querySelectorAll('textarea[data-pnote]').forEach(t => { if (t.dataset.pnote === `${pid}|${k}` && t.value !== value) { t.value = value; autoGrow(t); } });
}
document.querySelector('main').addEventListener('input', e => {
  const tp = e.target.closest('textarea[data-pnote]');
  if (tp) { autoGrow(tp); const [pid, ...k] = tp.dataset.pnote.split('|'); setPNote(pid, k.join('|'), tp.value); return; }
  const t = e.target.closest('textarea[data-note]'); if (!t) return;
  autoGrow(t);
  setNote(t.dataset.note, t.value);
});
document.querySelector('main').addEventListener('click', e => { const sn = e.target.closest('.pn-snip'); if (sn) sn.classList.toggle('open'); });
document.querySelector('main').addEventListener('toggle', e => {
  if (e.target.matches && e.target.matches('details.note') && e.target.open) autoGrow(e.target.querySelector('textarea'));
}, true);
const dlg = $('#noteDlg'), dlgText = $('#noteDlgText');
document.querySelector('main').addEventListener('click', e => {
  const ba = e.target.closest('[data-expand-a]');
  const bp = e.target.closest('[data-expand-p]');
  const b = ba || bp || e.target.closest('[data-expand]'); if (!b) return;
  if (ba) { dlg.dataset.kind = 'a'; dlg.dataset.key = ba.dataset.expandA; const k = ba.dataset.expandA; dlgText.value = k.startsWith('宮:') ? palAnn(k.slice(2)) : starAnn(k.slice(2)); }
  else if (bp) { dlg.dataset.kind = 'p'; dlg.dataset.key = bp.dataset.expandP; const [pid, ...k] = bp.dataset.expandP.split('|'); dlgText.value = pn(pid, k.join('|')); }
  else { dlg.dataset.kind = 'n'; dlg.dataset.key = b.dataset.expand; dlgText.value = notes[b.dataset.expand] || ''; }
  $('#noteDlgTitle').textContent = b.dataset.title || '筆記';
  dlgText.placeholder = b.dataset.ph || '寫下你觀察到的共通點、書上的解釋…';
  if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  dlgText.focus();
});
dlgText.addEventListener('input', () => {
  if (dlg.dataset.kind === 'a') setAnn(dlg.dataset.key, dlgText.value);
  else if (dlg.dataset.kind === 'p') { const [pid, ...k] = dlg.dataset.key.split('|'); setPNote(pid, k.join('|'), dlgText.value); }
  else setNote(dlg.dataset.key, dlgText.value);
});
$('#noteDlgClose').addEventListener('click', () => { dlg.close ? dlg.close() : dlg.removeAttribute('open'); });
dlg.addEventListener('close', () => {
  save(KEY_N, notes); save(KEY_PN, pnotes); save(KEY_A, anns);
  if (ui.view === 'chart') { const y = window.scrollY; renderChart(); window.scrollTo(0, y); }
  if (ui.view === 'cards') { renderCards(); if (cardDlgEl.open) renderCardDetail(cardDlgEl.dataset.star); }
});
const growAll = () => document.querySelectorAll('textarea[data-note],textarea[data-pnote]').forEach(autoGrow);

syncTimeUI();
/* ---------- 備份提醒 ---------- */
function renderBackupBanner() {
  const el = $('#backupBanner');
  const hasData = people.length || Object.keys(notes).length || Object.keys(pnotes).length;
  const changed = meta.lastChange && (!meta.lastBackup || meta.lastChange > meta.lastBackup);
  const days = meta.lastBackup ? Math.floor((Date.now() - meta.lastBackup) / 864e5) : null;
  const due = days === null ? true : days >= 7;
  const snoozed = meta.snoozeUntil && Date.now() < meta.snoozeUntil;
  if (!hasData || !changed || !due || snoozed) { el.hidden = true; return; }
  el.hidden = false;
  el.querySelector('.msg').textContent = days === null ? '你還沒有備份過資料。資料只存在這個瀏覽器裡，建議現在備份一份。' : `距離上次備份已經 ${days} 天，之後還有新的修改。`;
}
$('#backupNow').addEventListener('click', doBackup);
$('#backupLater').addEventListener('click', () => { meta.snoozeUntil = Date.now() + 864e5; save(KEY_M, meta); renderBackupBanner(); });

/* ---------- 排盤設定 ---------- */
const SETTING_FIELDS = [
  ['geng', '庚干四化', [['陰同','太陽祿 武曲權 太陰科 天同忌（預設）'],['同陰','太陽祿 武曲權 天同科 太陰忌']]],
  ['wu', '戊干化科', [['右弼','右弼化科（預設）'],['太陽','太陽化科']]],
  ['ren', '壬干化科', [['左輔','左輔化科（預設）'],['天府','天府化科']]],
  ['dayDivide', '晚子時（23–24 點）', [['forward','日柱算隔天（預設）'],['current','日柱算當天']]],
  ['yearDivide', '年的分界', [['normal','正月初一（預設）'],['exact','立春']]],
  ['fixLeap', '農曆閏月生日', [['true','前半月算本月，後半月算下月（預設）'],['false','整個閏月都算本月']]],
  ['algorithm', '安星法', [['default','通行版（預設）'],['zhongzhou','中州派']]],
];
function renderSettings() {
  $('#settingsForm').innerHTML = SETTING_FIELDS.map(([k, label, opts]) => `<label class="f">${label}<select data-setting="${k}">${opts.map(([v, t]) => `<option value="${v}"${String(settings[k]) === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`).join('')
    + `<div class="inline"><button class="btn" type="button" id="settingsReset">恢復預設</button></div><p class="hint">修改後所有命盤會立即重排。和文墨天機對照不一致時，可以從這裡調整。</p>`;
}
$('#settingsForm').addEventListener('change', e => {
  const sel = e.target.closest('[data-setting]'); if (!sel) return;
  const k = sel.dataset.setting; settings[k] = k === 'fixLeap' ? sel.value === 'true' : sel.value;
  save(KEY_S, settings); applySettings(); refresh(); toast('排盤設定已更新');
});
$('#settingsForm').addEventListener('click', e => {
  if (e.target.id !== 'settingsReset') return;
  settings = Object.assign({}, DEFAULT_SETTINGS); save(KEY_S, settings); applySettings(); renderSettings(); refresh(); toast('已恢復預設');
});

/* ---------- 離線與安裝 ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

let rz;
const redraw = () => { if (ui.view === 'chart') { const p = people.find(x => x.id === ui.person); const a = p && chartOf(p); if (a) { drawSF(); drawLines(a); } } };
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(redraw, 150); });
document.fonts?.ready.then(redraw);
applySettings();
renderSettings();
bannerReady = true;
renderBackupBanner();
go(ui.view);
})();
