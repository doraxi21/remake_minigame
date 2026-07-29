(function () {
  const baseConfig = {
    rounds: 5,
    choiceCount: 4,
    guideText: "Nghe và chọn đường đúng",
    promptPrefix: "Hãy chọn đường tới:",
    promptField: "vi",
    nextText: "Tiếp",
    rematchText: "Chơi lại",
    promptDelayMs: 350,
    nextDelayMs: 700,
    items: []
  };

  const defaultConfig = {
    ...baseConfig,
    ...(window.PipiContent?.listenChoosePath || {})
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function makeChoices(items, target, count) {
    const distractors = PipiUtils
      .shuffle(items.filter((item) => item.word !== target.word))
      .slice(0, Math.max(0, count - 1));

    return PipiUtils.shuffle([target, ...distractors]);
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    data.nextText = data.nextText || baseConfig.nextText;
    data.rematchText = data.rematchText || baseConfig.rematchText;
    const rounds = PipiUtils.shuffle(data.items || []).slice(0, Math.min(Number(data.rounds) || 5, data.items.length));
    const session = PipiRuntime.createSession(context, { type: "listenChoosePath", id: data.id });
    const pipi = context.pipi;
    let roundIndex = 0;
    let score = 0;
    let target = null;
    const stepResults = Array.from({ length: rounds.length }, () => "");
    let locked = false;
    let completed = false;
    let promptTimer = null;
    let nextTimer = null;

    root.className = "listen-choose-path";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Listen & Choose Path</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds.length}</span></strong>
      </div>
      <div class="prompt path-prompt">
        <span class="prompt-label">${data.promptPrefix}</span>
        <button class="prompt-word word-sound" data-target type="button">...</button>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe lại">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="path-stage">
        <div class="path-track" data-track></div>
        <div class="path-options" data-options></div>
      </div>
      <div class="path-actions" data-actions></div>
    `;

    const targetButton = root.querySelector("[data-target]");
    const repeatButton = root.querySelector("[data-repeat]");
    const trackNode = root.querySelector("[data-track]");
    const optionsNode = root.querySelector("[data-options]");
    const actionsNode = root.querySelector("[data-actions]");
    pipi?.setSpecialEncouragement("");

    function clearTimers() {
      if (promptTimer) {
        window.clearTimeout(promptTimer);
        promptTimer = null;
      }

      if (nextTimer) {
        window.clearTimeout(nextTimer);
        nextTimer = null;
      }
    }

    function speakTarget(withVietnamese = false) {
      if (!target) return;
      PipiAudio.speakWord(target, { withVietnamese });
    }

    function renderTrack() {
      const currentStep = Math.min(roundIndex, Math.max(0, rounds.length - 1));
      trackNode.innerHTML = rounds.map((item, index) => `
        <div class="path-step ${stepResults[index] === "correct" ? "is-done" : ""} ${stepResults[index] === "wrong" ? "is-wrong" : ""} ${index === currentStep ? "is-current" : ""}">
          <span>${index + 1}</span>
        </div>
      `).join("");
    }

    function renderChoices() {
      const choices = makeChoices(data.items || [], target, Number(data.choiceCount) || 4);
      optionsNode.innerHTML = choices.map((item, index) => `
        <button class="path-choice" data-word="${item.word}" style="--path-color:${["#2ac87a", "#42b6f5", "#ff9f3f", "#8b73f6"][index % 4]}" type="button">
          ${renderItemVisual(item)}
          <span>${item.word}</span>
        </button>
      `).join("");
    }

    function showNextButton() {
      actionsNode.innerHTML = `
        <button class="primary-btn" data-next-round type="button">${data.nextText}</button>
      `;
      actionsNode.querySelector("[data-next-round]").addEventListener("click", () => {
        if (completed || !locked) return;
        nextRound();
      }, { once: true });
    }

    function finish() {
      completed = true;
      locked = true;
      clearTimers();
      PipiAudio.stop();
      const passed = score >= rounds.length;
      session.complete({ score, total: rounds.length, correct: score, wrong: rounds.length - score, passed });
      optionsNode.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });
      renderTrack();

      if (passed) {
        pipi?.setState("win", `Tuyệt vời! Bé đã đi đúng ${score}/${rounds.length} bước.`, "jumping");
        pipi?.setSpecialEncouragement("Bạn đã hoàn thành đường đi rồi! Mình sang bài tiếp theo nào!");
        actionsNode.innerHTML = `
          <button class="primary-btn rematch-btn" data-rematch type="button">${data.rematchText}</button>
        `;
      } else {
        pipi?.wrong("Lỡ thua rồi, hãy thử lại.", "Mình thử lại nhé!");
        pipi?.setSpecialEncouragement("Lỡ thua rồi, hãy thử lại.");
        actionsNode.innerHTML = `
          <div class="path-result is-failed">Lỡ thua rồi, hãy thử lại</div>
          <button class="primary-btn rematch-btn" data-rematch type="button">${data.rematchText}</button>
        `;
      }

      actionsNode.querySelector("[data-rematch]").addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });
    }

    function startRound() {
      clearTimers();
      PipiAudio.stop();
      locked = false;
      PipiUtils.hideTranslation(root);
      actionsNode.innerHTML = "";

      if (roundIndex >= rounds.length) {
        finish();
        return;
      }

      target = rounds[roundIndex];
      targetButton.textContent = target[data.promptField] || target.word;
      renderTrack();
      renderChoices();
      session.setState(session.states.PLAYING, { round: roundIndex + 1, score, total: rounds.length, word: target.word });
      pipi?.setState("hi", `${data.promptPrefix} ${target[data.promptField] || target.word}`);
      promptTimer = window.setTimeout(() => {
        promptTimer = null;
        if (!completed && !locked) speakTarget(false);
      }, data.promptDelayMs);
    }

    function nextRound() {
      roundIndex += 1;
      startRound();
    }

    function answer(item, card) {
      if (locked || completed) return;
      const correct = item.word === target.word;
      const audioToken = PipiAudio.stop();
      locked = true;
      clearTimers();
      PipiUtils.showTranslation(root, item);
      card.classList.add(correct ? "is-correct" : "is-wrong");
      stepResults[roundIndex] = correct ? "correct" : "wrong";

      if (correct) {
        score += 1;
        PipiUtils.setText(root, "[data-score]", score);
        session.score({ score, total: rounds.length });
      } else {
        const targetCard = optionsNode.querySelector(`[data-word="${target.word}"]`);
        targetCard?.classList.add("is-answer");
      }

      renderTrack();

      optionsNode.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });

      session.answer({
        action: "choose-path",
        word: item.word,
        target: target.word,
        correct,
        score,
        total: rounds.length
      });

      showNextButton();

      const feedback = correct
        ? pipi?.setState("happy", "Đúng rồi! Pipi đi thêm một bước.", "clapping")
        : pipi?.wrong(`Chưa đúng rồi, đường đúng là ${target.word}.`, "Mình thử bước tiếp nhé!");

      Promise.resolve(feedback).then(() => {
        if (!PipiAudio.isCurrent(audioToken)) return null;
        return PipiAudio.speakWord(correct ? item : target, { withVietnamese: true });
      }).finally(() => {
        if (!completed && locked) nextTimer = window.setTimeout(nextRound, data.nextDelayMs);
      });
    }

    optionsNode.addEventListener("click", (event) => {
      const card = event.target.closest("[data-word]");
      if (!card || locked || completed) return;
      const item = (data.items || []).find((entry) => entry.word === card.dataset.word);
      answer(item, card);
    });

    repeatButton.addEventListener("click", () => speakTarget(false));
    targetButton.addEventListener("click", () => {
      if (!target) return;
      PipiUtils.showTranslation(root, target);
      speakTarget(true);
    });

    session.start({ score: 0, total: rounds.length, rounds: rounds.length });
    startRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.listenChoosePath = { mount, defaultConfig };
})();
