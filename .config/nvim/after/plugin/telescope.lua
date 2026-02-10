local telescope = require("telescope")
local builtin = require("telescope.builtin")

-- vim.keymap.set("n", "<leader>sf", builtin.find_files, { desc = 'Find files' })
-- vim.keymap.set("n", "<C-p>", builtin.git_files, { desc = 'Find git files' })
vim.keymap.set("n", "<leader>cb", builtin.current_buffer_fuzzy_find, { desc = 'Fuzzy find in current buffer' })
vim.keymap.set("n", "<leader>sb", builtin.buffers, { desc = 'List buffers' })
vim.keymap.set("n", "<leader>sf", builtin.find_files, { desc = 'Find files' })
vim.keymap.set("n", "<leader>sh", builtin.help_tags, { desc = 'Search help tags' })
vim.keymap.set("n", "<leader>sw", builtin.grep_string, { desc = 'Grep string under cursor' })
vim.keymap.set("n", "<leader>sg", builtin.live_grep, { desc = 'Live grep' })
vim.keymap.set("n", "<leader>st", builtin.lsp_type_definitions, { desc = 'Search type definition' })
vim.keymap.set("n", "<leader>sdg", builtin.diagnostics, { desc = 'Show diagnostics' })
vim.keymap.set("n", "<leader>sdb", function()
	builtin.diagnostics({ bufnr = 0 })
end, { desc = 'Show diagnostics for current buffer' })
vim.keymap.set("n", "<leader>sm", builtin.keymaps, { desc = 'Show keymaps' })

telescope.setup {
	defaults = {
		layout_strategy = 'horizontal',
		layout_config = {
			horizontal = {
				width = {padding = 0},
				height = {padding = 0},
				prompt_position = "bottom",
				preview_width = 0.5,
				mirror = false,
			},
		},
	},
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
