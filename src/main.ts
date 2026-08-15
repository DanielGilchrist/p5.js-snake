import p5 from "p5";

import * as Board from "./core/board";
import * as Game from "./core/game";
import * as Controls from "./core/controls";
import * as Input from "./core/input";
import * as Option from "./core/option";
import * as Autopilot from "./core/autopilot";
import * as Rng from "./core/rng";
import * as Invite from "./net/invite";
import * as Session from "./net/session";
import * as Players from "./core/players";
import * as Lockstep from "./net/lockstep";
import * as Timeline from "./core/timeline";
import * as Mode from "./shell/mode";
import * as Phase from "./shell/phase";
import * as Verdict from "./core/verdict";
import * as World from "./core/world";
import * as Effects from "./render/effects";
import * as Keys from "./render/keys";
import * as Layout from "./render/layout";
import * as Menu from "./render/menu";
import * as Palette from "./render/palette";
import * as Panel from "./render/panel";
import * as Settings from "./render/settings";
import * as InvitePanel from "./shell/invite";
import * as Slots from "./shell/slots";
import * as Offline from "./shell/offline";
import * as Storage from "./shell/storage";
import * as Pad from "./render/pad";
import * as Render from "./render";
import * as Rewind from "./render/rewind";
import * as Surface from "./render/surface";
import * as Units from "./render/units";

Offline.keep();

const TARGET_BLOCK = 34;
const MIN_TICKS_PER_SECOND = 10;
const SPEED_UP_MS = 2;
const FASTEST_FRACTION = 0.55;
const HITSTOP_MS = 130;
const ENDING_GRACE_MS = 600;
const PRESS_FEEDBACK_MS = 130;
const MAX_DENSITY = 2;
const RESEND_MS = 100;
const COAX_MS = 250;
const STALL_MS = 600;
const OPENING_MS = 2000;

const firstPhase = <B>(versus: boolean, now: Units.Millis): Phase.Phase<B> =>
  versus ? Phase.counting(Units.millis(now + OPENING_MS)) : Phase.LIVE;

const nightly = (): boolean => window.matchMedia("(prefers-color-scheme: dark)").matches;

const schemeFor = (settings: Settings.Type): Palette.Scheme =>
  Settings.schemeFor(settings, nightly());

const vault = Storage.browser();

const here = window.location.href;

const mode = Mode.read(here);

const online = Mode.networked(mode);

const cpu = Mode.runItself(mode);

const probing = mode.showing;

const piloted = mode.automatic;

const roomCode = mode.room;

window.addEventListener("hashchange", () => {
  const asked = Invite.read(window.location.href);

  if (!asked.some || asked.value !== roomCode) window.location.reload();
});

type Shell =
  | { readonly kind: "desk"; readonly stage: Units.Region }
  | {
      readonly kind: "handheld";
      readonly stage: Units.Region;
      readonly device: Units.Region;
      readonly pad: Pad.Pad;
    };

const touchFirst = (): boolean => window.matchMedia("(pointer: coarse)").matches;

const fillScreen = (): void => {
  if (!touchFirst() || document.fullscreenElement !== null) return;

  void document.documentElement
    .requestFullscreen?.({ navigationUI: "hide" })
    .catch(() => undefined);
};

const shellFor = (viewport: Units.Viewport, hand: Pad.Hand): Shell => {
  if (!touchFirst()) return { kind: "desk", stage: Layout.desk(viewport) };

  const handheld = Pad.arrange(viewport, hand);

  return {
    kind: "handheld",
    stage: handheld.stage,
    device: handheld.device,
    pad: handheld.pad,
  };
};

