// 本资源来源于互联网公开渠道，仅可用于个人学习爬虫技术。
// 严禁将其用于任何商业用途，下载后请于 24 小时内删除，搜索结果均来自源站，本人不承担任何责任。

let host = 'https://film.symx.club';
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'accept-language': 'zh-CN,zh;q=0.9',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'priority': 'u=1, i',
    'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'x-platform': 'web'
};

async function init(cfg) {
    const ext = cfg.ext;
    if (typeof ext === 'string' && ext.startsWith('http')) {
        host = ext.trim().replace(/\/$/, '');
    }
}

async function home(filter) {
    const resp = await req(`${host}/api/category/top`, {
        headers: { ...headers, 'referer': `${host}/index` }
    });
    const json = JSON.parse(resp.content);
    const categoryList = json.data;
    const fetchFilterTask = async (item) => {
        const typeId = item.id.toString();
        let typeFilters = [];
        try {
            const filterUrl = `${host}/api/film/category/filter?categoryId=${typeId}`;
            const filterResp = await req(filterUrl, {
                headers: { ...headers, 'referer': `${host}/category/${typeId}` }
            });
            const filterJson = JSON.parse(filterResp.content);
            const data = filterJson.data;
            const addCommonFilter = (key, name, optionsArr) => {
                if (optionsArr && optionsArr.length > 0) {
                    const value = [{ n: '全部', v: '' }];
                    optionsArr.forEach(opt => {
                        value.push({ n: opt, v: opt });
                    });
                    typeFilters.push({
                        key: key,
                        name: name,
                        init: '',
                        value: value
                    });
                }
            };
            addCommonFilter('area', '地区', data.areaOptions);
            addCommonFilter('year', '年份', data.yearOptions);
            addCommonFilter('language', '语言', data.languageOptions);
            if (data.sortOptions && data.sortOptions.length > 0) {
                const sortValue = [];
                data.sortOptions.forEach(opt => {
                    sortValue.push({ n: opt.label, v: opt.value });
                });
                const defaultInit = data.sortOptions[0].value;
                typeFilters.push({key: 'sort', name: '排序', init: defaultInit, value: sortValue});
            }
        } catch (e) {}
        return {type_id: typeId, type_name: item.name, filters: typeFilters};
    };
    const tasks = categoryList.map(item => fetchFilterTask(item));
    const results = await Promise.all(tasks);
    const classes = [];
    const filters = {};
    results.forEach(res => {
        classes.push({type_id: res.type_id,  type_name: res.type_name});
        if (res.filters && res.filters.length > 0) {
            filters[res.type_id] = res.filters;
        }
    });
    return JSON.stringify({ class: classes, filters: filters });
}

async function homeVod() {
    const resp = await req(`${host}/api/film/category`, {
        headers: { ...headers, 'referer': `${host}/index` }
    });
    const json = JSON.parse(resp.content);
    const videos = [];
    for (const i of json.data) {
        const filmList = i.filmList || [];
        for (const j of filmList) {
            videos.push({
                'vod_id': j.id.toString(),
                'vod_name': j.name,
                'vod_pic': j.cover,
                'vod_remarks': j.doubanScore || ''
            });
        }
    }
    return JSON.stringify({ list: videos });
}

async function category(tid, pg, filter, extend) {
    const area = extend.area || '';
    const year = extend.year || '';
    const language = extend.language || '';
    const sort = extend.sort || 'updateTime';
    const url = `${host}/api/film/category/list?area=${area}&categoryId=${tid}&language=${language}&pageNum=${pg}&pageSize=15&sort=${sort}&year=${year}`;
    const resp = await req(url, {
        headers: { ...headers, 'referer': `${host}/category/${tid}` }
    });
    const json = JSON.parse(resp.content);
    const videos = [];
    if (json.data && json.data.list) {
        for (const i of json.data.list) {
            videos.push({
                'vod_id': i.id.toString(),
                'vod_name': i.name,
                'vod_pic': i.cover,
                'vod_remarks': i.updateStatus
            });
        }
    }
    return JSON.stringify({list: videos, page: parseInt(pg)});
}

async function search(wd, quick, pg=1) {
    const url = `${host}/api/film/search?keyword=${encodeURIComponent(wd)}&pageNum=${pg}&pageSize=10`;
    const resp = await req(url, {
        headers: { ...headers, 'referer': `${host}/search?keyword=${encodeURIComponent(wd)}` }
    });
    const json = JSON.parse(resp.content);
    const videos = [];
    for (const i of json.data.list) {
        videos.push({
            'vod_id': i.id.toString(),
            'vod_name': i.name,
            'vod_pic': i.cover,
            'vod_remarks': i.updateStatus,
            'vod_year': i.year,
            'vod_area': i.area,
            'vod_director': i.director
        });
    }
    return JSON.stringify({
        list: videos,
        page: parseInt(pg)
    });
}

async function detail(id) {
    const resp = await req(`${host}/api/film/detail?id=${id}`, {
        headers: { ...headers, 'referer': `${host}/` }
    });
    const json = JSON.parse(resp.content);
    const data = json.data;
    const shows = [];
    const play_urls = [];
    for (const i of data.playLineList) {
        shows.push(i.playerName);
        const urls = i.lines.map(j => `${j.name}$${j.id}`);
        play_urls.push(urls.join('#'));
    }
    const video = {
        'vod_id': data.id.toString(),
        'vod_name': data.name,
        'vod_pic': data.cover,
        'vod_year': data.year,
        'vod_area': data.other,
        'vod_actor': data.actor,
        'vod_director': data.director,
        'vod_content': data.blurb,
        'vod_score': data.doubanScore,
        'vod_play_from': shows.join('$$$'),
        'vod_play_url': play_urls.join('$$$'),
        'type_name': data.vod_class || ''
    };
    return JSON.stringify({ list: [video] });
}

async function play(flag, id, flags) {
    const resp = await req(`${host}/api/line/play/parse?lineId=${id}`, {
        headers: { ...headers, 'referer': `${host}/` }
    });
    const json = JSON.parse(resp.content);
    return JSON.stringify({ jx: 0, parse: 0, url: json.data, header: { 'User-Agent': headers['User-Agent'] }});
}

export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        search: search,
        detail: detail,
        play: play
    };
}