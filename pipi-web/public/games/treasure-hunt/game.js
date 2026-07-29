(function () {
  const defaultConfig = {
    rounds: 5,
    guideText: "Find the object",
    promptPrefix: "Find:",
    background: "../assets/png/background.png",
    promptDelayMs: 350,
    nextDelayMs: 500,
    hotspots: []
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="hunt-image" src="${item.image}" alt="${item.word}" draggable="false">`;
    }

    return `<span class="hunt-emoji">${item.emoji || "?"}</span>`;
  }

  function normalizeHotspot(hotspot, index) {
    const item = hotspot.item || hotspot;
    return {
      id: hotspot.id || item.id || item.word || `hotspot-${index}`,
      item,
      x: hotspot.x ?? 50,
      y: hotspot.y ?? 50,
      size: hotspot.size ?? 14,
      found: false
    };
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "treasureHunt", id: data.id });
    const pipi = context.pipi;
    const hotspots = (data.hotspots || []).map(normalizeHotspot);
    const rounds = Math.min(Number(data.rounds) || 5, hotspots.length);
    const targetQueue = PipiUtils.shuffle(hotspots).slice(0, rounds);
    let round = 0;
    let score = 0;
    let target = null;
    let locked = false;
    let completed = false;
    let promptTimer = null;
    let nextTimer = null;

    root.className = "treasure-hunt";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Treasure Hunt</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds}</span></strong>
      </div>
      <div class="prompt hunt-prompt">
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
      <div class="hunt-scene" data-scene>
        <img class="hunt-bg" src="${data.background}" alt="Treasure hunt scene" draggable="false">
        <div class="hunt-hotspots" data-hotspots></div>
      </div>
      <div class="hunt-actions">
        <button class="primary-btn rematch-btn" data-rematch type="button" hidden>Chơi lại</button>
      </div>
    `;

    const targetButton = root.querySelector("[data-target]");
    const repeatButton = root.querySelector("[data-repeat]");
    const hotspotsNode = root.querySelector("[data-hotspots]");
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

    function renderHotspots() {
      hotspotsNode.innerHTML = hotspots.map((hotspot) => `
        <button
          class="hunt-hotspot ${hotspot.found ? "is-found" : ""} ${target && hotspot.id === target.id ? "is-current" : ""}"
          data-hotspot="${hotspot.id}"
          style="--x:${hotspot.x}%; --y:${hotspot.y}%; --size:${hotspot.size}%"
          type="button"
          aria-label="${hotspot.item.word}">
          ${renderItemVisual(hotspot.item)}
        </button>
      `).join("");
    }

    function speakTarget(withVietnamese = false) {
      if (target) PipiAudio.speakWord(target.item, { withVietnamese });
    }

    function finish() {
      completed = true;
      locked = true;
      clearTimers();
      PipiAudio.stop();
      session.complete({ score, total: rounds, correct: score, wrong: rounds - score, passed: score >= rounds });
      pipi?.setState("win", `Tuyệt vời! Bé đã tìm được ${score} kho báu.`, "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      rematchButton.hidden = false;
      renderHotspots();
    }

    function nextRound() {
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
      targetButton.textContent = target.item.word;
      session.setState(session.states.PLAYING, {
        round: round + 1,
        score,
        total: rounds,
        word: target.item.word
      });
      pipi?.setState("hi", `${data.promptPrefix} ${target.item.word}`);
      renderHotspots();

      promptTimer = window.setTimeout(() => {
        promptTimer = null;
        if (!completed && !locked) speakTarget(false);
      }, data.promptDelayMs);
    }

    hotspotsNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-hotspot]");
      if (!button || locked || completed || !target) return;

      const audioToken = PipiAudio.stop();
      const hotspot = hotspots.find((entry) => entry.id === button.dataset.hotspot);
      const correct = hotspot.id === target.id;
      session.answer({
        action: "select",
        word: hotspot.item.word,
        target: target.item.word,
        correct,
        score: correct ? score + 1 : score,
        total: rounds
      });
      PipiUtils.showTranslation(root, hotspot.item);

      if (correct) {
        locked = true;
        hotspot.found = true;
        score += 1;
        round += 1;
        PipiUtils.setText(root, "[data-score]", score);
        session.score({ score, total: rounds });
        button.classList.add("is-correct", "is-found");
        renderHotspots();
        Promise.resolve(pipi?.setState("happy", "Đúng rồi! Pipi vỗ tay nè.", "clapping"))
          .then(() => {
            if (PipiAudio.isCurrent(audioToken)) {
              return PipiAudio.speakWord(hotspot.item, { withVietnamese: true });
            }
            return null;
          })
          .then(() => {
            if (!completed && locked) {
              nextTimer = window.setTimeout(nextRound, data.nextDelayMs);
            }
          });
        return;
      }

      button.classList.add("is-wrong");
      Promise.resolve(pipi?.wrong(`Chưa đúng rồi, tìm ${target.item.word} cơ.`, "Mình thử lại nhé!"))
        .then(() => {
          if (PipiAudio.isCurrent(audioToken)) {
            return PipiAudio.speakWord(hotspot.item, { withVietnamese: true });
          }
          return null;
        });
      window.setTimeout(() => button.classList.remove("is-wrong"), 900);
    });

    repeatButton.addEventListener("click", () => speakTarget(false));
    targetButton.addEventListener("click", () => {
      if (!target) return;
      PipiUtils.showTranslation(root, target.item);
      speakTarget(true);
    });
    rematchButton.addEventListener("click", () => {
      PipiAudio.stop();
      mount(root, config, context);
    });

    session.start({ score: 0, total: rounds, rounds });
    nextRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.treasureHunt = { mount, defaultConfig };
})();
