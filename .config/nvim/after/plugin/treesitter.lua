require("nvim-treesitter.configs").setup({
	ensure_installed = {
		"javascript",
		"typescript",
		"c",
		"lua",
		"rust",
		"ruby",
		"go",
		"python",
		"bash",
		"html",
		"css",
		"scss",
		"json",
		"yaml",
		"toml",
		"markdown"
	},
	sync_install = false,
	auto_install = true,
	highlight = { enable = true },
})
