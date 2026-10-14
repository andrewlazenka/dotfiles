# Local Web Access extension

A personal, Exa-only adaptation of [pi-web-access](https://github.com/nicobailon/pi-web-access). The adapted upstream code remains available under the included MIT license.

## Tools

- `web_search`: Exa direct API when keyed, otherwise zero-config Exa MCP
- `code_search`: Exa code context
- `web_fetch`: guarded page, GitHub, PDF, YouTube, and local-video fetching
- `get_search_content`: bounded paging and passage finding for stored web results

## Configuration

Configuration is read from `web-search.json` under `PI_CODING_AGENT_DIR`, then `$XDG_CONFIG_HOME/pi`, then `~/.pi`.

```json
{
  "exaApiKey": "$EXA_API_KEY",
  "maxInlineContentChars": 30000,
  "pdf": { "maxSizeMB": 20 },
  "fetchRouting": { "allowRemoteHostedProviders": false },
  "fetchContent": {
    "domainPolicy": {
      "allow": [],
      "deny": ["blocked.example.com"]
    }
  },
  "ssrf": {
    "allowRanges": [],
    "trustEnvProxy": false
  }
}
```

`exaApiKey` also accepts a literal, `$ENV_VAR`, or `!trusted local command`. With no key, Exa MCP is used.

Remote hosted page extraction through Jina is disabled by default because it discloses the target URL to a third party. Set `fetchRouting.allowRemoteHostedProviders` to `true` to opt in.

Fetched content is cached for one hour under the Pi config directory, with 128-entry/128 MiB limits and restrictive local permissions. Use the returned `responseId` with `get_search_content` to page through or search it.
