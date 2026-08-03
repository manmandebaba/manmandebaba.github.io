/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 0,
  title: '华数TV',
  lang: 'cat'
})
*/

import { Crypto as CryptoJS } from 'assets://js/lib/cat.js';

/**
 * 全局变量
 */
let debug = 0;
let siteKey = "";
let siteType = 0;

/**
 * 规则配置
 */
let rule = {
    host: 'https://www.wasu.cn',
    apiHost: 'https://ups.5g.wasu.tv',
    apiHost2: 'https://mcspapp.5g.wasu.tv',
    siteName: '华数TV',
    author: 'DeepSeek',
    timeout: 15000,
    headers: {
        'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
        'cache-control': 'no-cache',
        'origin': 'https://www.wasu.cn',
        'pragma': 'no-cache',
        'priority': 'u=1, i',
        'referer': 'https://www.wasu.cn',
        'sec-ch-ua': '"Microsoft Edge";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0'
    }
};


/**
 * 初始化
 */
async function init(cfg) {
    const start = Date.now();
    log(1, '初始化', `========== ${rule.siteName} ==========`);
    siteKey = cfg.skey || '';
    siteType = cfg.stype || 0;
    
    let ext = cfg.ext !== undefined ? cfg.ext : cfg;
    let configObj = null;
    
    if (ext) {
        if (typeof ext === 'object') {
            configObj = ext;
        } else if (typeof ext === 'string' && ext.includes('$')) {
            let parts = ext.split('$');
            let html = await req(parts[0]);
            let json = JSON.parse(html.content);
            configObj = json[parts[1]];
        } else if (typeof ext === 'string') {
            rule.host = ext;
        }
    }
    
    await syncConfig(configObj, ext);
    
    log(1, '初始化', `Host: ${rule.host} | 站点: ${rule.siteName} | 调试: ${debug === 1 ? '开启' : '关闭'}`);
    logTime(start, '初始化');
}

/**
 * 同步配置
 */
async function syncConfig(configObj, extStr) {
    const start = Date.now();
    
    let rootConfig = null;
    if (typeof extStr === 'string' && extStr.includes('$')) {
        try {
            const [url] = extStr.split('$');
            const html = await req(url);
            rootConfig = JSON.parse(html.content);
        } catch (e) {
            if (debug === 1) log(2, '配置', `解析根节点配置失败: ${e.message}`);
        }
    } else if (typeof extStr === 'object') {
        rootConfig = extStr;
    }

    const getVal = (keys, def) => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        
        for (const key of keyList) {
            if (typeof globalThis !== 'undefined' && globalThis[key] !== undefined && globalThis[key] !== null && globalThis[key] !== '') {
                return globalThis[key];
            }
        }
        
        if (configObj) {
            for (const key of keyList) {
                if (configObj[key] !== undefined && configObj[key] !== null && configObj[key] !== '') {
                    return configObj[key];
                }
            }
        }
        
        if (rootConfig) {
            for (const key of keyList) {
                if (rootConfig[key] !== undefined && rootConfig[key] !== null && rootConfig[key] !== '') {
                    return rootConfig[key];
                }
            }
        }
        
        return def;
    };

    debug = getVal(['调试', 'debug', '调试模式'], debug) ? 1 : 0;
    
    rule.host = getVal(['host', 'hosturl', 'url', 'site'], rule.host);
    rule.apiHost = getVal(['apiHost', 'api_host'], rule.apiHost);
    rule.apiHost2 = getVal(['apiHost2', 'api_host2'], rule.apiHost2);
    rule.timeout = getVal(['timeout', '超时'], rule.timeout);

    log(1, '配置', `========== 【${rule.siteName}】配置信息 ==========`);
    log(1, '开关', `调试: ${debug === 1 ? '开启' : '关闭'}`);
    logTime(start, '配置同步');
}

/**
 * 首页
 */
async function home(filter) {
    const start = Date.now();
    
    let classes = [...CLASSES];
    
    log(0, '首页', `返回 ${classes.length} 个分类`);
    logTime(start, '首页');
    return JSON.stringify({ class: classes, filters: FILTERS });
}

