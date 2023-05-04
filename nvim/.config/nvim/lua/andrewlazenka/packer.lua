-- used during codespaces initialization
-- always ensures packer is downloaded & available before installing
local ensure_packer = function()
  local fn = vim.fn
  local install_path = fn.stdpath('data')..'/site/pack/packer/start/packer.nvim'
  if fn.empty(fn.glob(install_path)) > 0 then
    fn.system({'git', 'clone', '--depth', '1', 'https://github.com/wbthomason/packer.nvim', install_path})
    vim.cmd [[packadd packer.nvim]]
    return true
  end
  return false
end

local packer_bootstrap = ensure_packer()

return require("packer").startup(function(use)
	use "wbthomason/packer.nvim"

	-- color schemes

	use "folke/tokyonight.nvim"
	use "lunarvim/onedarker.nvim"
	use "haishanh/night-owl.vim"
	use "macguirerintoul/night_owl_light.vim"
	use "arcticicestudio/nord-vim"
	use "rmehri01/onenord.nvim"
	use "navarasu/onedark.nvim"
	use { "catppuccin/nvim", as = "catppuccin" }

	-- lsp

	use {
		"VonHeikemen/lsp-zero.nvim",
		requires = {
			-- LSP Support
			{ "neovim/nvim-lspconfig" },
			{ "williamboman/mason.nvim" },
			{ "williamboman/mason-lspconfig.nvim" },

			-- Autocompletion
			{ "hrsh7th/nvim-cmp" },
			{ "hrsh7th/cmp-nvim-lsp" },
			{ "L3MON4D3/LuaSnip" },
		}
	}
	use "neovim/nvim-lspconfig"
	use "jose-elias-alvarez/null-ls.nvim"
	use {
		"nvim-treesitter/nvim-treesitter",
		run = ":TSUpdate"
	}

	-- ui

	use {
		"nvim-lualine/lualine.nvim",
		requires = { "kyazdani42/nvim-web-devicons", opt = true }
	}
	use "ryanoasis/vim-devicons"
	use {
		"folke/todo-comments.nvim",
		requires = { { "nvim-lua/plenary.nvim" } },
		config = function()
			require("todo-comments").setup()
		end
	}
	use {
		"folke/trouble.nvim",
		requires = "nvim-tree/nvim-web-devicons",
		config = function()
			require("trouble").setup {}
		end
	}
	use {
		'lewis6991/gitsigns.nvim',
		config = function()
			require('gitsigns').setup()
		end
	}
	use {
		"SmiteshP/nvim-navic",
		requires = "neovim/nvim-lspconfig"
	}
	use {
		"nvim-tree/nvim-tree.lua",
		requires = { {"nvim-tree/nvim-web-devicons"} }
	}
	use "simrat39/symbols-outline.nvim"

	-- git

	use "tpope/vim-fugitive"
	use { "sindrets/diffview.nvim", requires = "nvim-lua/plenary.nvim" }

	-- code navigation

	use {
		"nvim-telescope/telescope.nvim",
		requires = { {"nvim-lua/plenary.nvim"} },
		tag = "0.1.1"
	}
	use "ThePrimeagen/harpoon"

	-- syntax formatter

	use "MunifTanjim/prettier.nvim"

	-- agents

	use "github/copilot.vim"
	use {
	  "jackMort/ChatGPT.nvim",
		config = function()
		  require("chatgpt").setup()
		end,
		requires = {
		  "MunifTanjim/nui.nvim",
		  "nvim-lua/plenary.nvim",
		  "nvim-telescope/telescope.nvim"
		}
	}

	-- ruby & rails
	use "tpope/vim-rails"

	if packer_bootstrap then
		require("packer").sync()
	end
end)
