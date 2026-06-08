/*
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 1,
  title: '金牌影院',
  lang: 'cat'
})
*/

import 'assets://js/lib/crypto-js.js';

let host = '';
let currentHost = '';
let HOSTS = [
  "https://hnytxj.com", "https://www.hkybqufgh.com", "https://www.sizhengxt.com",
  "https://www.sdzhgt.com", "https://www.jiabaide.cn", "https://m.9zhoukj.com",
  "https://m.cqzuoer.com", "https://www.hellosht52bwb.com"
];
const KEY = "cb808529bae6b6be45ecfab29a4889bc";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.61 Safari/537.36";

// 工具函数
const guid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
  const r = Math.random() * 16 | 0;
  return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
});

const md5 = s => CryptoJS.MD5(s).toString();
const sha1 = s => CryptoJS.SHA1(s).toString();

const toQueryString = obj => Object.keys(obj)
  .filter(k => obj[k] != null && obj[k] !== '')
  .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
  .join('&');

const getHeaders = (params = {}) => {
  const t = Date.now().toString();
  const sign = sha1(md5(toQueryString({ ...params, key: KEY, t })));
  return {
    'User-Agent': USER_AGENT,
    'Accept': 'application/json, text/plain, */*',
    'sign': sign,
    't': t,
    'deviceid': guid()
  };
};

const normalizeFieldName = k => {
  const l = k.toLowerCase();
  if (l.startsWith('vod') && l.length > 3) return 'vod_' + l.slice(3);
  if (l.startsWith('type') && l.length > 4) return 'type_' + l.slice(4);
  return l;
};

const normalizeVodList = list => (list || []).map(item => {
  const res = {};
  for (const [k, v] of Object.entries(item || {})) {
    if (v != null) res[normalizeFieldName(k)] = v;
  }
  return res;
});

// 基础的HTTP请求函数
async function request(url, obj) {
    if (!obj) {
        obj = { headers: getHeaders(), timeout: 5000 };
    }
    const response = await req(url, obj);
    return response.content;
}

async function init(cfg) {
    console.log('=== 金牌影院初始化 ===');
    
    // 随机选择一个域名
    const randomIndex = Math.floor(Math.random() * HOSTS.length);
    host = HOSTS[randomIndex];
    currentHost = host;
    
    console.log(`🎯 随机选择域名: ${host}`);
    
    if (cfg && typeof cfg === 'object') {
        cfg.skey = '';
        cfg.stype = '3';
    }
    
    return true;
}

// 分类数据
async function home(filter) {
  try {
    const [cRes, fRes] = await Promise.all([
      request(`${host}/api/mw-movie/anonymous/get/filer/type`),
      request(`${host}/api/mw-movie/anonymous/v1/get/filer/list`)
    ]);
    
    const cData = JSON.parse(cRes);
    const fData = JSON.parse(fRes);
    
    const classes = (cData.data || []).map(k => ({ 
      type_name: k.typeName, 
      type_id: k.typeId.toString() 
    }));
    
    const filters = {};
    const baseSort = [
      { n: "最近更新", v: "2" }, 
      { n: "人气高低", v: "3" }, 
      { n: "评分高低", v: "4" }
    ];
    
    for (const [tid, d] of Object.entries(fData.data || {})) {
      const sortValues = tid === '1' ? baseSort.slice(1) : baseSort;
      const arr = [
        { 
          key: "type", 
          name: "类型", 
          value: (d.typeList || []).map(i => ({ n: i.itemText, v: i.itemValue })) 
        },
        { 
          key: "area", 
          name: "地区", 
          value: (d.districtList || []).map(i => ({ n: i.itemText, v: i.itemText })) 
        },
        { 
          key: "year", 
          name: "年份", 
          value: (d.yearList || []).map(i => ({ n: i.itemText, v: i.itemText })) 
        },
        { 
          key: "lang", 
          name: "语言", 
          value: (d.languageList || []).map(i => ({ n: i.itemText, v: i.itemText })) 
        },
        { 
          key: "sort", 
          name: "排序", 
          value: sortValues 
        }
      ];
      
      if (d.plotList?.length) {
        arr.splice(1, 0, { 
          key: "v_class", 
          name: "剧情", 
          value: d.plotList.map(i => ({ n: i.itemText, v: i.itemText })) 
        });
      }
      
      filters[tid] = arr;
    }
    
    return JSON.stringify({ class: classes, filters: filters });
    
  } catch (e) {
    return JSON.stringify({
      class: [
        { type_id: '1', type_name: '电影' },
        { type_id: '2', type_name: '电视剧' },
        { type_id: '3', type_name: '动漫' },
        { type_id: '4', type_name: '综艺' }
      ],
      filters: {}
    });
  }
}

