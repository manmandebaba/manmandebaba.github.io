/* ============================================================
   个人导航页 · 默认配置文件 (v0.0.2)
   说明：此文件通过 <script> 引入，双击 index.html 即可生效，
        无需本地服务器。界面内的所有修改都会保存到浏览器
         localStorage；如需「重置」会回到这里定义的默认值。
   ------------------------------------------------------------
   字段说明：
     settings.theme        主题：auto | dark | light
     settings.searchEngine 默认搜索引擎 key（见 app.js ENGINES）
     settings.aiAssistant  默认 AI 助手 key（见 app.js AI_ASSISTANTS）
     settings.cardIcon     卡片图标：favicon（自动抓取）| emoji
     settings.background   背景预设名 或 图片 URL
     settings.weatherCity  天气城市（留空则隐藏天气组件）
     settings.offWorkTime  下班时间 HH:MM
     settings.payDay       发薪日（每月几号）
   ============================================================ */
window.NAV_CONFIG_DEFAULT = {
  version: 2,
  title: "我的导航",
  settings: {
    theme: "auto",
    searchEngine: "baidu",
    aiAssistant: "deepseek",
    cardIcon: "favicon",
    background: "aurora",
    showSearch: true,
    showClock: true,
    showWeather: true,
    weatherCity: "北京",
    showOffWork: true,
    offWorkTime: "18:30",
    showPayday: true,
    payDay: 10
  },
  favorites: [
    { id: "deepseek",   name: "DeepSeek", url: "https://chat.deepseek.com",     icon: "🧠" },
    { id: "doubao",     name: "豆包",     url: "https://www.doubao.com",        icon: "🫘" },
    { id: "github",     name: "GitHub",   url: "https://github.com",            icon: "🐙" },
    { id: "bilibili",   name: "B站",      url: "https://www.bilibili.com",       icon: "📺" },
    { id: "douyin",     name: "抖音",     url: "https://www.douyin.com",         icon: "🎵" },
    { id: "taobao",     name: "淘宝",     url: "https://www.taobao.com",         icon: "🛍️" },
    { id: "jd",         name: "京东",     url: "https://www.jd.com",             icon: "🟥" },
    { id: "notion",     name: "Notion",   url: "https://www.notion.so",          icon: "📝" },
    { id: "zhihu",      name: "知乎",     url: "https://www.zhihu.com",          icon: "❓" },
    { id: "music163",   name: "网易云",   url: "https://music.163.com",          icon: "🎧" }
  ],
  categories: [
    {
      id: "ai", name: "AI 工具", icon: "🤖", sort: 1, items: [
        { id: "deepseek", name: "DeepSeek",   url: "https://chat.deepseek.com",  icon: "🧠", description: "深度求索" },
        { id: "doubao",   name: "豆包",       url: "https://www.doubao.com",     icon: "🫘", description: "字节跳动" },
        { id: "kimi",     name: "Kimi",       url: "https://kimi.moonshot.cn",   icon: "🌙", description: "月之暗面" },
        { id: "chatgpt",  name: "ChatGPT",    url: "https://chatgpt.com",        icon: "💬", description: "OpenAI" },
        { id: "yuanbao",  name: "元宝",       url: "https://yuanbao.tencent.com",icon: "🐧", description: "腾讯" },
        { id: "qwen",     name: "通义千问",   url: "https://tongyi.aliyun.com",   icon: "🐫", description: "阿里" },
        { id: "yiyan",    name: "文心一言",   url: "https://yiyan.baidu.com",     icon: "🅰️", description: "百度" },
        { id: "zhipu",    name: "智谱清言",   url: "https://chat.zhipuai.cn",     icon: "📊", description: "智谱 AI" }
      ]
    },
    {
      id: "dev", name: "开发工具", icon: "💻", sort: 2, items: [
        { id: "github",   name: "GitHub",          url: "https://github.com",             icon: "🐙", description: "代码托管" },
        { id: "gitee",    name: "Gitee",           url: "https://gitee.com",              icon: "🦋", description: "国内托管" },
        { id: "stack",    name: "Stack Overflow",  url: "https://stackoverflow.com",      icon: "📚", description: "问答社区" },
        { id: "npm",      name: "npm",             url: "https://www.npmjs.com",          icon: "📦", description: "包管理" },
        { id: "mdn",      name: "MDN",             url: "https://developer.mozilla.org",  icon: "📖", description: "Web 文档" },
        { id: "docker",   name: "Docker",          url: "https://www.docker.com",         icon: "🐳", description: "容器" },
        { id: "vercel",   name: "Vercel",          url: "https://vercel.com",             icon: "▲",  description: "部署平台" },
        { id: "codepen",  name: "CodePen",         url: "https://codepen.io",             icon: "✒️", description: "前端演练" }
      ]
    },
    {
      id: "social", name: "社交娱乐", icon: "🎮", sort: 3, items: [
        { id: "bilibili", name: "B站",     url: "https://www.bilibili.com",  icon: "📺", description: "弹幕视频" },
        { id: "douyin",   name: "抖音",     url: "https://www.douyin.com",    icon: "🎵", description: "短视频" },
        { id: "xhs",      name: "小红书",   url: "https://www.xiaohongshu.com",icon: "📕", description: "种草社区" },
        { id: "zhihu",    name: "知乎",     url: "https://www.zhihu.com",     icon: "❓", description: "知识问答" },
        { id: "weibo",    name: "微博",     url: "https://weibo.com",         icon: "🐦", description: "微博客" },
        { id: "tieba",    name: "百度贴吧", url: "https://tieba.baidu.com",   icon: "🔥", description: "兴趣社区" }
      ]
    },
    {
      id: "shopping", name: "购物生活", icon: "🛒", sort: 4, items: [
        { id: "taobao",   name: "淘宝",     url: "https://www.taobao.com",       icon: "🛍️", description: "综合电商" },
        { id: "jd",       name: "京东",     url: "https://www.jd.com",           icon: "🟥", description: "京东商城" },
        { id: "pdd",      name: "拼多多",   url: "https://www.pinduoduo.com",    icon: "🟣", description: "拼团" },
        { id: "meituan",  name: "美团",     url: "https://www.meituan.com",      icon: "🦘", description: "本地生活" },
        { id: "ctrip",    name: "携程",     url: "https://www.ctrip.com",        icon: "✈️", description: "旅行预订" }
      ]
    },
    {
      id: "productivity", name: "效率工具", icon: "⚡", sort: 5, items: [
        { id: "notion",   name: "Notion",     url: "https://www.notion.so",   icon: "📝", description: "笔记协作" },
        { id: "feishu",   name: "飞书",       url: "https://www.feishu.cn",    icon: "📋", description: "字节协作" },
        { id: "wps",      name: "WPS",        url: "https://www.wps.cn",       icon: "📄", description: "办公套件" },
        { id: "tdoc",     name: "腾讯文档",   url: "https://docs.qq.com",      icon: "📄", description: "在线文档" },
        { id: "trello",   name: "Trello",     url: "https://trello.com",       icon: "🗂️", description: "看板" },
        { id: "mubu",     name: "幕布",       url: "https://mubu.com",         icon: "🌿", description: "思维大纲" }
      ]
    },
    {
      id: "media", name: "影音视频", icon: "🎬", sort: 6, items: [
        { id: "qqvideo",  name: "腾讯视频", url: "https://v.qq.com",        icon: "🎞️", description: "长视频" },
        { id: "iqiyi",    name: "爱奇艺",   url: "https://www.iqiyi.com",    icon: "🅱️", description: "长视频" },
        { id: "youku",    name: "优酷",     url: "https://www.youku.com",    icon: "📼", description: "长视频" },
        { id: "music163", name: "网易云",   url: "https://music.163.com",    icon: "🎧", description: "音乐" },
        { id: "youtube",  name: "YouTube",  url: "https://www.youtube.com",  icon: "📺", description: "视频" },
        { id: "spotify",  name: "Spotify",  url: "https://www.spotify.com",  icon: "🎵", description: "音乐" }
      ]
    },
    {
      id: "learn", name: "学习资讯", icon: "📚", sort: 7, items: [
        { id: "dedao",    name: "得到",     url: "https://www.dedao.cn",      icon: "📖", description: "知识服务" },
        { id: "geek",     name: "极客时间", url: "https://time.geekbang.org",  icon: "⏱️", description: "技术课程" },
        { id: "kr36",     name: "36氪",     url: "https://36kr.com",          icon: "📰", description: "创投资讯" },
        { id: "huxiu",    name: "虎嗅",     url: "https://www.huxiu.com",     icon: "🐯", description: "商业资讯" }
      ]
    }
  ]
};
