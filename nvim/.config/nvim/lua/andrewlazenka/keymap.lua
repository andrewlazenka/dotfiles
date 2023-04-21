-- nvim-tree
vim.keymap.set("n", "<C-t>", ":NvimTreeToggle<CR>")
vim.keymap.set("n", "<C-f>", ":NvimTreeFocus<CR>")

-- core
vim.keymap.set("n", "<C-j>", "<PageDown>")
vim.keymap.set("n", "<C-k>", "<PageUp>")

-- quickfix
vim.keymap.set("n", "<leader>qo", ":copen<CR>")
vim.keymap.set("n", "<leader>qc", ":cclose<CR>")
vim.keymap.set("n", "<leader>qn", ":cnext<CR>")
vim.keymap.set("n", "<leader>qp", ":cprev<CR>")
