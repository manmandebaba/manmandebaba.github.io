# -*- coding: utf-8 -*-
# ============================================================
#  ZIP0 聚合影视源  (OK影视 / FongMi TV Python Spider)
# ------------------------------------------------------------
#  数据来自 zip0.com 同款 8 条苹果CMS采集线路:
#    电影天堂 / 如意 / 暴风 / 飞飞 / 360 / 极速 / 最大 / 量子
#  功能:
#    · 聚合搜索: 8 线路并发搜索, 自动去重合并, 显示来源数
#    · 多线路详情: 详情页自动匹配同名片源, 一键切换线路
#    · 直链播放: m3u8/mp4 直连, 无需解析
#  分类浏览基于量子线路(库容 15 万+, 更新最快)。
#
#  OK影视配置示例(sites 内):
#    {"key":"zip0","name":"ZIP0聚合","type":3,
#     "api":"https://你的托管地址/ZIP0.py",
#     "searchable":2,"quickSearch":0,"filterable":0}
#  或将本文件放到手机后用本地路径(file://)引用。
# ============================================================

import json
import re
import time
import warnings
import threading

import requests

try:
    warnings.filterwarnings('ignore')
    requests.packages.urllib3.disable_warnings()
except Exception:
    pass

from base.spider import Spider

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36')

# ---------------- 线路配置(与 zip0.com 线路编号一致) ----------------
SOURCES = [
    {'key': 'dyttzy', 'name': '电影天堂', 'api': 'https://caiji.dyttzyapi.com/api.php/provide/vod'},
    {'key': 'ruyi',   'name': '如意资源', 'api': 'https://cj.rycjapi.com/api.php/provide/vod'},
    {'key': 'bfzy',   'name': '暴风资源', 'api': 'https://bfzyapi.com/api.php/provide/vod'},
    {'key': 'ffzy',   'name': '飞飞资源', 'api': 'https://ffzy5.tv/api.php/provide/vod'},
    {'key': 'zy360',  'name': '360资源',  'api': 'https://360zy.com/api.php/provide/vod'},
    {'key': 'jisu',   'name': '极速资源', 'api': 'https://jszyapi.com/api.php/provide/vod'},
    {'key': 'zuid',   'name': '最大资源', 'api': 'https://api.zuidapi.com/api.php/provide/vod'},
    {'key': 'lzi',    'name': '量子资源', 'api': 'https://cj.lziapi.com/api.php/provide/vod'},
]

MAIN_KEY = 'lzi'          # 分类浏览主力线路
HOME_KEYS = ['lzi', 'zuid', 'bfzy']   # 首页最新聚合线路
TIMEOUT = 8               # 单请求超时(秒)
MAX_WORKERS = 8           # 并发线程数

# ---------------- 分类(量子线路叶子分类) ----------------
CATEGORIES = [
    ('lzi:6',  '动作片'),  ('lzi:7',  '喜剧片'),  ('lzi:8',  '爱情片'),
    ('lzi:9',  '科幻片'),  ('lzi:10', '恐怖片'),  ('lzi:11', '剧情片'),
    ('lzi:12', '战争片'),  ('lzi:34', '伦理片'),
    ('lzi:13', '国产剧'),  ('lzi:14', '香港剧'),  ('lzi:15', '韩国剧'),
    ('lzi:16', '欧美剧'),  ('lzi:22', '日本剧'),  ('lzi:21', '台湾剧'),
    ('lzi:24', '泰国剧'),  ('lzi:23', '海外剧'),
    ('lzi:25', '大陆综艺'), ('lzi:26', '港台综艺'), ('lzi:27', '日韩综艺'),
    ('lzi:28', '欧美综艺'),
    ('lzi:29', '国产动漫'), ('lzi:30', '日韩动漫'), ('lzi:31', '欧美动漫'),
    ('lzi:49', '动画片'),  ('lzi:52', 'AI漫剧'),
    ('lzi:20', '纪录片'),  ('lzi:35', '电影解说'), ('lzi:46', '短剧'),
    ('lzi:36', '体育'),
]

_TAG = re.compile(r'<[^>]+>')
_LOCK = threading.Lock()


def _clean(text):
    """去除HTML标签与多余空白"""
    if not text:
        return ''
    text = _TAG.sub('', str(text))
    text = text.replace('&nbsp;', ' ').replace('&amp;', '&')
    text = text.replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>')
    return re.sub(r'\s+', ' ', text).strip()


def _is_direct(url):
    """判断是否为可直连播放的音视频地址"""
    if not url:
        return False
    u = url.split('?')[0].lower()
    return u.endswith('.m3u8') or u.endswith('.mp4')


