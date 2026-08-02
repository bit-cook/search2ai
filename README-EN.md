[简体中文](README.md) · **English**

## User Communication

[discord](https://discord.gg/AKXYq32Bxc)

## Buy me a coffee

<a href="https://www.buymeacoffee.com/fatwang2" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

# Version Updates
- V0.2.8, 20260802, full refactor: remove the per-model entry files (search2openai/groq/moonshot/gemini.js) and unify into one core (`src/core` + dual Node/Worker entries). Any OpenAI-compatible API works out of the box, including the official Gemini OpenAI-compatible endpoint, Moonshot, Groq, DeepSeek, and Volcano Ark. Streaming and non-streaming both supported. Added local test script `scripts/test-local.js`
- V0.2.7, 20260802, back to maintenance: fix the `MAX_RESULTS is not defined` error for SearXNG search; fix duplicate `tool_call_id` caused by parallel streaming tool calls; remove the hardcoded third-party mirror and model name in the Gemini worker (new `API_BASE` env var, official endpoint by default); return readable errors and signup guidance when the Search1API key is missing or invalid; pass through real upstream status codes and reasons (401/429, etc.)
- V0.2.6, 20240425, support the searxng search service, support the moonshot API in stream mode
- V0.2.5, 20240425, open source the code for the search api
- V0.2.4, 20240424, support for Groq in Cloudflare Worker
- V0.2.3, 20240423, support for Azure OpenAI in Cloudflare Worker. It also introduces the ability to use an authorization code and customize the user's request key.
- V0.2.2, 20240420, support Moonshot API on unstream mode
- V0.2.1, 20240310, supports Google, Bing, Duckduckgo, Search1API for news-type searches; supports adjusting the number of search results via the MAX_RESULTS environment variable; supports adjusting the number of in-depth searches desired via the CRAWL_RESULTS environment variable.
- V0.2.0，20240310，Optimized openai.js, cloudflare worker version, really faster this time!

For more historical updates, please see [Version History](https://github.com/fatwang2/search2ai/releases)

# S2A

Give your LLM API web access: search, news, and page summarization. The model decides whether to search based on your input — it does not search on every request. No plugins, no key replacement: just point your client's custom base URL to your deployment. Self-hosting is fully supported and other features (image generation, voice, etc.) are unaffected.

Works with any OpenAI-compatible API: OpenAI, Gemini (official OpenAI-compatible endpoint), Moonshot, Groq, DeepSeek, Volcano Ark (Ark), Azure OpenAI, etc. — switch via environment variables, one codebase for all.

<table>
    <tr>
        <td><img src="https://github.com/user-attachments/assets/0f9b9c2e-3e99-4132-b19f-15b5fdfcf43d" alt="效果示例"></td>
        <td><img src="https://github.com/user-attachments/assets/698cea75-0760-4ee4-8501-cda1628b582e" alt="效果示例"></td>
    </tr>
    <tr>
        <td><img src="https://github.com/user-attachments/assets/d834ad68-b4b0-4d72-bf2c-96931fa9e55a" alt="效果示例"></td>
        <td><img src="https://github.com/user-attachments/assets/19bba006-10c3-4af2-9afd-314efebda73b" alt="效果示例"></td>
    </tr>
</table>

# Features

| Upstream Model (any OpenAI-compatible API) | Features              | Stream           | Deployments                                         |
| ------------------------------------------ | --------------------- | ---------------- | --------------------------------------------------- |
| `OpenAI` / `Gemini` / `Moonshot` / `Groq` / `DeepSeek` / `Volcano Ark` etc. | search, news, crawler | stream, unstream | Local, Zeabur, Cloudflare Worker, Vercel |
| `Azure OpenAI` (`OPENAI_TYPE=azure`) | search, news, crawler | stream, unstream | Local, Cloudflare Worker                 |

# Usage

**Replace the custom domain in any client with the following address**

![image](https://github.com/user-attachments/assets/ac321325-2253-4e94-bec8-8e84f8301108)



# Deployment

**Zeabur**

Click the button for one-click deployment, switched on your own environment variables

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com/templates/A4HGYF?referralCode=fatwang2)

To keep the project updated, it is recommended to fork this repository first, then deploy your branch through Zeabur

[![Deployed on Zeabur](https://zeabur.com/deployed-on-zeabur-dark.svg)](https://zeabur.com?referralCode=fatwang2&utm_source=fatwang2&utm_campaign=oss)

**Local Deployment**

1. Clone the repository locally

```
git clone https://github.com/fatwang2/search2ai
```

2. Copy `.env.template` as `.env`, configure environment variables (search service key is required)
3. Install dependencies and start

```
npm install
npm start
```

4. Port 3014, the complete address after concatenation is as follows, can be configured according to the client's requirements for the apibase address (if https is required, need to use nginx for reverse proxy, many tutorials online)

```
http://localhost:3014/v1/chat/completions
```

**Cloudflare worker**

1. Deploy this repo with `wrangler.toml` (entry: `src/entry/worker.js`), or `npm install -g wrangler && wrangler deploy`
2. Configure variables in Worker Settings → Variables (`APIBASE`, `SEARCH_SERVICE`, `SEARCH1API_KEY`, etc.)
   ![Effect Example](https://github.com/user-attachments/assets/05746a9d-0772-4b60-a228-63396fa1614a)
3. Configure triggers - custom domain in the worker, direct access to the worker's address in China might have issues, need to replace with custom domain
   ![Alt text](https://github.com/user-attachments/assets/01f5b013-e758-438e-ab53-2065892b0a24)


**Vercel**

Entry: `src/entry/node-server.js` (see `vercel.json`). Note: Vercel Serverless has a 10s response limit, so long responses may time out; use Zeabur or a local server for production.

One-click deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Ffatwang2%2Fsearch2ai&env=SEARCH_SERVICE&envDescription=%E6%9A%82%E6%97%B6%E6%94%AF%E6%8C%81google%E3%80%81bing%E3%80%81serpapi%E3%80%81serper%E3%80%81duckduckgo%EF%BC%8C%E5%BF%85%E5%A1%AB)

To ensure updates, you can also first fork this project and then deploy it on Vercel yourself

# Environment Variables

Configuration is done through environment variables:

| Environment Variable | Required    | Description                                                                                                                                                                 | Example                                                                          |
| -------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `SEARCH_SERVICE`   | Yes         | Search service. Configure the key of the service you choose.                              | `search1api, google, bing, serpapi, serper, duckduckgo, searxng`                        |
| `SEARCH1API_KEY`   | Yes*        | Required if using search1api (recommended companion search service). Free 100 credits now. Click [here](https://www.search1api.com/?utm_source=search2ai) to register | `xxx` |
| `APIBASE`          | No          | Upstream LLM base URL. Any OpenAI-compatible API.                                                                                                                                                  | `https://api.openai.com`, `https://ark.cn-beijing.volces.com/api/v3`, `https://generativelanguage.googleapis.com/v1beta/openai` |
| `MAX_RESULTS`      | No          | Number of search results.                                                                                                                                                   | `5`                                                                           |
| `CRAWL_RESULTS`    | No          | Number of deep searches (retrieve webpage text after searching). Currently only supports search1api.                          | `1`                                                                            |
| `BING_KEY`         | No       | Required if using Bing search. Click [here](https://www.microsoft.com/en-us/bing/apis/bing-web-search-api) to create                                              | `xxx`                                                                          |
| `GOOGLE_CX`        | No       | Required if using Google search. Search engine ID. Click [here](https://programmablesearchengine.google.com/controlpanel/create) to create                      | `xxx`                                                                          |
| `GOOGLE_KEY`       | No       | Required if using Google search. API key. Click [here](https://console.cloud.google.com/apis/credentials) to create                                              | `xxx`                                                                          |
| `SERPAPI_KEY`      | No       | Required if using serpapi. Free 100 requests/month. Click [here](https://serpapi.com/) to register                                              | `xxx`                                                                          |
| `SERPER_KEY`       | No       | Required if using serper. Free 2500 requests for 6 months. Click [here](https://serper.dev/) to register                                         | `xxx`                                                                          |
| `SEARXNG_BASE_URL` | No       | Required if using searxng. Self-hosted SearXNG domain, JSON mode must be enabled. | `https://search.xxx.xxx` |
| `OPENAI_TYPE`      | No          | Upstream type. Default `openai`.                                                                                                                                   | `openai, azure`                                                                |
| `RESOURCE_NAME`    | No       | Required if azure is selected                                                                                                                                               | `xxxx`                                                                         |
| `DEPLOY_NAME`      | No       | Required if azure is selected                                                                                                                                               | `gpt-35-turbo`                                                                 |
| `API_VERSION`      | No       | Required if azure is selected                                                                                                                                               | `2024-02-15-preview`                                                           |
| `AZURE_API_KEY`    | No       | Required if azure is selected                                                                                                                                               | `xxxx`                                                                         |
| `AUTH_KEYS`        | No       | Comma-separated allowlist of request keys. When set, requests must use one of these keys and the upstream uses `OPENAI_API_KEY` / `AZURE_API_KEY` instead — useful when sharing your service | `1111,2222` |
| `OPENAI_API_KEY`   | No       | Fixed upstream key for openai when `AUTH_KEYS` is set                                                        | `sk-xxx` |

\* `google / bing / serpapi / serper / searxng` are also supported — configure the key for whichever one you pick.

# Local Testing

```
cp .env.local.example .env.local   # fill in your LLM API key and search service key
npm test                            # or node scripts/test-local.js
```

# Future Iterations

- Upgrade the `ai` SDK dependency (critical vulnerability pending)
- Add a "search-then-answer" pipeline for models without function calling support
- Support more vertical searches
# Future Iterations

- Fix streaming output issues in Vercel project
- Improve the speed of streaming output
- Support more vertical searches
