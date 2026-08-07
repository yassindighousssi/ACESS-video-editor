const MODIFIER_ORDER = ["ctrl", "alt", "shift", "meta"] as const;
type Modifier = (typeof MODIFIER_ORDER)[number];

const MODIFIER_ALIASES: Record<string, Modifier> = {
  ctrl: "ctrl",
  control: "ctrl",
  "control-key": "ctrl",
  alt: "alt",
  option: "alt",
  opt: "alt",
  shift: "shift",
  meta: "meta",
  cmd: "meta",
  command: "meta",
  win: "meta",
  window: "meta",
  super: "meta",
};

export interface KeyboardEventLike {
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly key: string;
}

function isModifier(token: string): token is Modifier {
  return MODIFIER_ORDER.includes(token as Modifier);
}

export class ShortcutEngine {
  static normalize(shortcut: string): string {
    const tokens = shortcut.trim().toLowerCase().split("+").map(t => t.trim()).filter(t => t.length > 0);
    const modifiers = tokens.filter(t => MODIFIER_ALIASES[t] !== undefined).map(t => MODIFIER_ALIASES[t]);
    const key = tokens.find(t => MODIFIER_ALIASES[t] === undefined);
    if (key === undefined) return "";
    const ordered = MODIFIER_ORDER.filter(m => modifiers.includes(m));
    return [...ordered, key].join("+");
  }

  static parse(shortcut: string): { readonly modifiers: readonly string[]; readonly key: string } {
    const normalized = ShortcutEngine.normalize(shortcut);
    const parts = normalized.split("+");
    const key = parts[parts.length - 1] ?? "";
    const modifiers = parts.slice(0, -1).filter(isModifier);
    return { modifiers, key };
  }

  static format(shortcut: string): string {
    const normalized = ShortcutEngine.normalize(shortcut);
    if (normalized.length === 0) return "";
    return normalized.split("+")
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join("+");
  }

  static isValid(shortcut: string): boolean {
    return ShortcutEngine.normalize(shortcut).length > 0;
  }

  static matches(event: KeyboardEventLike, shortcut: string): boolean {
    const parsed = ShortcutEngine.parse(shortcut);
    if (parsed.key.length === 0) return false;
    const eventModifiers: Modifier[] = [];
    if (event.ctrlKey) eventModifiers.push("ctrl");
    if (event.altKey) eventModifiers.push("alt");
    if (event.shiftKey) eventModifiers.push("shift");
    if (event.metaKey) eventModifiers.push("meta");
    if (parsed.modifiers.length !== eventModifiers.length) return false;
    for (let i = 0; i < parsed.modifiers.length; i++) {
      if (parsed.modifiers[i] !== eventModifiers[i]) return false;
    }
    return event.key.toLowerCase() === parsed.key;
  }
}
