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
dashboard.section.header.opts.hl = "Include"

dashboard.section.buttons.val = {
	dashboard.button("f", "🔍  Find file", ":Telescope git_files <CR>"),
	dashboard.button("e", "📄  New file", ":ene <BAR> startinsert <CR>"),
	dashboard.button("r", "⏱️   Recently used files", ":Telescope oldfiles cwd_only=true <CR>"),
	dashboard.button("q", "❌  Quit Neovim", ":qa<CR>"),
}
dashboard.section.buttons.opts.hl = "Keyword"

dashboard.section.footer.val = fortune()
dashboard.section.footer.opts.hl = "Type"

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

local stats = {
  type = "text",
  val = lazy_stats() .. " " .. nvim_version() .. "\n",
  opts = {
    position = "center",
    hl = "Function",
  },
}

alpha.setup({
  layout = {
    { type = "padding", val = 1 },
    dashboard.section.header,
    { type = "padding", val = 1 },
    stats,
    { type = "padding", val = 2 },
    dashboard.section.buttons,
    { type = "padding", val = 1 },
    dashboard.section.footer,
  },
  opts = {
    margin = 44,
  }
})