const HELP_LINES: readonly (readonly [string, string])[] = [
  ["Move", Controls.nameOf(Mode.controlsFor(mode), Players.FIRST)],
  ["Pause", "P"],
  ["Settings", "Shift+S"],
  ["Controls", "?"],
];

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    p.pixelDensity(Math.min(MAX_DENSITY, p.displayDensity()));
    p.createCanvas(p.windowWidth, p.windowHeight).parent(document.body);
    p.frameRate(60);

    const viewport = Units.viewport(p.windowWidth, p.windowHeight);
    let settings = vault.read(Slots.SETTINGS);
    let scheme = schemeFor(settings);
    let shell = shellFor(viewport, settings.hand);

    const mine = Layout.cellsFor(shell.stage, TARGET_BLOCK);

    const net: Option.Type<Session.Session> = online
      ? Option.some(
          Session.join(roomCode, mode.joining ? "guest" : "host", () => ({
            cols: mine.cols,
            rows: mine.rows,
            seed: Math.floor(Math.random() * 1_000_000_000),
          })),
        )
      : Option.none;

    const boot = (size: Board.GridSize, seed: number): void => {
      const started = Board.parse(size, <B>(board: Board.Grid<B>, api: Board.Api<B>): void => {
        let layout = Layout.fit(board, shell.stage);
        let surface = Surface.of(p, scheme, board, layout);

        let round = seed;
        let pending = seed;
        let state = Game.start(board, Rng.fromSeed(round), mode.rules);
        let timeline = Timeline.start(state);
        let previous = state.world.players;
        let effects: readonly Effects.Effect[] = [];
        let phase: Phase.Phase<B> = net.some
          ? Phase.READY
          : firstPhase(mode.rules.players > 1, Units.millis(p.millis()));
        let bite = phase.kind === "counting" ? phase.until : Units.millis(0);
        let lastTick = 0;
        let hitstop = 0;
        let inputLockedUntil = 0;
        let reshaping = false;

        const versus = (): boolean => mode.rules.players > 1;

        const myPlayer = (): Players.Id => (net.some ? net.value.seat : Players.FIRST);

        const rulesNow = (): Input.Rules => {
          if (!net.some) return Mode.localRules(mode);

          return phase.kind === "ready" ? Input.waiting(myPlayer()) : Input.away(myPlayer());
        };

        const endingNow = (): Option.Type<Render.Ending> => {
          if (state.kind !== "over" || Players.count(state.world.players) < 2) return Option.none;

          const won = Verdict.winner(state.outcome, state.world.players);
          const title = Mode.cheerFor(mode, won, myPlayer());

          if (!Verdict.onScore(state.outcome, state.world.players)) {
            return Option.some(Render.ending(title));
          }

          const counted = Players.everyone(state.world.players).map(([who, player]) =>
            Render.tally(Mode.nameFor(mode, who, myPlayer()), player.score),
          );

          return Option.some(Render.ending(title, counted));
        };

        const namingNow = (): Option.Type<Render.Naming> => {
          if (!versus() || phase.kind !== "counting") return Option.none;

          const tags = Players.everyone(state.world.players).map(([who]) =>
            Mode.tagFor(mode, who, myPlayer()),
          );
          const ringed = Mode.ringed(mode) ? Option.some<number>(myPlayer()) : Option.none;

          return Option.some(Render.naming(tags, ringed));
        };

        const chrome = (): Render.Chrome =>
          Render.chrome(
            scheme,
            shell.stage,
            shell.kind === "handheld" ? Option.some(shell.device) : Option.none,
            shell.kind === "handheld" ? "touch" : "keys",
            endingNow(),
            namingNow(),
          );
        let gate = Lockstep.waiting(0);
        let resent = 0;
        let coaxed = 0;
        let stalling = 0;
        let split = false;
        let verdict: Option.Type<string> = Option.none;
        let held: Option.Type<Pad.Control> = Option.none;
        let heldUntil = 0;
        let thumb: Option.Type<number> = Option.none;

        const baseInterval =
          1000 / Math.max(MIN_TICKS_PER_SECOND, Math.floor((board.cols + board.rows) / 4.3));

        const fastestInterval = baseInterval * FASTEST_FRACTION;

        const tickInterval = (): number =>
          Math.max(
            fastestInterval,
            baseInterval - Players.scored(state.world.players) * SPEED_UP_MS,
          );

        const apply = (command: Game.Command): void => {
          const now = Units.millis(p.millis());
          const stepped = Game.step(api, state, command);

          state = stepped.state;

          if (command.kind === "restart") {
            timeline = Timeline.start(state);
            bite = now;
          } else {
            Timeline.record(timeline, stepped.events);
          }

          if (stepped.events.some((event) => event.kind === "scored")) bite = now;

          if (stepped.events.some((event) => event.kind === "scored")) hitstop = HITSTOP_MS;

          if (stepped.events.some((event) => event.kind === "ended")) {
            inputLockedUntil = now + ENDING_GRACE_MS;

            if (net.some && state.kind === "over") {
              verdict = Option.some(
                Verdict.mineToLose(state.outcome, net.value.seat, state.world.players),
              );
              askAgain(now);
            }
          }

          effects = [
            ...effects,
            ...stepped.events.flatMap((event) => Effects.spawn(scheme, event, layout, now)),
          ];
        };

        const startRound = (now: Units.Millis): void => {
          phase = firstPhase(versus(), now);
          lastTick = now;

          if (net.some) {
            round = pending;
            gate = Lockstep.waiting(0);
            resent = 0;
            split = false;
            verdict = Option.none;
            net.value.clearRematch();
            net.value.beginRound(round);
            state = Game.start(board, Rng.fromSeed(round), mode.rules);
            timeline = Timeline.start(state);
            bite = now;
            effects = [];
          } else if (reshaping) {
            window.location.reload();

            return;
          } else {
            apply(Game.restart);
          }

          if (phase.kind === "counting") bite = phase.until;

          previous = state.world.players;
        };

        const askAgain = (now: Units.Millis): void => {
          pending = round + 1;
          coaxed = 0;
          phase = Phase.READY;
          lastTick = now;
        };

        const drawRewind = (playback: Rewind.Playback<B>, now: Units.Millis): void => {
          if (net.some && p.millis() - coaxed > COAX_MS) {
            net.value.nudgeReady();
            coaxed = p.millis();
          }

          if (piloted && net.some && net.value.heardRematch() && !net.value.askedRematch()) {
            net.value.askRematch();
          }

          if (net.some && net.value.bothWantRematch()) {
            startRound(now);

            return;
          }

          const frame = Rewind.frame(playback, timeline, now);

          if (frame.kind === "finished") {
            startRound(now);

            return;
          }

          phase = Phase.rewinding(frame.playback);

          effects = [
            ...Effects.alive(effects, now),
            ...frame.undone.flatMap((event) => Effects.unspawn(scheme, event, layout, now)),
          ];

          const shake = Effects.shakeOffset(effects, now);

          p.push();
          p.translate(shake.dx, shake.dy);

          Render.draw(p, frame.scene, layout, surface, chrome());

          p.pop();

          Effects.draw(p, scheme, effects, layout, now);
          Render.drawSkipHint(
            p,
            scheme,
            shell.kind === "handheld" ? "touch" : "keys",
            net.some && net.value.askedRematch(),
          );

          if (shell.kind === "handheld")
            Keys.draw(p, scheme, shell.pad, Option.none, rulesNow().suspendable);
        };

        const lockstep = (): boolean => {
          if (!net.some) return true;

          const session = net.value;

          const opening = Lockstep.step(gate, session.turnsAt(gate.beat));

          if (opening.kind === "commit") {
            session.record(opening.beat, opening.committed, World.fingerprint(state.world));
            gate = opening.next;
            resent = 0;
          }

          const turn = Lockstep.step(gate, session.turnsAt(gate.beat));

          if (turn.kind !== "advance") {
            if (stalling === 0) stalling = p.millis();

            return false;
          }

          stalling = 0;

          const mark = session.markAt(gate.beat);

          if (mark.some && mark.value !== World.fingerprint(state.world)) split = true;

          for (const direction of session.seat === Players.FIRST ? turn.mine : turn.theirs) {
            apply(Game.turn(Players.FIRST, direction));
          }

          for (const direction of session.seat === Players.id(1) ? turn.mine : turn.theirs) {
            apply(Game.turn(Players.id(1), direction));
          }

          gate = turn.next;
          session.flush(gate.beat - 1);

          return true;
        };

        const keepTalking = (): void => {
          if (!net.some || gate.posted < 0) return;
          if (p.millis() - resent <= RESEND_MS) return;

          net.value.flush(gate.posted);
          resent = p.millis();
        };

        const nudgePilot = (): void => {
          if (!piloted || !net.some) return;
          if (state.kind !== "playing") return;
          if (gate.posted === gate.beat || gate.queued.length > 0) return;

          const picked = Autopilot.choose(api, state.world, net.value.seat);

          if (picked.some) gate = Lockstep.pressed(gate, picked.value);
        };

        const driveCpu = (): void => {
          if (!cpu || state.kind !== "playing") return;

          const picked = Autopilot.choose(api, state.world, Players.id(1));

          if (picked.some) apply(Game.turn(Players.id(1), picked.value));
        };

        const stepWorld = (now: Units.Millis): void => {
          if (now - lastTick < Math.max(tickInterval(), hitstop)) return;

          nudgePilot();
          if (!lockstep()) return;

          driveCpu();

          previous = state.world.players;
          lastTick = now;
          hitstop = 0;
          apply(Game.tick);
        };

        const painting = (now: Units.Millis, paint: (scene: Render.Scene<B>) => void): void => {
          effects = Effects.alive(effects, now);

          const alpha = Math.min(1, (now - lastTick) / tickInterval());
          const shake = Effects.shakeOffset(effects, now);

          p.push();
          p.translate(shake.dx, shake.dy);
          paint(Render.scene(state, previous, alpha, bite));
          p.pop();

          Effects.draw(p, scheme, effects, layout, now);

          if (shell.kind === "handheld") {
            if (!thumb.some && now > heldUntil) held = Option.none;

            Keys.draw(p, scheme, shell.pad, held, rulesNow().suspendable);
          }
        };

        const paintWorld = (now: Units.Millis): void => {
          painting(now, (scene) => {
            Render.draw(p, scene, layout, surface, chrome());
          });
        };

        const paintBoard = (now: Units.Millis): void => {
          painting(now, (scene) => {
            Render.drawBoard(p, scene, layout, surface, chrome());
          });
        };

        const drawCounting = (until: Units.Millis, now: Units.Millis): void => {
          const left = until - now;

          if (left <= 0) {
            phase = Phase.LIVE;
            lastTick = now;

            drawLive(now);

            return;
          }

          lastTick = now;
          paintWorld(now);
          Render.drawCountdown(
            p,
            scheme,
            layout,
            shell.stage,
            Render.countdown(Units.millis(left), Units.millis(OPENING_MS)),
          );
        };

        const drawLive = (now: Units.Millis): void => {
          stepWorld(now);
          paintWorld(now);

          if (split) Render.drawSplit(p, scheme, layout, shell.stage);
          else if (stalling > 0 && p.millis() - stalling > STALL_MS) {
            Render.drawStall(p, scheme, layout, shell.stage);
          }

          if (net.some && probing) {
            const session = net.value;
            const theirs = session.turnsAt(gate.beat);

            p.push();
            p.noStroke();
            p.fill(255, 0, 0);
            p.textSize(16);
            p.textAlign(p.LEFT, p.TOP);
            p.text(
              `beat=${gate.beat} posted=${gate.posted} theirs=${theirs.some} held=[${session.held().join(",")}] dt=${Math.round(now - lastTick)} iv=${Math.round(tickInterval())} hs=${hitstop} rs=${Math.round(p.millis() - resent)}`,
              12,
              12,
            );

            p.pop();
          }
        };

        const resume = (now: Units.Millis): void => {
          phase = net.some && !net.value.readiness().sealed ? Phase.READY : Phase.LIVE;
          lastTick = now;
        };

        const drawReady = (now: Units.Millis): void => {
          if (!net.some) return;

          const session = net.value;
          const standing = session.readiness();

          if (standing.sealed) {
            if (verdict.some) phase = Phase.rewinding(Rewind.begin(timeline, state, now));
            else startRound(now);

            return;
          }

          if (piloted && !standing.here) session.declareReady();

          if (p.millis() - coaxed > COAX_MS) {
            session.nudgeReady();
            coaxed = p.millis();
          }

          lastTick = now;
          paintBoard(now);
          Render.drawReady(
            p,
            scheme,
            { here: standing.here, there: standing.there, verdict },
            layout,
            shell.stage,
            shell.kind === "handheld" ? "touch" : "keys",
          );
        };

        p.draw = () => {
          const now = Units.millis(p.millis());

          keepTalking();

          if (phase.kind === "ready") {
            drawReady(now);

            return;
          }

          if (phase.kind === "counting") {
            drawCounting(phase.until, now);

            return;
          }

          if (phase.kind === "rewinding") {
            drawRewind(phase.playback, now);

            return;
          }

          if (phase.kind === "settings") {
            paintWorld(now);
            Panel.draw(p, scheme, menuNow(), layout.blockWidth, phase.cursor);

            return;
          }

          if (phase.kind === "frozen") {
            paintWorld(now);

            return;
          }

          if (phase.kind === "help") {
            paintWorld(now);
            Render.drawTablet(
              p,
              scheme,
              [
                Render.line("CONTROLS", 0.62),
                ...HELP_LINES.map(([what, how]) => Render.line(`${what}: ${how}`, 0.3)),
              ],
              layout,
              shell.stage,
            );

            return;
          }

          drawLive(now);
        };

        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
          scheme = schemeFor(settings);
          surface = Surface.of(p, scheme, board, layout);
          effects = [];
        });

        const wantsReshaping = (): boolean => {
          if (online) return false;

          const ideal = Layout.cellsFor(shell.stage, TARGET_BLOCK);
          return ideal.cols !== board.cols || ideal.rows !== board.rows;
        };

        p.windowResized = () => {
          p.resizeCanvas(p.windowWidth, p.windowHeight);
          shell = shellFor(Units.viewport(p.windowWidth, p.windowHeight), settings.hand);
          layout = Layout.fit(board, shell.stage);
          surface = Surface.of(p, scheme, board, layout);
          effects = [];
          reshaping = wantsReshaping();
        };

        const press = (key: Input.Key, now: Units.Millis): void => {
          if (now < inputLockedUntil) return;

          if (phase.kind === "rewinding") {
            const asking = key.kind === "skip" || key.kind === "other";

            if (asking && net.some) net.value.askRematch();
            else if (asking) startRound(now);

            return;
          }

          const command = Input.commandFor(state, key, rulesNow());
          if (!command.some) return;

          if (net.some && command.value.kind === "turn") {
            gate = Lockstep.pressed(gate, command.value.direction);

            return;
          }

          if (command.value.kind === "restart" && net.some) return;

          if (command.value.kind === "restart" && reshaping) {
            window.location.reload();

            return;
          }

          if (command.value.kind === "restart") {
            const playback = Rewind.begin(timeline, state, now);

            if (Rewind.worthWatching(playback)) {
              effects = [];
              phase = Phase.rewinding(playback);

              return;
            }
          }

          apply(command.value);
        };

        const applySettings = (next: Settings.Type): void => {
          const before = settings;

          settings = next;
          vault.write(Slots.SETTINGS, settings);
          scheme = schemeFor(settings);

          if (before.hand !== settings.hand) {
            shell = shellFor(Units.viewport(p.windowWidth, p.windowHeight), settings.hand);
            layout = Layout.fit(board, shell.stage);
          }

          surface = Surface.of(p, scheme, board, layout);
          effects = [];
        };

        const menuNow = (): Menu.Menu =>
          Menu.of(
            shell.stage,
            layout.blockWidth,
            settings,
            Menu.rowsFor(shell.kind === "handheld"),
          );

        const tapped = (at: Units.Point): void => {
          const now = Units.millis(p.millis());

          if (phase.kind === "settings") {
            const menu = menuNow();
            const picked = Menu.hit(menu, at);

            if (picked.some) applySettings(Settings.chosen(settings, picked.value));
            else if (!Menu.covers(menu, at)) resume(now);

            return;
          }

          if (phase.kind === "ready") {
            fillScreen();

            if (shell.kind === "handheld") {
              const picked = Pad.hit(shell.pad, at);

              if (picked.some && picked.value === "menu") {
                phase = Phase.settings(0);

                return;
              }
            }

            if (net.some) net.value.declareReady();

            return;
          }

          if (shell.kind !== "handheld") return;

          const control = Pad.hit(shell.pad, at);

          if (control.some) {
            held = control;
            heldUntil = now + PRESS_FEEDBACK_MS;
          }

          if (control.some && control.value === "menu") {
            if (rulesNow().suspendable) phase = Phase.settings(0);

            return;
          }

          const key = control.some ? Pad.keyOf(control.value) : Option.some(Input.other);

          if (key.some) press(key.value, now);
        };

        const slid = (at: Units.Point): void => {
          if (shell.kind !== "handheld" || phase.kind !== "live") return;

          const control = Pad.hit(shell.pad, at);
          const steering = control.some && Pad.steers(control.value);

          if (!steering) {
            held = Option.none;

            return;
          }

          if (held.some && held.value === control.value) return;

          held = control;

          const key = Pad.keyOf(control.value);

          if (key.some) press(key.value, Units.millis(p.millis()));
        };

        const lifted = (): void => {
          thumb = Option.none;
          heldUntil = Units.millis(p.millis()) + PRESS_FEEDBACK_MS;
        };

        window.addEventListener(
          "pointerdown",
          (event: PointerEvent) => {
            if (shell.kind !== "handheld" && phase.kind !== "settings") return;

            event.preventDefault();

            if (!thumb.some) thumb = Option.some(event.pointerId);

            tapped(Units.point(event.clientX, event.clientY));
          },
          { passive: false },
        );

        window.addEventListener(
          "pointermove",
          (event: PointerEvent) => {
            if (!thumb.some || thumb.value !== event.pointerId) return;

            event.preventDefault();
            slid(Units.point(event.clientX, event.clientY));
          },
          { passive: false },
        );

        for (const ending of ["pointerup", "pointercancel"] as const) {
          window.addEventListener(ending, (event: PointerEvent) => {
            if (!thumb.some || thumb.value !== event.pointerId) return;

            lifted();
          });
        }

        if (probing) {
          Object.assign(window, {
            snakeProbe: () => ({
              phase: phase.kind,
              beat: gate.beat,
              posted: gate.posted,
              held: net.some ? net.value.held() : [],
              split,
              mark: World.fingerprint(state.world),
              ready: net.some ? net.value.readiness() : undefined,
              score: Players.scored(state.world.players),
            }),
          });
        }

        p.keyPressed = () => {
          const now = Units.millis(p.millis());
          const key = Input.parseKey(p.key, Mode.controlsFor(mode));

          if (phase.kind === "ready") {
            if (key.kind === "menu") phase = Phase.settings(0);
            else if (key.kind === "help") phase = Phase.HELP;
            else if (key.kind === "skip" && net.some) net.value.declareReady();

            return;
          }

          if (
            !rulesNow().suspendable &&
            (key.kind === "freeze" || key.kind === "menu" || key.kind === "help")
          ) {
            return;
          }

          if (key.kind === "freeze") {
            if (phase.kind === "frozen") resume(now);
            else phase = Phase.FROZEN;

            return;
          }

          if (phase.kind === "frozen") return;

          if (phase.kind === "help") {
            if (key.kind === "menu") phase = Phase.settings(0);
            else resume(now);

            return;
          }

          if (phase.kind === "settings") {
            const { cursor } = phase;

            if (key.kind === "help") {
              phase = Phase.HELP;

              return;
            }

            if (key.kind === "menu" || key.kind === "skip") {
              resume(now);

              return;
            }

            if (key.kind !== "turn") return;

            const menu = menuNow();

            if (key.direction === "up") phase = Phase.settings(cursor - 1 + menu.lines.length);
            else if (key.direction === "down") phase = Phase.settings(cursor + 1);
            else {
              const row = Menu.rowAt(menu, cursor);

              applySettings(Menu.cycle(settings, row, key.direction === "right" ? 1 : -1));
            }

            return;
          }

          if (key.kind === "menu") {
            phase = Phase.settings(0);

            return;
          }

          if (key.kind === "help") {
            phase = Phase.HELP;

            return;
          }

          press(key, now);
        };
      });

      if (!started.ok) {
        const { error } = started;
        p.draw = () => Render.drawError(p, schemeFor(Settings.DEFAULT), error);
      }
    };

    if (!net.some) {
      boot(mine, Date.now());

      return;
    }

    const lobby = net.value;
    const invite = Invite.link(window.location.href, roomCode);
    const panel = InvitePanel.mount();

    if (mode.hosting) panel.show(invite);

    p.draw = () => {
      const stage = lobby.stage();

      if (stage.kind === "ready") {
        panel.hide();
        boot(Board.size(stage.config.cols, stage.config.rows), stage.config.seed);

        return;
      }

      Render.drawLobby(p, schemeFor(vault.read(Slots.SETTINGS)), {
        code: roomCode,
        role: lobby.role,
        waiting: stage.kind === "waiting",
      });
    };
  };
});
