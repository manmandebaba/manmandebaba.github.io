/**
 * 哔哩哔哩 (Cat/Spider格式移植版)
 * 核心逻辑：保留原版自定义搜索分类、筛选逻辑
 * 优化：封装req请求，统一头部管理
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '[t3]B站(Cat)',
  lang: 'cat'
})',
  lang: 'cat'
})',
  lang: 'cat'
})',
  lang: 'cat'
})
*/

// ================= 配置区域 =================
const SITE_URL = 'https://www.bilibili.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ⚠️在此处填入你的B站Cookie (VIP账号可看高画质)
// 格式: SESSDATA=xxx; bili_jct=xxx; DedeUserID=xxx;
let myCookie = ''; 

// ================= 核心框架 =================

// 1. 请求封装 (自动携带头部)
async function request(url, options = {}) {
    let defaultHeaders = {
        'User-Agent': UA,
        'Referer': SITE_URL,
        'Cookie': myCookie
    };

    let method = options.method || 'GET';
    let headers = Object.assign({}, defaultHeaders, options.headers || {});
    let data = options.body || options.data || null;

    // 调用壳子底层req
    // 注意：Cat/TVBox 环境通常返回 { content: "string_body", headers: {} }
    let res = await req(url, {
        method: method,
        headers: headers,
        data: data
    });
    
    // 自动解析JSON的辅助逻辑（可选，为了稳健性这里还是返回raw response，在业务层parse）
    return res;
}

// 2. 初始化
async function init(cfg) {
    try {
        // 支持通过 ext 传入 cookie，格式: "SESSDATA=...; bili_jct=..."
        if (cfg && cfg.ext) {
            if (typeof cfg.ext === 'string' && cfg.ext.includes('SESSDATA')) {
                myCookie = cfg.ext;
            } else if (typeof cfg.ext === 'object' && cfg.ext.cookie) {
                myCookie = cfg.ext.cookie;
            }
        }
    } catch (e) {
        console.log('init error: ' + e.message);
    }
}

// 3. 主页分类与筛选
async function home(filter) {
    const classes = [
        { type_id: '1', type_name: '番剧' },
        { type_id: '4', type_name: '国创' },
        { type_id: '2', type_name: '电影' },
        { type_id: '5', type_name: '电视剧' },
        { type_id: '3', type_name: '纪录片' },
        { type_id: '7', type_name: '综艺' },
        { type_id: '全部', type_name: '全部(自定义)' },
        { type_id: 'search_仙逆', type_name: '🔍仙逆' },
        { type_id: 'search_沙雕动画', type_name: '🔍沙雕动画' },
        { type_id: 'search_搞笑动漫', type_name: '🔍搞笑动漫' }
    ];

    const filters = {
        '全部': [
            {
                key: 'search_keyword', name: '🔍快捷搜索', value: [
                    { n: '默认推荐', v: '' }, 
                    { n: '仙逆', v: '仙逆' }, 
                    { n: '沙雕动画', v: '沙雕动画' }, 
                    { n: '搞笑', v: '搞笑' }, 
                    { n: '修真', v: '修真' },
                    { n: '王林', v: '王林' }
                ]
            },
            {
                key: 'search_sort', name: '排序方式', value: [
                    { n: '综合排序', v: '' }, 
                    { n: '最新发布', v: 'pubdate' }, 
                    { n: '最多播放', v: 'click' }, 
                    { n: '最多弹幕', v: 'dm' }
                ]
            }
        ],
        'search_仙逆': [
            { key: 'subtype', name: '子类型', value: [{n:'全部',v:''},{n:'搞笑版',v:'搞笑'},{n:'解说版',v:'解说'},{n:'完整版',v:'完整'}] },
            { key: 'sort', name: '排序', value: [{n:'综合',v:''},{n:'最新',v:'pubdate'},{n:'最热',v:'click'}] }
        ],
        'search_沙雕动画': [
            { key: 'style', name: '风格', value: [{n:'全部',v:''},{n:'搞笑',v:'搞笑'},{n:'脑洞',v:'脑洞'},{n:'日常',v:'日常'}] }
        ]
    };

    return JSON.stringify({ class: classes, filters: filters });
}

