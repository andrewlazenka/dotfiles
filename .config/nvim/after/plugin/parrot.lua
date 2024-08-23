local handle = io.popen("op read 'op://Private/Perplexity API Key/credential'")
local output = handle:read('*a')
local pplx_apikey = output:gsub('[\n\r]', ' ')

local handle = io.popen("op read 'op://Private/Anthropic API Key/credential'")
local output = handle:read('*a')
local anth_apikey = output:gsub('[\n\r]', ' ')

require("parrot").setup {
  -- Providers must be explicitly added to make them available.
  providers = {
	pplx = {
		api_key = pplx_apikey,
	--   api_key = os.getenv "PERPLEXITY_API_KEY",
	--   -- OPTIONAL
	--   -- gpg command
	--   -- api_key = { "gpg", "--decrypt", vim.fn.expand("$HOME") .. "/pplx_api_key.txt.gpg"  },
	--   -- macOS security tool
	--   -- api_key = { "/usr/bin/security", "find-generic-password", "-s pplx-api-key", "-w" },
	},
	-- openai = {
	--   api_key = os.getenv "OPENAI_API_KEY",
	-- },
	anthropic = {
	  api_key = anth_apikey,
	},
	-- mistral = {
	--   api_key = os.getenv "MISTRAL_API_KEY",
	-- },
	-- gemini = {
	--   api_key = os.getenv "GEMINI_API_KEY",
	-- },
	-- ollama = {} -- provide an empty list to make provider available
  },
}
