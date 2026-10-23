-- Run through rex_launch so the project picker stays in the calling terminal.
local cwd = assert(rex.args.cwd, "cwd is required")
local label = cwd:match("([^/]+/[^/]+)$"):gsub("/", "_"):gsub("%.", "_")
assert(#label <= 128, "project label is too long")

local sessions = assert(rex.call("session.list"))
local session_id
for _, session in ipairs(sessions.sessions or {}) do
    if session.label == label then
        session_id = session.session_id
        break
    end
end

local window_id
local created = session_id == nil
if created then
    local function terminal(command)
        return rex.layout.block{
            flavor = "com.superlogical.terminal.shell",
            label = command or "shell",
            -- Interactive startup loads the PATH and mise setup in .zshrc.
            options = {
                cwd = cwd,
                shell = "none",
                command = command and { "/bin/zsh", "-lic", "exec " .. command }
                    or { "/bin/zsh", "-li" },
            },
        }
    end
    local session = assert(rex.call("session.create", {
        label = label,
        initial_windows = {
            {
                window_label = "agents",
                layout = rex.layout.horizontal(0.5, terminal("pi"), terminal("claude")),
            },
            {
                window_label = "nvim",
                layout = terminal("nvim"),
            },
            {
                window_label = "terminals",
                layout = rex.layout.horizontal(0.5, terminal("lazygit"), terminal()),
            },
        },
    }))
    session_id = session.session_id
    window_id = session.initial_windows[1].window_id
    assert(rex.session.attach{ session_id = session_id })
    assert(rex.session.focus_window{ session_id = session_id, window_id = window_id })
end

-- Show the background-created session in the current native window.
-- Selecting an existing project preserves its running editor and agent.
rex.client.queue("session.select", { session_id = session_id, window_id = window_id })
return { session_id = session_id, created = created }
