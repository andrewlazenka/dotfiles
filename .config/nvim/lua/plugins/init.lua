return {
	{
		'goolord/alpha-nvim',
		requires = { 'nvim-tree/nvim-web-devicons' },
	},
	{
		"nvim-lualine/lualine.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons", opt = true }
	},
	"ryanoasis/vim-devicons",
	{
		"numToStr/Comment.nvim",
		config = function()
			require("Comment").setup()
		end
	},
	{
		"nvim-telescope/telescope.nvim",
		dependencies = { {"nvim-lua/plenary.nvim"} },
		tag = "0.1.5"
	},
	"ThePrimeagen/harpoon",
	"github/copilot.vim",
	{
		"nvim-treesitter/nvim-treesitter",
		build = ":TSUpdate",
		event = { "BufReadPost", "BufNewFile" },
	},
	"tpope/vim-fugitive",
	"tpope/vim-abolish",
	{ "sindrets/diffview.nvim", dependencies = "nvim-lua/plenary.nvim" },

	{"williamboman/mason.nvim"},
	{"williamboman/mason-lspconfig.nvim"},
	{
		"neovim/nvim-lspconfig",
		dependencies = {
		  "hrsh7th/nvim-cmp",
		  "hrsh7th/cmp-nvim-lsp",
		  "hrsh7th/cmp-buffer",
		  "hrsh7th/cmp-path",
		  "hrsh7th/cmp-cmdline",
		  "williamboman/mason.nvim",
		  "williamboman/mason-lspconfig.nvim",
		},
	},
	{
		"folke/todo-comments.nvim",
		dependencies = { { "nvim-lua/plenary.nvim" } },
		config = function()
			require("todo-comments").setup()
		end
	},
	{
		"folke/trouble.nvim",
		dependencies = "nvim-tree/nvim-web-devicons",
		config = function()
			require("trouble").setup {}
		end
	},
	{
		"lewis6991/gitsigns.nvim",
		config = function()
			require("gitsigns").setup()
		end
	},
	"MunifTanjim/prettier.nvim",
	"simrat39/symbols-outline.nvim",
	{
		"SmiteshP/nvim-navic",
		dependencies = "neovim/nvim-lspconfig"
	},
	"christoomey/vim-tmux-navigator",
	{
	  'stevearc/oil.nvim',
	  dependencies = { "nvim-tree/nvim-web-devicons" },
	},

	-- color schemes
	"folke/tokyonight.nvim",
	"lunarvim/onedarker.nvim",
	"haishanh/night-owl.vim",
	"macguirerintoul/night_owl_light.vim",
	"arcticicestudio/nord-vim",
	"rmehri01/onenord.nvim",
	"navarasu/onedark.nvim",
	{ "catppuccin/nvim", as = "catppuccin" },
	"neanias/everforest-nvim",
}
