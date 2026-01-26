local capabilities = require('cmp_nvim_lsp').default_capabilities()

vim.api.nvim_create_autocmd('LspAttach', {
	group = vim.api.nvim_create_augroup('UserLspConfig', {}),
	callback = function(args)
		local client = vim.lsp.get_client_by_id(args.data.client_id)
		local bufnr = args.buf

		local opts = { noremap = true, silent = true, buffer = bufnr }
		vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
		vim.keymap.set("n", "gr", vim.lsp.buf.references, opts)
		vim.keymap.set("n", "gi", vim.lsp.buf.implementation, opts)
		vim.keymap.set("n", "<leader>lf", vim.lsp.buf.format, opts)
		vim.keymap.set('n', '<leader>lr', vim.lsp.buf.rename, { buffer = bufnr, desc = "LSP: Rename symbol" })
		vim.keymap.set("n", "vd", function() vim.diagnostic.open_float({ border = "rounded" }) end, opts)
		vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
		vim.keymap.set('i', '<C-Space>', vim.lsp.buf.completion, { buffer = bufnr, desc = "LSP: Trigger completion" })

		if client.server_capabilities.documentSymbolProvider then
			require("nvim-navic").attach(client, bufnr)
		end
	end,
})

vim.lsp.config('*', {
	capabilities = capabilities,
	root_markers = { '.git' },
})

require("mason").setup()
require("mason-lspconfig").setup({
	ensure_installed = {
		"astro",
		"bashls",
		"buf_ls",
		"gopls",
		"intelephense",
		"jedi_language_server",
		"jsonls",
		"lua_ls",
		"marksman",
		-- "ruby_lsp",
		"ruff",
		-- "solargraph",
		"svelte",
		"tailwindcss",
		"tinymist",
		"ts_ls",
	},
	handlers = {
		function(server_name)
			vim.lsp.enable(server_name)
		end,
	}
})