/**
 * 首页推荐
 */
async function homeVod() {
    return await category('961', 1, {}, {});
}

/**
 * 分类
 */
async function category(tid, pg, filter, extend) {
    const start = Date.now();
    pg = parseInt(pg) || 1;
    
    try {
        let secretB64 = await getCurrentAppKey();
        let sign = generateXSign(secretB64);
        let headers = getApiHeaders(sign);
        
        let extendParams = extend || {};
        let ndType = extendParams['年代'] || '全部';
        let dqType = extendParams['地区'] || '全部';
        let lxType = extendParams['类型'] || '全部';
        
        let params = {
            functionName: 'getNewsSearchedByCondition',
            nodeId: tid,
            nodeTag: lxType,
            yearTag: ndType,
            countryTag: dqType,
            orderType: '0',
            pageSize: '40',
            page: pg,
            keyword: '',
            siteId: '1000101'
        };
        
        let url = buildUrl(`${rule.apiHost}/rmp-user-suggest/1000101/hzhs/searchServlet`, params);
        log(0, '分类请求', `URL: ${url}`);
        
        let response = await req(url, {
            headers: headers,
            method: 'GET'
        });
        let json = JSON.parse(response.content);
        
        let videos = [];
        let dataList = json.data || [];
        
        for (let item of dataList) {
            videos.push({
                vod_id: `${item.nodeId}@${item.newsId}`,
                vod_name: item.title || '',
                vod_pic: item.hPic || '',
                vod_year: item.pubTime || '暂无日期',
                vod_remarks: item.episodeDesc || '暂无备注'
            });
        }
        
        log(0, '分类', `tid:${tid}, pg:${pg}, 获取 ${videos.length} 条数据`);
        logTime(start, `分类 - tid:${tid} 第${pg}页`);
        
        return JSON.stringify({
            page: pg,
            pagecount: 9999,
            limit: videos.length,
            total: 999999,
            list: videos
        });
    } catch (e) {
        log(3, '分类', e.message);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
    }
}

/**
 * 详情
 */
async function detail(id) {
    const start = Date.now();
    
    try {
        let parts = id.split('@');
        if (parts.length !== 2) {
            log(3, '详情', `无效的ID格式: ${id}`);
            return JSON.stringify({ list: [] });
        }
        
        let nodeId = parts[0];
        let newsId = parts[1];
        
        let secretB64 = await getCurrentAppKey();
        let sign = generateXSign(secretB64);
        let headers = getApiHeaders(sign);
        
        let params = {
            siteId: '1000101',
            functionName: 'getCurrentNews',
            nodeId: nodeId,
            newsId: newsId,
            platform: 'web'
        };
        
        let url = buildUrl(`${rule.apiHost2}/bvradio_app/hzhs/newsServlet`, params);
        log(0, '详情请求', `URL: ${url}`);
        
        let response = await req(url, {
            headers: headers,
            method: 'GET'
        });
        let json = JSON.parse(response.content);
        
        let data = json.data || {};
        
        let playUrls = [];
        let vodList = data.vodList || [];
        
        for (let vod of vodList) {
            let name = vod.title || '';
            let fileList = vod.fileList || [];
            let playUrl = '';
            
            if (fileList.length > 1) {
                playUrl = fileList[1]?.playUrl || '';
            } else if (fileList.length > 0) {
                playUrl = fileList[0]?.playUrl || '';
            }
            
            if (name && playUrl) {
                playUrls.push(`${name}$${playUrl}`);
            }
        }
        
        let playFrom = '华数';
        let playUrl = playUrls.join('#');
        
        let vod = {
            vod_id: id,
            vod_name: data.title || '',
            vod_director: data.director || '',
            vod_actor: data.actor || '',
            vod_remarks: data.episodeDesc || '',
            vod_year: data.pubTime || '',
            vod_area: data.countryTag || '',
            vod_content: `介绍剧情👉${data.newsAbstract || ''}`,
            vod_play_from: playFrom,
            vod_play_url: playUrl
        };
        
        log(0, '详情', `${data.title || id} 成功`);
        logTime(start, `详情 - ${data.title || id}`);
        return JSON.stringify({ list: [vod] });
    } catch (e) {
        log(3, '详情', e.message);
        logTime(start, '详情 - 失败');
        return JSON.stringify({ list: [] });
    }
}

