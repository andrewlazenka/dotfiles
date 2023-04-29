local dap = require("nvim-dap")

vim.keymap.set("n", "<leader>bgt", dap.toggle_breakpoint)
vim.keymap.set("n", "<leader>bgc", dap.continue)
vim.keymap.set("n", "<leader>bgi", dap.step_into)
vim.keymap.set("n", "<leader>bgov", dap.step_over)
vim.keymap.set("n", "<leader>bgou", dap.step_out)
