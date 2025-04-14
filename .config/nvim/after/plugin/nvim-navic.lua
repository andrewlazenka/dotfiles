local navic = require("nvim-navic")

local on_attach = function(client, bufnr)
    if client.server_capabilities.documentSymbolProvider then
        navic.attach(client, bufnr)
    end
end

require("lspconfig").clangd.setup {
    on_attach = on_attach
}

-- vim.o.winbar = "%{%v:lua.require'nvim-navic'.get_location()%}"
