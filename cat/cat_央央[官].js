/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '央央[官]',
  lang: 'cat'
})
*/

import { _ } from 'assets://js/lib/cat.js';

let host = 'https://api.cntv.cn';
let siteKey = '';
let siteId = '';

/**
 * 基础请求函数
 */
async function request(url, timeout = 15000) {
    let res = await req(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://tv.cctv.com',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: timeout
    });
    return res.content;
}

/**
 * 初始化
 */
async function init(cfg) {
    siteKey = cfg.skey;
    siteId = cfg.sid;
}

/**
 * 首页分类（带筛选）
 */
async function home(filter) {
    const classes = [
        { type_id: '栏目大全', type_name: '栏目大全' },
        { type_id: '特别节目', type_name: '特别节目' },
        { type_id: '纪录片', type_name: '纪录片' },
        { type_id: '电视剧', type_name: '电视剧' },
        { type_id: '动画片', type_name: '动画片' }
    ];

    // 筛选配置（央视接口筛选相对简单）
    const filters = {
        "特别节目": [
            {
                key: "sort",
                name: "排序",
                value: [
                    { n: "最新", v: "desc" },
                    { n: "最热", v: "hot" }
                ]
            }
        ],
        "纪录片": [
            {
                key: "sort",
                name: "排序",
                value: [
                    { n: "最新", v: "desc" },
                    { n: "最热", v: "hot" }
                ]
            }
        ]
    };

    return JSON.stringify({
        class: classes,
        filters: filters
    });
}

/**
 * 首页推荐
 */
async function homeVod() {
    return JSON.stringify({ list: [] });
}

/**
 * 分类列表查询
 */
async function category(tid, pg, filter, extend) {
    try {
        let page = parseInt(pg) || 1;
        let videos = [];

        const channelMap = {
            "特别节目": "CHAL1460955953877151",
            "纪录片": "CHAL1460955924871139",
            "电视剧": "CHAL1460955853485115",
            "动画片": "CHAL1460955899450127"
        };

        if (tid === '栏目大全') {
            // 栏目大全
            let url = `https://api.cntv.cn/lanmu/columnSearch?&fl=&fc=&cid=&p=${page}&n=20&serviceId=tvcctv&t=json`;
            let res = await request(url);
            let json = JSON.parse(res);
            
            if (json && json.response && json.response.docs) {
                videos = _.map(json.response.docs, (it) => {
                    let lastVideo = it.lastVIDE || {};
                    return {
                        vod_id: `${lastVideo.videoSharedCode}|${it.column_firstclass}|${it.column_name}|${it.channel_name}|${it.column_brief}|${it.column_logo}|${lastVideo.videoTitle}|栏目大全`,
                        vod_name: it.column_name,
                        vod_pic: it.column_logo,
                        vod_remarks: it.channel_name || '',
                        vod_content: ''
                    };
                });
            }
        } else {
            // 其他分类
            let fl_url = `&channelid=${channelMap[tid] || ''}&fc=${encodeURIComponent(tid)}`;
            
            let url = `https://api.cntv.cn/list/getVideoAlbumList?${fl_url}&area=&letter=&n=24&serviceId=tvcctv&t=json&p=${page}`;
            let res = await request(url);
            let json = JSON.parse(res);
            
            if (json && json.data && json.data.list) {
                videos = _.map(json.data.list, (it) => {
                    return {
                        vod_id: `${it.id}|${it.sc}|${it.title}|${it.channel}|${it.brief}|${it.image}|${it.count}|${tid}`,
                        vod_name: it.title,
                        vod_pic: it.image,
                        vod_remarks: `${it.sc || ''}${it.year ? '·' + it.year : ''}`,
                        vod_content: it.brief || ''
                    };
                });
            }
        }

        return JSON.stringify({
            page: page,
            list: videos
        });
        
    } catch (e) {
        console.log('category error: ' + e.message);
        return JSON.stringify({
            page: parseInt(pg),
            list: []
        });
    }
}