/**
 * 播放
 */
async function play(flag, id, flags) {
    const start = Date.now();
    logTime(start, '播放');
    
    try {
        let playUrl = id;
        
        if (playUrl.includes('$')) {
            let parts = playUrl.split('$');
            playUrl = parts[parts.length - 1];
        }
        
        if (playUrl.includes('.mp4')) {
            playUrl = playUrl.replace('.mp4', '/playlist.m3u8');
        }
        
        log(0, '播放', `原始播放地址: ${playUrl}`);
        
        let secretB64 = await getCurrentAppKey();
        if (!secretB64) {
            log(3, '播放', '获取密钥失败');
            return JSON.stringify({ parse: 0, url: playUrl, header: rule.headers });
        }
        
        let sign = getXSignForPost(secretB64, playUrl);
        let headers = getApiHeaders(sign);
        
        let jsonData = {
            playUrl: playUrl,
            platform: 'web'
        };
        
        let url = buildUrl(`${rule.apiHost2}/thirdApiFile/file/getPlayUrl`, jsonData);
        log(0, '播放请求', `URL: ${url}`);
        
        let response = await req(url, {
            headers: headers,
            method: 'POST',
            data: jsonData
        });
        log(0, '播放响应', `内容: ${response.content.substring(0, 200)}`);
        
        let json = JSON.parse(response.content);
        
        if (json.code == 200) {
            let resultUrl = json.data?.playUrl || json.data?.url || playUrl;
            log(0, '播放', `成功: ${resultUrl.substring(0, 60)}...`);
            return JSON.stringify({
                parse: 0,
                url: resultUrl,
                header: rule.headers
            });
        } else {
            log(3, '播放', `接口返回错误: ${json.msg || json.message || '未知错误'}`);
            return JSON.stringify({ parse: 0, url: playUrl, header: rule.headers });
        }
    } catch (e) {
        log(3, '播放', `失败: ${e.message}`);
        return JSON.stringify({ parse: 0, url: id, header: rule.headers });
    }
}

/**
 * 搜索
 */
async function search(wd, quick, pg) {
    const start = Date.now();
    pg = parseInt(pg) || 1;
    log(0, '搜索', `关键词: ${wd}, 页码: ${pg}`);
    
    try {
        let secretB64 = await getCurrentAppKey();
        let sign = generateXSign(secretB64);
        let headers = getApiHeaders(sign);
        
        let params = {
            functionName: 'getNewsSearched',
            searchNewsType: '3,4,5',
            keyword: wd,
            pageSize: 10,
            page: pg,
            siteId: '1000101'
        };
        
        let url = buildUrl(`${rule.apiHost}/rmp-user-suggest/1000101/hzhs/searchServlet`, params);
        log(0, '搜索请求', `URL: ${url}`);
        
        let response = await req(url, {
            headers: headers,
            method: 'GET'
        });
        let json = JSON.parse(response.content);
        
        let videos = [];
        let dataList = json.data || [];
        
        for (let item of dataList) {
            videos.push({
                vod_id: `${item.nodeId}@${item.newsId}`,
                vod_name: item.title || '',
                vod_pic: item.hPic || '',
                vod_year: item.pubTime || '暂无日期',
                vod_remarks: item.episodeDesc || '暂无备注'
            });
        }
        
        log(0, '搜索', `"${wd}" 找到 ${videos.length} 条`);
        logTime(start, `搜索 - ${wd} (${videos.length}条)`);
        
        return JSON.stringify({
            page: pg,
            pagecount: 9999,
            limit: videos.length,
            total: 999999,
            list: videos
        });
    } catch (e) {
        log(3, '搜索', e.message);
        logTime(start, `搜索 - ${wd} (空)`);
        return JSON.stringify({ list: [], page: pg, pagecount: 0, limit: 0, total: 0 });
    }
}

