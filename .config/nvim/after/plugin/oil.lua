require("oil").setup({
	view_options = {
		show_hidden = true,
		-- is_hidden_file = function(name, bufnr)
		--   return vim.startswith(name, ".")
		-- end,
	},
})