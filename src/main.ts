import p5 from "p5";

import * as Assert from "./core/assert";
import * as Board from "./core/board";
import * as Game from "./core/game";
import * as Controls from "./core/controls";
import * as Geometry from "./core/geometry";
import * as Input from "./core/input";
import * as Option from "./core/option";
import * as Autopilot from "./core/autopilot";
import * as Rng from "./core/rng";
import * as Standings from "./core/standings";
import * as Invite from "./net/invite";
import * as Session from "./net/session";
import * as Players from "./core/players";
import * as Lockstep from "./net/lockstep";
import * as Timeline from "./core/timeline";
import * as Fault from "./shell/fault";
import * as Build from "./shell/build";
import * as Intent from "./shell/intent";
import * as Mode from "./shell/mode";
import * as Pace from "./shell/pace";
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
const ENDING_GRACE_MS = 600;
const PRESS_FEEDBACK_MS = 130;
const MAX_DENSITY = 2;
const PIXEL_BUDGET = 5_000_000;

const densityFor = (width: number, height: number, offered: number): number => {
  const area = Math.max(1, width * height);

  return Math.min(MAX_DENSITY, offered, Math.max(1, Math.sqrt(PIXEL_BUDGET / area)));
};
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

const probing = mode.showing;

const piloted = mode.automatic;

const roomCode = mode.room;

window.addEventListener("hashchange", () => {
  const wanted = Invite.asked(window.location.href);

  if (wanted.kind !== Invite.ROOM || wanted.code !== roomCode) window.location.reload();
});

const DESK = "desk";
const HANDHELD = "handheld";

type Shell =
  | { readonly kind: typeof DESK; readonly stage: Units.Region }
  | {
      readonly kind: typeof HANDHELD;
      readonly stage: Units.Region;
      readonly device: Units.Region;
      readonly pad: Pad.Pad;
    };

const touchFirst = (): boolean => window.matchMedia("(pointer: coarse)").matches;

const idle = (): void => undefined;

const soloAgain = (): void => {
  window.location.href = new URL(window.location.pathname, window.location.href).toString();
};

const fillScreen = (): void => {
  if (!touchFirst() || document.fullscreenElement !== null) return;

  void document.documentElement
    .requestFullscreen?.({ navigationUI: "hide" })
    .catch(() => undefined);
};