/**
 * 获取当前AppKey
 */
async function getCurrentAppKey() {
    try {
        let resp = await req(rule.host, { headers: rule.headers });
        let html = resp.content;
        
        let jsPathPattern = /src="(\/[\d\.]+\/assets\/js\/index-[\w\.-]+\.js)"/;
        let match = html.match(jsPathPattern);
        if (!match) {
            log(3, '签名', '无法提取JS路径');
            return '';
        }
        
        let jsPath = match[1];
        let jsUrl = `${rule.host}${jsPath}`;
        
        let jsResp = await req(jsUrl, { headers: rule.headers });
        let jsContent = jsResp.content;
        
        let keyPattern = /const \w+="([^"]+)",\w+="([^"]+)",\w+="([^"]+)";/;
        let keyMatch = jsContent.match(keyPattern);
        if (!keyMatch) {
            log(3, '签名', '无法提取密钥');
            return '';
        }
        
        log(0, '签名', `获取密钥成功`);
        return keyMatch[2];
    } catch (e) {
        log(3, '签名', `获取AppKey失败: ${e.message}`);
        return '';
    }
}

/**
 * 生成GET请求签名
 */
function generateXSign(secretB64) {
    if (!secretB64) return '';
    try {
        let secretKey = base64Decode(secretB64);
        let data = '{}';
        let signature = hmacSha256(secretKey, data);
        return base64Encode(signature);
    } catch (e) {
        log(3, '签名', `生成签名失败: ${e.message}`);
        return '';
    }
}

/**
 * 生成POST请求签名
 */
function getXSignForPost(secretB64, playUrl) {
    if (!secretB64) return '';
    try {
        let secretKey = base64Decode(secretB64);
        let payload = {
            playUrl: playUrl,
            platform: 'web'
        };
        let dataString = JSON.stringify(payload);
        let signature = hmacSha256(secretKey, dataString);
        return base64Encode(signature);
    } catch (e) {
        log(3, '签名', `生成POST签名失败: ${e.message}`);
        return '';
    }
}

/**
 * Base64解码
 */
function base64Decode(str) {
    try {
        let words = CryptoJS.enc.Base64.parse(str);
        return words.toString(CryptoJS.enc.Latin1);
    } catch (e) {
        log(3, 'Base64', `解码失败: ${e.message}`);
        return str;
    }
}

/**
 * Base64编码
 */
function base64Encode(data) {
    try {
        let words = CryptoJS.enc.Latin1.parse(data);
        return CryptoJS.enc.Base64.stringify(words);
    } catch (e) {
        log(3, 'Base64', `编码失败: ${e.message}`);
        return data;
    }
}

/**
 * HMAC-SHA256加密
 */
function hmacSha256(key, data) {
    try {
        let result = CryptoJS.HmacSHA256(data, key);
        return result.toString(CryptoJS.enc.Latin1);
    } catch (e) {
        log(3, 'HMAC', `计算失败: ${e.message}`);
        return '';
    }
}

/**
 * 日志输出
 */
function log(level, tag, msg) {
    if (level === 1 || debug) {
        const prefix = { 0: '🔍', 1: '✅', 2: '⚠️', 3: '❌', 4: '⚙️' }[level] || '📝';
        console.log(`${prefix}【${rule.siteName}-${tag}】 ${msg}`);
    }
}

/**
 * 耗时统计
 */
function logTime(start, label) {
    if (debug) {
        console.log(`⏱️【${rule.siteName}】${label} 耗时: ${Date.now() - start}ms`);
    }
}

/**
 * 获取站点名称
 */
