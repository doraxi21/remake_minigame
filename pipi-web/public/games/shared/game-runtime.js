(function () {
  const STATES = {
    IDLE: "idle",
    PLAYING: "playing",
    CHECKING: "checking",
    COMPLETED: "completed",
    REVIEW: "review"
  };

  function createSession(context = {}, meta = {}) {
    let state = STATES.IDLE;
    let score = 0;
    let total = 0;
    const gameId = meta.id || meta.type || "game";

    function base(payload = {}) {
      return {
        gameId,
        type: meta.type,
        state,
        ...payload
      };
    }

    function emitState(nextState, payload = {}) {
      state = nextState;
      context.onStateChange?.(base(payload));
    }

    function start(payload = {}) {
      score = payload.score ?? score;
      total = payload.total ?? total;
      emitState(STATES.PLAYING, { score, total, ...payload });
      context.onStart?.(base({ score, total, ...payload }));
    }

    function emitScore(payload = {}) {
      score = payload.score ?? score;
      total = payload.total ?? total;
      context.onScoreChange?.(base({ score, total, ...payload }));
    }

    function emitInteraction(payload = {}) {
      context.onInteraction?.(base(payload));
    }

    function answer(payload = {}) {
      emitInteraction({ action: "answer", ...payload });
      context.onAnswer?.(base({
        score,
        total,
        correct: Boolean(payload.correct),
        ...payload
      }));
    }

    function complete(payload = {}) {
      score = payload.score ?? score;
      total = payload.total ?? total;
      const correct = payload.correct ?? score;
      const wrong = payload.wrong ?? Math.max(0, total - correct);
      const result = {
        score,
        total,
        correct,
        wrong,
        passed: payload.passed ?? score >= total,
        status: "completed",
        ...payload
      };
      emitState(STATES.COMPLETED, result);
      context.onComplete?.(base({ state: STATES.COMPLETED, ...result }));
    }

    return {
      getState: () => state,
      start,
      setState: emitState,
      score: emitScore,
      interaction: emitInteraction,
      answer,
      complete,
      states: STATES
    };
  }

  function mergeConfig(defaultConfig, config) {
    return { ...defaultConfig, ...config };
  }

  window.PipiRuntime = {
    STATES,
    createSession,
    mergeConfig
  };
})();
