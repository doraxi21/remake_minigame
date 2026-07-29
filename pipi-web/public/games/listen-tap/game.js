(function () {
  const defaultConfig = window.PipiContent?.listenTap || {
    rounds: 5,
    mode: "vi-to-en",
    promptField: "vi",
    choiceField: "word",
    promptPrefix: "Hãy chọn hình/từ:",
    promptDelayMs: 350,
    nextDelayMs: 650,
    items: []
  };

  const modes = {
    "vi-to-en": {
      label: "Tiếng Việt",
      description: "Hiện nghĩa tiếng Việt, chọn từ tiếng Anh.",
      promptField: "vi",
      choiceField: "word",
      promptPrefix: "Hãy chọn hình/từ:",
      speechPrefix: "Hãy nghe và chọn:"
    },
    "en-to-vi": {
      label: "Tiếng Anh",
      description: "Hiện từ tiếng Anh, chọn nghĩa tiếng Việt.",
      promptField: "word",
      choiceField: "vi",
      promptPrefix: "Hãy chọn nghĩa:",
      speechPrefix: "Hãy nghe và chọn nghĩa của:"
    }
  };

  function applyMode(config) {
    const hasKnownMode = Boolean(modes[config.mode]);
    const selectedMode = modes[config.mode] || modes["vi-to-en"];

    return {
      ...config,
      mode: config.mode || "vi-to-en",
      promptField: hasKnownMode ? selectedMode.promptField : config.promptField || selectedMode.promptField,
      choiceField: hasKnownMode ? selectedMode.choiceField : config.choiceField || selectedMode.choiceField,
      promptPrefix: hasKnownMode ? selectedMode.promptPrefix : config.promptPrefix || selectedMode.promptPrefix,
      speechPrefix: hasKnownMode ? selectedMode.speechPrefix : config.speechPrefix || selectedMode.speechPrefix
    };
  }

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function renderModePicker(root, config, context) {
    root.className = "listen-tap listen-mode-picker";
    root.innerHTML = `
      <div class="mode-picker-panel">
        <p class="eyebrow">Listen & Tap</p>
        <h2>Chọn cách chơi</h2>
        <div class="mode-options">
          ${Object.entries(modes).map(([mode, meta]) => `
            <button class="mode-card" data-mode="${mode}" type="button">
              <span>${meta.label}</span>
              <small>${meta.description}</small>
            </button>
          `).join("")}
        </div>
      </div>
    `;

    root.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        mount(root, { ...config, mode: button.dataset.mode, chooseModeOnStart: false }, context);
      });
    });
  }

  function mount(root, config = {}, context = {}) {
    const mergedData = PipiRuntime.mergeConfig(defaultConfig, config);
    if (mergedData.chooseModeOnStart && !config.mode) {
      renderModePicker(root, mergedData, context);
      return;
    }

    const data = applyMode(mergedData);
    const session = PipiRuntime.createSession(context, { type: "listenTap", id: data.id });
    const totalRounds = Math.min(Number(data.rounds) || 5, data.items.length);
    const targetQueue = PipiUtils.shuffle(data.items).slice(0, totalRounds);
    let round = 0;
    let score = 0;
    let target = null;
    let locked = false;
    let completed = false;
    let nextTimer = null;
    let promptTimer = null;
    const pipi = context.pipi;

    root.className = "listen-tap";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Listen & Tap</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${totalRounds}</span></strong>
      </div>
      <div class="prompt">
        <span class="prompt-label">${data.promptPrefix}</span>
        <button class="prompt-word word-sound" data-target type="button">...</button>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe tiếng Anh">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="cards-grid" data-choices></div>
      <div data-completion></div>
    `;

    const choicesNode = root.querySelector("[data-choices]");
    const repeatButton = root.querySelector("[data-repeat]");
    const targetButton = root.querySelector("[data-target]");
    const completionNode = root.querySelector("[data-completion]");
    pipi?.setSpecialEncouragement("");

    function clearRoundTimers() {
      if (nextTimer) {
        window.clearTimeout(nextTimer);
        nextTimer = null;
      }

      if (promptTimer) {
        window.clearTimeout(promptTimer);
        promptTimer = null;
      }
    }

    function goNextRound() {
      clearRoundTimers();
      PipiAudio.stop();
      completionNode.innerHTML = "";
      startRound();
    }

    function finish() {
      completed = true;
      locked = true;
      clearRoundTimers();
      session.complete({ score, total: totalRounds, correct: score, passed: score >= totalRounds });
      pipi?.setState("win", `Hoàn thành rồi! Bé được ${score} sao cùng Pipi.`, "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      choicesNode.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });
      completionNode.innerHTML = `
        <div class="completion-actions">
          <button class="primary-btn" data-again type="button">Chơi lại</button>
        </div>
      `;
      root.querySelector("[data-again]").addEventListener("click", () => mount(root, config, context));
    }

    function startRound() {
      if (completed) return;
      clearRoundTimers();
      PipiAudio.stop();
      locked = false;
      session.setState(session.states.PLAYING, { round: round + 1, score, total: totalRounds });
      PipiUtils.hideTranslation(root);
      completionNode.innerHTML = "";

      if (round >= totalRounds) {
        finish();
        return;
      }

      target = targetQueue[round];
      const distractors = PipiUtils
        .shuffle(data.items.filter((item) => item.word !== target.word))
        .slice(0, Math.max(0, Math.min(4, data.items.length) - 1));
      const choices = PipiUtils.shuffle([target, ...distractors]);
      targetButton.textContent = target[data.promptField] || target.word;
      pipi?.setState("hi", `${data.speechPrefix} ${target[data.promptField] || target.word}`);
      promptTimer = window.setTimeout(() => {
        promptTimer = null;
        if (!completed && !locked && target) {
          PipiAudio.speakWord(target);
        }
      }, data.promptDelayMs ?? 350);

      choicesNode.innerHTML = choices.map((item) => `
        <button class="choice-card" data-word="${item.word}" type="button">
          ${renderItemVisual(item)}
          <span class="label">${item[data.choiceField] || item.word}</span>
        </button>
      `).join("");
    }

    choicesNode.addEventListener("click", (event) => {
      const card = event.target.closest("[data-word]");
      if (!card || locked || completed) return;

      const audioToken = PipiAudio.stop();
      const item = data.items.find((entry) => entry.word === card.dataset.word);
      const correct = item.word === target.word;
      session.answer({ action: "select", word: item.word, target: target.word, correct, score: correct ? score + 1 : score, total: totalRounds });
      PipiUtils.showTranslation(root, item);

      if (correct) {
        locked = true;
        clearRoundTimers();
        card.classList.add("correct");
        score += 1;
        round += 1;
        session.score({ score, total: totalRounds });
        PipiUtils.setText(root, "[data-score]", score);
        const correctFlow = pipi?.setState("happy", "Đúng rồi! Pipi vỗ tay nè.", "clapping");
        completionNode.innerHTML = `
          <div class="completion-actions listen-next-actions">
            <button class="primary-btn" data-next-round type="button">Tiếp</button>
          </div>
        `;
        completionNode.querySelector("[data-next-round]").addEventListener("click", goNextRound, { once: true });
        Promise.resolve(correctFlow).then(() => {
          if (!PipiAudio.isCurrent(audioToken)) return null;
          return PipiAudio.speakWord(item, { withVietnamese: true });
        }).then(() => {
          if (completed || !locked) return;
          nextTimer = window.setTimeout(goNextRound, data.nextDelayMs ?? 650);
        });
      } else {
        card.classList.add("wrong");
        const targetLabel = target[data.promptField] || target.word;
        const wrongFlow = pipi?.wrong(`Không đúng rồi, tìm ${targetLabel} cơ.`, "Hãy cố lên!");
        Promise.resolve(wrongFlow).then(() => {
          if (PipiAudio.isCurrent(audioToken)) {
            PipiAudio.speakWord(item, { withVietnamese: true });
          }
        });
        window.setTimeout(() => card.classList.remove("wrong"), 900);
      }
    });

    repeatButton.addEventListener("click", () => {
      if (target) PipiAudio.speakWord(target);
    });

    targetButton.addEventListener("click", () => {
      if (!target) return;
      PipiUtils.showTranslation(root, target);
      PipiAudio.speakWord(target, { withVietnamese: true });
    });

    session.start({ score: 0, total: totalRounds, rounds: totalRounds, mode: data.mode });
    startRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.listenTap = { mount, defaultConfig };
})();