function getSiteName(cfg) {
    let def = ((cfg.skey?.split('_')[1] || cfg.skey) || (cfg.key?.split('_')[1] || cfg.key) || rule.siteName).replace(/\[.*\]$/, '');
    if (typeof cfg === 'string' && cfg.includes('$')) return cfg.split('$')[1] || def;
    return def || rule.siteName;
}

/**
 * 获取API请求头
 */
function getApiHeaders(sign) {
    return {
        ...rule.headers,
        'accept': 'application/json, text/plain, */*',
        'launchchannel': 'web_channel',
        'siteid': '1000101',
        'x-sign': sign
    };
}

/**
 * 拼接URL参数
 */
function buildUrl(baseUrl, params) {
    let queryString = '';
    for (let key in params) {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            if (queryString) {
                queryString += '&';
            }
            queryString += `${key}=${encodeURIComponent(params[key])}`;
        }
    }
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * 通用筛选配置 - 地区
 */
const AREA_FILTERS = {
    "961": [
        {"n": "全部", "v": ""}, {"n": "内地", "v": "内地"}, {"n": "港台", "v": "港台"},
        {"n": "欧美", "v": "欧美"}, {"n": "日韩", "v": "日韩"}, {"n": "泰国", "v": "泰国"},
        {"n": "其他", "v": "其他"}
    ],
    "962": [
        {"n": "全部", "v": ""}, {"n": "内地", "v": "内地"}, {"n": "港台", "v": "港台"},
        {"n": "日韩", "v": "日韩"}, {"n": "欧美", "v": "欧美"}, {"n": "泰国", "v": "泰国"},
        {"n": "其他", "v": "其他"}
    ],
    "963": [
        {"n": "全部", "v": ""}, {"n": "内地", "v": "内地"}, {"n": "日韩", "v": "日韩"},
        {"n": "欧美", "v": "欧美"}, {"n": "港台", "v": "港台"}, {"n": "其他", "v": "其他"}
    ],
    "965": [
        {"n": "全部", "v": ""}, {"n": "内地", "v": "内地"}, {"n": "欧美", "v": "欧美"}
    ]
};

/**
 * 通用筛选配置 - 年代
 */
const YEAR_FILTERS = [
    {"n": "全部", "v": ""}, {"n": "2026", "v": "2026"}, {"n": "2025", "v": "2025"},
    {"n": "2024", "v": "2024"}, {"n": "2023", "v": "2023"}, {"n": "2022", "v": "2022"},
    {"n": "2021", "v": "2021"}, {"n": "2020", "v": "2020"}, {"n": "2019", "v": "2019"},
    {"n": "2018", "v": "2018"}, {"n": "2017", "v": "2017"}, {"n": "2016", "v": "2016"},
    {"n": "2015", "v": "2015"}, {"n": "2014", "v": "2014"}, {"n": "2013", "v": "2013"},
    {"n": "2012", "v": "2012"}, {"n": "2011", "v": "2011"}, {"n": "2010", "v": "2010"}
];

/**
 * 类型筛选配置
 */
