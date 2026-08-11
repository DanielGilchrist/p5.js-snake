export type Panel = {
  readonly show: (link: string) => void;
  readonly hide: () => void;
};

const STYLE = `
.invite {
  position: fixed;
  left: 50%;
  bottom: 8vh;
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  transform: translateX(-50%);
  font-family: system-ui, sans-serif;
}

.invite[data-open="yes"] {
  display: flex;
}

.invite-hint {
  color: #8d8477;
  font-size: 0.82rem;
}

.invite-link {
  max-width: min(90vw, 34rem);
  padding: 0.55rem 0.8rem;
  border: 1px solid #4a443c;
  border-radius: 0.5rem;
  background: #201d1a;
  color: #d8d0c4;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.86rem;
  text-align: center;
  overflow-wrap: anywhere;
  user-select: all;
  -webkit-user-select: all;
}

.invite-copy {
  padding: 0.75rem 1.6rem;
  border: 0;
  border-radius: 0.6rem;
  background: #a8bc9a;
  color: #23201c;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
}
`;

const SETTLE_MS = 1400;
const ANSWER_MS = 1200;

const sharable = (): boolean =>
  window.matchMedia("(pointer: coarse)").matches && typeof navigator.share === "function";

export const mount = (): Panel => {
  const sheet = document.createElement("style");

  sheet.textContent = STYLE;
  document.head.append(sheet);

  const root = document.createElement("div");
  const hint = document.createElement("p");
  const field = document.createElement("div");
  const copy = document.createElement("button");

  root.className = "invite";
  hint.className = "invite-hint";
  field.className = "invite-link";
  copy.className = "invite-copy";
  copy.type = "button";

  hint.textContent = "Send this link, both of you on the same network";

  const resting = (): string => (sharable() ? "SHARE LINK" : "COPY LINK");

  copy.textContent = resting();

  root.append(hint, field, copy);
  document.body.append(root);

  let settled = 0;

  const done = (word: string): void => {
    copy.textContent = word;
    settled += 1;

    const mine = settled;

    window.setTimeout(() => {
      if (settled === mine) copy.textContent = resting();
    }, SETTLE_MS);
  };

  copy.addEventListener("click", () => {
    const link = field.textContent ?? "";

    if (sharable()) {
      void navigator
        .share({ title: "Snake", url: link })
        .then(() => {
          done("SHARED");
        })
        .catch(() => undefined);

      return;
    }

    const stalled = new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("clipboard did not answer"));
      }, ANSWER_MS);
    });

    void Promise.race([navigator.clipboard.writeText(link), stalled])
      .then(() => {
        done("COPIED");
      })
      .catch(() => {
        done("SELECT IT ABOVE");
      });
  });

  return {
    show: (link) => {
      field.textContent = link;
      root.dataset["open"] = "yes";
    },
    hide: () => {
      delete root.dataset["open"];
    },
  };
};
