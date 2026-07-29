(function () {
  const defaultConfig = {
    rounds: 4,
    guideText: "Listen and arrange the words",
    checkText: "Check",
    nextText: "Next",
    backText: "Back",
    clearText: "Xóa",
    promptDelayMs: 300,
    sentences: []
  };

  function normalizeSentence(entry, index) {
    if (typeof entry === "string") {
      return {
        id: `sentence-${index}`,
        text: entry,
        vi: "",
        parts: entry.trim().split(/\s+/)
      };
    }

    const text = entry.text || (entry.parts || []).join(" ");
    return {
      id: entry.id || `sentence-${index}`,
      text,
      vi: entry.vi || "",
      audioEn: entry.audioEn || entry.audio || "",
      audioVi: entry.audioVi || "",
      parts: entry.parts?.length ? entry.parts : text.trim().split(/\s+/)
    };
  }

  function makeTiles(parts) {
    return PipiUtils.shuffle(parts.map((part, index) => ({
      id: `${index}-${part}-${Math.random().toString(16).slice(2)}`,
      text: part,
      used: false
    })));
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "listenArrange", id: data.id });
    const pipi = context.pipi;
    const pool = (data.sentences || []).map(normalizeSentence);
    const rounds = PipiUtils.shuffle(pool).slice(0, Math.min(Number(data.rounds) || 4, pool.length));
    const roundStates = rounds.map((sentence) => ({
      sentence,
      tiles: makeTiles(sentence.parts),
      answer: [],
      solved: false
    }));
    let roundIndex = 0;
    let completed = false;
    let promptTimer = null;

    root.className = "listen-arrange";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Listen & Arrange</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds.length}</span></strong>
      </div>
      <div class="prompt arrange-prompt">
        <span class="prompt-label">${data.guideText}</span>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe câu">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="arrange-stage">
        <div class="sentence-card" data-sentence-card>
          <span class="sentence-vi" data-sentence-vi></span>
          <span class="sentence-hint">Nghe Pipi đọc rồi xếp đúng thứ tự.</span>
        </div>
        <div class="arrange-answer" data-answer></div>
        <div class="arrange-bank" data-bank></div>
      </div>
      <div class="arrange-actions">
        <button class="nav-btn secondary" data-back type="button">${data.backText}</button>
        <button class="nav-btn secondary" data-clear type="button">${data.clearText}</button>
        <button class="primary-btn" data-check type="button">${data.checkText}</button>
        <button class="nav-btn" data-next type="button">${data.nextText}</button>
        <button class="primary-btn rematch-btn" data-rematch type="button" hidden>Chơi lại</button>
      </div>
    `;

    const sentenceViNode = root.querySelector("[data-sentence-vi]");
    const answerNode = root.querySelector("[data-answer]");
    const bankNode = root.querySelector("[data-bank]");
    const repeatButton = root.querySelector("[data-repeat]");
    const sentenceCard = root.querySelector("[data-sentence-card]");
    const backButton = root.querySelector("[data-back]");
    const clearButton = root.querySelector("[data-clear]");
    const checkButton = root.querySelector("[data-check]");
    const nextButton = root.querySelector("[data-next]");
    const rematchButton = root.querySelector("[data-rematch]");
    pipi?.setSpecialEncouragement("");

    function getState() {
      return roundStates[roundIndex];
    }

    function getSentence() {
      return getState().sentence;
    }

    function getScore() {
      return roundStates.filter((state) => state.solved).length;
    }

    function clearPromptTimer() {
      if (!promptTimer) return;
      window.clearTimeout(promptTimer);
      promptTimer = null;
    }

    function speakSentence(sentence = getSentence(), withVietnamese = false) {
      PipiAudio.stop();
      if (sentence.audioEn) {
        return PipiAudio.playEffect(sentence.audioEn, { volume: 0.95 }).then(() => {
          if (withVietnamese && sentence.vi) return PipiAudio.speak(sentence.vi, { lang: "vi-VN", rate: 0.9 });
          return null;
        });
      }

      return PipiAudio.speak(sentence.text, { lang: "en-US", rate: 0.76 }).then(() => {
        if (withVietnamese && sentence.vi) return PipiAudio.speak(sentence.vi, { lang: "vi-VN", rate: 0.9 });
        return null;
      });
    }

    function updateScore() {
      const score = getScore();
      PipiUtils.setText(root, "[data-score]", score);
      session.score({ score, total: rounds.length });
    }

    function currentAnswer(state = getState()) {
      return state.answer.map((tile) => tile.text).join(" ");
    }

    function renderAnswer() {
      const state = getState();
      answerNode.innerHTML = state.sentence.parts.map((_, index) => {
        const tile = state.answer[index];
        return `
          <button class="arrange-slot ${tile ? "is-filled" : ""}" data-answer-index="${index}" type="button">
            ${tile ? tile.text : ""}
          </button>
        `;
      }).join("");
    }

    function renderBank() {
      const state = getState();
      bankNode.innerHTML = state.tiles.map((tile, index) => `
        <button class="arrange-tile" data-tile-id="${tile.id}" style="--tile-color:${["#29c46d", "#42b6f5", "#ff9f3f", "#8b73f6", "#ff72a6", "#24c7c7"][index % 6]}" type="button" ${tile.used ? "disabled" : ""}>
          ${tile.text}
        </button>
      `).join("");
    }

    function renderRound(options = {}) {
      const state = getState();
      const sentence = getSentence();
      root.classList.toggle("has-correct", state.solved);
      root.classList.remove("has-wrong");
      sentenceViNode.textContent = sentence.vi || "Sắp xếp thành câu đúng.";
      backButton.disabled = roundIndex === 0;
      nextButton.disabled = roundIndex === rounds.length - 1;
      checkButton.disabled = completed;
      clearButton.disabled = completed;
      renderAnswer();
      renderBank();
      session.setState(session.states.PLAYING, {
        round: roundIndex + 1,
        total: rounds.length,
        sentence: sentence.text,
        solved: state.solved
      });

      clearPromptTimer();
      if (options.speak !== false) {
        PipiAudio.stop();
        promptTimer = window.setTimeout(() => {
          promptTimer = null;
          if (!completed) speakSentence(sentence);
        }, data.promptDelayMs);
      }

      pipi?.setState("hi", "Nghe rồi xếp các từ theo đúng thứ tự nhé.");
    }

    function markUnsolved(state = getState()) {
      if (!state.solved) return;
      state.solved = false;
      completed = false;
      checkButton.disabled = false;
      clearButton.disabled = false;
      rematchButton.hidden = true;
      pipi?.setSpecialEncouragement("");
      updateScore();
      session.interaction({ action: "unsolve", sentence: state.sentence.text, score: getScore(), total: rounds.length });
    }

    function clearAnswer() {
      const state = getState();
      markUnsolved(state);
      state.answer = [];
      state.tiles = state.tiles.map((tile) => ({ ...tile, used: false }));
      root.classList.remove("has-correct", "has-wrong");
      renderAnswer();
      renderBank();
    }

    function addTile(tileId) {
      const state = getState();
      if (state.answer.length >= state.sentence.parts.length) return;
      const tile = state.tiles.find((entry) => entry.id === tileId);
      if (!tile || tile.used) return;

      markUnsolved(state);
      tile.used = true;
      state.answer.push(tile);
      root.classList.remove("has-correct", "has-wrong");
      session.interaction({ action: "pick-word", word: tile.text, sentence: state.sentence.text });
      PipiAudio.speak(tile.text, { lang: "en-US", rate: 0.78 });
      renderAnswer();
      renderBank();
    }

    function removeAnswerAt(index) {
      const state = getState();
      const tile = state.answer[index];
      if (!tile) return;

      markUnsolved(state);
      state.answer.splice(index, 1);
      state.tiles = state.tiles.map((entry) => entry.id === tile.id ? { ...entry, used: false } : entry);
      root.classList.remove("has-correct", "has-wrong");
      renderAnswer();
      renderBank();
    }

    function maybeFinish() {
      const score = getScore();
      if (score !== rounds.length || completed) return;
      completed = true;
      clearPromptTimer();
      PipiAudio.stop();
      session.complete({ score, total: rounds.length, correct: score, passed: true });
      pipi?.setState("win", `Giỏi lắm! Bé đã xếp đúng ${score} câu.`, "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      rematchButton.hidden = false;
      checkButton.disabled = true;
      clearButton.disabled = true;
    }

    function checkAnswer() {
      const state = getState();
      const sentence = getSentence();
      if (completed && state.solved) return;

      const answer = currentAnswer(state);
      const correct = answer === sentence.parts.join(" ");
      session.answer({
        action: "check",
        answer,
        target: sentence.text,
        correct,
        score: correct && !state.solved ? getScore() + 1 : getScore(),
        total: rounds.length
      });

      if (correct) {
        const audioToken = PipiAudio.stop();
        state.solved = true;
        root.classList.remove("has-wrong");
        root.classList.add("has-correct");
        updateScore();
        PipiUtils.showTranslation(root, { word: sentence.text, vi: sentence.vi });
        Promise.resolve(pipi?.setState("happy", "Đúng rồi! Pipi vỗ tay nè.", "clapping"))
          .then(() => {
            if (PipiAudio.isCurrent(audioToken)) return speakSentence(sentence, true);
            return null;
          })
          .then(maybeFinish);
        return;
      }

      const audioToken = PipiAudio.stop();
      root.classList.add("has-wrong");
      Promise.resolve(pipi?.wrong("Chưa đúng thứ tự rồi.", "Mình nghe lại và thử nhé!"))
        .then(() => {
          if (PipiAudio.isCurrent(audioToken)) return speakSentence(sentence);
          return null;
        });
    }

    bankNode.addEventListener("click", (event) => {
      const tile = event.target.closest("[data-tile-id]");
      if (tile) addTile(tile.dataset.tileId);
    });

    answerNode.addEventListener("click", (event) => {
      const slot = event.target.closest("[data-answer-index]");
      if (slot) removeAnswerAt(Number(slot.dataset.answerIndex));
    });

    repeatButton.addEventListener("click", () => speakSentence());
    sentenceCard.addEventListener("click", () => {
      const sentence = getSentence();
      PipiUtils.showTranslation(root, { word: sentence.text, vi: sentence.vi });
      speakSentence(sentence, true);
    });

    backButton.addEventListener("click", () => {
      if (roundIndex <= 0) return;
      roundIndex -= 1;
      renderRound();
    });

    nextButton.addEventListener("click", () => {
      if (roundIndex >= rounds.length - 1) return;
      roundIndex += 1;
      renderRound();
    });

    clearButton.addEventListener("click", clearAnswer);
    checkButton.addEventListener("click", checkAnswer);
    rematchButton.addEventListener("click", () => {
      PipiAudio.stop();
      mount(root, config, context);
    });

    session.start({ score: 0, total: rounds.length, rounds: rounds.length });
    renderRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.listenArrange = { mount, defaultConfig };
})();
