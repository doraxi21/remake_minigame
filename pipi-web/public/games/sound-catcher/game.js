(function () {
  const defaultConfig = {
    rounds: 5,
    guideText: "Nghe và bắt đúng thẻ",
    promptPrefix: "Hãy bắt:",
    promptField: "vi",
    choiceCount: 5,
    lanes: 3,
    speedMin: 20,
    speedStep: 0.85,
    promptDelayMs: 350,
    nextDelayMs: 500,
    items: []
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "soundCatcher", id: data.id });
    const pipi = context.pipi;
    const rounds = Math.min(data.rounds, data.items.length);
    const targetQueue = PipiUtils.shuffle(data.items).slice(0, rounds);
    let round = 0;
    let score = 0;
    let target = null;
    let locked = false;
    let completed = false;
    let promptTimer = null;
    let nextTimer = null;

    root.className = "sound-catcher";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Sound Catcher</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds}</span></strong>
      </div>
      <div class="prompt">
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
      <div class="catcher-field" data-field></div>
      <div class="catcher-actions">
        <button class="primary-btn rematch-btn" data-rematch type="button" hidden>Chơi lại</button>
      </div>
    `;

    const targetButton = root.querySelector("[data-target]");
    const repeatButton = root.querySelector("[data-repeat]");
    const fieldNode = root.querySelector("[data-field]");
    const rematchButton = root.querySelector("[data-rematch]");
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
      if (target) PipiAudio.speakWord(target, { withVietnamese });
    }

    function buildChoices() {
      const distractors = PipiUtils
        .shuffle(data.items.filter((item) => item.word !== target.word))
        .slice(0, Math.max(0, data.choiceCount - 1));

      return PipiUtils.shuffle([target, ...distractors]);
    }

    function renderChoices() {
      const choices = buildChoices();
      fieldNode.innerHTML = choices.map((item, index) => {
        const laneCount = Math.max(1, data.lanes);
        const lane = index % laneCount;
        const laneTop = laneCount === 1 ? 50 : 20 + lane * (60 / (laneCount - 1));
        const speed = data.speedMin + (index % 3) * data.speedStep;
        const delay = -index * (speed / choices.length);

        return `
          <button
            class="catch-token lane-${lane} ${item.word === target.word ? "is-target" : ""}"
            data-word="${item.word}"
            style="--lane-top:${laneTop}%; --speed:${speed}s; --delay:${delay}s"
            type="button">
            ${renderItemVisual(item)}
            <span class="label">${item.word}</span>
          </button>
        `;
      }).join("");
    }

    function finish() {
      completed = true;
      locked = true;
      clearTimers();
      session.complete({ score, total: rounds, correct: score, passed: score >= rounds });
      fieldNode.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });
      pipi?.setState("win", `Tuyệt vời! Bé đã bắt đúng ${score} thẻ.`, "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      rematchButton.hidden = false;
    }

    function startRound() {
      if (completed) return;
      clearTimers();
      PipiAudio.stop();
      PipiUtils.hideTranslation(root);
      locked = false;

      if (round >= rounds) {
        finish();
        return;
      }

      target = targetQueue[round];
      targetButton.textContent = target[data.promptField] || target.word;
      session.setState(session.states.PLAYING, { round: round + 1, total: rounds, word: target.word });
      pipi?.setState("hi", `Nghe kỹ rồi bắt ${target[data.promptField] || target.word} nhé.`);
      renderChoices();

      promptTimer = window.setTimeout(() => {
        promptTimer = null;
        speakTarget(false);
      }, data.promptDelayMs);
    }

    fieldNode.addEventListener("click", (event) => {
      const token = event.target.closest("[data-word]");
      if (!token || locked || completed) return;

      const audioToken = PipiAudio.stop();
      const item = data.items.find((entry) => entry.word === token.dataset.word);
      const correct = item.word === target.word;
      session.answer({ action: "catch", word: item.word, target: target.word, correct, score: correct ? score + 1 : score, total: rounds });
      PipiUtils.showTranslation(root, item);
      token.classList.add(correct ? "is-correct" : "is-wrong");

      if (correct) {
        locked = true;
        score += 1;
        round += 1;
        session.score({ score, total: rounds });
        PipiUtils.setText(root, "[data-score]", score);
        fieldNode.querySelectorAll("button").forEach((button) => {
          button.disabled = true;
        });

        Promise.resolve(pipi?.setState("happy", "Bắt đúng rồi! Pipi vỗ tay nè.", "clapping"))
          .then(() => {
            if (PipiAudio.isCurrent(audioToken)) {
              return PipiAudio.speakWord(item, { withVietnamese: true });
            }
            return null;
          })
          .then(() => {
            if (completed || !locked) return;
            nextTimer = window.setTimeout(startRound, data.nextDelayMs);
          });
      } else {
        const targetLabel = target[data.promptField] || target.word;
        const wrongFlow = pipi?.wrong(`Không đúng rồi, tìm ${targetLabel} cơ.`, "Hãy cố lên!");
        Promise.resolve(wrongFlow).then(() => {
          if (PipiAudio.isCurrent(audioToken)) {
            PipiAudio.speakWord(item, { withVietnamese: true });
          }
        });
        window.setTimeout(() => token.classList.remove("is-wrong"), 900);
      }
    });

    repeatButton.addEventListener("click", () => speakTarget(false));
    targetButton.addEventListener("click", () => {
      if (!target) return;
      PipiUtils.showTranslation(root, target);
      speakTarget(true);
    });
    rematchButton.addEventListener("click", () => mount(root, config, context));

    session.start({ score: 0, total: rounds, rounds });
    startRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.soundCatcher = { mount, defaultConfig };
})();
