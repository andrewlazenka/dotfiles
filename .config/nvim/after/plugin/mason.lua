require("mason").setup()
require("mason-lspconfig").setup {
    ensure_installed = {
        "astro",
        "bashls",
        "buf_ls",
        "gopls",
        "jedi_language_server",
        "jsonls",
        "marksman",
        "ruby_lsp",
        "ruff-lsp",
        "solargraph",
        "svelte",
        "tailwindcss",
        "ts_ls",
    },
}

require("mason-lspconfig").setup_handlers {
	function (server_name)
		require("lspconfig")[server_name].setup {}
	end
}
