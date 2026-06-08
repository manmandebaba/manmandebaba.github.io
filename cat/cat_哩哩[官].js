/**
 * 哔哩哔哩 - 猫影视JS爬虫格式
 * 调用壳子超级解析功能
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '哩哩[官]',
  lang: 'cat',
})
*/
/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '哩哩[官]',
  lang: 'cat',
})
*/

import { _ } from 'assets://js/lib/cat.js';

const host = 'https://www.bilibili.com';
const apihost = 'https://api.bilibili.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

let danmakuAPI = '';

async function init(cfg) {
    danmakuAPI = cfg.ext || '';
}

// 通用请求封装
async function request(url, method = 'get', params = {}) {
    let reqOptions = {
        method: method,
        headers: {
            'User-Agent': UA,
            'Referer': host,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
    };
    const res = await req(url, reqOptions);
    return JSON.parse(res.content);
}

// 格式化数字
function formatCount(num) {
    if (num > 1e8) return (num / 1e8).toFixed(2) + '亿';
    if (num > 1e4) return (num / 1e4).toFixed(2) + '万';
    return num.toString();
}

// 首页分类
async function home() {
    const classes = [
        { type_id: '1', type_name: '番剧' },
        { type_id: '4', type_name: '国创' },
        { type_id: '2', type_name: '电影' },
        { type_id: '5', type_name: '电视剧' },
        { type_id: '3', type_name: '纪录片' },
        { type_id: '7', type_name: '综艺' }
    ];

    const filters = {
        "1": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }] }
        ],
        "4": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }] }
        ],
        "2": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }] }
        ],
        "5": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }] }
        ],
        "3": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }, { n: "高分", v: "score" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }] }
        ],
        "7": [
            { key: "order", name: "排序", value: [{ n: "最热", v: "hot" }, { n: "最新", v: "new" }] },
            { key: "year", name: "年代", value: [{ n: "全部", v: "" }, { n: "2026", v: "2026" }, { n: "2025", v: "2025" }, { n: "2024", v: "2024" }, { n: "2023", v: "2023" }] }
        ]
    };

    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

// 分类列表
async function category(tid, pg, filter, extend) {
    const page = parseInt(pg) || 1;
    const order = extend.order || 'hot';
    const year = extend.year || '';
    
    let url = '';
    
    // 根据分类ID构建不同的API地址
    if (['1', '4'].includes(tid)) {
        url = `${apihost}/pgc/web/rank/list?season_type=${tid}&pagesize=20&page=${page}&day=3`;
    } else {
        url = `${apihost}/pgc/season/rank/web/list?season_type=${tid}&pagesize=20&page=${page}&day=3`;
    }
    
    const res = await request(url);
    
    const videos = [];
    if (res.code === 0) {
        const vodList = res.result ? res.result.list : (res.data ? res.data.list : []);
        
        for (const vod of vodList) {
            const title = vod.title ? vod.title.trim() : '';
            if (title.includes('预告')) {
                continue;
            }
            
            const remark = vod.new_ep ? vod.new_ep.index_show : vod.index_show;
            
            // 处理封面图片
            let cover = vod.cover || '';
            if (cover && cover.startsWith('//')) {
                cover = 'https:' + cover;
            }
            
            videos.push({
                vod_id: vod.season_id ? vod.season_id.toString() : '',
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark || ''
            });
        }
    }
    
    return JSON.stringify({ 
        page: page, 
        list: videos 
    });
}

// 详情页
async function detail(id) {
    const url = `${apihost}/pgc/view/web/season?season_id=${id}`;
    const res = await request(url);
    
    if (res.code !== 0) {
        return JSON.stringify({ list: [] });
    }
    
    const data = res.result;
    const stat = data.stat || {};
    
    // 处理封面图片
    let cover = data.cover || '';
    if (cover && cover.startsWith('//')) {
        cover = 'https:' + cover;
    }
    
    let vod = {
        vod_id: data.season_id ? data.season_id.toString() : '',
        vod_name: data.title || '',
        vod_pic: cover,
        type_name: data.share_sub_title || data.type_name || '',
        vod_year: data.publish && data.publish.pub_time ? data.publish.pub_time.substr(0, 4) : '',
        vod_area: data.areas && data.areas.length > 0 ? data.areas[0].name : '',
        vod_actor: `点赞:${formatCount(stat.likes || 0)} 投币:${formatCount(stat.coins || 0)}`,
        vod_content: data.evaluate || data.new_ep?.desc || '',
        vod_director: data.rating ? `评分:${data.rating.score}` : '暂无评分',
        vod_play_from: '哔哩哔哩'
    };
    
    // 过滤预告片，构建播放列表
    const episodes = (data.episodes || []).filter(ep => !ep.title.includes('预告'));
    const playUrls = [];
    
    for (const ep of episodes) {
        const title = `${ep.title.replace(/#/g, '-')} ${ep.long_title || ''}`;
        const playId = `${data.season_id}_${ep.id}_${ep.cid}`;
        playUrls.push(`${title}$${playId}`);
    }
    
    vod.vod_play_url = playUrls.join('#');
    
    return JSON.stringify({ list: [vod] });
}

// 核心播放解析逻辑：壳子超级解析
async function play(flag, id, flags) {
    // 解析ID格式：seasonId_epId_cid
    const parts = id.split('_');
    let playUrl = id;
    
    if (parts.length >= 2) {
        // 构建B站播放链接
        playUrl = `https://www.bilibili.com/bangumi/play/ep${parts[1]}`;
    }
    
    // 调用壳子超级解析
    return JSON.stringify({
        parse: 1,
        jx: 1,
        play_parse: true,
        parse_type: '壳子超级解析',
        parse_source: '哔哩哔哩',
        url: playUrl,
        danmaku: danmakuAPI ? danmakuAPI + id : "",
        header: JSON.stringify({
            'User-Agent': UA,
            'Referer': host,
            'Origin': host
        })
    });
}

// 搜索功能
async function search(wd, quick) {
    const encodedKeyword = encodeURIComponent(wd);
    const searchTypes = ['media_bangumi', 'media_ft'];
    
    const allVideos = [];
    
    for (const type of searchTypes) {
        try {
            const url = `${apihost}/x/web-interface/search/type?search_type=${type}&keyword=${encodedKeyword}&page=1`;
            const res = await request(url);
            
            if (res.code === 0 && res.data && res.data.result) {
                for (const vod of res.data.result) {
                    const title = vod.title ? vod.title.replace(/<[^>]+>/g, '') : '';
                    if (title.includes('预告')) {
                        continue;
                    }
                    
                    // 处理封面图片
                    let cover = vod.cover || '';
                    if (cover && cover.startsWith('//')) {
                        cover = 'https:' + cover;
                    }
                    
                    allVideos.push({
                        vod_id: vod.season_id ? vod.season_id.toString() : '',
                        vod_name: title,
                        vod_pic: cover,
                        vod_remarks: vod.index_show || ''
                    });
                }
            }
        } catch (searchError) {
            console.log(`搜索类型 ${type} 失败: ${searchError.message}`);
        }
    }
    
    return JSON.stringify({ list: allVideos });
}

export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search };
}