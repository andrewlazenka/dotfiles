local M = {}

function M.get_secret_from_1password(item_path)
    local cmd = "op read " .. item_path
    local handle = io.popen(cmd)
    if not handle then
        print("Error: Could not run 1Password CLI command.")
        return nil
    end
    local secret = handle:read("*a")
    handle:close()

    secret = secret:gsub("%s+$", "")
    if string.len(secret) == 0 then
        print("Warning: 1Password CLI returned an empty secret or failed.")
        return nil
    end
    return secret
end

return M