const TYPE_FILTERS = {
    "961": [
        {"n": "全部", "v": ""}, {"n": "动作", "v": "动作"}, {"n": "科幻", "v": "科幻"},
        {"n": "惊悚", "v": "惊悚"}, {"n": "冒险", "v": "冒险"}, {"n": "剧情", "v": "剧情"},
        {"n": "励志", "v": "励志"}, {"n": "爱情", "v": "爱情"}, {"n": "喜剧", "v": "喜剧"},
        {"n": "家庭", "v": "家庭"}, {"n": "历史", "v": "历史"}, {"n": "魔幻", "v": "魔幻"},
        {"n": "恐怖", "v": "恐怖"}, {"n": "战争", "v": "战争"}, {"n": "武侠", "v": "武侠"}
    ],
    "962": [
        {"n": "全部", "v": ""}, {"n": "都市", "v": "都市"}, {"n": "爱情", "v": "爱情"},
        {"n": "短剧", "v": "短剧"}, {"n": "战争", "v": "战争"}, {"n": "家庭", "v": "家庭"},
        {"n": "悬疑", "v": "悬疑"}, {"n": "古装", "v": "古装"}, {"n": "谍战", "v": "谍战"},
        {"n": "喜剧", "v": "喜剧"}, {"n": "农村", "v": "农村"}, {"n": "刑侦", "v": "刑侦"},
        {"n": "武侠", "v": "武侠"}, {"n": "历史", "v": "历史"}
    ],
    "963": [
        {"n": "全部", "v": ""}, {"n": "动作", "v": "动作"}, {"n": "冒险", "v": "冒险"},
        {"n": "益智", "v": "益智"}, {"n": "亲子", "v": "亲子"}, {"n": "热血", "v": "热血"},
        {"n": "剧情", "v": "剧情"}, {"n": "魔幻", "v": "魔幻"}, {"n": "励志", "v": "励志"},
        {"n": "机战", "v": "机战"}, {"n": "搞笑", "v": "搞笑"}, {"n": "科幻", "v": "科幻"},
        {"n": "治愈", "v": "治愈"}, {"n": "儿歌", "v": "儿歌"}, {"n": "教育", "v": "教育"},
        {"n": "校园", "v": "校园"}, {"n": "童话", "v": "童话"}, {"n": "推理", "v": "推理"},
        {"n": "怀旧", "v": "怀旧"}, {"n": "宠物", "v": "宠物"}, {"n": "舞蹈", "v": "舞蹈"}
    ],
    "965": [
        {"n": "全部", "v": ""}, {"n": "文化", "v": "文化"}, {"n": "纪实", "v": "纪实"},
        {"n": "访谈", "v": "访谈"}, {"n": "历史", "v": "历史"}, {"n": "美食", "v": "美食"},
        {"n": "旅游", "v": "旅游"}, {"n": "时尚", "v": "时尚"}, {"n": "情感", "v": "情感"},
        {"n": "生活", "v": "生活"}, {"n": "真人秀", "v": "真人秀"}
    ]
};

/**
 * 筛选器配置
 */
const FILTERS = {
    "961": [
        {"key": "地区", "name": "地区", "value": AREA_FILTERS["961"]},
        {"key": "类型", "name": "类型", "value": TYPE_FILTERS["961"]},
        {"key": "年代", "name": "年代", "value": YEAR_FILTERS}
    ],
    "962": [
        {"key": "地区", "name": "地区", "value": AREA_FILTERS["962"]},
        {"key": "类型", "name": "类型", "value": TYPE_FILTERS["962"]},
        {"key": "年代", "name": "年代", "value": YEAR_FILTERS}
    ],
    "963": [
        {"key": "地区", "name": "地区", "value": AREA_FILTERS["963"]},
        {"key": "类型", "name": "类型", "value": TYPE_FILTERS["963"]},
        {"key": "年代", "name": "年代", "value": YEAR_FILTERS}
    ],
    "965": [
        {"key": "地区", "name": "地区", "value": AREA_FILTERS["965"]},
        {"key": "类型", "name": "类型", "value": TYPE_FILTERS["965"]},
        {"key": "年代", "name": "年代", "value": YEAR_FILTERS}
    ],
    "966": [
        {
            "key": "类型", "name": "类型",
            "value": [
                {"n": "全部", "v": ""}, {"n": "国内视野", "v": "国内视野"},
                {"n": "国际纵览", "v": "国际纵览"}, {"n": "军事话题", "v": "军事话题"},
                {"n": "社会百态", "v": "社会百态"}, {"n": "央视频", "v": "央视频"}
            ]
        }
    ]
};

/**
 * 分类列表
 */
const CLASSES = [
    {"type_id": "961", "type_name": "电影"},
    {"type_id": "962", "type_name": "剧集"},
    {"type_id": "963", "type_name": "少儿"},
    {"type_id": "965", "type_name": "栏目"},
    {"type_id": "966", "type_name": "新闻"}
];

/**
 * 导出
 */
export function __jsEvalReturn() {
    return { init, home, homeVod, category, detail, play, search };
}