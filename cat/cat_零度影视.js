let host = 'http://ldys.sq1005.top';
const headers = {
    'User-Agent': 'okhttp/4.12.0',
    'client': 'app',
    'deviceType': 'Android'
};

const publicKey = `-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCoYt0BP77U+DM08BiI/QbSRIfxijXo85BTPqIM1Ow8BNwhLETzRIZ+dEwdWDbydG/PspgBAfRpGaYVdJYtvaC2JnoO8+Ik6qMWojfEJxSFLa0Pb0A892tun4gsxoEMjcreZ+YGyaBxAfqX0BSMfdrOgIYaZQjYrw9TRLlUT31QoQIDAQAB\n-----END PUBLIC KEY-----`;
const privateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCquQQ5r6+yJI8CDFkXRp8vUsdD45ov8EP12ooLs56ca2DQXaSNGS9910bAPVA9chkp0mKIvKqjAsHz5Tl9EeNPblarGEeJUIxpxZtiSqNTpvtiD/TjhpzuHYic7RAfQ/h7p/ypE8ymU42pYjsB5t26Mv6XgkLV+jzrSf73HlCuS0iMyLmt6zz3Mw9izM13EpB8iFLtfbbYymycKTx4RAmPQLwhNGex/AlUIYxXP4R2yyaa4W6mEtc6aME2QuzJFxPgP3HJ9NBx/LWVn4skxWjZ7zg+VRQRHnjyVaSLu3Z5gN5ITWCyE32qaHJa6WBahZj5jWhRyAG1bQ+xKJa8lBL5AgMBAAECggEAUwv9SjJ0PSwbhNuM2w23kcWquROWhYtTA91zGY4esehqB/IFgb2mpIh8Gje5OKqwIu/8jpd4SiOlRYdUF8sD0DfUYRZGdj2AkFNX6tBz8tVfo6wvbB6naA1lzzBij1L5JO3qsjS3cJFkb+kg2yP66AC2Z+0tpfk8eRhdtshAZwfcd1DEGt1uAvYL1eaUK9HRvpt9lPeGcHERDl2hBd4uyaF0K1O+zF9y59nYbTySWPxRZq3sFEE85xRMlstD7YZi7W2gKvMFRD4/FKmrZ3m7aKJRITtyKOyyPcYmepNv3Qv7kk59Pg38n2WWQ0Ra/bCH3E48YNCnQvZMpitkTfJhoQKBgQDbnROOYTP8OTJ6f/qhoGjxeO3x1VOaOp8l0x7b0SCfoqNGS0Cyiqj72BmJtPMPqSTjn6MmNzqbg1KOdhXyzNozs+i5ccW1M56j96mr5I/Z0FpE3oyIHNfDDBlf9M8YQqEF9oYxniYYft9oapO7cRQkHER6qpvnHTavwlv4m78CXwKBgQDHAjs2YlpKDdI1lcbZJCc7TwtH+Pd2bUki8YXafWNcPhITQHbOZjr310eK1QJC6GJncjkOqbX7yv3ivvTO35FZTQhuA1xEG1P00FG8bE0tHYPIwQHi9y0eA5cieMdo8E6XYria1mw/3fqSQEsfZyJlR32JQIoGAipM8iO1X2nZpwKBgDkMFIhnt5lNQk+P7wsNIDWZtDWdtJnboHuy29E+Abt2A/O+mI/IdRz2hau/1WO8DFkUnszOi+rZshhPlGP90rCbi1igtTrcrdjp/KkqNjPea5R4OwkgdOu1uOG0NheXNzzVTQaWjk7Opjn5dWa7eP/oV+GFb/oZHJuLYVizHGsBAoGADA7rjZEKDYCm4w5PPSr+oY5ZjaPdQrS+gLqHtMRyN82fBMGcMUdqfUfzEstzVqCEDeaS5HuOBlK3bXzKkppjUTjksN3NQmcxgBz7RuJ9DqXCLXDcb2cwuafYCYOt+YLOEEgwDVm+t2P44dG5e46hO+fICH/7nP+WlpD5buz4GfMCgYB57r3g/6hi9WUDnfc7ZAzWMqR0EhJVYKYy+KFEtdIPzhkkIHq5RASe88E9kzoGoZFdb3tIjvGZWcHerirrqWkMsuQtP/Qi0zjieid5tAPj+r4kbiCVTw0E0jnmPBzGInQi7lpeTTKnG1fbyS5lBS+WmHfIuzpECgCkxhaT+LJJkg==\n-----END PRIVATE KEY-----`;

async function home(filter) {
    const hd = await getHeaders();
    const resp = await req(host + '/api/v1/app/screen/screenType', {
        method: 'POST',
        headers: hd
    });
    const content = JSON.parse(resp.content);
    const classes = [];
    const filterObj = {};
    if (content.data) {
        content.data.forEach(mainCate => {
            classes.push({
                type_id: mainCate.id.toString(),
                type_name: mainCate.name
            });
            const filters = [];
            if (mainCate.children) {
                mainCate.children.forEach(subCate => {
                    let filterType = '';
                    switch (subCate.name) {
                        case '类型': filterType = 'type'; break;
                        case '地区': filterType = 'area'; break;
                        case '年份': filterType = 'year'; break;
                    }
                    if (filterType) {
                        const values = [
                            { n: '全部', v: '' },
                            ...subCate.children.map(item => ({
                                n: item.name,
                                v: item.name
                            }))
                        ];
                        filters.push({
                            key: filterType,
                            name: subCate.name,
                            value: values,
                            init: ''
                        });
                    }
                });
            }
            filters.push({
                key: 'sort',
                name: '排序',
                init: 'NEWEST',
                value: [
                    { n: '最新', v: 'NEWEST' },
                    { n: '人气', v: 'POPULARITY' },
                    { n: '评分', v: 'COLLECT' },
                    { n: '热搜', v: 'HOT' }
                ]
            });
            filterObj[mainCate.id.toString()] = filters;
        });
    }

    return JSON.stringify({class: classes, filters: filterObj});
}

async function homeVod() {
    return JSON.stringify({ list: [] });
}

async function category(tid, pg, filter, extend) {
    const hd = await getHeaders();
    const condition = {
        'classify': extend.type || '',
        'region': extend.area || '',
        sreecnTypeEnum: extend.sort || 'NEWEST',
        typeId: tid,
        'year': extend.year || ''
    };
    const params = {
        condition: condition,
        pageNum: parseInt(pg),
        pageSize: 40
    };
    const resp = await req(host + '/api/v1/app/screen/screenMovie', {
        method: 'POST',
        headers: hd,
        data: params
    });
    const json = JSON.parse(resp.content);
    const videos = [];
    if (json.data && json.data.records) {
        json.data.records.forEach(item => {
            videos.push({
                vod_id: item.id + '*' + item.typeId,
                vod_name: item.name,
                vod_pic: item.cover,
                vod_remarks: item.totalEpisode || '',
            });
        });
    }
    return JSON.stringify({
        list: videos,
        page: parseInt(pg),
        pagecount: json.data ? json.data.pages : 0,
        limit: 40,
        total: json.data ? json.data.total : 0
    });
}

async function detail(id) {
    const hd = await getHeaders();
    const parts = id.split('*');
    const vodId = parseInt(parts[0]);
    const typeId = parts[1];
    const detailParams = {"id": vodId, "typeId": typeId};
    const detailRes = await req(host + '/api/v1/app/play/movieDesc', {
        method: 'POST',
        headers: hd,
        data: detailParams
    });
    const detailJson = JSON.parse(detailRes.content);
    const detailData = detailJson.data;
    const playReqPayload = JSON.stringify({
        "id": vodId,
        "source": 0,
        "typeId": typeId
    });
    const playParams = {"key": rsaEncrypt(playReqPayload)};
    const playDataRes = await req(host + '/api/v1/app/play/movieDetails', {
        method: 'POST',
        headers: hd,
        data: playParams
    });
    const playDataEnc = JSON.parse(playDataRes.content).data;
    const decryptedDataStr = rsaDecrypt(playDataEnc);
    const decryptedData = JSON.parse(decryptedDataStr);
    const shows = [];
    const playUrls = [];
    if (decryptedData.moviePlayerList) {
        for (const player of decryptedData.moviePlayerList) {
            const episodePayload = JSON.stringify({
                "id": vodId,
                "source": 0,
                "typeId": typeId,
                "playerId": player.id
            });
            const episodeParams = {"key": rsaEncrypt(episodePayload)};
            const episodeRes = await req(host + '/api/v1/app/play/movieDetails', {
                method: 'POST',
                headers: hd,
                data: episodeParams
            });
            const episodeDataEnc = JSON.parse(episodeRes.content).data;
            const episodeDecStr = rsaDecrypt(episodeDataEnc);
            const episodeDecData = JSON.parse(episodeDecStr);
            const urls = [];
            if (episodeDecData.episodeList) {
                episodeDecData.episodeList.forEach(ep => {
                    const param = {
                        id: vodId,
                        typeId: typeId,
                        playerId: player.id,
                        episodeId: ep.id
                    };
                    const paramStr = JSON.stringify(param);
                    urls.push(ep.episode + '$' + paramStr);
                });
            }
            if (urls.length > 0) {
                shows.push(player.moviePlayerName);
                playUrls.push(urls.join('#'));
            }
        }
    }
    const vod = {
        vod_id: id,
        vod_name: detailData.name,
        vod_pic: detailData.cover,
        vod_year: detailData.year,
        vod_area: detailData.area,
        vod_remarks: detailData.totalEpisode,
        vod_actor: detailData.star,
        vod_content: detailData.introduce,
        vod_play_from: shows.join('$$$'),
        vod_play_url: playUrls.join('$$$')
    };
    return JSON.stringify({
        list: [vod]
    });
}

async function play(flag, id, flags) {
    const hd = await getHeaders();
    const param = JSON.parse(id);
    const urlPayload = JSON.stringify({
        "id": param.id,
        "source": 0,
        "typeId": param.typeId,
        "playerId": param.playerId,
        "episodeId": param.episodeId
    });
    const urlParams = {"key": rsaEncrypt(urlPayload)};
    const postData = await req(host + '/api/v1/app/play/movieDetails', {
        method: 'POST',
        headers: hd,
        data: urlParams
    });
    const encryptedUrl = JSON.parse(postData.content).data;
    const decryptedUrlDataStr = rsaDecrypt(encryptedUrl);
    const playerUrl = JSON.parse(decryptedUrlDataStr).url;
    const analysisRes = await req(host + '/api/v1/app/play/analysisMovieUrl?playerUrl=' + encodeURIComponent(playerUrl) + '&playerId=' + param.playerId, {
        headers: hd
    });
    const finalUrl = JSON.parse(analysisRes.content).data;
    return JSON.stringify({parse: 0, url: finalUrl, header: {'User-Agent': headers['User-Agent']}
    });
}

async function search(wd, quick, pg=1) {
    const hd = await getHeaders();
    const params = {
        condition: {value: wd},
        pageNum: parseInt(pg),
        pageSize: 40
    };
    const resp = await req(host + '/api/v1/app/search/searchMovie', {
        method: 'POST',
        headers: hd,
        data: params
    });
    const json = JSON.parse(resp.content);
    const videos = [];
    if (json.data && json.data.records) {
        json.data.records.forEach(item => {
            videos.push({
                vod_id: item.id + '*' + item.typeId,
                vod_name: item.name,
                vod_pic: item.cover,
                vod_remarks: item.totalEpisode || ''
            });
        });
    }
    return JSON.stringify({list: videos, page: parseInt(pg), pagecount: json.data ? json.data.pages : 0});
}

async function getHeaders() {
    let did = await local.get('cache_zeroYs', 'did');
    if (!did) {
        did = generateDid();
        await local.set('cache_zeroYs', 'did', did);
    }
    let token = await local.get('cache_zeroYs', 'zero_token');
    if (!token) {
        try {
            const res = await req(host + '/api/v1/app/user/visitorInfo', {
                headers: {...headers, 'deviceId': did}
            });
            const json = JSON.parse(res.content);
            if (json.code === 200 && json.data && json.data.token) {
                token = json.data.token;
                await local.set('cache_zeroYs', 'zero_token', token);
            }
        } catch (e) {
            console.error('获取Token失败', e);
        }
    }
    return {...headers, 'deviceId': did, 'token': token, 'Content-Type': 'application/json'};
}

function generateDid() {
    const hex = '0123456789abcdef';
    let did = '';
    for (let i = 0; i < 16; i++) {
        did += hex[Math.floor(Math.random() * 16)];
    }
    return did;
}

function rsaEncrypt(data) {
    return rsaX('RSA/PKCS1', true, true, data, false, publicKey, true);
}

function rsaDecrypt(data) {
    return rsaX('RSA/PKCS1', false, false, data, true, privateKey, false);
}

async function init(cfg) {}

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
