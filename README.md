**简体中文** · [English](README-EN.md)

## 用户交流

[discord 频道](https://discord.gg/AKXYq32Bxc)

## 友情赞助

<a href="https://www.buymeacoffee.com/fatwang2" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

# S2A

让你的大模型 API 支持联网搜索、新闻和网页总结。大模型会根据你的输入判断是否联网，不是每次都搜索。

- 无需安装插件、无需更换 key，在常用客户端里替换自定义地址即可
- 支持所有 OpenAI 兼容 API：OpenAI、Gemini（官方 OpenAI 兼容端点）、Moonshot、Groq、DeepSeek、火山方舟、Azure OpenAI 等
- 支持流式与非流式，不影响画图、语音等其他功能
- 支持自行部署

<table>
    <tr>
        <td><img src="pictures/Opencatnews.png" alt="效果示例"></td>
        <td><img src="pictures/BotGem.png" alt="效果示例"></td>
    </tr>
    <tr>
        <td><img src="pictures/Lobehub.png" alt="效果示例"></td>
        <td><img src="pictures/url.png" alt="效果示例"></td>
    </tr>
</table>

# 🚀 先注册搜索服务：Search1API

本项目配套搜索服务 [**Search1API**](https://www.search1api.com/?utm_source=search2ai)，一个 key 聚合 Google / Bing / DuckDuckGo 等主流搜索引擎，注册免费送 100 积分，点击 👉 [**立即注册**](https://www.search1api.com/?utm_source=search2ai)

配置方式（复制到 `.env` 或 Worker 环境变量）：

```
SEARCH_SERVICE=search1api
SEARCH1API_KEY=你的_key
```

# 快速开始

**本地部署**

```bash
git clone https://github.com/fatwang2/search2ai
cd search2ai
npm install
cp .env.template .env    # 配置搜索服务 key(必填)与 APIBASE
npm start                # 默认端口 3014
```

客户端自定义地址填 `http://localhost:3014/v1`，请求 key 随意（或用 `AUTH_KEYS` 限定）。

**Cloudflare Worker**

用 `wrangler.toml` 部署本仓库（入口 `src/entry/worker.js`），在 Worker 后台 Settings → Variables 配置环境变量，再绑定自定义域名即可。

**Zeabur 一键部署**

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/A4HGYF?referralCode=fatwang2)

如需保持项目更新，建议先 fork 本仓库再部署你的分支。

# 环境变量

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `SEARCH_SERVICE` | 是 | 搜索服务：`search1api`（推荐，注册送 100 积分）、`google`、`bing`、`serpapi`、`serper`、`searxng` |
| `SEARCH1API_KEY` | 看情况 | 选 search1api 时必填，[注册](https://www.search1api.com/?utm_source=search2ai) |
| `APIBASE` | 否 | 大模型上游完整前缀（host + 版本段），与 OpenAI SDK 的 `baseURL` 语义一致，填 provider 文档里的地址，默认 `https://api.openai.com/v1`。例：`https://api.openai.com/v1`、`https://ark.cn-beijing.volces.com/api/v3`、`https://generativelanguage.googleapis.com/v1beta/openai` |
| `AUTH_KEYS` | 否 | 允许的请求 key 列表（逗号分隔），配置后上游改用 `OPENAI_API_KEY` |
| `OPENAI_API_KEY` | 否 | 配置 `AUTH_KEYS` 后，openai 上游使用的固定 key |
| `OPENAI_TYPE` | 否 | `openai`（默认）或 `azure`；选 azure 需配 `RESOURCE_NAME` / `DEPLOY_NAME` / `API_VERSION` / `AZURE_API_KEY` |
| `MAX_RESULTS` | 否 | 搜索结果条数，默认 `5` |
| `CRAWL_RESULTS` | 否 | 深度搜索（抓取网页正文）数量，目前仅 search1api 支持，默认 `0` |

其它搜索服务 key（`GOOGLE_CX` / `GOOGLE_KEY` / `BING_KEY` / `SERPAPI_KEY` / `SERPER_KEY` / `SEARXNG_BASE_URL`）按所选服务对应配置，详见 [.env.template](.env.template)。

# 本地测试

```bash
cp .env.local.example .env.local   # 填入大模型 API Key 与搜索服务 Key
npm test
```

# 致谢

- [search1api](https://www.search1api.com) - 本项目配套搜索服务