const shellFor = (viewport: Units.Viewport, hand: Pad.Hand): Shell => {
  if (!touchFirst()) return { kind: DESK, stage: Layout.desk(viewport) };

  const handheld = Pad.arrange(viewport, hand);

  return {
    kind: HANDHELD,
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

p5.disableFriendlyErrors = !Build.debugging();

export const sketch = new p5((p: p5) => {
  p.setup = () => {
    p.pixelDensity(densityFor(p.windowWidth, p.windowHeight, p.displayDensity()));
    p.createCanvas(p.windowWidth, p.windowHeight).parent(document.body);
    p.frameRate(60);

    let onFrame: () => void = idle;
    let onKey: () => void = idle;
    let onResize: () => void = idle;

    p.draw = () => {
      onFrame();
    };

    p.keyPressed = () => {
      onKey();
    };

    p.windowResized = () => {
      onResize();
    };

    const viewport = Units.viewport(p.windowWidth, p.windowHeight);
    let settings = vault.read(Slots.SETTINGS);
    let scheme = schemeFor(settings);
    let shell = shellFor(viewport, settings.hand);

    if (mode.fault.some) {
      const told = Fault.ofLink(mode.fault.value);

      onFrame = () => {
        Render.drawTrouble(p, scheme, told, touchFirst() ? Render.TOUCH : Render.KEYS);
      };

      onKey = soloAgain;
      window.addEventListener("pointerdown", soloAgain);

      return;
    }

    const mine = Layout.cellsFor(shell.stage, TARGET_BLOCK);

    const net: Option.Type<Session.Session> = online
      ? Option.some(
          Session.join(
            roomCode,
            mode.joining ? Session.GUEST : Session.HOST,
            () => ({
              cols: mine.cols,
              rows: mine.rows,
              seed: Math.floor(Math.random() * 1_000_000_000),
            }),
            mode.rules.players,
            here,
          ),
        )
      : Option.none;

    const boot = (size: Board.GridSize, seed: number): void => {
      const started = Board.parse(size, <B>(board: Board.Grid<B>, api: Board.Api<B>): void => {
        let layout = Layout.fit(board, shell.stage);
        let surface = Surface.of(p, scheme, board, layout);

        let round = seed;
        let pending = seed;
        const rules = net.some
          ? Game.forPlayers(net.value.players(), mode.rules.growth)
          : mode.rules;

        let state = Game.start(board, Rng.fromSeed(round), rules);
        let timeline = Timeline.start(state);
        let previous = state.world.players;
        let effects: readonly Effects.Effect[] = [];
        let phase: Phase.Phase<B> = net.some
          ? Phase.READY
          : firstPhase(rules.players > 1, Units.millis(p.millis()));
        let bite = Phase.isCounting(phase) ? phase.until : Units.millis(0);
        let lastTick = 0;
        let hitstop = 0;
        let inputLockedUntil = 0;
        let reshaping = false;
        let standings = Standings.blank(rules.players);
        let finalists: readonly Players.Id[] = [];

        const versus = (): boolean => rules.players > 1;

        const myPlayer = (): Players.Id => (net.some ? net.value.seat() : Players.FIRST);

        const rulesNow = (): Input.Rules => {
          if (!net.some) return Mode.localRules(mode);

          return phase === Phase.READY ? Input.waiting(myPlayer()) : Input.away(myPlayer());
        };

        const endingNow = (): Option.Type<Render.Ending> => {
          if (state.kind !== Game.OVER || Players.count(state.world.players) < 2)
            return Option.none;

          const won = Verdict.winner(state.outcome, state.world.players);
          const cheer = Mode.cheerFor(mode, won, myPlayer(), finalists);

          if (!Verdict.onScore(state.outcome, state.world.players)) {
            return Option.some(Render.ending(cheer.who, cheer.title));
          }

          const counted = Players.everyone(state.world.players).map(([who, player]) =>
            Render.tally(who, player.score),
          );

          return Option.some(Render.ending(cheer.who, cheer.title, counted));
        };

        const namingNow = (): Option.Type<Render.Naming> => {
          if (!versus() || !Phase.isCounting(phase)) return Option.none;

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
            shell.kind === HANDHELD ? Option.some(shell.device) : Option.none,
            shell.kind === HANDHELD ? Render.TOUCH : Render.KEYS,
            endingNow(),
            namingNow(),
            standings,
          );
        let gate = Lockstep.waiting(0);
        let resent = 0;
        let coaxed = 0;
        let stalling = 0;
        let split = false;
        let verdict: Option.Type<Render.Line> = Option.none;
        let held: Option.Type<Pad.Control> = Option.none;
        let heldUntil = 0;
        let thumb: Option.Type<number> = Option.none;

        const pace = Pace.of(board);

        const scoreNow = (): number => Players.scored(state.world.players);

        const apply = (command: Game.Command): void => {
          const now = Units.millis(p.millis());
          const stepped = Game.step(api, state, command);

          state = stepped.state;

          if (command.kind === Game.RESTART) {
            timeline = Timeline.start(state);
            bite = now;
          } else {
            Timeline.record(timeline, stepped.events);
          }

          if (stepped.events.some((event) => event.kind === Game.SCORED)) bite = now;

          if (stepped.events.some((event) => event.kind === Game.SCORED)) hitstop = Pace.savour();

          if (stepped.events.some((event) => event.kind === Game.ENDED)) {
            inputLockedUntil = now + ENDING_GRACE_MS;

            if (state.kind === Game.OVER && Players.count(state.world.players) > 1) {
              const fallen = stepped.events.flatMap((event) =>
                event.kind === Game.DIED ? [event.player] : [],
              );

              finalists = Verdict.rewarded(state.outcome, state.world.players, fallen);
              standings = Standings.award(standings, finalists);
            }

            if (net.some && state.kind === Game.OVER) {
              const won = Verdict.winner(state.outcome, state.world.players);
              const cheer = Mode.cheerFor(mode, won, myPlayer(), finalists);

              verdict = Option.some(
                Render.crowned(state.world, Render.ending(cheer.who, cheer.title)),
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
            state = Game.start(board, Rng.fromSeed(round), rules);
            timeline = Timeline.start(state);
            bite = now;
            effects = [];
          } else if (reshaping) {
            window.location.reload();

            return;
          } else {
            apply(Game.restart);
          }

          if (Phase.isCounting(phase)) bite = phase.until;

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

          if (frame.kind === Rewind.FINISHED) {
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
            shell.kind === HANDHELD ? Render.TOUCH : Render.KEYS,
            net.some && net.value.askedRematch(),
          );

          if (shell.kind === HANDHELD)
            Keys.draw(p, scheme, shell.pad, Option.none, rulesNow().suspendable);
        };

        const lockstep = (): boolean => {
          if (!net.some) return true;

          const session = net.value;

          const opening = Lockstep.step(gate, session.turnsAt(gate.beat));

          if (opening.kind === Lockstep.COMMIT) {
            session.record(opening.beat, opening.committed, World.fingerprint(state.world));
            gate = opening.next;
            resent = 0;
          }

          const turn = Lockstep.step(gate, session.turnsAt(gate.beat));

          if (turn.kind !== Lockstep.ADVANCE) {
            if (stalling === 0) stalling = p.millis();

            return false;
          }

          stalling = 0;

          const mark = session.markAt(gate.beat);

          if (mark.some && mark.value !== World.fingerprint(state.world)) split = true;

          for (const who of session.dropsAt(gate.beat)) apply(Game.drop(who));

          for (const direction of turn.mine) apply(Game.turn(myPlayer(), direction));

          for (const seated of turn.theirs) {
            for (const direction of seated.runs) apply(Game.turn(seated.seat, direction));
          }

          gate = turn.next;
          session.flush(gate.beat - 1);

          return true;
        };

        const keepTalking = (): void => {
          if (!net.some) return;

          net.value.noticeLeaving(gate.beat);

          if (gate.posted < 0) return;
          if (p.millis() - resent <= RESEND_MS) return;

          net.value.flush(gate.posted);
          resent = p.millis();
        };

        const nudgePilot = (): void => {
          if (!piloted || !net.some) return;
          if (state.kind !== Game.PLAYING) return;
          if (gate.posted === gate.beat || gate.queued.length > 0) return;

          const picked = Autopilot.choose(api, state.world, myPlayer());

          if (picked.some) gate = Lockstep.pressed(gate, picked.value);
        };

        const driveCpu = (): void => {
          if (state.kind !== Game.PLAYING) return;

          for (const who of Mode.machines(mode)) {
            const picked = Autopilot.choose(api, state.world, who);

            if (picked.some) apply(Game.turn(who, picked.value));
          }
        };

        const stepWorld = (now: Units.Millis): void => {
          if (!Pace.due(pace, Units.millis(now - lastTick), scoreNow(), hitstop)) return;

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

          const alpha = Pace.partway(pace, Units.millis(now - lastTick), scoreNow());
          const shake = Effects.shakeOffset(effects, now);

          p.push();
          p.translate(shake.dx, shake.dy);
          paint(Render.scene(state, previous, alpha, bite));
          p.pop();

          Effects.draw(p, scheme, effects, layout, now);

          if (shell.kind === HANDHELD) {
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
              `beat=${gate.beat} posted=${gate.posted} theirs=${theirs.some} held=[${session.held().join(",")}] dt=${Math.round(now - lastTick)} iv=${Math.round(Pace.gapFor(pace, scoreNow()))} hs=${hitstop} rs=${Math.round(p.millis() - resent)}`,
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

        const badgeFor = (who: Players.Id): Render.Badge => {
          const sitting = Players.at(state.world.players, who);

          if (!sitting.some) return Render.badge(Number(who), Geometry.RIGHT, Render.ALIVE);

          return Render.badge(
            Number(who),
            sitting.value.snake.facing,
            sitting.value.alive ? Render.ALIVE : Render.DEAD,
          );
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
            {
              here: standing.here,
              missing: standing.missing.map((who) => badgeFor(who)),
              verdict,
            },
            layout,
            shell.stage,
            shell.kind === HANDHELD ? Render.TOUCH : Render.KEYS,
          );
        };

        onFrame = () => {
          const now = Units.millis(p.millis());

          keepTalking();

          if (net.some) {
            const stage = net.value.stage();

            if (Session.isTrouble(stage)) {
              Render.drawTrouble(
                p,
                scheme,
                Fault.ofSession(stage),
                shell.kind === HANDHELD ? Render.TOUCH : Render.KEYS,
              );

              return;
            }
          }

          if (phase === Phase.READY) {
            drawReady(now);

            return;
          }

          if (Phase.isCounting(phase)) {
            drawCounting(phase.until, now);

            return;
          }

          if (Phase.isRewinding(phase)) {
            drawRewind(phase.playback, now);

            return;
          }

          if (Phase.isSettings(phase)) {
            paintWorld(now);
            Panel.draw(p, scheme, menuNow(), layout.blockWidth, phase.cursor);

            return;
          }

          if (phase === Phase.FROZEN) {
            paintWorld(now);

            return;
          }

          if (phase === Phase.HELP) {
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

        onResize = () => {
          p.pixelDensity(densityFor(p.windowWidth, p.windowHeight, p.displayDensity()));
          p.resizeCanvas(p.windowWidth, p.windowHeight);
          shell = shellFor(Units.viewport(p.windowWidth, p.windowHeight), settings.hand);
          layout = Layout.fit(board, shell.stage);
          surface = Surface.of(p, scheme, board, layout);
          effects = [];
          reshaping = wantsReshaping();
        };

        const press = (key: Input.Key, now: Units.Millis): void => {
          if (now < inputLockedUntil) return;

          if (Phase.isRewinding(phase)) {
            const asking = key.kind === Input.SKIP || key.kind === Input.OTHER;

            if (asking && net.some) net.value.askRematch();
            else if (asking) startRound(now);

            return;
          }

          const command = Input.commandFor(state, key, rulesNow());
          if (!command.some) return;

          if (net.some && command.value.kind === Game.TURN) {
            gate = Lockstep.pressed(gate, command.value.direction);

            return;
          }

          if (command.value.kind === Game.RESTART && net.some) return;

          if (command.value.kind === Game.RESTART && reshaping) {
            window.location.reload();

            return;
          }

          if (command.value.kind === Game.RESTART) {
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
          Menu.of(shell.stage, layout.blockWidth, settings, Menu.rowsFor(shell.kind === HANDHELD));

        const tapped = (at: Units.Point): void => {
          const now = Units.millis(p.millis());

          if (Phase.isSettings(phase)) {
            const menu = menuNow();
            const picked = Menu.hit(menu, at);

            if (picked.some) applySettings(Settings.chosen(settings, picked.value));
            else if (!Menu.covers(menu, at)) resume(now);

            return;
          }

          if (phase === Phase.READY) {
            fillScreen();

            if (shell.kind === HANDHELD) {
              const picked = Pad.hit(shell.pad, at);

              if (picked.some && picked.value === Pad.MENU) {
                phase = Phase.settings(0);

                return;
              }
            }

            if (net.some) net.value.declareReady();

            return;
          }

          if (shell.kind !== HANDHELD) return;

          const control = Pad.hit(shell.pad, at);

          if (control.some) {
            held = control;
            heldUntil = now + PRESS_FEEDBACK_MS;
          }

          if (control.some && control.value === Pad.MENU) {
            if (rulesNow().suspendable) phase = Phase.settings(0);

            return;
          }

          const key = control.some ? Pad.keyOf(control.value) : Option.some(Input.other);

          if (key.some) press(key.value, now);
        };

        const slid = (at: Units.Point): void => {
          if (shell.kind !== HANDHELD || phase !== Phase.LIVE) return;

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
            if (shell.kind !== HANDHELD && !Phase.isSettings(phase) && phase !== Phase.READY) {
              return;
            }

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

        onKey = () => {
          const now = Units.millis(p.millis());
          const key = Input.parseKey(p.key, Mode.controlsFor(mode));

          if (net.some && Session.isTrouble(net.value.stage())) {
            soloAgain();

            return;
          }

          const wanted = Intent.forKey(phase, key, rulesNow().suspendable);

          switch (wanted.kind) {
            case Intent.NOTHING:
              return;

            case Intent.READY_UP:
              if (net.some) net.value.declareReady();

              return;

            case Intent.OPEN_SETTINGS:
              phase = Phase.settings(0);

              return;

            case Intent.OPEN_HELP:
              phase = Phase.HELP;

              return;

            case Intent.RESUME:
              resume(now);

              return;

            case Intent.FREEZE:
              phase = Phase.FROZEN;

              return;

            case Intent.MOVE_CURSOR:
              if (Phase.isSettings(phase)) {
                phase = Phase.settings(Menu.nextCursor(menuNow(), phase.cursor, wanted.by));
              }

              return;

            case Intent.CYCLE_SETTING:
              if (Phase.isSettings(phase)) {
                applySettings(Menu.cycle(settings, Menu.rowAt(menuNow(), phase.cursor), wanted.by));
              }

              return;

            case Intent.PRESS:
              press(wanted.key, now);

              return;

            default:
              return Assert.never(wanted);
          }
        };
      });

      if (!started.ok) {
        const { error } = started;
        onFrame = () => Render.drawError(p, schemeFor(Settings.DEFAULT), error);
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

    onKey = () => {
      const key = Input.parseKey(p.key, Mode.controlsFor(mode));

      if (Session.isTrouble(lobby.stage())) {
        soloAgain();

        return;
      }

      if (key.kind === Input.SKIP) lobby.start();
      if (key.kind !== Input.TURN) return;

      if (key.direction === Geometry.LEFT) lobby.resize(-1);
      if (key.direction === Geometry.RIGHT) lobby.resize(1);
    };

    window.addEventListener("pointerdown", () => {
      if (Session.isTrouble(lobby.stage())) {
        soloAgain();

        return;
      }

      lobby.start();
    });

    onFrame = () => {
      const stage = lobby.stage();

      if (Session.isTrouble(stage)) {
        panel.hide();
        Render.drawTrouble(
          p,
          schemeFor(vault.read(Slots.SETTINGS)),
          Fault.ofSession(stage),
          touchFirst() ? Render.TOUCH : Render.KEYS,
        );

        return;
      }

      if (Session.isSeated(stage)) {
        panel.hide();
        boot(Board.size(stage.config.cols, stage.config.rows), stage.config.seed);

        return;
      }

      const waiting = lobby.lobby();

      Render.drawLobby(p, schemeFor(vault.read(Slots.SETTINGS)), {
        code: roomCode,
        role: lobby.role,
        prompt: touchFirst() ? Render.TOUCH : Render.KEYS,
        size: waiting.size,
        here: waiting.here,
      });
    };
  };
});
