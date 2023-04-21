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

-- start actual packer things

return require("packer").startup(function(use)
		-- packer can manage itself
	use "wbthomason/packer.nvim"

		-- color schemes
	use "folke/tokyonight.nvim"
	use "lunarvim/onedarker.nvim"
	use "haishanh/night-owl.vim"
	use "macguirerintoul/night_owl_light.vim"
	use "arcticicestudio/nord-vim"
	use "rmehri01/onenord.nvim"
	use "navarasu/onedark.nvim"

	use {
		"nvim-lualine/lualine.nvim",
		requires = { "kyazdani42/nvim-web-devicons", opt = true }
	}
	use "ryanoasis/vim-devicons"
	use {
		'numToStr/Comment.nvim',
		config = function()
			require('Comment').setup()
		end
	}
	use {
		"nvim-telescope/telescope.nvim",
		requires = { {"nvim-lua/plenary.nvim"} },
		tag = "0.1.1"
	}
	use "ThePrimeagen/harpoon"
	use "github/copilot.vim"
	use {
		"nvim-treesitter/nvim-treesitter",
		run = ":TSUpdate"
	}
	use "tpope/vim-fugitive"
	use {
		"nvim-tree/nvim-tree.lua",
		requires = { {"nvim-tree/nvim-web-devicons"} }
	}
	use { "sindrets/diffview.nvim", requires = "nvim-lua/plenary.nvim" }
	use {
		"VonHeikemen/lsp-zero.nvim",
		requires = {
			-- LSP Support
			{"neovim/nvim-lspconfig"},
			{"williamboman/mason.nvim"},
			{"williamboman/mason-lspconfig.nvim"},

			-- Autocompletion
			{"hrsh7th/nvim-cmp"},
			{"hrsh7th/cmp-buffer"},
			{"hrsh7th/cmp-path"},
			{"saadparwaiz1/cmp_luasnip"},
			{"hrsh7th/cmp-nvim-lsp"},
			{"hrsh7th/cmp-nvim-lua"},

			-- Snippets
			{"L3MON4D3/LuaSnip"},
			{"rafamadriz/friendly-snippets"},
		}
	}
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
	use('neovim/nvim-lspconfig')
	use('jose-elias-alvarez/null-ls.nvim')
	use('MunifTanjim/prettier.nvim')

	use({
	  "jackMort/ChatGPT.nvim",
		config = function()
		  require("chatgpt").setup()
		end,
		requires = {
		  "MunifTanjim/nui.nvim",
		  "nvim-lua/plenary.nvim",
		  "nvim-telescope/telescope.nvim"
		}
	})

	if packer_bootstrap then
		require("packer").sync()
	end
end)