// 主页推荐
async function homeVod() {
  try {
    const [r1, r2] = await Promise.all([
      request(`${host}/api/mw-movie/anonymous/v1/home/all/list`),
      request(`${host}/api/mw-movie/anonymous/home/hotSearch`)
    ]);
    
    const data1 = JSON.parse(r1).data || {};
    const data2 = JSON.parse(r2).data || [];
    
    let list = [];
    for (const k in data1) {
      if (data1[k]?.list) {
        list.push(...data1[k].list);
      }
    }
    
    if (Array.isArray(data2)) {
      list.push(...data2);
    }
    
    const normalizedList = normalizeVodList(list);
    return JSON.stringify({ list: normalizedList });
    
  } catch (e) {
    return JSON.stringify({ list: [] });
  }
}

// 分类
async function category(tid, pg, filter, extend) {
  try {
    const params = {
      area: extend?.area || '',
      filterStatus: "1",
      lang: extend?.lang || '',
      pageNum: pg || 1,
      pageSize: "30",
      sort: extend?.sort || '1',
      sortBy: "1",
      type: extend?.type || '',
      type1: tid,
      v_class: extend?.v_class || '',
      year: extend?.year || ''
    };
    
    const url = `${host}/api/mw-movie/anonymous/video/list?${toQueryString(params)}`;
    const res = await request(url, { headers: getHeaders(params) });
    const data = JSON.parse(res);
    
    const vodList = normalizeVodList(data.data?.list || []);
    
    return JSON.stringify({
      list: vodList,
      page: parseInt(pg) || 1,
      pagecount: 9999,
      limit: 90,
      total: 999999
    });
    
  } catch (e) {
    return JSON.stringify({
      list: [],
      page: parseInt(pg) || 1,
      pagecount: 1,
      limit: 90,
      total: 0
    });
  }
}

// 详情
async function detail(id) {
  try {
    const res = await request(`${host}/api/mw-movie/anonymous/video/detail?id=${id}`, {
      headers: getHeaders({ id })
    });
    
    const data = JSON.parse(res);
    const vod = normalizeVodList([data.data])[0];
    if (!vod) {
      return JSON.stringify({ list: [] });
    }
    
    vod.vod_play_from = '金牌影院';
    const eps = vod.episodelist || [];
    
    if (eps.length === 0) {
      vod.vod_play_url = `${vod.vod_name}$${id}@@1`;
    } else if (eps.length === 1) {
      vod.vod_play_url = `${vod.vod_name}$${id}@@${eps[0].nid}`;
    } else {
      vod.vod_play_url = eps.map(ep => {
        const name = ep.name?.trim() || `第${ep.nid}集`;
        return `${name}$${id}@@${ep.nid}`;
      }).join('#');
    }
    
    delete vod.episodelist;
    return JSON.stringify({ list: [vod] });
    
  } catch (e) {
    return JSON.stringify({ list: [] });
  }
}

// 播放
async function play(_, id) {
  try {
    const [vid, nid] = id.split('@@');
    const url = `${host}/api/mw-movie/anonymous/v2/video/episode/url?clientType=1&id=${vid}&nid=${nid}`;
    const res = await request(url, { headers: getHeaders({ clientType: '1', id: vid, nid }) });
    const data = JSON.parse(res);
    
    const urls = [];
    for (const item of data.data?.list || []) {
      urls.push(item.resolutionName, item.url);
    }
    
    return JSON.stringify({
      parse: 0,
      url: urls,
      header: {
        'User-Agent': USER_AGENT,
        'sec-ch-ua-platform': '"Windows"',
        'DNT': '1',
        'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
        'sec-ch-ua-mobile': '?0',
        'Origin': host,
        'Referer': host + '/'
      }
    });
    
  } catch (e) {
    return JSON.stringify({
      parse: 0,
      url: ["错误", "播放地址获取失败"],
      header: { 'User-Agent': USER_AGENT }
    });
  }
}

// 搜索
async function search(wd, quick, pg = "1") {
  try {
    const params = { 
      keyword: wd, 
      pageNum: pg, 
      pageSize: "8", 
      sourceCode: "1" 
    };
    
    const url = `${host}/api/mw-movie/anonymous/video/searchByWord?${toQueryString(params)}`;
    const res = await request(url, { headers: getHeaders(params) });
    const data = JSON.parse(res);
    
    let list = normalizeVodList(data.data?.result?.list || []);
    
    return JSON.stringify({ 
      list: list,
      page: parseInt(pg),
      pagecount: 10,
      limit: 8,
      total: list.length * 10
    });
    
  } catch (e) {
    return JSON.stringify({ 
      list: [],
      page: parseInt(pg),
      pagecount: 0,
      limit: 8,
      total: 0
    });
  }
}

export default {
  init: init,
  home: home,
  homeVod: homeVod,
  category: category,
  detail: detail,
  play: play,
  search: search
};