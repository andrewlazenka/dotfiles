require("codecompanion").setup({
	adapters = {
		http = {
			openrouter = function()
				return require("codecompanion.adapters").extend("openai_compatible", {
					env = {
						url = "https://openrouter.ai/api",
						api_key = "cmd:op read \"op://Private/OpenRouter API Key - avante/credential\" --no-newline",
						chat_url = "/v1/chat/completions",
					},
					schema = {
						model = {
							default = "x-ai/grok-code-fast-1",
							choices = {
								["anthropic/claude-4.5-sonnet"] = {},
								["anthropic/claude-4.5-opus"] = {},
							},
						},
					},
				})
			end
		},
	},
	strategies = {
		chat = {
			-- adapter = "opencode",
			adapter = "openrouter",
		},
		inline = {
			adapter = "openrouter",
		},
	},
})

vim.keymap.set("v", "ga", "<cmd>CodeCompanionChat Add<cr>", { noremap = true, silent = true })
vim.keymap.set("v", "<leader>cc", ":<C-u>'<,'>CodeCompanion ", { noremap = true })
