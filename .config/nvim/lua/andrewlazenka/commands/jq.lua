-- Alternative implementation using :%! with error handling
local function format_json_with_jq()
  -- Save current content and cursor position
  local lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)
  local cursor_pos = vim.api.nvim_win_get_cursor(0)

  -- Execute jq command (removed silent!)
  vim.cmd('%!jq .')

  -- Check if command succeeded by comparing content
  local new_lines = vim.api.nvim_buf_get_lines(0, 0, -1, false)

  -- If buffer is empty or only contains error message, restore original
  if #new_lines == 0 or (#new_lines == 1 and new_lines[1]:match('^jq:')) then
    -- Restore original content
    vim.api.nvim_buf_set_lines(0, 0, -1, false, lines)
    vim.api.nvim_win_set_cursor(0, cursor_pos)

    -- Show error message
    local error_msg = #new_lines > 0 and new_lines[1] or "jq formatting failed"
    vim.notify(error_msg, vim.log.levels.INFO)
  else
    vim.notify("JSON formatted successfully", vim.log.levels.INFO)
  end
end

-- Create command and mapping
vim.api.nvim_create_user_command('JqFormat', format_json_with_jq, {
  desc = 'Format JSON in current buffer using jq'
})

vim.keymap.set('n', '<leader>jq', format_json_with_jq, {
  desc = 'Format JSON with jq'
})
