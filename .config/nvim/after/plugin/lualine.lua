local lualine = require("lualine")

-- Color table for highlights
-- stylua: ignore
local colors = {
  bg       = "#202328",
  fg       = "#bbc2cf",
  yellow   = "#ECBE7B",
  cyan     = "#008080",
  darkblue = "#081633",
  green    = "#98be65",
  orange   = "#FF8800",
  violet   = "#a9a1e1",
  magenta  = "#c678dd",
  blue     = "#51afef",
  red      = "#ec5f67",
}

local conditions = {
  buffer_not_empty = function()
    return vim.fn.empty(vim.fn.expand("%:t")) ~= 1
  end,
  hide_in_width = function()
    return vim.fn.winwidth(0) > 80
  end,
  check_git_workspace = function()
    local filepath = vim.fn.expand("%:p:h")
    local gitdir = vim.fn.finddir(".git", filepath .. ";")
    return gitdir and #gitdir > 0 and #gitdir < #filepath
  end,
}

-- Config
local config = {
  options = {
    -- Disable sections and component separators
    component_separators = "",
    section_separators = "",
    theme = "tokyonight",
      -- We are going to use lualine_c an lualine_x as left and
      -- right section. Both are highlighted by c theme .  So we
      -- are just setting default looks o statusline
    --   normal = { c = { fg = colors.fg, bg = colors.bg } },
    --   inactive = { c = { fg = colors.fg, bg = colors.bg } },
    -- },
	icons_enabled = true,
  },
  sections = {
    -- these are to remove the defaults
    lualine_a = {},
    lualine_b = {},
    lualine_y = {},
    lualine_z = {},
    -- These will be filled later
    lualine_c = {},
    lualine_x = {},
  },
  inactive_sections = {
    -- these are to remove the defaults
    lualine_a = {},
    lualine_b = {},
    lualine_y = {},
    lualine_z = {},
    lualine_c = {},
    lualine_x = {},
  },
}

-- Inserts a component in lualine_c at left section
local function ins_left(component)
  table.insert(config.sections.lualine_c, component)
end

-- Inserts a component in lualine_x at right section
local function ins_right(component)
  table.insert(config.sections.lualine_x, component)
end

ins_left {
	"mode",
	color = { bg = colors.blue, fg = colors.bg },
	fmt = function(str) return str:sub(1,1) end,
}

ins_left {
  "branch",
  icon = "",
  color = { fg = colors.violet },
}

ins_left {
  "diff",
  -- Is it me or the symbol for modified us really weird
  symbols = { added = " ", modified = " ", removed = " " },
  diff_color = {
    added = { fg = colors.green },
    modified = { fg = colors.orange },
    removed = { fg = colors.red },
  },
  cond = conditions.hide_in_width,
}

ins_left {
  "diagnostics",
  sources = { "nvim_diagnostic" },
  symbols = { error = " ", warn = " ", info = " " },
  diagnostics_color = {
    color_error = { fg = colors.red },
    color_warn = { fg = colors.yellow },
    color_info = { fg = colors.cyan },
  },
}

-- Insert mid section. You can make any number of sections in neovim :)
-- for lualine it"s any number greater then 2
ins_left {
  function()
    return "%="
  end,
}

ins_left {
  "filename",
  path = 1,
  icons_enabled = true,
  cond = conditions.buffer_not_empty,
  color = { fg = colors.magenta },
}

ins_right {
  -- Lsp server name .
  function()
    local msg = ""
    local clients = vim.lsp.get_clients({ bufnr = 0 })
    if next(clients) == nil then
      return msg
    end
    return " " .. #clients
  end,
  color = function()
    local clients = vim.lsp.get_clients({ bufnr = 0 })
    if next(clients) == nil then
      return { fg = colors.red }
    end
    return { fg = colors.green }
  end
}

ins_right {
  "filetype",
  colored = true,
}

ins_right {
	"location",
	color = { bg = colors.blue, fg = colors.bg },
}

lualine.setup(config)
