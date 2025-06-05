local secrets = require("utils.secrets")

return {
	{
		"yetone/avante.nvim",
		cmd = { "AvanteAsk", "AvanteChat", "AvanteToggle" },
		version = false,
		build = "make BUILD_FROM_SOURCE=true",
		config = function()
			require("avante").setup({
				provider = "openrouter",
				vendors = {
					openrouter = {
						__inherited_from = 'openai',
						endpoint = 'https://openrouter.ai/api/v1',
						parse_api_key = function ()
							return secrets.get_secret_from_1password("\"op://Private/OpenRouter API Key - avante/credential\"")
						end,
						model = 'anthropic/claude-sonnet-4',
					},
				},
			})
		end,
		dependencies = {
		  "nvim-treesitter/nvim-treesitter",
		  "stevearc/dressing.nvim",
		  "nvim-lua/plenary.nvim",
		  "MunifTanjim/nui.nvim",
		},
	},
}
