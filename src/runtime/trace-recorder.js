export function createTraceRecorder({ clock = () => new Date(), exporters = [] } = {}) {
  const events = [];
  const sinks = Array.isArray(exporters) ? exporters : [exporters];

  return {
    record(type, payload = {}) {
      const event = {
        ...payload,
        id: `evt_${String(events.length + 1).padStart(6, "0")}`,
        type,
        timestamp: clock().toISOString()
      };
      events.push(event);
      for (const exporter of sinks) {
        exporter?.record?.(structuredClone(event));
      }
      return event;
    },

    all() {
      return structuredClone(events);
    },

    exportTo(exporter) {
      for (const event of events) {
        exporter.record(structuredClone(event));
      }
    },

    clear() {
      events.length = 0;
    }
  };
}
