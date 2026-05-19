export function createCompactionSnapshot({
  task,
  state = {},
  observations = [],
  trace = [],
  activePlan = null,
  activeGoal = null,
  approvals = [],
  artifacts = [],
  doNotRedo = [],
  loadedSkills = [],
  connectorState = []
} = {}) {
  if (!task?.id) {
    throw new TypeError("task.id is required");
  }

  return {
    type: "compaction_snapshot",
    taskId: task.id,
    objective: task.objective,
    createdAt: new Date().toISOString(),
    activePlan,
    activeGoal,
    approvals,
    artifacts,
    doNotRedo,
    loadedSkills,
    connectorState,
    state,
    observations: observations.map(toObservationSummary),
    traceSummary: summarizeTrace(trace)
  };
}

export function saveCompactionCheckpoint({ stateStore, snapshot }) {
  if (!stateStore?.addCheckpoint) {
    throw new TypeError("stateStore.addCheckpoint is required");
  }
  return stateStore.addCheckpoint({
    taskId: snapshot.taskId,
    kind: "compaction_snapshot",
    snapshot
  });
}

function toObservationSummary(observation) {
  return {
    status: observation.status,
    tool: observation.tool || null,
    reason: observation.reason || null,
    metadata: observation.metadata || {}
  };
}

function summarizeTrace(trace) {
  const events = Array.isArray(trace) ? trace : [];
  const lastEvent = events.at(-1) || null;
  return {
    eventCount: events.length,
    lastEventType: lastEvent?.type || null,
    lastEventId: lastEvent?.id || null
  };
}
