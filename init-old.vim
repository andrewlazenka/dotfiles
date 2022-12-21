" Options
set clipboard=unnamedplus " Enables the clipboard between Vim/Neovim and other applications.
set completeopt=noinsert,menuone,noselect " Modifies the auto-complete menu to behave more like an IDE.
set cursorline " Highlights the current line in the editor
set hidden " Hide unused buffers
set autoindent " Indent a new line
set inccommand=split " Show replacements in a split screen
set mouse=a " Allow to use the mouse in the editor
set guicursor="" " Set cursor as block
set number " Shows the line number on the current line
set relativenumber " Shows line number relative to the cursor
set splitbelow splitright " Change the split screen behavior
set title " Show file title
set wildmenu " Show a more advance menu
set cc=80 " Show at 80 column a border for good code style
set tabstop=4
set softtabstop=4
set scrolloff=8

filetype plugin indent on   " Allow auto-indenting depending on file type
syntax on
set ttyfast " Speed up scrolling in Vim

" Plugins

call plug#begin(has('nvim') ? stdpath('data') . '/plugged' : '~/.vim/plugged')

Plug 'nvim-lualine/lualine.nvim' " Status bar & tabline
Plug 'preservim/nerdtree' " File tree browser
Plug 'ryanoasis/vim-devicons' " DevIcons (for NerdTree & airline)
Plug 'tpope/vim-commentary' " Quick comment tools
Plug 'neoclide/coc.nvim'  " Auto Completion
Plug 'nvim-lua/plenary.nvim'
Plug 'nvim-telescope/telescope.nvim', { 'tag': '0.1.0' }
Plug 'ThePrimeagen/harpoon'
Plug 'github/copilot.vim'
Plug 'nvim-treesitter/nvim-treesitter', { 'do': ':TSUpdate' }
Plug 'folke/tokyonight.nvim'

call plug#end()

" Colorscheme

" colorscheme tokyonight

" Keymaps

nnoremap <C-t> :NERDTreeToggle<CR>
nnoremap <C-f> :NERDTreeFocus<CR>
nnoremap <C-p> <cmd>Telescope find_files<cr>
nnoremap <leader>pf <cmd>Telescope live_grep<cr>

" Formatting

hi Normal guifg=#ffffff guibg=#333333
hi Comment guifg=#111111 gui=bold
hi Error guifg=#ff0000 gui=undercurl
hi Cursor gui=reverse

let g:airline_powerline_fonts = 1
let NERDTreeShowHidden=1
