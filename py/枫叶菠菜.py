# -*- coding: utf-8 -*-
"""
TVBox Python 爬虫插件 - 枫叶影院 (www.fyppit.com)
严格遵循 TVBox 开源 Python 爬虫插件规范

目标站结构：
  首页          https://www.fyppit.com/
  分类列表页     https://www.fyppit.com/webtv/{tid}.html
  分类第N页      https://www.fyppit.com/webtv/{tid}/page/{pg}.html
  详情页         https://www.fyppit.com/movie/{id}.html
  播放页         https://www.fyppit.com/video/{id}/{sid}/{nid}.html
  搜索页         https://www.fyppit.com/search.html?wd={kw}
  搜索第N页      https://www.fyppit.com/search/page/{pg}.html?wd={kw}

分类清单（脚本已从源码解析，共 39 个，必须全部返回）：
  1 电影, 2 电视剧, 3 短剧, 4 动漫, 5 综艺, 48 网飞netflix,
  6 剧情片, 7 动作片, 8 冒险片, 9 喜剧片, 10 奇幻片, 11 恐怖片, 16 悬疑片, 17 惊悚片,
  12 国产剧, 13 港剧, 14 韩剧, 15 日剧, 23 泰剧, 24 台剧, 25 欧美剧, 26 新马剧,
  41 总裁短剧, 42 神豪短剧, 43 穿越重生短剧, 44 都市短剧, 45 年代短剧, 46 长篇剧场,
  36 国产动漫, 37 日本动漫, 38 韩国动漫, 39 欧美动漫, 40 港台动漫, 47 漫剧,
  30 国产综艺, 31 港台综艺, 32 韩国综艺, 33 日本综艺, 35 欧美综艺
"""

import sys
import json
import re
import time
import urllib.parse

sys.path.append('..')
try:
    from base.spider import Spider as BaseSpider
except ImportError:
    from spider import Spider as BaseSpider


