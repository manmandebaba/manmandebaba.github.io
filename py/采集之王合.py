"""
@header({
  searchable: 1,
  filterable: 1,
  quickSearch: 0,
  title: '采集之王[合]',
  lang: 'hipy',
})
"""

# -*- coding: utf-8 -*-
# 采集之王[合] - Python 完整版 (硬编码分类版)
# 内嵌 2026 静态配置，聚合 18 个苹果CMS标准资源站
# 硬编码所有站点分类数据，启动无需网络请求分类，极速初始化
# 支持：分类筛选、搜索(精准/强制图片)、详情、多线路解析、弹幕
# 屏蔽：伦理片、理论片
import re
import sys
import json
import time
from urllib.parse import quote, urljoin
from concurrent.futures import ThreadPoolExecutor, as_completed
sys.path.append('..')
from base.spider import Spider


# ========== 内嵌采集站配置 ==========
BUILTIN_SITES = [
    {"name": "爱奇艺", "url": "https://iqiyizyapi.com", "api": "/api.php/provide/vod", "parse_url": "https://www.iqiyizyjx.com/?url=", "cate_exclude": "电影|连续剧|动漫|综艺", "searchable": True},
    {"name": "豆瓣", "url": "https://caiji.dbzy5.com", "api": "/api.php/provide/vod", "parse_url": "https://doubanzyjx.com:966/?url=", "cate_exclude": "电影|连续剧|动漫|综艺|电影资讯|娱乐新闻", "searchable": True},
    {"name": "360", "url": "https://360zyzz.com", "api": "/api.php/provide/vod", "parse_url": "https://www.360jiexi.com/player/?url=", "cate_exclude": "电影|连续剧|动漫|综艺|电影资讯|娱乐新闻|体育|未分类", "searchable": True},
    {"name": "U酷", "url": "https://api.ukuapi88.com", "api": "/api.php/provide/vod", "parse_url": "https://api.ukubf.com/m3u8/?url=", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|资讯|新闻资讯|预告资讯|影视资讯|明星资讯", "searchable": True},
    {"name": "金鹰", "url": "https://jinyingzy.com", "api": "/api.php/provide/vod", "parse_url": "https://hd.iapijy.com/play?url=", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|资讯", "searchable": True},
    {"name": "电影天堂", "url": "http://caiji.dyttzyapi.com", "api": "/api.php/provide/vod", "parse_url": "http://caiji.dyttzyapi.com", "cate_exclude": "电影片|电视剧|连续剧|动漫|综艺|资讯", "searchable": True},
    {"name": "茅台", "url": "https://caiji.maotaizy.cc", "api": "/api.php/provide/vod", "parse_url": "https://mtjiexi.cc:966/?url=", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|资讯", "searchable": True},
    {"name": "猫眼", "url": "https://api.maoyanapi.top", "api": "/api.php/provide/vod", "parse_url": "https://jx.maoyanjx.top/player/?url=", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|新闻资讯", "searchable": True},
    {"name": "魔都", "url": "https://www.mdzyapi.com", "api": "/api.php/provide/vod", "parse_url": "https://jiexi.moduzyjx.com/?url=", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|新闻资讯", "searchable": True},
    {"name": "最大", "url": "https://zuida.xyz", "api": "/api.php/provide/vod", "parse_url": "https://jx.zuidplay.com/m3u8Player/?url=", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|新闻资讯", "searchable": True},
    {"name": "极速", "url": "https://jszyapi.com", "api": "/api.php/provide/vod", "parse_url": "https://jsjiexi.com/play/?url=", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|新闻资讯", "searchable": True},
    {"name": "速播", "url": "https://subocaiji.com", "api": "/api.php/provide/vod", "parse_url": "https://subojiexi.com/play/?url=", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|新闻资讯", "searchable": True},
    {"name": "豪华", "url": "https://hhzyapi.com", "api": "/api.php/provide/vod", "parse_url": "https://hhjiexi.com/play/?url=", "cate_exclude": "电影|连续剧|电视剧|动漫|综艺", "searchable": True},
    {"name": "虎牙", "url": "https://www.huyaapi.com", "api": "/api.php/provide/vod", "parse_url": "https://huyajx.com/play?url=", "cate_exclude": "电影|连续剧|电视剧|动漫|综艺", "searchable": True},
    {"name": "艾旦", "url": "https://lovedan.net", "api": "/api.php/provide/vod", "parse_url": "", "cate_exclude": "电影|连续剧|电视剧|动漫|综艺", "searchable": True},
    {"name": "红牛", "url": "https://www.hongniuzy2.com", "api": "/api.php/provide/vod", "parse_url": "", "cate_exclude": "电影|连续剧|电视剧|动漫|综艺", "searchable": True},
    {"name": "飘零", "url": "https://p2100.net", "api": "/api.php/provide/vod", "parse_url": "", "cate_exclude": "电影|电视剧|连续剧|动漫|综艺|八卦爆料|影片资讯|娱乐动态", "searchable": True},
]

# ========== 硬编码分类数据 (已屏蔽伦理片、理论片) ==========
HARDCODED_CATES = {
    "https://caiji.dbzy5.com": {
        "name": "豆瓣",
        "cates": [
            {"type_id": "5", "type_name": "纪录片"}, {"type_id": "6", "type_name": "动作片"},
            {"type_id": "7", "type_name": "爱情片"}, {"type_id": "8", "type_name": "喜剧片"},
            {"type_id": "9", "type_name": "科幻片"}, {"type_id": "10", "type_name": "恐怖片"},
            {"type_id": "11", "type_name": "剧情片"}, {"type_id": "12", "type_name": "战争片"},
            {"type_id": "13", "type_name": "国产剧"}, {"type_id": "14", "type_name": "香港剧"},
            {"type_id": "15", "type_name": "欧美剧"}, {"type_id": "16", "type_name": "韩剧"},
            {"type_id": "21", "type_name": "泰国剧"}, {"type_id": "22", "type_name": "日本剧"},
            {"type_id": "23", "type_name": "台湾剧"}, {"type_id": "24", "type_name": "海外剧"},
            {"type_id": "29", "type_name": "演唱会"}, {"type_id": "35", "type_name": "新闻资讯"},
            {"type_id": "36", "type_name": "体育赛事"}, {"type_id": "37", "type_name": "短剧大全"},
            {"type_id": "38", "type_name": "篮球"}, {"type_id": "39", "type_name": "足球"},
            {"type_id": "40", "type_name": "网球"}, {"type_id": "41", "type_name": "斯诺克"},
            {"type_id": "42", "type_name": "LPL"}, {"type_id": "43", "type_name": "重生民国"},
            {"type_id": "44", "type_name": "穿越现代"}, {"type_id": "45", "type_name": "反转爽剧"},
            {"type_id": "46", "type_name": "言情总裁"}, {"type_id": "47", "type_name": "现代都市"},
            {"type_id": "48", "type_name": "古装仙侠"}, {"type_id": "49", "type_name": "悬疑烧脑"},
            {"type_id": "50", "type_name": "惊悚片"}
        ]
    },
    "https://360zyzz.com": {
        "name": "360",
        "cates": [
            {"type_id": "6", "type_name": "动作片"}, {"type_id": "7", "type_name": "喜剧片"},
            {"type_id": "8", "type_name": "爱情片"}, {"type_id": "9", "type_name": "科幻片"},
            {"type_id": "10", "type_name": "恐怖片"}, {"type_id": "11", "type_name": "剧情片"},
            {"type_id": "12", "type_name": "战争片"}, {"type_id": "13", "type_name": "国产剧"},
            {"type_id": "14", "type_name": "香港剧"}, {"type_id": "15", "type_name": "韩国剧"},
            {"type_id": "16", "type_name": "欧美剧"}, {"type_id": "18", "type_name": "NBA"},
            {"type_id": "20", "type_name": "惊悚片"}, {"type_id": "21", "type_name": "家庭篇"},
            {"type_id": "22", "type_name": "古装片"}, {"type_id": "23", "type_name": "历史片"},
            {"type_id": "24", "type_name": "悬疑片"}, {"type_id": "25", "type_name": "犯罪片"},
            {"type_id": "26", "type_name": "灾难片"}, {"type_id": "27", "type_name": "纪录片"},
            {"type_id": "28", "type_name": "短片"}, {"type_id": "29", "type_name": "动画片"},
            {"type_id": "30", "type_name": "台湾剧"}, {"type_id": "31", "type_name": "日本剧"},
            {"type_id": "32", "type_name": "海外剧"}, {"type_id": "33", "type_name": "泰国剧"},
            {"type_id": "41", "type_name": "足球"}, {"type_id": "42", "type_name": "篮球"},
            {"type_id": "45", "type_name": "西部片"}, {"type_id": "46", "type_name": "爽文短剧"},
            {"type_id": "47", "type_name": "现代都市"}, {"type_id": "48", "type_name": "脑洞悬疑"},
            {"type_id": "49", "type_name": "年代穿越"}, {"type_id": "50", "type_name": "古装仙侠"},
            {"type_id": "51", "type_name": "反转爽剧"}, {"type_id": "52", "type_name": "女频恋爱"},
            {"type_id": "53", "type_name": "成长逆袭"}
        ]
    },
    "https://api.ukuapi88.com": {
        "name": "U酷",
        "cates": [
            {"type_id": "6", "type_name": "动作片"}, {"type_id": "7", "type_name": "喜剧片"},
            {"type_id": "8", "type_name": "爱情片"}, {"type_id": "9", "type_name": "科幻片"},
            {"type_id": "10", "type_name": "恐怖片"}, {"type_id": "11", "type_name": "剧情片"},
            {"type_id": "12", "type_name": "战争片"}, {"type_id": "13", "type_name": "国产剧"},
            {"type_id": "14", "type_name": "港澳剧"}, {"type_id": "15", "type_name": "日剧"},
            {"type_id": "16", "type_name": "欧美剧"}, {"type_id": "21", "type_name": "台湾剧"},
            {"type_id": "22", "type_name": "韩剧"}, {"type_id": "23", "type_name": "泰剧"},
            {"type_id": "24", "type_name": "记录片"}, {"type_id": "32", "type_name": "短剧"},
            {"type_id": "33", "type_name": "奇幻片"}, {"type_id": "34", "type_name": "犯罪片"}
        ]
    },
    "https://jinyingzy.com": {
        "name": "金鹰",
        "cates": [
            {"type_id": "3", "type_name": "欧美剧"}, {"type_id": "4", "type_name": "香港剧"},
            {"type_id": "5", "type_name": "韩剧"}, {"type_id": "6", "type_name": "日剧"},
            {"type_id": "7", "type_name": "马泰剧"}, {"type_id": "9", "type_name": "动作片"},
            {"type_id": "10", "type_name": "爱情片"}, {"type_id": "11", "type_name": "喜剧片"},
            {"type_id": "12", "type_name": "科幻片"}, {"type_id": "13", "type_name": "恐怖片"},
            {"type_id": "14", "type_name": "剧情片"}, {"type_id": "15", "type_name": "战争片"},
            {"type_id": "16", "type_name": "记录片"}, {"type_id": "20", "type_name": "内地剧"},
            {"type_id": "23", "type_name": "动画片"}, {"type_id": "28", "type_name": "台湾剧"},
            {"type_id": "29", "type_name": "体育赛事"}, {"type_id": "30", "type_name": "短剧"},
            {"type_id": "31", "type_name": "预告片"}, {"type_id": "32", "type_name": "足球"},
            {"type_id": "33", "type_name": "篮球"}, {"type_id": "34", "type_name": "台球"},
            {"type_id": "35", "type_name": "其他赛事"}, {"type_id": "40", "type_name": "古装仙侠"},
            {"type_id": "41", "type_name": "现代都市"}, {"type_id": "42", "type_name": "穿越年代"},
            {"type_id": "43", "type_name": "言情总裁"}, {"type_id": "44", "type_name": "重生民国"},
            {"type_id": "45", "type_name": "反转爽剧"}, {"type_id": "46", "type_name": "脑洞悬疑"},
            {"type_id": "47", "type_name": "擦边短剧"}, {"type_id": "48", "type_name": "AI漫剧"}
        ]
    },
    "http://caiji.dyttzyapi.com": {
        "name": "电影天堂",
        "cates": [
            {"type_id": "6", "type_name": "动作片"}, {"type_id": "7", "type_name": "喜剧片"},
            {"type_id": "8", "type_name": "爱情片"}, {"type_id": "9", "type_name": "科幻片"},
            {"type_id": "10", "type_name": "恐怖片"}, {"type_id": "11", "type_name": "剧情片"},
            {"type_id": "12", "type_name": "战争片"}, {"type_id": "13", "type_name": "国产剧"},
            {"type_id": "14", "type_name": "香港剧"}, {"type_id": "15", "type_name": "韩国剧"},
            {"type_id": "16", "type_name": "欧美剧"}, {"type_id": "20", "type_name": "记录片"},
            {"type_id": "21", "type_name": "台湾剧"}, {"type_id": "22", "type_name": "日本剧"},
            {"type_id": "23", "type_name": "海外剧"}, {"type_id": "24", "type_name": "泰国剧"},
            {"type_id": "36", "type_name": "短剧"}, {"type_id": "37", "type_name": "动画片"}
        ]
    },
    "https://caiji.maotaizy.cc": {
        "name": "茅台",
        "cates": [
            {"type_id": "5", "type_name": "纪录片"}, {"type_id": "6", "type_name": "动作片"},
            {"type_id": "7", "type_name": "爱情片"}, {"type_id": "8", "type_name": "喜剧片"},
            {"type_id": "9", "type_name": "科幻片"}, {"type_id": "10", "type_name": "恐怖片"},
            {"type_id": "11", "type_name": "剧情片"}, {"type_id": "12", "type_name": "战争片"},
            {"type_id": "13", "type_name": "国产剧"}, {"type_id": "14", "type_name": "香港剧"},
            {"type_id": "15", "type_name": "欧美剧"}, {"type_id": "16", "type_name": "韩剧"},
            {"type_id": "21", "type_name": "泰国剧"}, {"type_id": "22", "type_name": "日本剧"},
            {"type_id": "23", "type_name": "台湾剧"}, {"type_id": "24", "type_name": "海外剧"},
            {"type_id": "29", "type_name": "演唱会"}, {"type_id": "36", "type_name": "体育赛事"},
            {"type_id": "37", "type_name": "短剧大全"}, {"type_id": "38", "type_name": "篮球"},
            {"type_id": "39", "type_name": "足球"}, {"type_id": "40", "type_name": "网球"},
            {"type_id": "41", "type_name": "斯诺克"}, {"type_id": "42", "type_name": "LPL"},
            {"type_id": "43", "type_name": "重生民国"}, {"type_id": "44", "type_name": "穿越现代"},
            {"type_id": "45", "type_name": "反转爽剧"}, {"type_id": "46", "type_name": "言情总裁"},
            {"type_id": "47", "type_name": "现代都市"}, {"type_id": "48", "type_name": "古装仙侠"},
            {"type_id": "49", "type_name": "悬疑烧脑"}, {"type_id": "50", "type_name": "惊悚片"},
            {"type_id": "52", "type_name": "娱乐新闻"}, {"type_id": "53", "type_name": "预告片"}
        ]
    },
    "https://api.maoyanapi.top": {
        "name": "猫眼",
        "cates": [
            {"type_id": "6", "type_name": "动作片"}, {"type_id": "7", "type_name": "喜剧片"},
            {"type_id": "8", "type_name": "爱情片"}, {"type_id": "9", "type_name": "科幻片"},
            {"type_id": "10", "type_name": "恐怖片"}, {"type_id": "11", "type_name": "剧情片"},
            {"type_id": "12", "type_name": "战争片"}, {"type_id": "13", "type_name": "国产剧"},
            {"type_id": "14", "type_name": "香港剧"}, {"type_id": "15", "type_name": "韩国剧"},
            {"type_id": "16", "type_name": "欧美剧"}, {"type_id": "17", "type_name": "体育"},
            {"type_id": "18", "type_name": "NBA"}, {"type_id": "20", "type_name": "惊悚片"},
            {"type_id": "21", "type_name": "家庭篇"}, {"type_id": "22", "type_name": "古装片"},
            {"type_id": "23", "type_name": "历史片"}, {"type_id": "24", "type_name": "悬疑片"},
            {"type_id": "25", "type_name": "犯罪片"}, {"type_id": "26", "type_name": "灾难片"},
            {"type_id": "27", "type_name": "纪录片"}, {"type_id": "28", "type_name": "短片"},
            {"type_id": "29", "type_name": "动画片"}, {"type_id": "30", "type_name": "台湾剧"},
            {"type_id": "31", "type_name": "日本剧"}, {"type_id": "32", "type_name": "海外剧"},
            {"type_id": "33", "type_name": "泰国剧"}, {"type_id": "41", "type_name": "足球"},
            {"type_id": "42", "type_name": "篮球"}, {"type_id": "43", "type_name": "未分类"},
            {"type_id": "45", "type_name": "西部片"}, {"type_id": "46", "type_name": "爽文短剧"},
            {"type_id": "47", "type_name": "短剧现代都市"}, {"type_id": "48", "type_name": "短剧脑洞悬疑"},
            {"type_id": "49", "type_name": "短剧年代穿越"}, {"type_id": "50", "type_name": "短剧古装仙侠"},
            {"type_id": "51", "type_name": "短剧反转爽剧"}, {"type_id": "52", "type_name": "短剧女频恋爱"},
            {"type_id": "53", "type_name": "短剧成长逆袭"}, {"type_id": "54", "type_name": "奇幻片"}
        ]
    },
    "https://www.mdzyapi.com": {
        "name": "魔都",
        "cates": [
            {"type_id": "10", "type_name": "动作片"}, {"type_id": "11", "type_name": "喜剧片"},
            {"type_id": "12", "type_name": "爱情片"}, {"type_id": "13", "type_name": "科幻片"},
            {"type_id": "14", "type_name": "恐怖片"}, {"type_id": "15", "type_name": "剧情片"},
            {"type_id": "16", "type_name": "战争片"}, {"type_id": "17", "type_name": "惊悚片"},
            {"type_id": "18", "type_name": "家庭片"}, {"type_id": "19", "type_name": "古装片"},
            {"type_id": "20", "type_name": "历史片"}, {"type_id": "21", "type_name": "悬疑片"},
            {"type_id": "22", "type_name": "犯罪片"}, {"type_id": "23", "type_name": "灾难片"},
            {"type_id": "24", "type_name": "记录片"}, {"type_id": "25", "type_name": "短片"},
            {"type_id": "26", "type_name": "国产剧"}, {"type_id": "27", "type_name": "香港剧"},
            {"type_id": "28", "type_name": "韩国剧"}, {"type_id": "29", "type_name": "欧美剧"},
            {"type_id": "30", "type_name": "台湾剧"}, {"type_id": "31", "type_name": "日本剧"},
            {"type_id": "32", "type_name": "海外剧"}, {"type_id": "33", "type_name": "泰国剧"},
            {"type_id": "38", "type_name": "短剧"}, {"type_id": "40", "type_name": "体育"},
            {"type_id": "41", "type_name": "足球"}, {"type_id": "42", "type_name": "AI漫剧"}
        ]
    },
    "https://zuida.xyz": {
        "name": "最大",
        "cates": [
            {"type_id": "6", "type_name": "动作片"}, {"type_id": "7", "type_name": "喜剧片"},
            {"type_id": "8", "type_name": "爱情片"}, {"type_id": "9", "type_name": "科幻片"},
            {"type_id": "10", "type_name": "恐怖片"}, {"type_id": "11", "type_name": "剧情片"},
            {"type_id": "12", "type_name": "战争片"}, {"type_id": "13", "type_name": "国产剧"},
            {"type_id": "14", "type_name": "欧美剧"}, {"type_id": "15", "type_name": "韩剧"},
            {"type_id": "16", "type_name": "日剧"}, {"type_id": "17", "type_name": "港剧"},
            {"type_id": "18", "type_name": "台剧"}, {"type_id": "19", "type_name": "泰剧"},
            {"type_id": "20", "type_name": "纪录片"}, {"type_id": "23", "type_name": "海外剧"},
            {"type_id": "39", "type_name": "动画片"}, {"type_id": "47", "type_name": "演唱会"},
            {"type_id": "48", "type_name": "体育赛事"}, {"type_id": "49", "type_name": "篮球"},
            {"type_id": "50", "type_name": "足球"}, {"type_id": "51", "type_name": "预告片"},
            {"type_id": "52", "type_name": "斯诺克"}, {"type_id": "53", "type_name": "影视解说"},
            {"type_id": "54", "type_name": "爽文短剧"}, {"type_id": "56", "type_name": "港台三级"},
            {"type_id": "60", "type_name": "两性课堂"}, {"type_id": "61", "type_name": "写真热舞"},
            {"type_id": "64", "type_name": "女频恋爱"}, {"type_id": "65", "type_name": "反转爽剧"},
            {"type_id": "66", "type_name": "古装仙侠"}, {"type_id": "67", "type_name": "年代穿越"},
            {"type_id": "68", "type_name": "脑洞悬疑"}, {"type_id": "69", "type_name": "现代都市"},
            {"type_id": "72", "type_name": "Netflix自制剧"}, {"type_id": "73", "type_name": "擦边短剧"},
            {"type_id": "74", "type_name": "科普学习"}, {"type_id": "75", "type_name": "漫剧"}
        ]
    },
    "https://jszyapi.com": {
        "name": "极速",
        "cates": [
            {"type_id": "3", "type_name": "欧美剧"}, {"type_id": "4", "type_name": "香港剧"},
            {"type_id": "5", "type_name": "韩剧"}, {"type_id": "6", "type_name": "日剧"},
            {"type_id": "7", "type_name": "马泰剧"}, {"type_id": "9", "type_name": "动作片"},
            {"type_id": "10", "type_name": "爱情片"}, {"type_id": "11", "type_name": "喜剧片"},
            {"type_id": "12", "type_name": "科幻片"}, {"type_id": "13", "type_name": "恐怖片"},
            {"type_id": "14", "type_name": "剧情片"}, {"type_id": "15", "type_name": "战争片"},
            {"type_id": "16", "type_name": "记录片"}, {"type_id": "20", "type_name": "内地剧"},
            {"type_id": "23", "type_name": "动画片"}, {"type_id": "28", "type_name": "台湾剧"},
            {"type_id": "29", "type_name": "体育赛事"}, {"type_id": "34", "type_name": "灾难片"},
            {"type_id": "35", "type_name": "悬疑片"}, {"type_id": "36", "type_name": "犯罪片"},
            {"type_id": "37", "type_name": "奇幻片"}, {"type_id": "38", "type_name": "短剧"},
            {"type_id": "39", "type_name": "预告片"}, {"type_id": "40", "type_name": "足球"},
            {"type_id": "41", "type_name": "篮球"}, {"type_id": "42", "type_name": "台球"},
            {"type_id": "43", "type_name": "其他赛事"}, {"type_id": "45", "type_name": "古装仙侠"},
            {"type_id": "46", "type_name": "现代都市"}, {"type_id": "47", "type_name": "穿越年代"},
            {"type_id": "48", "type_name": "言情总裁"}, {"type_id": "49", "type_name": "重生民国"},
            {"type_id": "50", "type_name": "反转爽剧"}, {"type_id": "52", "type_name": "脑洞悬疑"},
            {"type_id": "53", "type_name": "擦边短剧"}, {"type_id": "54", "type_name": "AI漫剧"}
        ]
    },
    "https://subocaiji.com": {
        "name": "速播",
        "cates": [
            {"type_id": "5", "type_name": "纪录片"}, {"type_id": "6", "type_name": "动作片"},
            {"type_id": "7", "type_name": "爱情片"}, {"type_id": "8", "type_name": "科幻片"},
            {"type_id": "9", "type_name": "战争片"}, {"type_id": "10", "type_name": "剧情片"},
            {"type_id": "11", "type_name": "恐怖片"}, {"type_id": "12", "type_name": "喜剧片"},
            {"type_id": "14", "type_name": "大陆剧"}, {"type_id": "15", "type_name": "台湾剧"},
            {"type_id": "16", "type_name": "韩剧"}, {"type_id": "17", "type_name": "美剧"},
            {"type_id": "18", "type_name": "港澳剧"}, {"type_id": "20", "type_name": "日剧"},
            {"type_id": "21", "type_name": "泰剧"}, {"type_id": "23", "type_name": "体育赛事"},
            {"type_id": "27", "type_name": "短剧"}, {"type_id": "28", "type_name": "预告片"},
            {"type_id": "29", "type_name": "足球"}, {"type_id": "30", "type_name": "篮球"},
            {"type_id": "31", "type_name": "台球"}, {"type_id": "32", "type_name": "其他赛事"},
            {"type_id": "37", "type_name": "古装仙侠"}, {"type_id": "38", "type_name": "现代都市"},
            {"type_id": "39", "type_name": "穿越年代"}, {"type_id": "40", "type_name": "言情总裁"},
            {"type_id": "41", "type_name": "重生民国"}, {"type_id": "42", "type_name": "反转爽剧"},
            {"type_id": "43", "type_name": "脑洞悬疑"}, {"type_id": "44", "type_name": "擦边短剧"},
            {"type_id": "45", "type_name": "AI漫剧"}
        ]
    },
    "https://hhzyapi.com": {
        "name": "豪华",
        "cates": [
            {"type_id": "3", "type_name": "欧美剧"}, {"type_id": "4", "type_name": "香港剧"},
            {"type_id": "5", "type_name": "韩剧"}, {"type_id": "6", "type_name": "日剧"},
            {"type_id": "7", "type_name": "马泰剧"}, {"type_id": "9", "type_name": "动作片"},
            {"type_id": "10", "type_name": "爱情片"}, {"type_id": "11", "type_name": "喜剧片"},
            {"type_id": "12", "type_name": "科幻片"}, {"type_id": "13", "type_name": "恐怖片"},
            {"type_id": "14", "type_name": "剧情片"}, {"type_id": "15", "type_name": "战争片"},
            {"type_id": "16", "type_name": "记录片"}, {"type_id": "20", "type_name": "内地剧"},
            {"type_id": "23", "type_name": "动画片"}, {"type_id": "28", "type_name": "台湾剧"},
            {"type_id": "34", "type_name": "灾难片"}, {"type_id": "35", "type_name": "悬疑片"},
            {"type_id": "36", "type_name": "犯罪片"}, {"type_id": "37", "type_name": "奇幻片"},
            {"type_id": "38", "type_name": "短剧"}, {"type_id": "39", "type_name": "预告片"},
            {"type_id": "40", "type_name": "体育赛事"}, {"type_id": "41", "type_name": "足球"},
            {"type_id": "42", "type_name": "篮球"}, {"type_id": "43", "type_name": "台球"},
            {"type_id": "44", "type_name": "其他赛事"}, {"type_id": "45", "type_name": "古装仙侠"},
            {"type_id": "46", "type_name": "现代都市"}, {"type_id": "47", "type_name": "穿越年代"},
            {"type_id": "48", "type_name": "言情总裁"}, {"type_id": "49", "type_name": "重生民国"},
            {"type_id": "50", "type_name": "反转爽剧"}, {"type_id": "51", "type_name": "脑洞悬疑"},
            {"type_id": "52", "type_name": "擦边短剧"}, {"type_id": "53", "type_name": "AI漫剧"}
        ]
    },
    "https://www.huyaapi.com": {
        "name": "虎牙",
        "cates": [
            {"type_id": "3", "type_name": "欧美剧"}, {"type_id": "4", "type_name": "香港剧"},
            {"type_id": "5", "type_name": "韩剧"}, {"type_id": "6", "type_name": "日剧"},
            {"type_id": "7", "type_name": "马泰剧"}, {"type_id": "9", "type_name": "动作片"},
            {"type_id": "10", "type_name": "爱情片"}, {"type_id": "11", "type_name": "喜剧片"},
            {"type_id": "12", "type_name": "科幻片"}, {"type_id": "13", "type_name": "恐怖片"},
            {"type_id": "14", "type_name": "剧情片"}, {"type_id": "15", "type_name": "战争片"},
            {"type_id": "16", "type_name": "记录片"}, {"type_id": "20", "type_name": "内地剧"},
            {"type_id": "23", "type_name": "动画片"}, {"type_id": "28", "type_name": "台湾剧"},
            {"type_id": "29", "type_name": "体育赛事"}, {"type_id": "30", "type_name": "短剧"},
            {"type_id": "31", "type_name": "预告片"}, {"type_id": "32", "type_name": "足球"},
            {"type_id": "33", "type_name": "篮球"}, {"type_id": "34", "type_name": "台球"},
            {"type_id": "35", "type_name": "其他赛事"}, {"type_id": "42", "type_name": "古装仙侠"},
            {"type_id": "43", "type_name": "现代都市"}, {"type_id": "44", "type_name": "穿越年代"},
            {"type_id": "45", "type_name": "言情总裁"}, {"type_id": "46", "type_name": "重生民国"},
            {"type_id": "47", "type_name": "反转爽剧"}, {"type_id": "48", "type_name": "脑洞悬疑"},
            {"type_id": "49", "type_name": "擦边短剧"}, {"type_id": "50", "type_name": "AI漫剧"}
        ]
    },
    "https://lovedan.net": {
        "name": "艾旦",
        "cates": [
            {"type_id": "5", "type_name": "福利视频"}, {"type_id": "6", "type_name": "动作片"},
            {"type_id": "7", "type_name": "喜剧片"}, {"type_id": "8", "type_name": "爱情片"},
            {"type_id": "9", "type_name": "科幻片"}, {"type_id": "10", "type_name": "恐怖片"},
            {"type_id": "11", "type_name": "犯罪片"}, {"type_id": "12", "type_name": "战争片"},
            {"type_id": "13", "type_name": "国产剧"}, {"type_id": "14", "type_name": "港台剧"},
            {"type_id": "15", "type_name": "日韩剧"}, {"type_id": "16", "type_name": "欧美剧"},
            {"type_id": "18", "type_name": "网红主播"}, {"type_id": "21", "type_name": "剧情片"},
            {"type_id": "22", "type_name": "纪录片"}, {"type_id": "30", "type_name": "海外剧"},
            {"type_id": "32", "type_name": "明星"}, {"type_id": "33", "type_name": "福利图片"},
            {"type_id": "34", "type_name": "爱蜜社"}, {"type_id": "35", "type_name": "头条女神"},
            {"type_id": "36", "type_name": "美媛馆"}, {"type_id": "37", "type_name": "海外抖音"},
            {"type_id": "38", "type_name": "嗲囡囡"}, {"type_id": "39", "type_name": "波萝社"},
            {"type_id": "40", "type_name": "魅妍社"}, {"type_id": "41", "type_name": "爱尤物"},
            {"type_id": "42", "type_name": "秀人网"}, {"type_id": "43", "type_name": "尤果网"},
            {"type_id": "44", "type_name": "推女神"}, {"type_id": "45", "type_name": "DGC套图"},
            {"type_id": "46", "type_name": "尤蜜荟"}, {"type_id": "47", "type_name": "模范学院"},
            {"type_id": "48", "type_name": "尤物馆"}, {"type_id": "49", "type_name": "优星馆"},
            {"type_id": "50", "type_name": "蜜桃社"}, {"type_id": "51", "type_name": "影私荟"},
            {"type_id": "52", "type_name": "顽味生活"}, {"type_id": "53", "type_name": "星乐园"},
            {"type_id": "54", "type_name": "花の颜"}, {"type_id": "55", "type_name": "御女郎"},
            {"type_id": "56", "type_name": "糖果画报"}, {"type_id": "57", "type_name": "花漾"},
            {"type_id": "58", "type_name": "星颜社"}, {"type_id": "59", "type_name": "画语界"},
            {"type_id": "60", "type_name": "直播"}, {"type_id": "61", "type_name": "央视"},
            {"type_id": "62", "type_name": "卫视"}, {"type_id": "63", "type_name": "短剧"},
            {"type_id": "64", "type_name": "影视解说"}, {"type_id": "65", "type_name": "港台三级"},
            {"type_id": "69", "type_name": "预告片"}
        ]
    },
    "https://www.hongniuzy2.com": {
        "name": "红牛",
        "cates": [
            {"type_id": "5", "type_name": "动作片"}, {"type_id": "6", "type_name": "喜剧片"},
            {"type_id": "7", "type_name": "爱情片"}, {"type_id": "8", "type_name": "科幻片"},
            {"type_id": "9", "type_name": "恐怖片"}, {"type_id": "10", "type_name": "剧情片"},
            {"type_id": "11", "type_name": "战争片"}, {"type_id": "12", "type_name": "国产剧"},
            {"type_id": "13", "type_name": "港澳剧"}, {"type_id": "14", "type_name": "日剧"},
            {"type_id": "15", "type_name": "欧美剧"}, {"type_id": "16", "type_name": "台湾剧"},
            {"type_id": "17", "type_name": "泰剧"}, {"type_id": "18", "type_name": "韩剧"},
            {"type_id": "19", "type_name": "纪录片"}, {"type_id": "29", "type_name": "体育赛事"},
            {"type_id": "30", "type_name": "短剧"}, {"type_id": "31", "type_name": "预告片"},
            {"type_id": "32", "type_name": "足球"}, {"type_id": "33", "type_name": "篮球"},
            {"type_id": "34", "type_name": "台球"}, {"type_id": "35", "type_name": "其他赛事"},
            {"type_id": "43", "type_name": "古装仙侠"}, {"type_id": "44", "type_name": "现代都市"},
            {"type_id": "45", "type_name": "穿越年代"}, {"type_id": "46", "type_name": "言情总裁"},
            {"type_id": "47", "type_name": "重生民国"}, {"type_id": "48", "type_name": "反转爽剧"},
            {"type_id": "49", "type_name": "脑洞悬疑"}, {"type_id": "50", "type_name": "擦边短剧"},
            {"type_id": "51", "type_name": "AI漫剧"}
        ]
    },
    "https://p2100.net": {
        "name": "飘零",
        "cates": [
            {"type_id": "5", "type_name": "动作片"}, {"type_id": "6", "type_name": "喜剧片"},
            {"type_id": "7", "type_name": "爱情片"}, {"type_id": "8", "type_name": "科幻片"},
            {"type_id": "9", "type_name": "恐怖片"}, {"type_id": "10", "type_name": "剧情片"},
            {"type_id": "11", "type_name": "战争片"}, {"type_id": "12", "type_name": "国产剧"},
            {"type_id": "13", "type_name": "香港剧"}, {"type_id": "14", "type_name": "台湾剧"},
            {"type_id": "15", "type_name": "日本剧"}, {"type_id": "16", "type_name": "韩国剧"},
            {"type_id": "17", "type_name": "欧美剧"}, {"type_id": "18", "type_name": "海外剧"},
            {"type_id": "19", "type_name": "短剧"}, {"type_id": "21", "type_name": "纪录片"},
            {"type_id": "22", "type_name": "邵氏大片"}, {"type_id": "23", "type_name": "站内新闻"}
        ]
    }
}


class Spider(Spider):

    def init(self, extend=""):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9',
        }
        self.timeout = 10
        self.search_limit = 5
        self.search_match = False
        self.search_pic = True
        
        # 处理配置
        self._sites = BUILTIN_SITES
        self._site_map = {s['url']: s for s in self._sites}
        self._classes = []
        self._filter = {}
        self._filter_def = {}
        
        self._build_classes_and_filter()
        
        if self._classes:
            self.host = self._classes[0]['type_id']
            self.headers['Referer'] = self.host + '/'

    def getName(self):
        return '采集之王[合]'

    def isVideoFormat(self, url):
        pass

    def manualVideoCheck(self):
        pass

    def destroy(self):
        pass

    def _build_classes_and_filter(self):
        """构建分类列表和筛选器 (使用硬编码数据，无需网络请求)"""
        for site in self._sites:
            url = site['url']
            name = site['name']
            
            # 主分类：站点本身
            self._classes.append({
                'type_id': url,
                'type_name': name,
                'api': site.get('api', '/api.php/provide/vod'),
                'parse_url': site.get('parse_url', ''),
                'searchable': site.get('searchable', True),
                'cate_exclude': site.get('cate_exclude', ''),
            })
            
            # 从硬编码数据构建筛选器
            hardcoded = HARDCODED_CATES.get(url)
            if hardcoded and hardcoded.get('cates'):
                class_list = hardcoded['cates']
                filter_values = [{"n": c['type_name'], "v": str(c['type_id'])} for c in class_list]
                self._filter[url] = [{"key": "类型", "name": "类型", "value": filter_values}]
                self._filter_def[url] = {"类型": str(class_list[0]['type_id'])}
            else:
                self._filter[url] = [{"key": "类型", "name": "类型", "value": [{"n": "全部", "v": ""}]}]
                self._filter_def[url] = {"类型": ""}

    def _get_site(self, type_id):
        """通过 type_id 获取站点信息（返回 _classes 里的完整信息）"""
        for c in self._classes:
            if c['type_id'] == type_id:
                return c
        return None

    def _build_url(self, site, params):
        """构建完整请求 URL"""
        api = site.get('api', '/api.php/provide/vod')
        base = urljoin(site['type_id'], api)
        if not base.endswith('/'):
            base += '/'
        query = '&'.join([f'{k}={v}' for k, v in (params or {}).items() if v])
        return f'{base}?{query}' if query else base

    # ========== 核心接口 ==========
    def homeContent(self, filter):
        result = {'class': self._classes, 'filters': self._filter}
        return result

    def homeVideoContent(self):
        result = {'list': []}
        if not self._classes:
            return result
        
        import random
        site = random.choice(self._classes)
        site_url = site['type_id']
        site_name = site['type_name']
        
        try:
            # 获取该站点第一个分类的推荐
            hardcoded = HARDCODED_CATES.get(site_url)
            tid = ''
            if hardcoded and hardcoded.get('cates'):
                tid = str(hardcoded['cates'][0]['type_id'])
            
            params = {'ac': 'detail'}
            if tid:
                params['t'] = tid
            url = self._build_url(site, params)
            resp = self.fetch(url, headers=self.headers, timeout=self.timeout)
            if resp and resp.status_code == 200:
                data = resp.json()
                vods = data.get('list', [])
                for v in vods[:20]:
                    v['vod_id'] = f"{site_url}${v['vod_id']}"
                    v['vod_remarks'] = f"{v.get('vod_remarks', '')}|{site_name}"
                result['list'] = vods
        except Exception as e:
            print(f'[{self.getName()}] 首页推荐失败: {e}')
        return result

    def categoryContent(self, tid, pg, filter, extend):
        result = {'list': [], 'page': int(pg or 1), 'pagecount': 999, 'limit': 20, 'total': 99999}
        
        site = self._get_site(tid)
        if not site:
            return result
        
        try:
            page = max(1, int(pg or 1))
            extend = extend or {}
            
            params = {'ac': 'detail', 'pg': page}
            if extend.get('类型'):
                params['t'] = extend['类型']
            
            url = self._build_url(site, params)
            resp = self.fetch(url, headers=self.headers, timeout=self.timeout)
            
            if resp and resp.status_code == 200:
                data = resp.json()
                vods = data.get('list', [])
                for v in vods:
                    v['vod_id'] = f"{tid}${v['vod_id']}"
                    v['vod_remarks'] = f"{v.get('vod_remarks', '')}|{site['type_name']}"
                result['list'] = vods
                if not vods:
                    result['pagecount'] = page - 1 if page > 1 else 1
        except Exception as e:
            print(f'[{self.getName()}] categoryContent 错误: {e}')
        return result

    def detailContent(self, ids):
        result = {'list': []}
        if not ids:
            return result
        
        vod_id = ids[0]
        if '$' not in vod_id:
            return result
        
        site_url, real_id = vod_id.split('$', 1)
        site = self._get_site(site_url)
        if not site:
            return result
        
        try:
            params = {'ac': 'detail', 'ids': real_id}
            url = self._build_url(site, params)
            resp = self.fetch(url, headers=self.headers, timeout=self.timeout)
            
            if resp and resp.status_code == 200:
                data = resp.json()
                vods = data.get('list', [])
                if vods:
                    vod = vods[0]
                    vod['vod_id'] = f"{site_url}${vod['vod_id']}"
                    if vod.get('vod_play_from'):
                        vod['vod_play_from'] = '$$$'.join([
                            f"{site['type_name']}|{src}" for src in vod['vod_play_from'].split('$$$')
                        ])
                    if vod.get('vod_play_url'):
                        urls = []
                        for part in vod['vod_play_url'].split('$$$'):
                            eps = []
                            for ep in part.split('#'):
                                if '$' in ep:
                                    name, link = ep.split('$', 1)
                                    eps.append(f"{name}${site_url}${link}")
                            urls.append('#'.join(eps))
                        vod['vod_play_url'] = '$$$'.join(urls)
                    
                    self._last_site = site
                    self._last_vod_name = vod.get('vod_name', '')
                    result['list'] = [vod]
        except Exception as e:
            print(f'[{self.getName()}] detailContent 错误: {e}')
        return result

    def searchContent(self, key, quick, pg="1"):
        result = {'list': [], 'page': int(pg or 1), 'pagecount': 1, 'limit': 20, 'total': 0}
        if not key:
            return result
        
        try:
            page = int(pg or 1)
            searchable_sites = [s for s in self._classes if s.get('searchable', True)]
            
            if not searchable_sites:
                return result
            
            per_page = self.search_limit
            total_pages = max(1, (len(searchable_sites) + per_page - 1) // per_page)
            true_page = (page - 1) // total_pages + 1
            site_page = (page - 1) % total_pages
            
            start = site_page * per_page
            end = min(start + per_page, len(searchable_sites))
            sites_to_search = searchable_sites[start:end]
            
            if not sites_to_search:
                return result
            
            all_results = []
            
            with ThreadPoolExecutor(max_workers=min(10, len(sites_to_search))) as executor:
                futures = {
                    executor.submit(self._search_single_site, site, key, true_page): site 
                    for site in sites_to_search
                }
                
                for future in as_completed(futures):
                    site = futures[future]
                    try:
                        vods = future.result()
                        if vods:
                            for v in vods:
                                v['vod_id'] = f"{site['type_id']}${v['vod_id']}"
                                v['vod_remarks'] = f"{v.get('vod_remarks', '')}|{site['type_name']}"
                            all_results.extend(vods)
                    except Exception as e:
                        print(f'[{self.getName()}] 搜索 {site["type_name"]} 失败: {e}')
            
            if self.search_match:
                all_results = [v for v in all_results if re.search(key, v.get('vod_name', ''), re.I)]
            
            result['list'] = all_results
            result['total'] = len(all_results)
            result['pagecount'] = total_pages
            
        except Exception as e:
            print(f'[{self.getName()}] searchContent 错误: {e}')
        return result

    def _search_single_site(self, site, key, page):
        try:
            params = {'ac': 'detail', 'wd': key, 'pg': page}
            url = self._build_url(site, params)
            resp = self.fetch(url, headers=self.headers, timeout=self.timeout)
            if resp and resp.status_code == 200:
                data = resp.json()
                return data.get('list', [])
        except:
            pass
        return []

    def playerContent(self, flag, id, vipFlags=None):
        result = {'parse': 0, 'url': '', 'header': {}, 'danmaku': ''}
        try:
            if '$' not in id:
                return result
            
            site_url, play_path = id.split('$', 1)
            site = self._get_site(site_url)
            if not site:
                return result
            
            play_url = urljoin(site_url, play_path)
            parse_url = site.get('parse_url', '')
            
            if parse_url:
                resp = self.fetch(play_url, headers=self.headers, timeout=self.timeout)
                if resp and resp.status_code == 200:
                    html = resp.text
                    m3u8_matches = re.findall(r'(https?://[^\s"\']+\.(?:m3u8|mp4)[^\s"\']*)', html)
                    if m3u8_matches:
                        result['url'] = m3u8_matches[0]
                        result['header'] = {'Referer': play_url, 'User-Agent': self.headers['User-Agent']}
                        self._add_danmaku(result, flag)
                        return result
                    
                    url_match = re.search(r'(?:url|src|source)\s*[:=]\s*[\'"]([^\'"]+)[\'"]', html)
                    if url_match:
                        real_url = url_match.group(1)
                        if parse_url.startswith('json:'):
                            api = parse_url.replace('json:', '') + real_url
                            api_resp = self.fetch(api, headers={'Referer': play_url}, timeout=self.timeout)
                            if api_resp:
                                api_data = api_resp.json()
                                result['url'] = api_data.get('url', real_url)
                        else:
                            result['url'] = parse_url + real_url
                        result['header'] = {'Referer': play_url, 'User-Agent': self.headers['User-Agent']}
                        self._add_danmaku(result, flag)
                        return result
            
            result['parse'] = 1
            result['url'] = play_url
            result['header'] = {'Referer': site_url + '/', 'User-Agent': self.headers['User-Agent']}
            self._add_danmaku(result, flag)
            
        except Exception as e:
            print(f'[{self.getName()}] playerContent 错误: {e}')
        return result

    def _add_danmaku(self, result, flag):
        from urllib.parse import quote
        vod_name = getattr(self, '_last_vod_name', '')
        flag_name = flag.split('|')[-1] if '|' in flag else flag
        result['danmaku'] = f'http://127.0.0.1:9978/proxy?do=appdanmu&vodName={quote(vod_name)}&vodIndex={quote(flag_name)}'

    def localProxy(self, param):
        pass

    def liveContent(self, url):
        pass


# ========== 独立测试 ==========
if __name__ == '__main__':
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    sp = Spider()
    sp.init()
    
    print(f'站点数: {len(sp._classes)}')
    for c in sp._classes[:5]:
        print(f'  {c["type_name"]}: {c["type_id"]}')
    
    home = sp.homeContent(False)
    print(f'\n首页分类数: {len(home["class"])}')
    print(f'筛选器站点数: {len(home["filters"])}')
    
    if sp._classes:
        first_site = sp._classes[0]['type_id']
        print(f'\n测试分类: {first_site}')
        cat = sp.categoryContent(first_site, '1', False, {})
        print(f'视频数: {len(cat["list"])}')
        for v in cat['list'][:3]:
            print(f'  {v["vod_name"]} - {v["vod_id"]}')
    
    print('\n测试搜索: 流浪地球')
    search = sp.searchContent('流浪地球', False, '1')
    print(f'搜索结果: {len(search["list"])}')
    for v in search['list'][:3]:
        print(f'  {v["vod_name"]} - {v["vod_id"]}')