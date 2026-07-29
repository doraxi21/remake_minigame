(function () {
  const defaultConfig = {
    rounds: 4,
    guideText: "Look and build the word",
    checkText: "Check",
    nextText: "Next",
    backText: "Back",
    extraLetters: 0,
    showWordHint: false,
    promptDelayMs: 300,
    items: []
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function makeLetterBank(word, extraLetters = 0) {
    const letters = word.toLowerCase().split("");
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const extras = Array.from({ length: extraLetters }, () => alphabet[Math.floor(Math.random() * alphabet.length)]);
    return PipiUtils.shuffle([...letters, ...extras]).map((letter, index) => ({
      id: `${letter}-${index}-${Math.random().toString(16).slice(2)}`,
      letter,
      used: false
    }));
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "wordBuilder", id: data.id });
    const pipi = context.pipi;
    const rounds = PipiUtils.pickMany(data.items, Math.min(data.rounds, data.items.length));
    const roundStates = rounds.map((item) => ({
      item,
      letterBank: makeLetterBank(item.word, data.extraLetters),
      answer: [],
      solved: false
    }));
    let roundIndex = 0;
    let completed = false;
    let promptTimer = null;

    root.className = "word-builder";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Word Builder</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds.length}</span></strong>
      </div>
      <div class="prompt word-builder-prompt">
        <span class="prompt-label">${data.guideText}</span>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe từ">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="builder-stage">
        <button class="target-card" data-target-card type="button" aria-label="Nghe từ mục tiêu">
          <span data-target-visual></span>
          <span class="target-hint" data-target-hint></span>
        </button>
        <div class="answer-row" data-answer></div>
        <div class="letter-bank" data-letters></div>
      </div>
      <div class="builder-actions">
        <button class="nav-btn secondary" data-back type="button">${data.backText}</button>
        <button class="nav-btn secondary" data-clear type="button">Xóa</button>
        <button class="primary-btn" data-check type="button">${data.checkText}</button>
        <button class="nav-btn" data-next type="button">${data.nextText}</button>
        <button class="primary-btn rematch-btn" data-rematch type="button" hidden>Chơi lại</button>
      </div>
      <div data-completion></div>
    `;

    const targetVisualNode = root.querySelector("[data-target-visual]");
    const targetHintNode = root.querySelector("[data-target-hint]");
    const answerNode = root.querySelector("[data-answer]");
    const lettersNode = root.querySelector("[data-letters]");
    const repeatButton = root.querySelector("[data-repeat]");
    const targetCard = root.querySelector("[data-target-card]");
    const backButton = root.querySelector("[data-back]");
    const clearButton = root.querySelector("[data-clear]");
    const checkButton = root.querySelector("[data-check]");
    const nextButton = root.querySelector("[data-next]");
    const rematchButton = root.querySelector("[data-rematch]");
    const completionNode = root.querySelector("[data-completion]");
    pipi?.setSpecialEncouragement("");

    function getState() {
      return roundStates[roundIndex];
    }

    function getTarget() {
      return getState().item;
    }

    function getScore() {
      return roundStates.filter((state) => state.solved).length;
    }

    function clearPromptTimer() {
      if (!promptTimer) return;
      window.clearTimeout(promptTimer);
      promptTimer = null;
    }

    function updateScore() {
      const score = getScore();
      PipiUtils.setText(root, "[data-score]", score);
      session.score({ score, total: rounds.length });
    }

    function currentAnswer(state = getState()) {
      return state.answer.map((entry) => entry.letter).join("");
    }

    function renderAnswer() {
      const state = getState();
      const target = getTarget();
      answerNode.innerHTML = target.word.split("").map((_, index) => {
        const entry = state.answer[index];
        return `
          <button class="answer-slot ${entry ? "is-filled" : ""}" data-answer-index="${index}" type="button" aria-label="Ô chữ ${index + 1}">
            ${entry ? entry.letter : ""}
          </button>
        `;
      }).join("");
    }

    function renderLetters() {
      const state = getState();
      lettersNode.innerHTML = state.letterBank.map((entry) => `
        <button class="letter-tile" data-letter-id="${entry.id}" type="button" ${entry.used ? "disabled" : ""}>
          ${entry.letter}
        </button>
      `).join("");
    }

    function renderRound(options = {}) {
      const state = getState();
      const target = getTarget();
      root.classList.toggle("is-long-word", target.word.length >= 8);
      root.classList.toggle("is-very-long-word", target.word.length >= 9);
      root.classList.toggle("has-correct", state.solved);
      root.classList.remove("has-wrong");
      targetVisualNode.innerHTML = renderItemVisual(target);
      targetHintNode.textContent = data.showWordHint ? target.word : target.vi || "";
      backButton.disabled = roundIndex === 0;
      nextButton.disabled = roundIndex === rounds.length - 1;
      checkButton.disabled = completed;
      clearButton.disabled = completed;
      completionNode.innerHTML = "";
      renderAnswer();
      renderLetters();
      session.setState(session.states.PLAYING, {
        round: roundIndex + 1,
        total: rounds.length,
        word: target.word,
        solved: state.solved
      });

      if (options.speak !== false) {
        clearPromptTimer();
        PipiAudio.stop();
        promptTimer = window.setTimeout(() => {
          promptTimer = null;
          if (!completed) PipiAudio.speakWord(target);
        }, data.promptDelayMs);
      }

      pipi?.setState("hi", `Nhìn hình rồi ghép từ ${target.word}.`);
    }

    function speakAfterFeedback(feedbackFlow, target, options = {}) {
      const maxWait = options.maxWaitMs ?? 500;
      const audioToken = options.audioToken;
      return Promise.race([
        Promise.resolve(feedbackFlow),
        new Promise((resolve) => window.setTimeout(resolve, maxWait))
      ]).then(() => {
        if (!audioToken || PipiAudio.isCurrent(audioToken)) {
          return PipiAudio.speakWord(target, options.speakOptions || {});
        }
        return null;
      });
    }

    function maybeFinish() {
      const score = getScore();
      if (score !== rounds.length || completed) return;
      completed = true;
      clearPromptTimer();
      session.complete({ score, total: rounds.length, correct: score, passed: true });
      pipi?.setState("win", `Giỏi lắm! Bé đã ghép đúng ${score} từ.`, "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      rematchButton.hidden = false;
    }

    function markUnsolved(state = getState()) {
      if (!state.solved) return;
      state.solved = false;
      completed = false;
      checkButton.disabled = false;
      clearButton.disabled = false;
      rematchButton.hidden = true;
      completionNode.innerHTML = "";
      pipi?.setSpecialEncouragement("");
      updateScore();
      session.interaction({ action: "unsolve", word: state.item.word, score: getScore(), total: rounds.length });
    }

    function clearAnswer() {
      const state = getState();
      markUnsolved(state);
      state.answer = [];
      state.letterBank = state.letterBank.map((entry) => ({ ...entry, used: false }));
      root.classList.remove("has-correct", "has-wrong");
      renderAnswer();
      renderLetters();
    }

    function removeAnswerAt(index) {
      const state = getState();
      if (!state.answer[index]) return;
      markUnsolved(state);
      const entry = state.answer[index];
      state.answer.splice(index, 1);
      state.letterBank = state.letterBank.map((letter) => letter.id === entry.id ? { ...letter, used: false } : letter);
      root.classList.remove("has-correct", "has-wrong");
      renderAnswer();
      renderLetters();
    }

    function addLetter(letterId) {
      const state = getState();
      const target = getTarget();
      if (state.answer.length >= target.word.length) return;
      const entry = state.letterBank.find((letter) => letter.id === letterId);
      if (!entry || entry.used) return;

      markUnsolved(state);
      state.answer.push(entry);
      entry.used = true;
      root.classList.remove("has-correct", "has-wrong");
      session.interaction({ action: "pick-letter", letter: entry.letter, word: target.word });
      PipiAudio.speak(entry.letter, { lang: "en-US", rate: 0.72 });
      renderAnswer();
      renderLetters();
    }

    function checkAnswer() {
      const state = getState();
      const target = getTarget();
      if (completed && state.solved) return;

      const value = currentAnswer(state);
      const correct = value.length === target.word.length && value === target.word.toLowerCase();
      session.answer({ action: "check", answer: value, word: target.word, correct, score: correct && !state.solved ? getScore() + 1 : getScore(), total: rounds.length });

      if (correct) {
        const audioToken = PipiAudio.stop();
        state.solved = true;
        root.classList.remove("has-wrong");
        root.classList.add("has-correct");
        updateScore();
        PipiUtils.showTranslation(root, target);
        speakAfterFeedback(pipi?.setState("happy", "Đúng rồi! Pipi vỗ tay nè.", "clapping"), target, {
          audioToken,
          speakOptions: { withVietnamese: true }
        })
          .then(maybeFinish);
      } else {
        const audioToken = PipiAudio.stop();
        markUnsolved(state);
        root.classList.add("has-wrong");
        const wrongFlow = pipi?.wrong("Chưa đúng rồi, mình thử ghép lại nhé.", "Hãy cố lên!");
        speakAfterFeedback(wrongFlow, target, { audioToken });
      }
    }

    function go(delta) {
      const nextIndex = roundIndex + delta;
      if (nextIndex < 0 || nextIndex >= rounds.length) return;
      roundIndex = nextIndex;
      PipiUtils.hideTranslation(root);
      renderRound();
    }

    lettersNode.addEventListener("click", (event) => {
      const tile = event.target.closest("[data-letter-id]");
      if (tile) addLetter(tile.dataset.letterId);
    });

    answerNode.addEventListener("click", (event) => {
      const slot = event.target.closest("[data-answer-index]");
      if (slot) removeAnswerAt(Number(slot.dataset.answerIndex));
    });

    repeatButton.addEventListener("click", () => PipiAudio.speakWord(getTarget()));
    targetCard.addEventListener("click", () => {
      const target = getTarget();
      PipiUtils.showTranslation(root, target);
      PipiAudio.speakWord(target, { withVietnamese: true });
    });

    backButton.addEventListener("click", () => go(-1));
    nextButton.addEventListener("click", () => go(1));
    clearButton.addEventListener("click", clearAnswer);
    checkButton.addEventListener("click", checkAnswer);
    rematchButton.addEventListener("click", () => {
      PipiAudio.stop();
      mount(root, config, context);
    });

    session.start({ score: 0, total: rounds.length, rounds: rounds.length });
    updateScore();
    renderRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.wordBuilder = { mount, defaultConfig };
})();