class Spider(BaseSpider):

    # ==================== 初始化 ====================
    def init(self, extend=""):
        self.host = "https://www.fyppit.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                          "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Referer": self.host + "/",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,"
                      "image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        }
        self.timeout = 15

    def getName(self):
        return "枫叶影院"

    def isVideoFormat(self, url):
        return any(url.lower().endswith(ext) for ext in ['.m3u8', '.mp4', '.flv', '.avi'])

    def manualVideoCheck(self):
        return False

    # ==================== 工具方法 ====================
    def _get(self, url, referer=None):
        """统一请求方法，带 Referer / UA / 防封延迟"""
        try:
            headers = dict(self.headers)
            if referer:
                headers["Referer"] = referer
            r = self.fetch(url, headers=headers, timeout=self.timeout)
            time.sleep(1)  # 防封
            return r.text if r else ""
        except Exception as e:
            print(f"[fyppit] fetch error: {url} -> {e}")
            return ""

    def _abs(self, url):
        """相对链接转绝对链接"""
        if not url:
            return ""
        if url.startswith("//"):
            return "https:" + url
        if url.startswith("http"):
            return url
        if url.startswith("/"):
            return self.host + url
        return self.host + "/" + url

    def _clean_pic(self, pic):
        """清理图片 URL"""
        if not pic:
            return ""
        pic = pic.replace("\\/", "/").strip()
        if pic.startswith("//"):
            return "https:" + pic
        if pic.startswith("/"):
            return self.host + pic
        return pic

    # ==================== 列表页解析 ====================
    def _parse_list(self, html):
        """
        解析影片列表页（首页 / 分类页 / 搜索页通用）
        结构：
          <a href="/movie/872256313.html" class="zj-item" title="活色生香">
            <div class="zj-cover">
              <span class="zj-badge">剧情电影</span>
              <span class="zj-score">8.0</span>
              <img src="https://..." alt="活色生香" loading="lazy">
              <div class="zj-corner zj-cut txt_center" title="已完结">已完结</div>
            </div>
            <div class="zj-item-title zj-cut" title="活色生香">活色生香</div>
            <div class="zj-item-sub zj-cut">大陆 · 2026</div>
          </a>
        """
        items = []
        if not html:
            return items

        # 匹配每个 zj-item 块
        blocks = re.findall(
            r'<a[^>]+href="(/movie/(\d+)\.html)"[^>]*class="[^"]*zj-item[^"]*"[^>]*>(.*?)</a>',
            html, re.S
        )
        # 兜底：class 在前 href 在后
        if not blocks:
            blocks = re.findall(
                r'<a[^>]+class="[^"]*zj-item[^"]*"[^>]+href="(/movie/(\d+)\.html)"[^>]*>(.*?)</a>',
                html, re.S
            )
        # 再兜底：只要 /movie/{id}.html 链接
        if not blocks:
            blocks = re.findall(r'<a[^>]+href="(/movie/(\d+)\.html)"[^>]*>(.*?)</a>', html, re.S)

        seen = set()
        for href, vod_id, inner in blocks:
            if vod_id in seen:
                continue
            seen.add(vod_id)

            # 名称：优先 zj-item-title 的 title 属性
            vod_name = ""
            m = re.search(r'class="[^"]*zj-item-title[^"]*"[^>]*title="([^"]+)"', inner)
            if m:
                vod_name = m.group(1).strip()
            if not vod_name:
                m = re.search(r'title="([^"]+)"', inner)
                if m:
                    vod_name = m.group(1).strip()
            if not vod_name:
                m = re.search(r'class="[^"]*zj-item-title[^"]*"[^>]*>([^<]+)<', inner)
                if m:
                    vod_name = m.group(1).strip()
            if not vod_name:
                m = re.search(r'alt="([^"]+)"', inner)
                if m:
                    vod_name = m.group(1).strip()
            if not vod_name:
                continue

            # 图片
            vod_pic = ""
            m = re.search(r'<img[^>]+src="([^"]+)"', inner) or \
                re.search(r'<img[^>]+data-original="([^"]+)"', inner)
            if m:
                vod_pic = self._clean_pic(m.group(1))

            # 备注：优先 zj-corner 的 title
            vod_remarks = ""
            m = re.search(r'class="[^"]*zj-corner[^"]*"[^>]*title="([^"]+)"', inner)
            if m:
                vod_remarks = m.group(1).strip()
            if not vod_remarks:
                m = re.search(r'class="[^"]*zj-corner[^"]*"[^>]*>([^<]+)<', inner)
                if m:
                    vod_remarks = m.group(1).strip()
            if not vod_remarks:
                m = re.search(r'class="[^"]*zj-item-sub[^"]*"[^>]*>([^<]+)<', inner)
                if m:
                    vod_remarks = m.group(1).strip()

            items.append({
                "vod_id": vod_id,
                "vod_name": vod_name,
                "vod_pic": vod_pic,
                "vod_remarks": vod_remarks,
            })

        return items

    # ==================== 详情页解析 ====================
    def _parse_play_sources(self, html, vod_id):
        """
        从详情页抠出所有 /video/{id}/{sid}/{nid}.html 链接
        返回 [(from_name, [(ep_name, ep_url), ...]), ...]

        实例 872120：sid=2（线路3）、sid=8（线路8）、sid=1（线路10），每源 38 集
        """
        pattern = re.compile(
            r'<a[^>]+href="(/video/(\d+)/(\d+)/(\d+)\.html)"[^>]*'
            r'class="[^"]*zj-ep[^"]*"[^>]*title="([^"]*)"[^>]*>([^<]*)</a>',
            re.S
        )
        matches = pattern.findall(html)

        # 兜底：无 class 限制
        if not matches:
            pattern2 = re.compile(r'<a[^>]+href="(/video/(\d+)/(\d+)/(\d+)\.html)"[^>]*>([^<]*)</a>', re.S)
            tmp = pattern2.findall(html)
            matches = [(h, pid, sid, nid, "", name) for h, pid, sid, nid, name in tmp]

        groups = {}
        for item in matches:
            if len(item) != 6:
                continue
            href, pid, sid, nid, ep_title, ep_text = item
            # 硬性规则1：按 vod_id 过滤相关推荐/热播榜的链接
            if pid != str(vod_id):
                continue
            ep_name = (ep_title or ep_text or "").strip()
            url = self._abs(href)
            if sid not in groups:
                groups[sid] = {}
            if nid not in groups[sid]:
                groups[sid][nid] = (ep_name if ep_name else f"第{nid}集", url)

        if not groups:
            return []

        # 播放源名称：从 zj-line-btn 抠
        # <button class="zj-line-btn " data-sid="2">播放线路3</button>
        src_names_map = {}
        for m in re.finditer(
            r'<button[^>]+class="[^"]*zj-line-btn[^"]*"[^>]*data-sid="(\d+)"[^>]*>([^<]+)</button>',
            html
        ):
            src_names_map[m.group(1)] = m.group(2).strip()

        result = []
        sorted_sids = sorted(groups.keys(), key=lambda x: int(x))
        for idx, sid in enumerate(sorted_sids):
            eps = groups[sid]
            sorted_nids = sorted(eps.keys(), key=lambda x: int(x))
            ep_list = []
            for nid in sorted_nids:
                ep_name, ep_url = eps[nid]
                ep_name = ep_name.replace('$', '').replace('#', '').strip()
                if not ep_name:
                    ep_name = f"第{nid}集"
                ep_list.append(f"{ep_name}${ep_url}")
            if not ep_list:
                continue
            if sid in src_names_map:
                from_name = src_names_map[sid]
            else:
                from_name = f"播放线路{idx + 1}"
            from_name = from_name.replace('$', '').replace('#', '').strip() or f"线路{idx + 1}"
            result.append((from_name, ep_list))

        return result

    # ==================== 首页 ====================
    def homeContent(self, filter):
        """
        硬性规则：分类数量必须等于源码中真实存在的分类数量（39 个）
        直接采用脚本已解析好的 39 个分类，一个都不能少
        """
        classes = [
            {"type_id": "1",  "type_name": "电影"},
            {"type_id": "2",  "type_name": "电视剧"},
            {"type_id": "3",  "type_name": "短剧"},
            {"type_id": "4",  "type_name": "动漫"},
            {"type_id": "5",  "type_name": "综艺"},
            {"type_id": "48", "type_name": "网飞netflix"},
            {"type_id": "6",  "type_name": "剧情片"},
            {"type_id": "7",  "type_name": "动作片"},
            {"type_id": "8",  "type_name": "冒险片"},
            {"type_id": "9",  "type_name": "喜剧片"},
            {"type_id": "10", "type_name": "奇幻片"},
            {"type_id": "11", "type_name": "恐怖片"},
            {"type_id": "16", "type_name": "悬疑片"},
            {"type_id": "17", "type_name": "惊悚片"},
            {"type_id": "12", "type_name": "国产剧"},
            {"type_id": "13", "type_name": "港剧"},
            {"type_id": "14", "type_name": "韩剧"},
            {"type_id": "15", "type_name": "日剧"},
            {"type_id": "23", "type_name": "泰剧"},
            {"type_id": "24", "type_name": "台剧"},
            {"type_id": "25", "type_name": "欧美剧"},
            {"type_id": "26", "type_name": "新马剧"},
            {"type_id": "41", "type_name": "总裁短剧"},
            {"type_id": "42", "type_name": "神豪短剧"},
            {"type_id": "43", "type_name": "穿越重生短剧"},
            {"type_id": "44", "type_name": "都市短剧"},
            {"type_id": "45", "type_name": "年代短剧"},
            {"type_id": "46", "type_name": "长篇剧场"},
            {"type_id": "36", "type_name": "国产动漫"},
            {"type_id": "37", "type_name": "日本动漫"},
            {"type_id": "38", "type_name": "韩国动漫"},
            {"type_id": "39", "type_name": "欧美动漫"},
            {"type_id": "40", "type_name": "港台动漫"},
            {"type_id": "47", "type_name": "漫剧"},
            {"type_id": "30", "type_name": "国产综艺"},
            {"type_id": "31", "type_name": "港台综艺"},
            {"type_id": "32", "type_name": "韩国综艺"},
            {"type_id": "33", "type_name": "日本综艺"},
            {"type_id": "35", "type_name": "欧美综艺"},
        ]
        return {"class": classes}

    # ==================== 分类页 ====================
    def categoryContent(self, tid, pg, filter, extend):
        """
        分类列表页
        第1页 /webtv/{tid}.html
        第N页 /webtv/{tid}/page/{pg}.html
        """
        try:
            pg = int(pg) if pg else 1
        except Exception:
            pg = 1

        if pg <= 1:
            url = f"{self.host}/webtv/{tid}.html"
        else:
            url = f"{self.host}/webtv/{tid}/page/{pg}.html"

        html = self._get(url, referer=self.host + "/")
        videos = self._parse_list(html)

        # 分页判断：<span>1/1339</span>
        pagecount = 999
        m = re.search(r'<span>\s*\d+\s*/\s*(\d+)\s*</span>', html)
        if m:
            try:
                pagecount = int(m.group(1))
            except Exception:
                pagecount = 999
        else:
            ms = re.findall(r'/webtv/' + str(tid) + r'/page/(\d+)\.html', html)
            if ms:
                try:
                    pagecount = max(int(x) for x in ms)
                except Exception:
                    pagecount = 999
            elif not re.search(r'下一页|next', html) and pg > 1:
                pagecount = pg

        return {
            "list": videos,
            "page": pg,
            "pagecount": pagecount,
            "limit": 20,
            "total": 9999,
        }

    # ==================== 搜索 ====================
    def searchContent(self, key, quick, pg=1, category=""):
        """
        搜索页
        第1页 /search.html?wd={kw}
        第N页 /search/page/{pg}.html?wd={kw}
        """
        try:
            pg = int(pg) if pg else 1
        except Exception:
            pg = 1

        kw = urllib.parse.quote(key)
        if pg <= 1:
            url = f"{self.host}/search.html?wd={kw}"
        else:
            url = f"{self.host}/search/page/{pg}.html?wd={kw}"

        html = self._get(url, referer=self.host + "/")
        videos = self._parse_list(html)

        pagecount = 999
        m = re.search(r'<span>\s*\d+\s*/\s*(\d+)\s*</span>', html)
        if m:
            try:
                pagecount = int(m.group(1))
            except Exception:
                pagecount = 999
        else:
            ms = re.findall(r'/search/page/(\d+)\.html', html)
            if ms:
                try:
                    pagecount = max(int(x) for x in ms)
                except Exception:
                    pagecount = 999
            elif not re.search(r'下一页|next', html):
                pagecount = pg

        return {
            "list": videos,
            "page": pg,
            "pagecount": pagecount,
            "limit": 20,
            "total": 9999,
        }

    # ==================== 详情 ====================
    def detailContent(self, ids):
        """
        详情页：只请求详情页，抠出所有 /video/{id}/{sid}/{nid}.html 链接
        实例 872120 应返回 3 个播放源，每源 38 集
        """
        if isinstance(ids, (list, tuple)):
            vod_id = str(ids[0]) if ids else ""
        else:
            vod_id = str(ids)

        url = f"{self.host}/movie/{vod_id}.html"
        html = self._get(url, referer=self.host + "/")

        # ---------- 基础信息 ----------
        vod_name = ""
        m = re.search(r'<div class="zj-detail-info">\s*<h1>\s*([^<]+?)\s*<small', html, re.S)
        if not m:
            m = re.search(r'<h1>\s*([^<]+?)\s*<small', html, re.S)
        if m:
            vod_name = m.group(1).strip()
        if not vod_name:
            m = re.search(r'<title>([^<]+)</title>', html)
            if m:
                vod_name = re.sub(r'《|》|免费观看.*$|在线观看.*$|高清.*$', '', m.group(1)).strip()

        # 图片
        vod_pic = ""
        m = re.search(r'<div class="zj-detail-cover">\s*<img[^>]+src="([^"]+)"', html, re.S)
        if not m:
            m = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        if m:
            vod_pic = self._clean_pic(m.group(1))

        # 简介
        vod_content = ""
        m = re.search(r'<p class="zj-desc[^"]*">(.*?)</p>', html, re.S)
        if not m:
            m = re.search(r'<meta property="og:description" content="([^"]*)"', html)
        if m:
            vod_content = re.sub(r'<[^>]+>', '', m.group(1)).strip()

        # 年份
        vod_year = ""
        m = re.search(r'/year/(\d+)\.html"[^>]*>\s*(\d{4})\s*<', html)
        if m:
            vod_year = m.group(2)

        # 地区
        vod_area = ""
        m = re.search(r'/area/[^"]+"[^>]*>\s*([^<]+?)\s*</a>', html)
        if m:
            vod_area = m.group(1).strip()

        # 类型
        vod_type = ""
        m = re.search(r'类型：<b><a[^>]+>([^<]+)</a>', html)
        if m:
            vod_type = m.group(1).strip()

        # ---------- 播放源 ----------
        sources = self._parse_play_sources(html, vod_id)

        if sources:
            vod_play_from = "$$$".join([s[0] for s in sources])
            vod_play_url = "$$$".join(["#".join(s[1]) for s in sources])
        else:
            vod_play_from = ""
            vod_play_url = ""

        video = {
            "vod_id": vod_id,
            "vod_name": vod_name,
            "vod_pic": vod_pic,
            "vod_year": vod_year,
            "vod_area": vod_area,
            "vod_type": vod_type,
            "vod_content": vod_content,
            "vod_play_from": vod_play_from,
            "vod_play_url": vod_play_url,
        }

        return {"list": [video]}

    # ==================== 播放 ====================
    def playerContent(self, flag, id, vipFlags):
        """
        播放页：从 player_aaaa 抠 m3u8
        实例：https://www.fyppit.com/video/872120/1/1.html
        player_aaaa={"url":"https:\/\/v8.qrssuv.com\/wjv8\/...\/index.m3u8",...}
        """
        play_url = id
        if not play_url.startswith("http"):
            play_url = self._abs(play_url)

        referer = self.host + "/"
        html = self._get(play_url, referer=referer)

        m3u8 = ""

        # 优先从 player_aaaa 抠
        m = re.search(r'player_aaaa\s*=\s*(\{.*?\})\s*(?:</script>|;)', html, re.S)
        if m:
            raw = m.group(1)
            try:
                data = json.loads(raw)  # json.loads 自动还原 \/
                m3u8 = data.get("url", "") or ""
                if isinstance(m3u8, str):
                    m3u8 = m3u8.replace('\\/', '/').strip()
            except Exception as e:
                print(f"[fyppit] player_aaaa parse error: {e}")
                um = re.search(r'"url"\s*:\s*"([^"]+)"', raw)
                if um:
                    m3u8 = um.group(1).replace('\\/', '/').strip()

        # 兜底1：直接找 m3u8
        if not m3u8:
            um = re.search(r'(https?://[^\s"\'<>\\]+\.m3u8[^\s"\'<>\\]*)', html)
            if um:
                m3u8 = um.group(1).replace('\\/', '/').strip()

        # 兜底2：iframe 再请求一次
        if not m3u8:
            im = re.search(r'<iframe[^>]+src="([^"]+)"', html)
            if im:
                iframe_url = self._abs(im.group(1))
                iframe_html = self._get(iframe_url, referer=play_url)
                pm = re.search(r'player_aaaa\s*=\s*(\{.*?\})\s*(?:</script>|;)', iframe_html, re.S)
                if pm:
                    try:
                        data = json.loads(pm.group(1))
                        m3u8 = (data.get("url", "") or "").replace('\\/', '/').strip()
                    except Exception:
                        pass
                if not m3u8:
                    um = re.search(r'(https?://[^\s"\'<>\\]+\.m3u8[^\s"\'<>\\]*)', iframe_html)
                    if um:
                        m3u8 = um.group(1).replace('\\/', '/').strip()

        header = json.dumps({
            "User-Agent": self.headers["User-Agent"],
            "Referer": referer,
        }, ensure_ascii=False)

        return {
            "parse": 0,
            "url": m3u8,
            "header": header,
        }


