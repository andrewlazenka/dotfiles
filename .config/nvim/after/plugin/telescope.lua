local telescope = require("telescope")
local builtin = require("telescope.builtin")

vim.keymap.set("n", "<leader>sf", builtin.find_files, {})
vim.keymap.set("n", "<C-p>", builtin.git_files, {})
vim.keymap.set("n", "<leader>cb", builtin.current_buffer_fuzzy_find)
vim.keymap.set("n", "<leader>sb", builtin.buffers)
vim.keymap.set("n", "<leader>sf", builtin.find_files)
vim.keymap.set("n", "<leader>sh", builtin.help_tags)
vim.keymap.set("n", "<leader>sw", builtin.grep_string)
vim.keymap.set("n", "<leader>sg", builtin.live_grep)
vim.keymap.set("n", "<leader>sd", builtin.diagnostics)
vim.keymap.set("n", "<leader>smap", builtin.keymaps)

telescope.setup {
	pickers = {
		find_files = {
			hidden = true
		},
		live_grep = {
			additional_args = function()
				return { "--hidden" }
			end,
			glob_pattern = "!.git"
		},
		current_buffer_fuzzy_find = {
			sorting_strategy = "ascending"
		},
	}
}
