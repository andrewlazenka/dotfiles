require("nvim-treesitter.configs").setup({
	ensure_installed = { "javascript", "typescript", "c", "lua", "rust", "ruby", "go" },
	sync_install = false,
	auto_install = true,
	highlight = { enable = true },
})