# ==================== 本地测试入口 ====================
if __name__ == "__main__":
    s = Spider()
    s.init()
    print("=== homeContent (应为 39 个分类) ===")
    hc = s.homeContent(False)
    print(f"分类数量: {len(hc['class'])}")
    print(json.dumps(hc, ensure_ascii=False, indent=2)[:800])

    print("\n=== categoryContent tid=2 pg=1 ===")
    print(json.dumps(s.categoryContent("2", 1, False, {}), ensure_ascii=False, indent=2)[:600])

    print("\n=== detailContent 872120 (应有 3 源 × 38 集) ===")
    detail = s.detailContent(["872120"])
    if detail["list"]:
        v = detail["list"][0]
        print(f"名称: {v['vod_name']}")
        froms = v["vod_play_from"].split("$$$")
        urls = v["vod_play_url"].split("$$$")
        print(f"播放源数: {len(froms)} -> {froms}")
        for i, u in enumerate(urls):
            eps = u.split("#")
            print(f"  源{i+1}: {len(eps)} 集, 首集: {eps[0][:80]}")

    print("\n=== playerContent 872120/1/1 ===")
    print(json.dumps(
        s.playerContent("", "https://www.fyppit.com/video/872120/1/1.html", []),
        ensure_ascii=False, indent=2
    )[:500])