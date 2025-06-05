local lspconfig = require("lspconfig")
local mason_lspconfig = require("mason-lspconfig")
local capabilities = require('cmp_nvim_lsp').default_capabilities()

local on_attach = function(client, bufnr)
	vim.api.nvim_buf_set_option(bufnr, 'omnifunc', 'v:lua.vim.lsp.omnifunc')

	local opts = { noremap = true, silent = true, buffer = bufnr }
	vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
	vim.keymap.set("n", "gr", vim.lsp.buf.references, opts)
	vim.keymap.set("n", "gi", vim.lsp.buf.implementation, opts)
	vim.keymap.set("n", "<leader>lf", vim.lsp.buf.format, opts)
	vim.keymap.set('n', '<leader>lr', vim.lsp.buf.rename, { desc = "LSP: Rename symbol" })
	vim.keymap.set("n", "vd", vim.diagnostic.open_float, opts)
	vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)

	vim.keymap.set('i', '<C-Space>', vim.lsp.buf.completion, { desc = "LSP: Trigger completion" })

	if client.server_capabilities.documentSymbolProvider then
		require("nvim-navic").attach(client, bufnr)
	end
end

require("mason").setup()
mason_lspconfig.setup({
	ensure_installed = {
		"astro",
		"bashls",
		"buf_ls",
		"gopls",
		"jedi_language_server",
		"jsonls",
		"lua-language-server",
		"marksman",
		"ruby_lsp",
		"ruff",
		"solargraph",
		"svelte",
		"tailwindcss",
		"tinymist",
		"ts_ls",
	},
	handlers = {
		function(server_name)
			require("lspconfig")[server_name].setup {
				on_attach = on_attach,
				capabilities = capabilities,
			}
		end
	}
})
