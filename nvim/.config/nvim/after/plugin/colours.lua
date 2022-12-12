local hl = function(thing, opts)
		vim.api.nvim_set_hl(0, thing, opts)
end

-- vim.cmd('colorscheme tokyonight')

hl('Normal', {
		bg = '#333333',
		fg = '#ffffff'
})

hl('Comment', {
		fg = '#111111',
		bold = true
})

hl('Error', {
		fg = '#ff0000',
		undercurl = true
})

hl('Cursor', {
		reverse = true
})