/**
 * 详情页：解析剧集列表
 */
async function detail(id) {
    try {
        let info = id.split("|");
        let cate = info[7];
        let ctid = info[0];
        
        const modeMap = {
            "特别节目": "0",
            "纪录片": "0",
            "电视剧": "0",
            "动画片": "1"
        };
        
        let mode = modeMap[cate] || '0';
        let playUrls = [];
        
        // 获取选集列表
        let albumUrl = `https://api.cntv.cn/NewVideo/getVideoListByAlbumIdNew?id=${ctid}&serviceId=tvcctv&p=1&n=100&mode=${mode}&pub=1`;
        
        try {
            let res = await request(albumUrl);
            let data = JSON.parse(res);
            
            if (data.errcode === '1001') {
                // 需要获取真实的ctid
                let videoInfoUrl = `https://api.cntv.cn/video/videoinfoByGuid?guid=${ctid}&serviceId=tvcctv`;
                let vInfoRes = await request(videoInfoUrl);
                let vInfoData = JSON.parse(vInfoRes);
                let realCtid = vInfoData.ctid;
                
                let columnUrl = `https://api.cntv.cn/NewVideo/getVideoListByColumn?id=${realCtid}&d=&p=1&n=100&sort=desc&mode=0&serviceId=tvcctv&t=json`;
                let colRes = await request(columnUrl);
                let colData = JSON.parse(colRes);
                playUrls = colData.data?.list || [];
            } else {
                playUrls = data.data?.list || [];
            }
        } catch (e) {
            console.log('获取剧集列表失败: ' + e.message);
        }
        
        // 构建播放链接
        let playList = [];
        if (playUrls && playUrls.length > 0) {
            _.each(playUrls, (item) => {
                let title = item.title || `第${item.index || '?'}集`;
                let cleanTitle = title.replace(/\$/g, '');
                let guid = item.guid || '';
                if (guid) {
                    playList.push(`${cleanTitle}$${guid}`);
                }
            });
        }
        
        let vod_name = info[2] || '';
        let vod_pic = info[5] || '';
        let vod_content = info[4] || '';
        let vod_remarks = info[6] ? `共${info[6]}集` : '';
        
        let video = {
            vod_id: id,
            vod_name: vod_name,
            vod_pic: vod_pic,
            vod_play_from: playList.length > 0 ? '央视频' : '',
            vod_play_url: playList.join('#'),
            vod_content: vod_content,
            vod_remarks: vod_remarks,
            type_name: info[1] || ''
        };
        
        return JSON.stringify({ list: [video] });
        
    } catch (e) {
        console.log('detail error: ' + e.message);
        return JSON.stringify({ list: [] });
    }
}

/**
 * 搜索功能
 */
async function search(wd, quick, pg) {
    // 央视搜索接口较复杂，返回空结果
    return JSON.stringify({ list: [] });
}

/**
 * 播放解析
 */
async function play(flag, id, flags) {
    try {
        // id 是视频的 guid
        // 央视视频的 m3u8 地址格式
        let playUrl = `https://cntv.playdreamer.cn/proxy/asp/hls/2000/0303000a/3/default/${id}/2000.m3u8`;
        
        // 尝试获取真实播放地址（可选，如果上面的不行可以用下面的）
        // let infoUrl = `https://api.cntv.cn/video/videoinfoByGuid?guid=${id}&serviceId=tvcctv`;
        
        return JSON.stringify({
            parse: 0, // 直接播放
            url: playUrl,
            header: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://tv.cctv.com',
                'Origin': 'https://tv.cctv.com'
            }
        });
        
    } catch (e) {
        console.log('play error: ' + e.message);
        return JSON.stringify({
            parse: 1,
            url: id,
            jx: 1
        });
    }
}

/**
 * 导出钩子
 */
export function __jsEvalReturn() {
    return {
        init: init,
        home: home,
        homeVod: homeVod,
        category: category,
        detail: detail,
        play: play,
        search: search
    };
}