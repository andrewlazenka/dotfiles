local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable", -- latest stable release
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

require("lazy").setup("plugins")

vim.api.nvim_create_autocmd("VimEnter", {
  callback = function()
    -- This command loads the plugin and sets the theme
    -- It uses a function that ensures the plugin is loaded first.
    -- The `load` function is specific to kanagawa.nvim
    -- Alternatively, you can use `vim.cmd.colorscheme "kanagawa-wave"`
    -- require('kanagawa').load("wave")
	require('tokyonight').load({ style = "day" })
    -- Or if you prefer the generic way after ensuring it's loaded:
    -- vim.cmd "colorscheme kanagawa-wave"
  end,
})
