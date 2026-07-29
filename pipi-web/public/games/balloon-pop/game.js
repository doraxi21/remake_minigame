(function () {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const defaultConfig = window.PipiContent?.balloonPop || {
    targetLetter: "random",
    minTargetCount: 3,
    maxTargetCount: 4,
    balloonCount: 12
  };

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function normalizeLetter(letter) {
    return String(letter || "").trim().toUpperCase();
  }

  function pickTargetLetter(config) {
    const configured = normalizeLetter(config.targetLetter);
    if (configured && configured !== "RANDOM") return configured[0];
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  function buildLetters(config, targetLetter) {
    const configured = normalizeLetter(config.targetLetter);
    const shouldUseProvidedLetters = configured && configured !== "RANDOM";

    if (shouldUseProvidedLetters && Array.isArray(config.letters) && config.letters.length > 0) {
      const normalized = config.letters.map(normalizeLetter).filter(Boolean);
      if (normalized.includes(targetLetter)) return normalized;
    }

    const minCount = Number(config.minTargetCount) || 3;
    const maxCount = Math.max(minCount, Number(config.maxTargetCount) || 4);
    const targetCount = Number(config.targetCount) || randomInt(minCount, maxCount);
    const balloonCount = Math.max(targetCount, Number(config.balloonCount) || 12);
    const decoys = alphabet.filter((letter) => letter !== targetLetter);
    const letters = Array.from({ length: targetCount }, () => targetLetter);

    while (letters.length < balloonCount) {
      letters.push(decoys[Math.floor(Math.random() * decoys.length)]);
    }

    return letters;
  }

  function prepareData(config) {
    const targetLetter = pickTargetLetter(config);
    return {
      ...config,
      targetLetter,
      vietnameseHint: config.vietnameseHint || `chữ ${targetLetter}`,
      letters: buildLetters(config, targetLetter)
    };
  }

  function mount(root, config = {}, context = {}) {
    const data = prepareData(PipiRuntime.mergeConfig(defaultConfig, config));
    const session = PipiRuntime.createSession(context, { type: "balloonPop", id: data.id });
    const colors = ["#ff6b6b", "#2456ee", "#20b86f", "#ff941f", "#8e5cff", "#00a9c7"];
    let found = 0;
    let completed = false;
    let interactionToken = 0;
    let inputLockedUntil = 0;
    const total = data.letters.filter((letter) => letter === data.targetLetter).length;
    const pipi = context.pipi;

    root.className = "balloon-pop";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Balloon Pop</p>
        <strong>Đã tìm: <span data-score>0</span>/<span data-total>${total}</span></strong>
      </div>
      <div class="prompt">
        <span class="prompt-label">Hãy tìm:</span>
        <button class="prompt-word word-sound" data-target type="button">${data.vietnameseHint}</button>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe chữ tiếng Anh">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="balloon-field" data-balloons></div>
    `;

    const balloonsNode = root.querySelector("[data-balloons]");
    const targetItem = { word: data.targetLetter, vi: data.vietnameseHint };
    pipi?.setSpecialEncouragement("");

    function speakTarget(withVietnamese = false) {
      PipiAudio.speakWord(targetItem, { withVietnamese });
    }

    function nextInteractionToken() {
      interactionToken += 1;
      PipiAudio.stop();
      return interactionToken;
    }

    function speakIfCurrent(token, item, options = {}) {
      if (token !== interactionToken) return Promise.resolve();
      return PipiAudio.speakWord(item, options);
    }

    function renderBalloons() {
      balloonsNode.innerHTML = PipiUtils.shuffle(data.letters).map((letter, index) => {
        const left = 5 + (index % 4) * 23 + Math.random() * 5;
        const top = 18 + Math.floor(index / 4) * 138 + Math.random() * 18;
        const color = colors[index % colors.length];
        const delay = (index % 4) * 0.22;

        return `
          <button
            class="balloon"
            style="left:${left}%; top:${top}px; background:${color}; animation-delay:${delay}s"
            data-letter="${letter}"
            type="button"
            aria-label="Letter ${letter}">
            ${letter}
          </button>
        `;
      }).join("");
    }

    balloonsNode.addEventListener("click", (event) => {
      const balloon = event.target.closest("[data-letter]");
      if (!balloon || balloon.classList.contains("popped") || balloon.dataset.locked === "true") return;

      const letter = balloon.dataset.letter;
      const item = { word: letter, vi: `chữ ${letter}` };
      const correct = letter === data.targetLetter;

      if (completed) {
        const token = nextInteractionToken();
        PipiUtils.showTranslation(root, item);
        speakIfCurrent(token, item, { withVietnamese: true });
        return;
      }

      if (performance.now() < inputLockedUntil) return;
      inputLockedUntil = performance.now() + 80;
      const token = nextInteractionToken();

      session.answer({ action: "pop", letter, target: data.targetLetter, correct, score: correct ? found + 1 : found, total, completed });
      PipiUtils.showTranslation(root, item);

      balloon.dataset.locked = "true";

      if (correct) {
        balloon.classList.add("popped");
        found += 1;
        session.score({ score: found, total });
        PipiUtils.setText(root, "[data-score]", found);
        const correctFlow = Promise.resolve(pipi?.setState("happy", "Pop! Đúng chữ rồi.", "clapping"))
          .then(() => speakIfCurrent(token, item, { withVietnamese: true }));

        if (found === total) {
          completed = true;
          correctFlow.then(() => {
            if (token !== interactionToken) return;
            session.complete({ score: found, total, correct: found, passed: true });
            pipi?.setState("win", "Tuyệt vời! Bé đã tìm hết chữ đúng.", "jumping");
            pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
          });
        }
      } else {
        const wrongFlow = pipi?.wrong(`Không đúng rồi, tìm ${data.vietnameseHint} cơ.`, "Hãy cố lên!");
        Promise.resolve(wrongFlow).then(() => speakIfCurrent(token, item, { withVietnamese: true }));
        window.setTimeout(() => {
          balloon.dataset.locked = "false";
        }, 900);
      }
    });

    root.querySelector("[data-repeat]").addEventListener("click", () => {
      const token = nextInteractionToken();
      speakIfCurrent(token, targetItem, { withVietnamese: false });
    });
    root.querySelector("[data-target]").addEventListener("click", () => {
      const token = nextInteractionToken();
      PipiUtils.showTranslation(root, targetItem);
      speakIfCurrent(token, targetItem, { withVietnamese: true });
    });

    session.start({ score: 0, target: data.targetLetter, total });
    pipi?.setState("hi", `Tìm tất cả chữ ${data.targetLetter} nhé.`);
    renderBalloons();
    window.setTimeout(() => speakTarget(false), 350);
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.balloonPop = { mount, defaultConfig };
})();
