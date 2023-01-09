local telescope = require("telescope")
local builtin = require("telescope.builtin")

vim.keymap.set("n", "<leader>sf", builtin.find_files, {})
vim.keymap.set("n", "<C-p>", builtin.git_files, {})
-- vim.keymap.set("n", "<leader>ss", function()
-- 	builtin.grep_string({ search = vim.fn.input("Grep > ") })
-- end)
vim.keymap.set("n", "<leader>sc", function()
  -- You can pass additional configuration to telescope to change theme, layout, etc.
  builtin.current_buffer_fuzzy_find(require("telescope.themes").get_dropdown {
    winblend = 10,
    previewer = false,
  })
end, { desc = "[/] Fuzzily search in current buffer]" })
vim.keymap.set("n", "<leader>sf", builtin.find_files, { desc = "[S]earch [F]iles" })
vim.keymap.set("n", "<leader>sh", builtin.help_tags, { desc = "[S]earch [H]elp" })
vim.keymap.set("n", "<leader>sw", builtin.grep_string, { desc = "[S]earch current [W]ord" })
vim.keymap.set("n", "<leader>sg", builtin.live_grep, { desc = "[S]earch by [G]rep" })
vim.keymap.set("n", "<leader>sd", builtin.diagnostics, { desc = "[S]earch [D]iagnostics" })
vim.keymap.set("n", "<leader>smap", builtin.keymaps, { desc = "[S]earch Normal Mode [Map]pings" })

telescope.setup {
	pickers = {
		find_files = {
			hidden = true
		},
		live_grep = {
			additional_args = function()
				return { "--hidden" }
			end,
			glob_pattern = '!.git'
		}
	}
}
