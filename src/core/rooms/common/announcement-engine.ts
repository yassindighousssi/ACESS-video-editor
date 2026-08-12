import { AnnouncementLevel } from "../../model/types";

export interface Announcement {
  readonly id: string;
  readonly textAr: string;
  readonly textEn: string;
  readonly level: AnnouncementLevel;
  readonly source: string;
  readonly timestamp: number;
}

export type AnnouncementListener = (announcement: Announcement) => void;

const LEVEL_PRIORITY: Record<AnnouncementLevel, number> = {
  all: 0,
  important: 1,
  critical_only: 2,
};

export class AnnouncementEngine {
  private history: Announcement[] = [];
  private listeners: Set<AnnouncementListener> = new Set();
  private currentLevel: AnnouncementLevel = "all";
  private maxHistory: number = 500;

  setLevel(level: AnnouncementLevel): void {
    this.currentLevel = level;
  }

  getLevel(): AnnouncementLevel {
    return this.currentLevel;
  }

  speak(
    textAr: string,
    textEn: string,
    level: AnnouncementLevel = "all",
    source: string = "system",
  ): Announcement | undefined {
    const announcement: Announcement = {
      id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      textAr,
      textEn,
      level,
      source,
      timestamp: Date.now(),
    };
    this.history.push(announcement);
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.currentLevel]) {
      return undefined;
    }
    for (const listener of [...this.listeners]) {
      listener(announcement);
    }
    return announcement;
  }

  onAnnounce(listener: AnnouncementListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getHistory(level?: AnnouncementLevel): readonly Announcement[] {
    if (level === undefined) return [...this.history];
    return this.history.filter(a => a.level === level);
  }

  getLast(): Announcement | undefined {
    return this.history[this.history.length - 1];
  }

  clear(): void {
    this.history = [];
    this.listeners.clear();
    this.currentLevel = "all";
  }
}
