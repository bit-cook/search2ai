**English** · [简体中文](README.md)

## User Communication

[Discord channel](https://discord.gg/AKXYq32Bxc)

## Buy me a coffee

<a href="https://www.buymeacoffee.com/fatwang2" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

# S2A

Give your LLM API web access: search, news, and page summarization. The model decides whether to search based on your input — it does not search on every request.

- No plugins, no key replacement — just point your client's custom base URL to your deployment
- Works with any OpenAI-compatible API: OpenAI, Gemini (official OpenAI-compatible endpoint), Moonshot, Groq, DeepSeek, Volcano Ark, Azure OpenAI, etc.
- Streaming and non-streaming supported; other features (image generation, voice, etc.) are unaffected
- Self-hosting fully supported

<table>
    <tr>
        <td><img src="pictures/Opencatnews.png" alt="example"></td>
        <td><img src="pictures/BotGem.png" alt="example"></td>
    </tr>
    <tr>
        <td><img src="pictures/Lobehub.png" alt="example"></td>
        <td><img src="pictures/url.png" alt="example"></td>
    </tr>
</table>

# 🚀 Register the Search Service First: Search1API

The companion search service for this project is [**Search1API**](https://www.search1api.com/?utm_source=search2ai) — one key for Google / Bing / DuckDuckGo and more, with 100 free credits on signup. Click 👉 [**Sign up now**](https://www.search1api.com/?utm_source=search2ai)

Configuration (add to `.env` or Worker environment variables):

```
SEARCH_SERVICE=search1api
SEARCH1API_KEY=your_key
```

# Quick Start

**Local deployment**

```bash
git clone https://github.com/fatwang2/search2ai
cd search2ai
npm install
cp .env.template .env    # configure the search service key (required) and APIBASE
npm start                # default port 3014
```

Set your client's custom base URL to `http://localhost:3014/v1`. Use any request key (or restrict it with `AUTH_KEYS`).

**Cloudflare Worker**

Deploy this repo with `wrangler.toml` (entry `src/entry/worker.js`), configure environment variables in Worker Settings → Variables, then bind a custom domain.

**Zeabur one-click deploy**

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/A4HGYF?referralCode=fatwang2)

Fork the repo first if you want to keep it updated.

# Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `SEARCH_SERVICE` | Yes | Search service: `search1api` (recommended, 100 free credits), `google`, `bing`, `serpapi`, `serper`, `searxng` |
| `SEARCH1API_KEY` | Conditional | Required when using search1api. [Register](https://www.search1api.com/?utm_source=search2ai) |
| `APIBASE` | No | Upstream LLM base URL, any OpenAI-compatible API. Default `https://api.openai.com`. **No need to append `/v1` manually**: bases ending in `/v1`, `/v3`, etc. are used as-is; bases ending in `/openai` get `/v1` appended; anything else gets `/v1` appended (e.g. `https://ark.cn-beijing.volces.com/api/v3` → `.../api/v3/chat/completions`) |
| `AUTH_KEYS` | No | Comma-separated allowlist of request keys. When set, upstream uses `OPENAI_API_KEY` |
| `OPENAI_API_KEY` | No | Fixed upstream key for openai when `AUTH_KEYS` is set |
| `OPENAI_TYPE` | No | `openai` (default) or `azure`; azure needs `RESOURCE_NAME` / `DEPLOY_NAME` / `API_VERSION` / `AZURE_API_KEY` |
| `MAX_RESULTS` | No | Number of search results. Default `5` |
| `CRAWL_RESULTS` | No | Number of deep searches (fetch page text). Only supported by search1api. Default `0` |

Keys for other search services (`GOOGLE_CX` / `GOOGLE_KEY` / `BING_KEY` / `SERPAPI_KEY` / `SERPER_KEY` / `SEARXNG_BASE_URL`) follow the service you choose; see [.env.template](.env.template).

# Local Testing

```bash
cp .env.local.example .env.local   # fill in your LLM API key and search service key
npm test
```

# Credits

- [search1api](https://www.search1api.com) - companion search service for this project
