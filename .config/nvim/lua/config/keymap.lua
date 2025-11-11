vim.keymap.set("n", "<C-f>", ":Oil<CR>", { desc = 'Open file browser' })
vim.keymap.set("n", "<C-j>", "<PageDown>", { desc = 'Scroll down a page' })
vim.keymap.set("n", "<C-k>", "<PageUp>", { desc = 'Scroll up a page' })
vim.keymap.set('n', '<Esc>', '<cmd>nohlsearch<CR>', { desc = 'Clear search highlights' })

-- quickfix
-- vim.keymap.set("n", "<leader>qo", ":copen<CR>")
-- vim.keymap.set("n", "<leader>qc", ":cclose<CR>")
-- vim.keymap.set("n", "<leader>qn", ":cnext<CR>")
-- vim.keymap.set("n", "<leader>qp", ":cprev<CR>")

vim.keymap.set("v", "J", ":m '>+1<CR>gv=gv", { desc = 'Move selected lines down' })
vim.keymap.set("v", "K", ":m '<-2<CR>gv=gv", { desc = 'Move selected lines up' })

-- Make split navigation easier.
vim.keymap.set('n', '<C-h>', '<C-w><C-h>', { desc = 'Move focus to the left window' })
vim.keymap.set('n', '<C-l>', '<C-w><C-l>', { desc = 'Move focus to the right window' })
vim.keymap.set('n', '<C-j>', '<C-w><C-j>', { desc = 'Move focus to the lower window' })
vim.keymap.set('n', '<C-k>', '<C-w><C-k>', { desc = 'Move focus to the upper window' })

vim.keymap.set('n', '<leader>dio', function()
  vim.diagnostic.setqflist({ open = true })
end, { desc = 'Send all diagnostics to quickfix and open' })
