-- Match tmux's prefix; press Ctrl+Space twice to send it to the terminal.
rex.bind("ctrl+space>ctrl+space", "pane.send_key", { key = "ctrl+space" })
rex.bind("ctrl+space>s", "session.switch")
rex.bind("cmd+s", "session.switch")
rex.bind("ctrl+space>c", "client.tab.new")
rex.bind("ctrl+space>n", "client.tab.next")
rex.bind("ctrl+space>p", "client.tab.previous")
rex.bind("ctrl+space>shift+5", "pane.split", { direction = "right" })
rex.bind("ctrl+space>shift+'", "pane.split", { direction = "down" })
rex.bind("ctrl+space>z", "pane.zoom")
rex.bind("ctrl+space>x", "pane.close")

rex.action{
    name = "open_project",
    title = "Open Project",
    description = "Pick a project and open or reattach to its agents, Neovim, and terminals workspace.",
    category = "Session",
    run = function(ctx)
        local window = assert(rex.session.new_window{
            window_label = "Open Project",
            focus = true,
            layout = rex.layout.block{
                flavor = "com.superlogical.terminal.shell",
                options = {
                    shell = "none",
                    command = { "/bin/zsh", "-lic", "rex_launch" },
                },
            },
        })
        rex.client.queue("session.select", {
            session_id = ctx.session_id,
            window_id = window.window_id,
        })
        rex.client.queue("client.tab.goto", { index = -1 })
        return window
    end,
}
rex.bind("ctrl+space>o", "open_project")
