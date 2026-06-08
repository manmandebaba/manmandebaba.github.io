/*
@header({
  searchable: 0,
  filterable: 0,
  quickSearch: 0,
  title: 'JRS直播[体]',
  author: 'OpenClaw',
  lang: 'cat'
})
*/

let host = 'https://m.jrskk.com';
const hosts = ['https://m.jrskk.com', 'https://m.jrs21.com', 'https://www.jrs33.com', 'https://3.swjrzx.com'];
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const defaultPic = 'https://im-imgs-bucket.oss-accelerate.aliyuncs.com/icon-192.png';
let cacheTime = 0;
let cacheHtml = '';

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function stripHtml(s) {
  return String(s || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

function absUrl(url, base) {
  url = String(url || '').trim();
  base = base || host;
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.indexOf('//') === 0) return 'https:' + url;
  if (url.charAt(0) === '/') return base + url;
  return base + '/' + url;
}

function utf8ToBase64Url(str) {
  str = unescape(encodeURIComponent(String(str || '')));
  let out = '';
  for (let i = 0; i < str.length; i += 3) {
    const c1 = str.charCodeAt(i);
    const c2 = str.charCodeAt(i + 1);
    const c3 = str.charCodeAt(i + 2);
    out += B64_CHARS.charAt(c1 >> 2);
    out += B64_CHARS.charAt(((c1 & 3) << 4) | ((c2 || 0) >> 4));
    out += isNaN(c2) ? '=' : B64_CHARS.charAt(((c2 & 15) << 2) | ((c3 || 0) >> 6));
    out += isNaN(c3) ? '=' : B64_CHARS.charAt(c3 & 63);
  }
  return out.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToUtf8(str) {
  str = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  let bytes = [];
  for (let i = 0; i < str.length; i += 4) {
    const c1 = B64_CHARS.indexOf(str.charAt(i));
    const c2 = B64_CHARS.indexOf(str.charAt(i + 1));
    const c3 = B64_CHARS.indexOf(str.charAt(i + 2));
    const c4 = B64_CHARS.indexOf(str.charAt(i + 3));
    if (c1 < 0 || c2 < 0) continue;
    const n = (c1 << 18) | (c2 << 12) | ((c3 < 0 ? 0 : c3) << 6) | (c4 < 0 ? 0 : c4);
    bytes.push((n >> 16) & 255);
    if (str.charAt(i + 2) !== '=') bytes.push((n >> 8) & 255);
    if (str.charAt(i + 3) !== '=') bytes.push(n & 255);
  }
  let raw = '';
  for (let j = 0; j < bytes.length; j++) raw += String.fromCharCode(bytes[j]);
  try { return decodeURIComponent(escape(raw)); } catch (e) { return raw; }
}

function safeJson(text, def) { try { return JSON.parse(text || '{}'); } catch (e) { return def || {}; } }

function matchCategory(tid, league, name, stype, hot) {
  tid = String(tid || 'all');
  const text = league + ' ' + name;
  if (tid === 'all' || tid === 'live') return true;
  if (tid === 'hot') return !!hot || /(NBA|CBA|英超|西甲|意甲|德甲|法甲|欧冠|中超|世界杯|世俱杯|亚冠|热门)/i.test(text);
  if (tid === 'basketball') return stype === 'lq' || /(NBA|CBA|WNBA|NBL|篮球|篮)/i.test(text);
  if (tid === 'football') return stype === 'zq' || (/(足球|英超|西甲|意甲|德甲|法甲|欧冠|欧联|中超|亚冠|足协|世界杯|世俱|巴西甲|巴西乙|日职|韩K|联赛|杯)/i.test(text) && !/(NBA|CBA|WNBA|NBL|篮球|篮)/i.test(text));
  if (tid === 'other') return !matchCategory('basketball', league, name, stype, hot) && !matchCategory('football', league, name, stype, hot);
  return true;
}

async function fetchText(url, referer) {
  const hd = { 'User-Agent': UA, 'Referer': referer || host + '/', 'Accept': 'text/html,application/json,*/*', 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8' };
  if (typeof Java !== 'undefined' && Java && Java.req) {
    const r = await Java.req(url, { headers: hd });
    if (typeof r === 'string') return r;
    return String((r && (r.body || r.content || r.data)) || '');
  }
  const r2 = await req(url, { headers: hd });
  return String((r2 && (r2.content || r2.body)) || '');
}

async function fetchHome(force) {
  if (!force && cacheHtml && Date.now() - cacheTime < 60000) return cacheHtml;
  for (let i = 0; i < hosts.length; i++) {
    try {
      const html = await fetchText(hosts[i] + '/', hosts[i] + '/');
      if (html && (/loc_match|lab_team|JRKAN|play\/steam/i).test(html)) {
        host = hosts[i]; cacheHtml = html; cacheTime = Date.now(); return html;
      }
    } catch (e) {}
  }
  return cacheHtml || '';
}

function firstMatch(text, reg) { const m = String(text || '').match(reg); return m ? m[1] : ''; }

function parseList(html, tid) {
  const list = [];
  const reg = /<ul\b[^>]*class=["'][^"']*item[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi;
  let m;
  while ((m = reg.exec(String(html || ''))) !== null) {
    const item = m[0];
    if (!/class=["'][^"']*ok[^"']*me[^"']*["']/i.test(item)) continue;
    const links = [];
    const areg = /<a\b([^>]*class=["'][^"']*ok[^"']*me[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
    let am;
    while ((am = areg.exec(item)) !== null) {
      const attrs = am[1];
      const href = firstMatch(attrs, /href=["']([^"']+)["']/i) || firstMatch(attrs, /data-play=["']([^"']+)["']/i);
      if (!href || href === 'javascript:void(0)') continue;
      const name = stripHtml(am[2]) || ('线路' + (links.length + 1));
      links.push({ name, url: absUrl(href, host) });
    }
    if (!links.length) continue;
    const league = stripHtml(firstMatch(item, /class=["'][^"']*lab_events[^"']*["'][\s\S]*?<span[^>]*class=["']name["'][^>]*>([\s\S]*?)<\/span>/i));
    const time = stripHtml(firstMatch(item, /class=["'][^"']*lab_time[^"']*["'][^>]*>([\s\S]*?)<\/li>/i));
    const home = stripHtml(firstMatch(item, /class=["'][^"']*lab_team_home[^"']*["'][\s\S]*?<strong[^>]*class=["']name["'][^>]*>([\s\S]*?)<\/strong>/i));
    const away = stripHtml(firstMatch(item, /class=["'][^"']*lab_team_away[^"']*["'][\s\S]*?<strong[^>]*class=["']name["'][^>]*>([\s\S]*?)<\/strong>/i));
    const stype = firstMatch(item, /data-stype=["']([^"']+)["']/i);
    const hot = /class=["'][^"']*hot[^"']*["']/i.test(item);
    let name = [time, league, [home, away].filter(Boolean).join(' vs ')].filter(Boolean).join(' ');
    if (!name) name = stripHtml(item).slice(0, 80) || '赛事直播';
    if (!matchCategory(tid, league, name, stype, hot)) continue;
    const pic = absUrl(firstMatch(item, /<img[^>]+src=["']([^"']+)["']/i) || defaultPic, host);
    const payload = { name, pic, links };
    list.push({ vod_id: 'jrs$' + utf8ToBase64Url(JSON.stringify(payload)), vod_name: name, vod_pic: pic, vod_remarks: links.map(x => x.name).slice(0, 3).join('/') || '直播' });
  }
  return list;
}

function getClasses() {
  return [
    { type_id: 'live', type_name: '正在直播' },
    { type_id: 'all', type_name: '全部赛程' },
    { type_id: 'basketball', type_name: '篮球直播' },
    { type_id: 'football', type_name: '足球直播' },
    { type_id: 'hot', type_name: '热门赛事' },
    { type_id: 'other', type_name: '其他赛事' }
  ];
}

async function init(cfg) { if (cfg && cfg.ext && String(cfg.ext).indexOf('http') === 0) host = String(cfg.ext).replace(/\/$/, ''); }
async function home(filter) { return JSON.stringify({ class: getClasses(), filters: {} }); }
async function homeVod() { return await category('live', 1, false, {}); }
async function category(tid, pg, filter, extend) {
  const html = await fetchHome(false);
  const list = parseList(html, tid || 'all');
  return JSON.stringify({ code: 1, msg: '数据列表', page: parseInt(pg) || 1, pagecount: 1, limit: list.length, total: list.length, list });
}
async function detail(id) {
  id = Array.isArray(id) ? id[0] : id;
  let payload = null;
  id = String(id || '');
  if (id.indexOf('jrs$') === 0) payload = safeJson(base64UrlToUtf8(id.slice(4)), null);
  if (!payload && /^https?:\/\//i.test(id)) payload = { name: '赛事直播', pic: defaultPic, links: [{ name: '直播', url: id }] };
  if (!payload) return JSON.stringify({ code: 1, list: [], page: 1, pagecount: 1, total: 0 });
  const playUrl = (payload.links || []).map((x, i) => (x.name || ('线路' + (i + 1))) + '$' + x.url).join('#');
  return JSON.stringify({ code: 1, msg: '数据列表', page: 1, pagecount: 1, limit: 1, total: 1, list: [{ vod_id: id, vod_name: payload.name || '赛事直播', vod_pic: payload.pic || defaultPic, vod_remarks: '直播', vod_content: 'JRKAN 体育赛事直播。部分线路为网页播放器，播放器可嗅探播放。', vod_play_from: 'JRS直播', vod_play_url: playUrl }] });
}
async function search(wd, quick, pg) { return JSON.stringify({ code: 1, msg: '数据列表', page: parseInt(pg) || 1, pagecount: 1, limit: 20, total: 0, list: [] }); }
async function play(flag, id, flags) { return JSON.stringify({ parse: /\.(m3u8|mp4|flv)(\?|$)/i.test(String(id || '')) ? 0 : 1, url: id, header: { 'User-Agent': UA, 'Referer': host + '/' } }); }

async function homeContent(filter) { return safeJson(await home(filter), { class: [], filters: {} }); }
async function homeVideoContent() { return safeJson(await homeVod(), { list: [] }); }
async function categoryContent(tid, pg, filter, extend) { return safeJson(await category(tid, pg, filter, extend || {}), { list: [] }); }
async function detailContent(ids) { return safeJson(await detail(ids), { list: [] }); }
async function searchContent(wd, quick, pg) { return safeJson(await search(wd, quick, pg || 1), { list: [] }); }
async function playerContent(flag, id, flags) { return safeJson(await play(flag, id, flags), { parse: 1, url: id }); }

export function __jsEvalReturn() {
  return { init, home, homeVod, category, search, detail, play, homeContent, homeVideoContent, categoryContent, detailContent, searchContent, playerContent };
}
