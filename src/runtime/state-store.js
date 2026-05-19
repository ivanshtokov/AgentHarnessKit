import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export function createMemoryStateStore(initialState = {}) {
  let state = normalizeState(initialState);

  return {
    getTask(taskId) {
      return clone(state.tasks[taskId] || null);
    },

    upsertTask(task) {
      state.tasks[task.id] = {
        ...(state.tasks[task.id] || {}),
        ...task,
        updatedAt: new Date().toISOString()
      };
      return clone(state.tasks[task.id]);
    },

    addArtifact(artifact) {
      const id = artifact.id || `art_${String(Object.keys(state.artifacts).length + 1).padStart(6, "0")}`;
      state.artifacts[id] = {
        id,
        createdAt: new Date().toISOString(),
        ...artifact
      };
      return clone(state.artifacts[id]);
    },

    addCheckpoint(checkpoint) {
      const saved = {
        id: checkpoint.id || `chk_${String(state.checkpoints.length + 1).padStart(6, "0")}`,
        createdAt: new Date().toISOString(),
        ...checkpoint
      };
      state.checkpoints.push(saved);
      return clone(saved);
    },

    listCheckpoints(taskId) {
      return clone(state.checkpoints.filter((checkpoint) => checkpoint.taskId === taskId));
    },

    approvals() {
      return createApprovalStore({
        read: () => state.approvals,
        write: (approvals) => {
          state = normalizeState({ ...state, approvals });
        }
      });
    },

    snapshot() {
      return clone(state);
    }
  };
}

export function createFileStateStore({ filePath }) {
  if (!filePath) {
    throw new Error("filePath is required");
  }

  function readState() {
    if (!fs.existsSync(filePath)) return normalizeState();
    return normalizeState(JSON.parse(fs.readFileSync(filePath, "utf8")));
  }

  function writeState(state) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(normalizeState(state), null, 2)}\n`);
  }

  return {
    getTask(taskId) {
      return clone(readState().tasks[taskId] || null);
    },

    upsertTask(task) {
      const state = readState();
      state.tasks[task.id] = {
        ...(state.tasks[task.id] || {}),
        ...task,
        updatedAt: new Date().toISOString()
      };
      writeState(state);
      return clone(state.tasks[task.id]);
    },

    addArtifact(artifact) {
      const state = readState();
      const id = artifact.id || `art_${String(Object.keys(state.artifacts).length + 1).padStart(6, "0")}`;
      state.artifacts[id] = {
        id,
        createdAt: new Date().toISOString(),
        ...artifact
      };
      writeState(state);
      return clone(state.artifacts[id]);
    },

    addCheckpoint(checkpoint) {
      const state = readState();
      const saved = {
        id: checkpoint.id || `chk_${String(state.checkpoints.length + 1).padStart(6, "0")}`,
        createdAt: new Date().toISOString(),
        ...checkpoint
      };
      state.checkpoints.push(saved);
      writeState(state);
      return clone(saved);
    },

    listCheckpoints(taskId) {
      return clone(readState().checkpoints.filter((checkpoint) => checkpoint.taskId === taskId));
    },

    approvals() {
      return createApprovalStore({
        read: () => readState().approvals,
        write: (approvals) => {
          const state = readState();
          state.approvals = approvals;
          writeState(state);
        }
      });
    },

    snapshot() {
      return clone(readState());
    }
  };
}

export function createMemoryApprovalStore(initialApprovals = []) {
  let approvals = [...initialApprovals];
  return createApprovalStore({
    read: () => approvals,
    write: (nextApprovals) => {
      approvals = nextApprovals;
    }
  });
}

export function createApprovalStore({ read, write }) {
  return {
    approve(record) {
      const approvals = read();
      const approval = normalizeApproval(record, approvals.length);
      write([...approvals, approval]);
      return clone(approval);
    },

    revoke(id, reason = "revoked") {
      const approvals = read();
      const nextApprovals = approvals.map((approval) =>
        approval.id === id
          ? { ...approval, status: "revoked", revokedAt: new Date().toISOString(), revokeReason: reason }
          : approval
      );
      write(nextApprovals);
    },

    findApproved({ toolName, riskClass, taskId, args }) {
      const argsHash = hashArgs(args);
      return clone(
        read().find(
          (approval) =>
            approval.status === "approved" &&
            approval.toolName === toolName &&
            approval.riskClass === riskClass &&
            approval.taskId === taskId &&
            !isExpired(approval) &&
            (!approval.argsHash || approval.argsHash === argsHash)
        ) || null
      );
    },

    all() {
      return clone(read());
    }
  };
}

export function hashArgs(args = {}) {
  return createHash("sha256").update(stableStringify(args)).digest("hex");
}

export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeState(state = {}) {
  return {
    tasks: state.tasks || {},
    approvals: state.approvals || [],
    artifacts: state.artifacts || {},
    checkpoints: state.checkpoints || []
  };
}

function normalizeApproval(record, index) {
  return {
    id: record.id || `apr_${String(index + 1).padStart(6, "0")}`,
    status: "approved",
    createdAt: new Date().toISOString(),
    argsHash: record.argsHash || hashArgs(record.args || {}),
    argsSnapshot: record.argsSnapshot || clone(record.args || {}),
    ...record
  };
}

function isExpired(approval) {
  return approval.expiresAt && new Date(approval.expiresAt).getTime() <= Date.now();
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
