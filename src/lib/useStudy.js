import { useEffect, useRef, useState } from "react";
import { backend, configured } from "./backend";
const storageKey = configured ? "pp-study-live-v2" : "pp-study-demo-v2";
function restore() {
  try {
    const draft = JSON.parse(sessionStorage.getItem(storageKey));
    const s = draft?.study;
    if (
      s?.id &&
      s.consent === true &&
      s.owner_id &&
      s.tasks?.length === 3 &&
      Array.isArray(s.events) &&
      Number.isInteger(draft.revision)
    )
      return draft;
  } catch {
    /* Invalid or unavailable drafts do not prevent a new participation. */
  }
  return { study: null, revision: 0 };
}
export function useStudy() {
  const [initial] = useState(restore);
  const [study, setStudy] = useState(initial.study);
  const [saveState, setSaveState] = useState("idle");
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const [conflict, setConflict] = useState(false);
  const [retry, setRetry] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);
  const queue = useRef(Promise.resolve());
  const revision = useRef(initial.revision);
  const pending = useRef(initial.pending || null);
  const latest = useRef(study);
  const conflicted = useRef(false);
  latest.current = study;
  function storeDraft(snapshot) {
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          study: snapshot,
          revision: revision.current,
          pending: pending.current,
        }),
      );
    } catch {
      setStorageWarning(true);
    }
  }
  useEffect(() => {
    if (!study) return;
    storeDraft(study);
    if (!configured) {
      setSaveState("demo");
      return;
    }
    let stale = false;
    setSaveState("saving");
    // Serialize writes and carry the server revision. A stale tab cannot overwrite newer data.
    queue.current = queue.current
      .catch(() => {})
      .then(async () => {
        if (conflicted.current) throw new Error("conflict");
        try {
          const flushPending = async () => {
            revision.current = await backend.save(
              pending.current,
              revision.current,
            );
            pending.current = null;
            if (latest.current) storeDraft(latest.current);
          };
          // Retry the exact unacknowledged write before newer changes. The server
          // may have committed it even when its response never reached this tab.
          if (pending.current) {
            const previous = pending.current;
            await flushPending();
            if (JSON.stringify(previous) === JSON.stringify(study)) return;
          }
          pending.current = study;
          if (latest.current) storeDraft(latest.current);
          await flushPending();
        } catch (error) {
          if (error.code === "40001") {
            conflicted.current = true;
            setConflict(true);
          }
          throw error;
        }
      });
    queue.current.then(
      () => {
        if (!stale) {
          setSavedSnapshot(study);
          setSaveState("saved");
        }
      },
      () => {
        if (!stale) setSaveState("error");
      },
    );
    return () => {
      stale = true;
    };
  }, [study, retry]);
  const visibleSaveState =
    configured && study && savedSnapshot !== study && saveState === "saved"
      ? "saving"
      : saveState;
  useEffect(() => {
    if (!configured || !study || visibleSaveState === "saved") return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [study, visibleSaveState]);
  async function reset() {
    await queue.current.catch(() => {});
    await backend.end();
    sessionStorage.removeItem(storageKey);
    revision.current = 0;
    pending.current = null;
    conflicted.current = false;
    setConflict(false);
    setStudy(null);
    setSaveState("idle");
    setSavedSnapshot(null);
  }
  return {
    study,
    setStudy,
    saveState: visibleSaveState,
    conflict,
    storageWarning,
    retrySave: () => setRetry((n) => n + 1),
    reset,
  };
}
