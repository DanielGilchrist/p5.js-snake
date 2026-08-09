# [p5.js-snake](https://danielgilchrist.github.io/p5.js-snake/)

Made using [p5.js](https://p5js.org/)

<img width="1004" height="604" alt="image" src="https://github.com/user-attachments/assets/42f9c977-ddf4-4d5f-a88c-6ba7f4e9d5c7" />

# Controls

## Keyboard
| Key | |
| --- | --- |
| Arrow keys or `hjkl` | Move |
| `p` | Pause |
| `s` | Settings |
| `?` | Controls |

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

CI runs `check` on every pull request, and deploys to GitHub Pages from `master` once it passes.
