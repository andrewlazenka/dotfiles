return {
  'dmtrKovalenko/fff.nvim',
  build = function()
    require("fff.download").download_or_build_binary()
  end,
  opts = { -- (optional)
    debug = {
      enabled = true,     -- we expect your collaboration at least during the beta
      show_scores = true, -- to help us optimize the scoring system, feel free to share your scores!
    },
  },
  lazy = false,
  keys = {
    {
      "ff",
      function() require('fff').find_files() end,
      desc = 'Find files',
    },
    {
      "<C-p>",
      function() require('fff').find_in_git_root() end,
      desc = 'Find files',
    },
  }
}
