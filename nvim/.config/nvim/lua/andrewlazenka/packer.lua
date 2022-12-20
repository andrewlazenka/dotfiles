return require("packer").startup(function(use)	
		use 'wbthomason/packer.nvim'
		use 'nvim-lualine/lualine.nvim' -- Status bar & tabline
		use 'preservim/nerdtree' -- File tree browser
		use 'ryanoasis/vim-devicons' -- DevIcons (for NerdTree & airline)
		use 'tpope/vim-commentary' -- Quick comment tools
		use 'neoclide/coc.nvim'  -- Auto Completion
		use 'nvim-lua/plenary.nvim'
		use {
				'nvim-telescope/telescope.nvim', 
				tag = '0.1.0'
		}
		use 'ThePrimeagen/harpoon'
		use 'github/copilot.vim'
		use {
				'nvim-treesitter/nvim-treesitter',
				run = ':TSUpdate'
		}
		use 'folke/tokyonight.nvim'
end)
