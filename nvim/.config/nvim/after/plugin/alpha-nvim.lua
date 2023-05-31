local status_ok, alpha = pcall(require, "alpha")
if not status_ok then
	return
end
local fortune = require("alpha.fortune")
local dashboard  = require("alpha.themes.dashboard")

dashboard.section.header.val = {
	[[                                                                   ]],
	[[      ████ ██████           █████      ██                    ]],
	[[     ███████████             █████                            ]],
	[[     █████████ ███████████████████ ███   ███████████  ]],
	[[    █████████  ███    █████████████ █████ ██████████████  ]],
	[[   █████████ ██████████ █████████ █████ █████ ████ █████  ]],
	[[ ███████████ ███    ███ █████████ █████ █████ ████ █████ ]],
	[[██████  █████████████████████ ████ █████ █████ ████ ██████]],
}

dashboard.section.buttons.val = {
	dashboard.button("f", "  Find file", ":Telescope git_files <CR>"),
	dashboard.button("e", "  New file", ":ene <BAR> startinsert <CR>"),
	dashboard.button("r", "  Recently used files", ":Telescope oldfiles <CR>"),
	dashboard.button("q", "  Quit Neovim", ":qa<CR>"),
}

dashboard.section.footer.val = fortune()

local function nvim_version()
    return " v"
      .. vim.version().major
      .. "."
      .. vim.version().minor
      .. "."
      .. vim.version().patch
      .. "  "
end

local function lazy_stats()
    local stats = require("lazy").stats()
    -- local ms = (math.floor(stats.startuptime * 100 + 0.5) / 100)
    return "⚡" .. stats.count .. " plugins"
end

local function stats()
    return lazy_stats() .. " " .. nvim_version() .. "\n"
end

local Plugstats = {
  type = "text",
  val = stats,
  opts = {
    position = "center",
    hl = "Function",
  },
}

dashboard.section.footer.opts.hl = "Type"
dashboard.section.header.opts.hl = "Include"
dashboard.section.buttons.opts.hl = "Keyword"

alpha.setup({
  layout = {
    { type = "padding", val = 1 },
    dashboard.section.header,
    { type = "padding", val = 1 },
    Plugstats,
    { type = "padding", val = 2 },
    dashboard.section.buttons,
    { type = "padding", val = 1 },
    dashboard.section.footer,
  },
  opts = {
    margin = 44,
  }
})
