local hl = function(thing, opts)
		vim.api.nvim_set_hl(0, thing, opts)
end

local defaulttheme = "onedarker"

function ChangeColorScheme(color)
	color = color or defaulttheme
	vim.cmd.colorscheme(color)
end

ChangeColorScheme()

vim.api.nvim_create_user_command("ChangeColorScheme", function(opts) ChangeColorScheme(opts.args) end, { nargs = 1 })
