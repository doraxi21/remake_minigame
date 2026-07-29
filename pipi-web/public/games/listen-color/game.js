(function () {
  const defaultColors = [
    { id: "red", word: "red", vi: "màu đỏ", hex: "#ff5c68" },
    { id: "blue", word: "blue", vi: "màu xanh dương", hex: "#38a9ff" },
    { id: "yellow", word: "yellow", vi: "màu vàng", hex: "#ffd43b" },
    { id: "green", word: "green", vi: "màu xanh lá", hex: "#34c96b" },
    { id: "orange", word: "orange", vi: "màu cam", hex: "#ff9a35" },
    { id: "purple", word: "purple", vi: "màu tím", hex: "#9b6dff" }
  ];

  const defaultConfig = {
    rounds: 5,
    choiceCount: 4,
    guideText: "Nghe màu và tô đúng ô",
    promptPrefix: "Hãy tô màu:",
    promptDelayMs: 250,
    nextDelayMs: 520,
    nextText: "Tiếp",
    rematchText: "Chơi lại",
    colors: defaultColors
  };

  function normalizeColors(colors) {
    return (colors?.length ? colors : defaultColors)
      .map((color) => ({
        id: color.id || color.word,
        word: color.word || color.id,
        vi: color.vi || color.word || color.id,
        hex: color.hex || color.color || "#38a9ff"
      }))
      .filter((color) => color.word && color.hex);
  }

  function mount(root, config = {}, context = {}) {
    root.__listenColorCleanup?.();
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const colors = normalizeColors(data.colors);
    const rounds = Math.min(Number(data.rounds) || 5, colors.length);
    const queue = PipiUtils.shuffle(colors).slice(0, rounds);
    const session = PipiRuntime.createSession(context, { type: "listenColor", id: data.id });
    const pipi = context.pipi;
    let round = 0;
    let score = 0;
    let target = null;
    let locked = false;
    let completed = false;
    let nextTimer = null;
    let promptTimer = null;
    let transitionQueued = false;
    const filled = Array.from({ length: rounds }, () => null);

    root.className = "listen-color";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Listen & Color</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds}</span></strong>
      </div>
      <div class="prompt">
        <span class="prompt-label">${data.promptPrefix}</span>
        <button class="prompt-word word-sound" data-target type="button">...</button>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe lại màu">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <section class="color-stage">
        <div class="color-picture" data-picture></div>
        <div class="color-choices" data-choices></div>
      </section>
      <div class="color-actions" data-actions></div>
    `;

    const targetButton = root.querySelector("[data-target]");
    const repeatButton = root.querySelector("[data-repeat]");
    const pictureNode = root.querySelector("[data-picture]");
    const choicesNode = root.querySelector("[data-choices]");
    const actionsNode = root.querySelector("[data-actions]");

    function clearTimers() {
      if (nextTimer) {
        window.clearTimeout(nextTimer);
        nextTimer = null;
      }
      transitionQueued = false;
      if (promptTimer) {
        window.clearTimeout(promptTimer);
        promptTimer = null;
      }
    }

    function renderPicture() {
      pictureNode.innerHTML = filled.map((color, index) => `
        <div class="paint-shape ${index === round && !completed ? "is-current" : ""}" style="--paint:${color?.hex || "#ffffff"}">
          <span>${index + 1}</span>
        </div>
      `).join("");
    }

    function speakTarget() {
      if (!target) return;
      PipiAudio.stop();
      PipiAudio.speakWord(target, { withVietnamese: false, rate: 0.78 });
    }

    function renderChoices() {
      const distractors = PipiUtils.shuffle(colors.filter((color) => color.word !== target.word))
        .slice(0, Math.max(0, Math.min(data.choiceCount, colors.length) - 1));
      const choices = PipiUtils.shuffle([target, ...distractors]);
      choicesNode.innerHTML = choices.map((color) => `
        <button class="color-choice" data-color="${color.word}" style="--swatch:${color.hex}" type="button">
          <span class="swatch" aria-hidden="true"></span>
          <strong>${color.word}</strong>
          <small>${color.vi}</small>
        </button>
      `).join("");
    }

    function finish() {
      completed = true;
      locked = true;
      clearTimers();
      PipiAudio.stop();
      renderPicture();
      session.complete({ score, total: rounds, correct: score, wrong: rounds - score, passed: score >= rounds });
      pipi?.setState("win", `Tuyệt vời! Bé đã tô đúng ${score}/${rounds} màu.`, "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      actionsNode.innerHTML = `<button class="primary-btn" data-rematch type="button">${data.rematchText}</button>`;
      actionsNode.querySelector("[data-rematch]").addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });
    }

    function scheduleNext(delay = data.nextDelayMs ?? 520) {
      if (transitionQueued || completed) return;
      if (nextTimer) {
        window.clearTimeout(nextTimer);
        nextTimer = null;
      }
      if (promptTimer) {
        window.clearTimeout(promptTimer);
        promptTimer = null;
      }
      transitionQueued = true;
      nextTimer = window.setTimeout(() => {
        nextTimer = null;
        transitionQueued = false;
        round += 1;
        nextRound();
      }, delay);
    }

    function advanceNow() {
      if (completed) return;
      if (nextTimer) {
        window.clearTimeout(nextTimer);
        nextTimer = null;
      }
      transitionQueued = false;
      round += 1;
      nextRound();
    }

    function showNextButton() {
      actionsNode.innerHTML = `<button class="primary-btn" data-next type="button">${data.nextText}</button>`;
      actionsNode.querySelector("[data-next]").addEventListener("click", () => {
        if (!locked || completed) return;
        PipiAudio.stop();
        advanceNow();
      }, { once: true });
    }

    function retryRound() {
      if (completed || !target) return;
      PipiAudio.stop();
      clearTimers();
      transitionQueued = false;
      locked = false;
      actionsNode.innerHTML = "";
      PipiUtils.hideTranslation(root);
      root.querySelectorAll(".color-choice").forEach((choice) => {
        choice.classList.remove("is-correct", "is-wrong");
      });
      pipi?.setState("hi", `${data.promptPrefix} ${target.word}`);
      speakTarget();
    }

    function showRetryNextButtons() {
      actionsNode.innerHTML = `
        <button class="primary-btn retry-btn" data-retry type="button">Chọn lại</button>
        <button class="primary-btn" data-next type="button">${data.nextText}</button>
      `;
      actionsNode.querySelector("[data-retry]").addEventListener("click", retryRound);
      actionsNode.querySelector("[data-next]").addEventListener("click", () => {
        if (!locked || completed) return;
        PipiAudio.stop();
        advanceNow();
      }, { once: true });
    }

    function nextRound() {
      clearTimers();
      PipiAudio.stop();
      PipiUtils.hideTranslation(root);
      actionsNode.innerHTML = "";
      locked = false;

      if (round >= rounds) {
        finish();
        return;
      }

      target = queue[round];
      targetButton.textContent = target.word;
      targetButton.style.setProperty("--target-color", target.hex);
      renderPicture();
      renderChoices();
      session.setState(session.states.PLAYING, { round: round + 1, score, total: rounds, word: target.word });
      pipi?.setState("hi", `${data.promptPrefix} ${target.word}`);
      promptTimer = window.setTimeout(speakTarget, data.promptDelayMs ?? 250);
    }

    function chooseColor(button) {
      if (locked || completed || !target) return;
      const chosen = colors.find((color) => color.word === button.dataset.color);
      if (!chosen) return;
      const correct = chosen.word === target.word;
      const audioToken = PipiAudio.stop();
      locked = true;
      clearTimers();
      PipiUtils.showTranslation(root, chosen);
      session.answer({
        action: "choose-color",
        word: chosen.word,
        target: target.word,
        correct,
        score: correct ? score + 1 : score,
        total: rounds
      });

      if (correct) {
        filled[round] = target;
        score += 1;
        button.classList.add("is-correct");
        PipiUtils.setText(root, "[data-score]", score);
        session.score({ score, total: rounds });
        renderPicture();
        showNextButton();
        const flow = pipi?.setState("happy", "Đúng rồi! Màu đẹp quá.");
        Promise.resolve(flow).then(() => {
          if (!completed && PipiAudio.isCurrent(audioToken)) {
            return PipiAudio.speakWord(target, { withVietnamese: true });
          }
          return null;
        }).finally(() => {
          if (!completed && locked) scheduleNext();
        });
        return;
      }

      button.classList.add("is-wrong");
      root.querySelector(`[data-color="${target.word}"]`)?.classList.add("is-correct");
      showRetryNextButtons();
      const flow = pipi?.wrong("Chưa đúng rồi.", `Mình cần màu ${target.word} nhé!`);
      Promise.resolve(flow).then(() => {
        if (!completed && PipiAudio.isCurrent(audioToken)) {
          return PipiAudio.speakWord(target, { withVietnamese: true });
        }
        return null;
      });
    }

    choicesNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-color]");
      if (button) chooseColor(button);
    });

    repeatButton.addEventListener("click", speakTarget);
    targetButton.addEventListener("click", () => {
      if (!target) return;
      PipiUtils.showTranslation(root, target);
      PipiAudio.speakWord(target, { withVietnamese: true });
    });

    root.__listenColorCleanup = () => {
      clearTimers();
      PipiAudio.stop();
    };

    session.start({ score: 0, total: rounds });
    nextRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.listenColor = { mount, defaultConfig };
})();
