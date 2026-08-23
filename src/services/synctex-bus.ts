export type SyncTexEvent = {
  forwardSearch: { line: number };
  inverseSearch: { line: number };
};

class SyncTexBus {
  private listeners: { [K in keyof SyncTexEvent]?: Array<(payload: SyncTexEvent[K]) => void> } = {};

  on<K extends keyof SyncTexEvent>(event: K, callback: (payload: SyncTexEvent[K]) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event]!.push(callback);
    return () => this.off(event, callback);
  }

  off<K extends keyof SyncTexEvent>(event: K, callback: (payload: SyncTexEvent[K]) => void) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event]!.filter(cb => cb !== callback);
  }

  emit<K extends keyof SyncTexEvent>(event: K, payload: SyncTexEvent[K]) {
    if (!this.listeners[event]) return;
    this.listeners[event]!.forEach(cb => cb(payload));
  }
}

export const synctexBus = new SyncTexBus();