// 4. 主页推荐视频
async function homeVod() {
    try {
        // 默认推荐热门番剧
        const list = await getRankList(1, 1);
        return JSON.stringify({ list: list.slice(0, 12) });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

// 5. 分类页逻辑 (核心)
async function category(tid, pg, filter, extend) {
    let page = parseInt(pg) || 1;
    let videos = [];

    try {
        //情况A: 自定义搜索分类 (如: search_仙逆)
        if (tid.startsWith('search_')) {
            videos = await handleCustomSearch(tid, page, extend);
        }
        //情况B: "全部"分类 (原版逻辑: 有关键词则搜索，无则推荐)
        else if (tid === '全部') {
            if (extend.search_keyword) {
                videos = await performSearch(extend.search_keyword, page, '', extend.search_sort);
            } else {
                // 无关键词时，获取混合推荐(这里简化为获取番剧榜单)
                videos = await getRankList(1, page);
            }
        }
        //情况C: 标准B站分区 (番剧、国创等)
        else {
            videos = await getRankList(parseInt(tid), page);
        }

        return JSON.stringify({
            list: videos,
            page: page,
            pagecount: videos.length < 20 ? page : page + 1,
            limit: 20,
            total: 999999
        });
    } catch (e) {
        console.log('category error: ' + e.message);
        return JSON.stringify({ list: [], page: page });
    }
}

// 6. 详情页逻辑
async function detail(id) {
    try {
        // 判断ID类型: BV/av 是UP主视频，数字ID通常是番剧SeasonID
        if (id.startsWith('BV') || id.startsWith('av')) {
            return await getVideoDetail(id);
        } else {
            return await getSeasonDetail(id);
        }
    } catch (e) {
        console.log('detail error: ' + e.message);
        return JSON.stringify({ list: [] });
    }
}

// 7. 搜索逻辑
async function search(wd, quick, pg) {
    let page = pg || 1;
    // 使用综合搜索
    let videos = await performSearch(wd, page, '', '');
    return JSON.stringify({ list: videos, page: page });
}

// 8. 播放解析逻辑
async function play(flag, id, flags) {
    try {
        // 线路1: B站直连 (尝试获取M3U8或MP4)
        if (flag === 'B站直连') {
            let playUrl = '';
            
            // 解析ID: seasonId_epId_cid 或 bvid_cid
            if (id.includes('_')) {
                const parts = id.split('_');
                const cid = parts[parts.length - 1];
                
                // 构造API
                if (id.startsWith('BV') || id.startsWith('av')) {
                    // UP主视频
                    const bvid = parts[0];
                    playUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=80&fnval=1&fnver=0&fourk=1`;
                } else {
                    // 番剧
                    const ep_id = parts[1];
                    playUrl = `https://api.bilibili.com/pgc/player/web/playurl?cid=${cid}&ep_id=${ep_id}&qn=80&fnval=1&fnver=0&fourk=1`;
                }

                const res = await request(playUrl);
                const data = JSON.parse(res.content);

                // 提取durl
                if (data.code === 0 && (data.data?.durl || data.result?.durl)) {
                    const durl = data.data?.durl || data.result?.durl;
                    const realUrl = durl[0].url;
                    return JSON.stringify({
                        parse: 0,
                        url: realUrl,
                        header: {
                            'User-Agent': UA,
                            'Referer': SITE_URL
                        }
                    });
                }
            }
        }

        // 线路2: 网页解析 (Fallback，或者作为默认线路)
        // 返回B站网页链接，让APP内置的嗅探器去抓取
        let webUrl = id;
        if (id.includes('_')) {
             // 简单还原回网页链接，这里只是为了兼容，实际 parse=1 时 url 最好是 http 开头
             // 如果 id 是自定义格式，最好在这里还原成 https://www.bilibili.com/video/xxx
             if(id.startsWith('BV')) webUrl = `https://www.bilibili.com/video/${id.split('_')[0]}`;
        }
        
        return JSON.stringify({
            parse: 1, // 开启嗅探
            jx: 1,
            url: webUrl,
            header: {
                'User-Agent': UA,
                'Referer': SITE_URL
            }
        });

    } catch (e) {
        return JSON.stringify({ parse: 1, url: id });
    }
}

// ================= 辅助函数区域 =================

// 辅助：获取排行榜 (番剧/国创等)
async function getRankList(seasonType, page) {
    const url = `https://api.bilibili.com/pgc/web/rank/list?season_type=${seasonType}&pagesize=20&page=${page}&day=3`;
    const res = await request(url);
    const data = JSON.parse(res.content);
    
    if (data.code === 0) {
        const list = data.result?.list || data.data?.list || [];
        return list.map(item => ({
            vod_id: String(item.season_id || '').trim(),
            vod_name: item.title?.trim(),
            vod_pic: fixCoverUrl(item.cover),
            vod_remarks: item.new_ep?.index_show || item.index_show || ''
        }));
    }
    return [];
}

// 辅助：执行搜索
async function performSearch(keyword, page, searchType = '', searchSort = '') {
    const encodedKey = encodeURIComponent(keyword);
    // 默认搜视频
    let url = `https://api.bilibili.com/x/web-interface/search/type?search_type=${searchType || 'video'}&keyword=${encodedKey}&page=${page}`;
    if (searchSort) url += `&order=${searchSort}`;

    const res = await request(url);
    const data = JSON.parse(res.content);

    if (data.code === 0 && data.data?.result) {
        return data.data.result.map(item => ({
            vod_id: item.bvid || (item.aid ? 'av' + item.aid : ''),
            vod_name: cleanHtml(item.title),
            vod_pic: fixCoverUrl(item.pic || item.cover),
            vod_remarks: generateRemarks(item)
        })).filter(v => v.vod_id); // 过滤无效ID
    }
    return [];
}

// 辅助：处理自定义分类逻辑
async function handleCustomSearch(tid, page, extend) {
    let keyword = '';
    switch(tid) {
        case 'search_仙逆': keyword = '仙逆'; break;
        case 'search_沙雕动画': keyword = '沙雕动画'; break;
        case 'search_搞笑动漫': keyword = '搞笑动漫'; break;
        default: keyword = tid.replace('search_', '');
    }

    // 拼接筛选条件
    let extra = extend.subtype || extend.style || '';
    let sort = extend.sort || '';
    let finalKey = extra ? `${keyword} ${extra}` : keyword;

    return await performSearch(finalKey, page, 'video', sort);
}

// 辅助：获取UP主视频详情
async function getVideoDetail(vid) {
    let url = vid.startsWith('BV') 
        ? `https://api.bilibili.com/x/web-interface/view?bvid=${vid}`
        : `https://api.bilibili.com/x/web-interface/view?aid=${vid.replace('av','')}`;

    const res = await request(url);
    const data = JSON.parse(res.content);

    if (data.code !== 0 || !data.data) return JSON.stringify({ list: [] });
    const d = data.data;

    const vod = {
        vod_id: vid,
        vod_name: d.title,
        vod_pic: fixCoverUrl(d.pic),
        type_name: d.tname || '视频',
        vod_year: new Date(d.pubdate * 1000).getFullYear(),
        vod_area: '中国',
        vod_remarks: `${formatCount(d.stat?.view)}播放`,
        vod_actor: d.owner?.name,
        vod_content: cleanHtml(d.desc),
        vod_play_from: 'B站直连$$$B站网页', // 定义两个播放源
        vod_play_url: ''
    };

    const shareUrl = `https://www.bilibili.com/video/${vid}`;
    let urls_direct = []; // 直连
    let urls_web = [];    // 网页

    if (d.pages) {
        d.pages.forEach(p => {
            const partName = p.part || `P${p.page}`;
            // 直连格式: bvid_cid (使用$$$分隔)
            urls_direct.push(`${partName}$${vid}_${p.cid}`);
            // 网页格式: http链接
            urls_web.push(`${partName}$${shareUrl}?p=${p.page}`);
        });
    }

    vod.vod_play_url = urls_direct.join('#') + '$$$' + urls_web.join('#');
    return JSON.stringify({ list: [vod] });
}

// 辅助：获取番剧详情
async function getSeasonDetail(seasonId) {
    const url = `https://api.bilibili.com/pgc/view/web/season?season_id=${seasonId}`;
    const res = await request(url);
    const data = JSON.parse(res.content);

    if (data.code !== 0 || !data.result) return JSON.stringify({ list: [] });
    const r = data.result;

    const vod = {
        vod_id: seasonId,
        vod_name: r.title,
        vod_pic: fixCoverUrl(r.cover),
        type_name: r.share_sub_title,
        vod_year: r.publish?.pub_time?.substr(0,4),
        vod_area: r.areas?.[0]?.name,
        vod_remarks: r.new_ep?.desc,
        vod_actor: r.actors,
        vod_content: cleanHtml(r.evaluate),
        vod_play_from: 'B站直连$$$B站网页',
        vod_play_url: ''
    };

    let episodes = r.episodes || [];
    // 过滤预告
    episodes = episodes.filter(ep => !ep.title?.includes('预告'));

    if (episodes.length > 0) {
        let urls_direct = [];
        let urls_web = [];

        episodes.forEach(ep => {
            let title = ep.long_title ? `${ep.title} ${ep.long_title}` : ep.title;
            title = title.replace(/#/g, '-'); // 防止破坏格式
            
            // 直连格式: seasonId_epId_cid
            urls_direct.push(`${title}$${seasonId}_${ep.id}_${ep.cid}`);
            
            // 网页格式
            const webLink = ep.share_url || `https://www.bilibili.com/bangumi/play/ep${ep.id}`;
            urls_web.push(`${title}$${webLink}`);
        });

        vod.vod_play_url = urls_direct.join('#') + '$$$' + urls_web.join('#');
    }

    return JSON.stringify({ list: [vod] });
}

// 工具: 修复图片链接
function fixCoverUrl(url) {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (!url.startsWith('http')) return 'https://' + url;
    return url;
}

// 工具: 清理HTML标签
function cleanHtml(text) {
    if (!text) return '';
    return text.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
}

// 工具: 生成备注
function generateRemarks(item) {
    if (item.duration) {
        const m = Math.floor(item.duration / 60);
        const s = item.duration % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return item.index_show || '';
}

// 工具: 格式化数字
function formatCount(num) {
    if (!num) return '0';
    if (num > 1e8) return (num / 1e8).toFixed(1) + '亿';
    if (num > 1e4) return (num / 1e4).toFixed(1) + '万';
    return num.toString();
}

// 导出
export default { init, home, homeVod, category, detail, search, play };
