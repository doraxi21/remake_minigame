(function () {
  const defaultConfig = window.PipiContent?.pipiQuiz || {
    rounds: 5,
    mode: "image-to-word",
    guideText: "Chọn đáp án đúng",
    promptDelayMs: 350,
    nextDelayMs: 650,
    items: []
  };

  const modes = {
    "image-to-word": {
      promptLabel: "Đây là gì?",
      choiceField: "word",
      speech(item) {
        return `Hãy chọn từ đúng cho hình ${item.vi || item.word}.`;
      }
    },
    "vi-to-en": {
      promptLabel: "Chọn từ tiếng Anh:",
      promptField: "vi",
      choiceField: "word",
      speech(item) {
        return `Hãy chọn từ tiếng Anh của ${item.vi || item.word}.`;
      }
    },
    "en-to-vi": {
      promptLabel: "Chọn nghĩa tiếng Việt:",
      promptField: "word",
      choiceField: "vi",
      speech(item) {
        return `Hãy chọn nghĩa tiếng Việt của ${item.word}.`;
      }
    }
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function renderPrompt(item, mode) {
    if (mode === "image-to-word") {
      return `
        <div class="quiz-picture-prompt">
          ${renderItemVisual(item)}
          <span>${item.vi || item.word}</span>
        </div>
      `;
    }

    const meta = modes[mode] || modes["image-to-word"];
    return `<button class="prompt-word word-sound" data-target type="button">${item[meta.promptField] || item.word}</button>`;
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const mode = modes[data.mode] ? data.mode : "image-to-word";
    const modeMeta = modes[mode];
    const rounds = Math.min(Number(data.rounds) || 5, data.items.length);
    const targetQueue = PipiUtils.shuffle(data.items).slice(0, rounds);
    const session = PipiRuntime.createSession(context, { type: "pipiQuiz", id: data.id });
    const pipi = context.pipi;
    let round = 0;
    let score = 0;
    let target = null;
    let locked = false;
    let completed = false;
    let nextTimer = null;
    let promptTimer = null;

    root.className = "pipi-quiz";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Pipi Quiz</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds}</span></strong>
      </div>
      <div class="prompt quiz-prompt">
        <span class="prompt-label">${modeMeta.promptLabel}</span>
        <div data-prompt-target></div>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe câu hỏi">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="quiz-options" data-options></div>
      <div data-completion></div>
    `;

    const promptTargetNode = root.querySelector("[data-prompt-target]");
    const optionsNode = root.querySelector("[data-options]");
    const completionNode = root.querySelector("[data-completion]");
    const repeatButton = root.querySelector("[data-repeat]");
    pipi?.setSpecialEncouragement("");

    function clearTimers() {
      if (nextTimer) {
        window.clearTimeout(nextTimer);
        nextTimer = null;
      }

      if (promptTimer) {
        window.clearTimeout(promptTimer);
        promptTimer = null;
      }
    }

    function finish() {
      completed = true;
      locked = true;
      clearTimers();
      PipiAudio.stop();
      session.complete({ score, total: rounds, correct: score, wrong: rounds - score, passed: score >= rounds });
      pipi?.setState("win", `Hoàn thành rồi! Bé được ${score}/${rounds} điểm.`, "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành quiz rồi! Mình sang bài tiếp theo nào!");
      optionsNode.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });
      completionNode.innerHTML = `
        <div class="quiz-win">
          <strong>Hoàn thành!</strong>
          <span>Bé đã trả lời xong ${rounds} câu.</span>
          <button class="primary-btn" data-rematch type="button">Chơi lại</button>
        </div>
      `;
      completionNode.querySelector("[data-rematch]").addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });
    }

    function speakQuestion() {
      if (!target) return;
      if (mode === "image-to-word") {
        PipiAudio.speak(modeMeta.speech(target), { lang: "vi-VN", rate: 0.92 });
        return;
      }

      PipiAudio.speakWord(target, { withVietnamese: mode === "en-to-vi" });
    }

    function scheduleNext(delay) {
      if (nextTimer) {
        window.clearTimeout(nextTimer);
        nextTimer = null;
      }
      round += 1;
      nextTimer = window.setTimeout(nextRound, delay);
    }

    function showNextButton() {
      completionNode.innerHTML = `
        <div class="quiz-next-actions">
          <button class="primary-btn" data-next-round type="button">Tiếp</button>
        </div>
      `;
      completionNode.querySelector("[data-next-round]").addEventListener("click", () => {
        if (completed || !locked) return;
        PipiAudio.stop();
        scheduleNext(0);
      }, { once: true });
    }

    function nextRound() {
      clearTimers();
      PipiAudio.stop();
      locked = false;
      PipiUtils.hideTranslation(root);
      completionNode.innerHTML = "";

      if (round >= rounds) {
        finish();
        return;
      }

      target = targetQueue[round];
      const distractors = PipiUtils
        .shuffle(data.items.filter((item) => item.word !== target.word))
        .slice(0, Math.max(0, Math.min(4, data.items.length) - 1));
      const choices = PipiUtils.shuffle([target, ...distractors]);
      promptTargetNode.innerHTML = renderPrompt(target, mode);
      optionsNode.innerHTML = choices.map((item, index) => `
        <button class="quiz-option" data-word="${item.word}" style="--quiz-color:${["#29c46d", "#36aeea", "#ff9d35", "#8b6df6"][index % 4]}" type="button">
          <span>${item[modeMeta.choiceField] || item.word}</span>
        </button>
      `).join("");

      session.setState(session.states.PLAYING, { round: round + 1, score, total: rounds });
      pipi?.setState("hi", modeMeta.speech(target));
      promptTimer = window.setTimeout(speakQuestion, data.promptDelayMs ?? 350);
    }

    optionsNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-word]");
      if (!button || locked || completed) return;

      const item = data.items.find((entry) => entry.word === button.dataset.word);
      const correct = item.word === target.word;
      const audioToken = PipiAudio.stop();
      locked = true;
      clearTimers();
      PipiUtils.showTranslation(root, item);
      session.answer({ action: "choose", word: item.word, target: target.word, correct, score: correct ? score + 1 : score, total: rounds });

      if (correct) {
        button.classList.add("is-correct");
        score += 1;
        showNextButton();
        PipiUtils.setText(root, "[data-score]", score);
        session.score({ score, total: rounds });
        const correctFlow = pipi?.setState("happy", "Đúng rồi! Giỏi lắm.", "clapping");
        Promise.resolve(correctFlow).then(() => {
          if (!completed && PipiAudio.isCurrent(audioToken)) {
            return PipiAudio.speakWord(item, { withVietnamese: true });
          }
          return null;
        }).finally(() => {
          if (!completed && locked) scheduleNext(data.nextDelayMs ?? 650);
        });
        return;
      }

      button.classList.add("is-wrong");
      showNextButton();
      const correctButton = optionsNode.querySelector(`[data-word="${target.word}"]`);
      correctButton?.classList.add("is-correct");
      const wrongFlow = pipi?.wrong(`Chưa đúng rồi, đáp án là ${target.word}.`, "Hãy cố lên!");
      Promise.resolve(wrongFlow).then(() => {
        if (!completed && PipiAudio.isCurrent(audioToken)) {
          return PipiAudio.speakWord(target, { withVietnamese: true });
        }
        return null;
      }).finally(() => {
        if (!completed && locked) scheduleNext(data.nextDelayMs ?? 750);
      });
    });

    repeatButton.addEventListener("click", () => {
      PipiAudio.stop();
      speakQuestion();
    });

    promptTargetNode.addEventListener("click", (event) => {
      if (!event.target.closest("[data-target]")) return;
      PipiUtils.showTranslation(root, target);
      PipiAudio.speakWord(target, { withVietnamese: true });
    });

    session.start({ score: 0, total: rounds, mode });
    nextRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.pipiQuiz = { mount, defaultConfig };
})();
