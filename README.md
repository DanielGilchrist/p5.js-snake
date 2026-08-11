# [p5.js-snake](https://danielgilchrist.github.io/p5.js-snake/)

Made using [p5.js](https://p5js.org/)

<img width="1004" height="604" alt="image" src="https://github.com/user-attachments/assets/42f9c977-ddf4-4d5f-a88c-6ba7f4e9d5c7" />

# Controls

## Keyboard
| Key | |
| --- | --- |
| Arrow keys, `hjkl` or `wsad` | Move |
| `p` | Pause |
| `Shift+S` | Settings |
| `?` | Controls |

# Modes

Append these to the URL. Without one you get the usual single player game.

| Link | |
| --- | --- |
| `?cpu` | One board, two snakes, the second played by the computer |
| `?friend` | Two players on one keyboard: arrows for green, `wsad` for purple |
| `?host` | Start a 1v1 over your network and get a link to send |
| `?room=CODE` | Join someone's 1v1, which is what their link looks like |

## 1v1 over your network

Open `?host`, send the link, and you both press `Enter` on the ready screen. Whoever
dies first loses, the board freezes on the result, and the next round starts once you
have both agreed to it. Both of you have to be on the same network.

There is no pausing during a 1v1, and no settings or help either, because stopping
your own game would stop your opponent's with it. All three are available on the
ready screen once the game is paused anyway.

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
