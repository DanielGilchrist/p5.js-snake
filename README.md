# [p5.js-snake](https://danielgilchrist.github.io/p5.js-snake/)

Made using [p5.js](https://p5js.org/)

<img width="1004" height="604" alt="image" src="https://github.com/user-attachments/assets/42f9c977-ddf4-4d5f-a88c-6ba7f4e9d5c7" />

# Controls

## Keyboard
| Key | |
| --- | --- |
| Arrow keys, `hjkl` or `wsad` | Move, and choose on the menu |
| `Enter` | Play the entry under the cursor |
| `p` | Pause |
| `Shift+S` or `Esc` or `Backspace` | Menu |
| `Esc` or `Backspace` | Back |
| `?` | How to play |

# Modes

The mode is selected through the menu and is facilitated through a link and query parameters.

| Link | |
| --- | --- |
| `?solo` | Straight into the single player game, skipping the menu |
| `?cpu=N` | One board, you and N computer players, up to eight in total |
| `?friend` | Two players on one keyboard: arrows for green, `wsad` for purple |
| `?host&players=N` | Open a room for N over your network and get a link to send |
| `?room=CODE` | Join someone's room, which is what their link looks like |

# Development

Requires [Bun](https://bun.sh).

```sh
bun install
bun run dev
```

| Command | |
| --- | --- |
| `bun run dev` | Typecheck, rebuild and serve on http://localhost:3000 |
| `bun run build` | Check, then bundle to `dist/` |
| `bun run check` | Typecheck, lint and format check |
| `bun run format` | Fix formatting |
| `HTTPS=1 bun run dev` | Serve over TLS as well, so a phone on your network can join |

`HTTPS=1` makes a self-signed certificate, so a phone will warn before letting you
through. The deployed site has a real one and does not.

CI runs `check` on every pull request, and deploys to GitHub Pages from `master` once it passes.
