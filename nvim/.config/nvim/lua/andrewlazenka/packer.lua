vim.cmd.packadd('packer.nvim')

return require("packer").startup(function(use)	
		-- packer can manage itself
		use 'wbthomason/packer.nvim'

		use 'nvim-lualine/lualine.nvim' -- Status bar & tabline
		use 'ryanoasis/vim-devicons' -- DevIcons (for NerdTree & airline)
		use 'tpope/vim-commentary' -- Quick comment tools
		use {
				'nvim-telescope/telescope.nvim', 
				requires = { {'nvim-lua/plenary.nvim'} },
				tag = '0.1.0'
		}
		use 'ThePrimeagen/harpoon'
		use 'github/copilot.vim'
		use {
				'nvim-treesitter/nvim-treesitter',
				run = ':TSUpdate'
		}
		use 'folke/tokyonight.nvim'
		use('tpope/vim-fugitive')
		use {
				'nvim-tree/nvim-tree.lua',
				requires = { {'nvim-tree/nvim-web-devicons'} }
		}

		  use {
				'VonHeikemen/lsp-zero.nvim',
				requires = {
						-- LSP Support
						{'neovim/nvim-lspconfig'},
						{'williamboman/mason.nvim'},
						{'williamboman/mason-lspconfig.nvim'},

						-- Autocompletion
						{'hrsh7th/nvim-cmp'},
						{'hrsh7th/cmp-buffer'},
						{'hrsh7th/cmp-path'},
						{'saadparwaiz1/cmp_luasnip'},
						{'hrsh7th/cmp-nvim-lsp'},
						{'hrsh7th/cmp-nvim-lua'},

						-- Snippets
						{'L3MON4D3/LuaSnip'},
						{'rafamadriz/friendly-snippets'},
				}
		}
end)
