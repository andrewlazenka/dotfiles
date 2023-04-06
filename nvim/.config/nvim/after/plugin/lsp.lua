local lsp = require("lsp-zero")

lsp.preset("recommended")

lsp.ensure_installed({
	"tsserver",
	"eslint",
	"jsonls",
	"bashls",
	"ruby_ls",
	"gopls",
	"marksman",
	"bufls",
	"rust_analyzer"
})

lsp.nvim_workspace()

lsp.on_attach(function(_, bufnr)
	local opts = { buffer = bufnr, remap = false }

	vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
	vim.keymap.set("n", "vd", vim.diagnostic.open_float, opts)
	vim.keymap.set("n", "D", vim.lsp.buf.hover, opts)
end)

lsp.setup()