class Spider(Spider):

    def getName(self):
        return 'ZIP0聚合'

    def init(self, extend=''):
        self.header = {'User-Agent': UA}
        self.timeout = TIMEOUT
        self.session = requests.Session()
        self.session.headers.update(self.header)
        # ext 可传 JSON 自定义线路, 例: {"enabled":["lzi","bfzy"]}
        self.sources = SOURCES
        try:
            if extend:
                cfg = json.loads(extend) if isinstance(extend, str) else extend
                enabled = cfg.get('enabled')
                if isinstance(enabled, list) and enabled:
                    keep = [s for s in SOURCES if s['key'] in enabled]
                    if keep:
                        self.sources = keep
        except Exception:
            pass
        self.by_key = {s['key']: s for s in self.sources}

    # ---------------- 基础请求 ----------------
    def _fetch(self, source, **params):
        """请求某条线路, 返回 dict 或 None"""
        try:
            r = self.session.get(source['api'], params=params,
                                 timeout=self.timeout, verify=False)
            j = r.json()
            return j if isinstance(j, dict) else None
        except Exception:
            return None

    def _fetch_by_key(self, key, **params):
        src = self.by_key.get(key)
        if not src:
            return None
        return self._fetch(src, **params)

    def _parallel(self, jobs):
        """并发执行 [(key, callable)] -> {key: result}"""
        out = {}
        if not jobs:
            return out
        threads = []

        def run(k, fn):
            try:
                res = fn()
            except Exception:
                res = None
            with _LOCK:
                out[k] = res

        for k, fn in jobs:
            t = threading.Thread(target=run, args=(k, fn))
            t.daemon = True
            threads.append(t)
            if len(threads) >= MAX_WORKERS:
                for t in threads:
                    t.start()
                for t in threads:
                    t.join()
                threads = []
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        return out

    # ---------------- 条目转换 ----------------
    def _item(self, vod, src_key):
        """CMS vod -> OK影视列表条目"""
        return {
            'vod_id': '%s:%s' % (src_key, vod.get('vod_id', '')),
            'vod_name': _clean(vod.get('vod_name', '')) or '未知影片',
            'vod_pic': vod.get('vod_pic', '') or '',
            'vod_remarks': _clean(vod.get('vod_remarks', '')) or '',
        }

    # ---------------- 首页 ----------------
    def homeContent(self, filter):
        result = {'class': [{'type_id': tid, 'type_name': name}
                            for tid, name in CATEGORIES],
                  'list': []}
        try:
            result['list'] = self._home_list()
        except Exception:
            pass
        return result

    def homeVideoContent(self):
        try:
            return {'list': self._home_list()}
        except Exception:
            return {}

    def _home_list(self):
        """并发取 3 条线路全站最新, 交错混合"""
        jobs = [(s['key'], lambda s=s: self._fetch(
            s, ac='detail', pg=1)) for s in self.sources
            if s['key'] in HOME_KEYS]
        data = self._parallel(jobs)
        pools = []
        for key in HOME_KEYS:
            j = data.get(key)
            if j and j.get('list'):
                pools.append([(v, key) for v in j['list']])
        mixed = []
        if pools:
            for i in range(20):
                for pool in pools:
                    if i < len(pool):
                        mixed.append(pool[i])
        return [self._item(v, k) for v, k in mixed[:30]]

    # ---------------- 分类 ----------------
    def categoryContent(self, tid, pg, filter, extend):
        try:
            tid = str(tid or '')
            key, _, real_tid = tid.partition(':')
            if key not in self.by_key or not real_tid:
                key, real_tid = MAIN_KEY, tid
            page = int(pg) if str(pg).isdigit() else 1
            j = self._fetch_by_key(key, ac='detail', t=real_tid, pg=page)
            if not j or not j.get('list'):
                return {'list': [], 'page': page, 'pagecount': 0,
                        'limit': 20, 'total': 0}
            try:
                pagecount = int(j.get('pagecount', 0) or 0)
                total = int(j.get('total', 0) or 0)
            except Exception:
                pagecount, total = 0, 0
            return {
                'list': [self._item(v, key) for v in j['list']],
                'page': page,
                'pagecount': pagecount,
                'limit': 20,
                'total': total,
            }
        except Exception:
            return {'list': [], 'page': 1, 'pagecount': 0,
                    'limit': 20, 'total': 0}

    # ---------------- 聚合搜索 ----------------
    def searchContent(self, key, quick, pg='1'):
        try:
            page = int(pg) if str(pg).isdigit() else 1
            if page > 1:
                return {'list': [], 'page': page}
            jobs = [(s['key'], lambda s=s: self._fetch(
                s, ac='detail', wd=key)) for s in self.sources]
            data = self._parallel(jobs)

            # 按片名+年份分组去重
            groups = {}
            order = []
            for s in self.sources:
                j = data.get(s['key'])
                if not j or not j.get('list'):
                    continue
                for v in j['list']:
                    name = _clean(v.get('vod_name', ''))
                    if not name:
                        continue
                    year = str(v.get('vod_year', '') or '')
                    gk = (name, year)
                    if gk not in groups:
                        groups[gk] = []
                        order.append(gk)
                    groups[gk].append((s['key'], v))

            def rank(entry):
                src_key, v = entry
                try:
                    score = float(v.get('vod_score', 0) or 0)
                except Exception:
                    score = 0.0
                remarks = _clean(v.get('vod_remarks', ''))
                bonus = 1 if any(w in remarks for w in ('完结', 'HD', '正片')) else 0
                return (bonus, score)

            result_list = []
            for gk in order:
                entries = groups[gk]
                entries.sort(key=rank, reverse=True)
                src_key, v = entries[0]
                item = self._item(v, src_key)
                if len(entries) > 1:
                    note = '·%d源' % len(entries)
                    item['vod_remarks'] = (item['vod_remarks'] + ' ' + note).strip()
                result_list.append(item)

            # 来源多的排前面, 便于发现全网资源最全的片子
            result_list.sort(key=lambda x: int(re.search(r'(\d+)源', x['vod_remarks']).group(1))
                             if re.search(r'(\d+)源', x['vod_remarks']) else 0,
                             reverse=True)
            return {'list': result_list, 'page': page}
        except Exception:
            return {'list': [], 'page': 1}

    # ---------------- 详情(多线路聚合) ----------------
    def detailContent(self, ids):
        try:
            if isinstance(ids, str):
                vid = ids
            else:
                vid = str(ids[0]) if ids else ''
            key, _, real_id = vid.partition(':')
            if key not in self.by_key:
                key, real_id = MAIN_KEY, vid
            main_src = self.by_key[key]

            j = self._fetch_by_key(key, ac='detail', ids=real_id)
            if not j or not j.get('list'):
                return {'list': []}
            vod = j['list'][0]
            name = _clean(vod.get('vod_name', ''))
            year = str(vod.get('vod_year', '') or '')

            # 主线路播放列表(仅保留直链线路)
            play_froms = []
            play_urls = []
            self._collect_lines(key, vod, play_froms, play_urls)
            if not play_urls:
                return {'list': []}

            # 并发去其他线路搜同名影片
            others = [s for s in self.sources if s['key'] != key]
            jobs = [(s['key'], lambda s=s: self._fetch(
                s, ac='detail', wd=name)) for s in others]
            data = self._parallel(jobs)

            for s in others:
                j2 = data.get(s['key'])
                if not j2 or not j2.get('list'):
                    continue
                for v2 in j2['list']:
                    n2 = _clean(v2.get('vod_name', ''))
                    y2 = str(v2.get('vod_year', '') or '')
                    if n2 != name:
                        continue
                    # 年份校验: 一方为空视为匹配, 否则需相等(允许差1年)
                    if year and y2:
                        try:
                            if abs(int(year) - int(y2)) > 1:
                                continue
                        except Exception:
                            pass
                    f2, u2 = [], []
                    self._collect_lines(s['key'], v2, f2, u2)
                    if u2:
                        play_froms.extend(f2)
                        play_urls.extend(u2)
                    break   # 每条线路只取一个匹配

            pic = vod.get('vod_pic', '') or ''
            try:
                score = str(float(vod.get('vod_score', 0) or 0))
                if score.endswith('.0'):
                    score = score[:-2]
            except Exception:
                score = ''
            d = {
                'vod_id': vid,
                'vod_name': name,
                'vod_pic': pic,
                'type_name': _clean(vod.get('type_name', '')),
                'vod_year': year,
                'vod_area': _clean(vod.get('vod_area', '')),
                'vod_actor': _clean(vod.get('vod_actor', '')),
                'vod_director': _clean(vod.get('vod_director', '')),
                'vod_content': _clean(vod.get('vod_content', '')),
                'vod_remarks': _clean(vod.get('vod_remarks', '')),
                'vod_play_from': '$$$'.join(play_froms),
                'vod_play_url': '$$$'.join(play_urls),
            }
            if score and score != '0':
                d['vod_score'] = score
            return {'list': [d]}
        except Exception:
            return {'list': []}

    def _collect_lines(self, src_key, vod, play_froms, play_urls):
        """解析 CMS vod 的播放线路, 仅保留直链线路"""
        src = self.by_key.get(src_key) or {}
        src_name = src.get('name', src_key)
        froms = str(vod.get('vod_play_from', '') or '').split(',')
        urls = str(vod.get('vod_play_url', '') or '').split('$$$')
        added = 0
        for i, url_group in enumerate(urls):
            fname = froms[i] if i < len(froms) else 'line%d' % (i + 1)
            url_group = url_group.strip()
            if not url_group:
                continue
            first_url = url_group.split('#')[0].split('$')[-1]
            if not _is_direct(first_url):
                continue          # 跳过分享页/网页线路
            line_name = src_name if added == 0 else '%s%s' % (src_name, fname)
            play_froms.append(line_name)
            play_urls.append(url_group)
            added += 1
            if added >= 2:        # 单线路最多取2条, 防止详情页过长
                break

    # ---------------- 播放 ----------------
    def playerContent(self, flag, id, vipFlags):
        try:
            url = str(id or '').strip()
            if url.startswith('//'):
                url = 'https:' + url
            header = {'User-Agent': UA}
            if _is_direct(url):
                return {'parse': 0, 'playUrl': '', 'url': url, 'header': header}
            return {'parse': 1, 'playUrl': '', 'url': url, 'header': header}
        except Exception:
            return {'parse': 0, 'playUrl': '', 'url': id, 'header': {'User-Agent': UA}}

    # ---------------- 生命周期 ----------------
    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        return False

    def destroy(self):
        pass

    def localProxy(self, param):
        return None
