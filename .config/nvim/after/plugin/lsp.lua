local lsp = require("lsp-zero")
local navic = require("nvim-navic")

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
	"rust_analyzer",
	"solargraph",
	"ruff_lsp",
	"jedi_language_server",
	"svelte-language-server"
})

lsp.nvim_workspace()

lsp.on_attach(function(client, bufnr)
	local opts = { buffer = bufnr, remap = false }

	vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
	vim.keymap.set("n", "gr", vim.lsp.buf.references, opts)
	vim.keymap.set("n", "vd", vim.diagnostic.open_float, opts)
	vim.keymap.set("n", "D", vim.lsp.buf.hover, opts)

    if client.server_capabilities.documentSymbolProvider then
        navic.attach(client, bufnr)
    end
end)

lsp.setup()
