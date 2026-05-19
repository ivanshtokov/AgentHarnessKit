export function createTraceRecorder({ clock = () => new Date() } = {}) {
  const events = [];

  return {
    record(type, payload = {}) {
      const event = {
        ...payload,
        id: `evt_${String(events.length + 1).padStart(6, "0")}`,
        type,
        timestamp: clock().toISOString()
      };
      events.push(event);
      return event;
    },

    all() {
      return structuredClone(events);
    },

    clear() {
      events.length = 0;
    }
  };
}
