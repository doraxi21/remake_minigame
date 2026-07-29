(function () {
  const colors = ["#fff8dc", "#e8fff4", "#e9f7ff", "#fff0f5", "#f3eeff", "#fff2df"];

  const defaultConfig = {
    rounds: 5,
    minCount: 2,
    maxCount: 4,
    distractorCount: 8,
    guideText: "Hãy đếm đúng con vật",
    promptPrefix: "Hãy tìm:",
    nextText: "Tiếp",
    rematchText: "Chơi lại",
    promptDelayMs: 220,
    nextDelayMs: 3000,
    finalWinDelayMs: 5000,
    wrongEncouragementDelayMs: 3000,
    items: []
  };

  function resolveItems(items) {
    const source = items?.length ? items : window.PipiContent?.vocabulary || [];
    return source
      .map((item) => {
        if (typeof item !== "string") {
          return item;
        }
        return window.PipiContent?.vocabulary?.find((entry) => entry.id === item || entry.word === item);
      })
      .filter((item) => item && item.word && (item.image || item.emoji));
  }

  function pickCount(min, max) {
    const low = Math.max(1, Number(min) || 2);
    const high = Math.max(low, Number(max) || low);
    return Math.floor(Math.random() * (high - low + 1)) + low;
  }

  function pluralize(word, count) {
    if (count === 1) return word;
    if (word.endsWith("s")) return word;
    return `${word}s`;
  }

  function makeSpawnList(target, targetCount, items, distractorCount) {
    const targets = Array.from({ length: targetCount }, () => ({ ...target, isTarget: true }));
    const others = items.filter((item) => item.word !== target.word);
    const distractors = Array.from({ length: Math.max(0, distractorCount) }, () => {
      const item = PipiUtils.shuffle(others)[0] || target;
      return { ...item, isTarget: false };
    });
    return PipiUtils.shuffle([...targets, ...distractors]);
  }

  function findPosition(stage, placed) {
    const stageWidth = Math.max(360, stage.clientWidth || 800);
    const stageHeight = Math.max(320, stage.clientHeight || 480);
    const size = Math.min(108, Math.max(82, stageWidth * 0.075));
    const minDistance = size * 0.96;
    const maxX = Math.max(16, stageWidth - size - 18);
    const maxY = Math.max(16, stageHeight - size - 18);

    for (let attempt = 0; attempt < 70; attempt += 1) {
      const x = 18 + Math.random() * (maxX - 18);
      const y = 18 + Math.random() * (maxY - 18);
      const overlaps = placed.some((point) => {
        const dx = point.x - x;
        const dy = point.y - y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
      });
      if (!overlaps) return { x, y };
    }

    return {
      x: 18 + Math.random() * (maxX - 18),
      y: 18 + Math.random() * (maxY - 18)
    };
  }

  function mount(root, config = {}, context = {}) {
    root.__countingAnimalsCleanup?.();
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const items = resolveItems(data.items);
    const session = PipiRuntime.createSession(context, { type: "countingAnimals", id: data.id });
    const pipi = context.pipi;

    if (items.length < 2) {
      root.className = "counting-animals";
      root.innerHTML = `<div class="prompt"><span class="prompt-label">Chưa có đủ dữ liệu cho Counting Animals.</span></div>`;
      return;
    }

    const rounds = Math.min(Number(data.rounds) || 5, items.length);
    const queue = PipiUtils.shuffle(items).slice(0, rounds);
    let round = 0;
    let score = 0;
    let target = null;
    let targetCount = 0;
    let foundCount = 0;
    let locked = false;
    let completed = false;
    let promptTimer = null;
    let nextTimer = null;

    root.className = "counting-animals";
    root.innerHTML = `
      <div class="prompt">
        <span class="prompt-label" data-prompt>${data.guideText}</span>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe lại đề bài">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="status-row">
        <p class="eyebrow">Counting Animals</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds}</span></strong>
      </div>
      <div class="translation-popover" data-translation></div>
      <section class="counting-stage" data-stage></section>
      <div class="counting-actions" data-actions></div>
    `;

    const promptNode = root.querySelector("[data-prompt]");
    const scoreNode = root.querySelector("[data-score]");
    const stageNode = root.querySelector("[data-stage]");
    const actionsNode = root.querySelector("[data-actions]");
    const repeatButton = root.querySelector("[data-repeat]");

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

    function speakPrompt() {
      if (!target) return;
      PipiAudio.stop();
      PipiAudio.speak(`Find ${targetCount} ${pluralize(target.word, targetCount)}`, { lang: "en-US", rate: 0.82 });
    }

    function updatePrompt() {
      promptNode.textContent = `${data.promptPrefix} ${targetCount} ${target.word}`;
    }

    function renderAnimals() {
      const spawned = makeSpawnList(target, targetCount, items, Number(data.distractorCount) || 5);
      const placed = [];
      stageNode.innerHTML = "";
      spawned.forEach((animal, index) => {
        const position = findPosition(stageNode, placed);
        placed.push(position);
        const button = document.createElement("button");
        button.className = "counting-animal";
        button.type = "button";
        button.dataset.word = animal.word;
        button.style.left = `${position.x}px`;
        button.style.top = `${position.y}px`;
        button.style.setProperty("--animal-bg", colors[index % colors.length]);
        button.innerHTML = animal.image
          ? `<img src="${animal.image}" alt="${animal.word}">`
          : `<span class="emoji" aria-hidden="true">${animal.emoji}</span>`;
        button.addEventListener("click", () => selectAnimal(animal, button));
        stageNode.appendChild(button);
      });
    }

    function renderRound() {
      clearTimers();
      PipiAudio.stop();
      PipiUtils.hideTranslation(root);
      actionsNode.innerHTML = "";
      locked = false;
      foundCount = 0;
      target = queue[round];
      targetCount = pickCount(data.minCount, data.maxCount);
      updatePrompt();
      renderAnimals();
      pipi?.setState("hi", `Hãy tìm ${targetCount} ${target.vi || target.word} nhé.`);
      promptTimer = window.setTimeout(speakPrompt, data.promptDelayMs);
    }

    function nextRound() {
      PipiAudio.stop();
      clearTimers();
      if (round >= rounds - 1) {
        finish();
        return;
      }
      round += 1;
      renderRound();
    }

    function finish() {
      completed = true;
      locked = true;
      clearTimers();
      session.complete({ score, total: rounds, correct: score, wrong: rounds - score, passed: score >= rounds });
      pipi?.setState("win", `Tuyệt vời! Bé đã đếm đúng ${score}/${rounds} màn.`, "jumping");
      actionsNode.innerHTML = `
        <span class="counting-message">Hoàn thành rồi!</span>
        <button class="primary-btn" data-rematch type="button">${data.rematchText}</button>
      `;
      actionsNode.querySelector("[data-rematch]").addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });
    }

    function showNextButton() {
      actionsNode.innerHTML = `<button class="primary-btn" data-next type="button">${data.nextText}</button>`;
      actionsNode.querySelector("[data-next]").addEventListener("click", nextRound, { once: true });
    }

    function scheduleAutoAdvance() {
      const delay = round >= rounds - 1 ? data.finalWinDelayMs : data.nextDelayMs;
      nextTimer = window.setTimeout(nextRound, delay);
    }

    function selectAnimal(animal, button) {
      if (locked || completed || button.classList.contains("is-found")) return;
      PipiAudio.stop();
      clearTimers();

      if (animal.word === target.word) {
        button.classList.add("is-found");
        foundCount += 1;
        session.answer({
          action: "select",
          correct: true,
          word: animal.word,
          target: target.word,
          count: foundCount,
          totalCount: targetCount
        });

        if (foundCount >= targetCount) {
          locked = true;
          score += 1;
          scoreNode.textContent = score;
          session.score({ score, total: rounds });
          pipi?.setState("happy", `Đúng rồi! Có ${targetCount} ${target.vi || target.word}.`);
          PipiUtils.showTranslation(root, target);
          showNextButton();
          scheduleAutoAdvance();
        } else {
          pipi?.setState("happy", `${foundCount}! Đếm tiếp nhé.`);
          PipiAudio.speak(String(foundCount), { lang: "en-US", rate: 0.9 });
        }
        return;
      }

      button.classList.add("is-wrong");
      window.setTimeout(() => button.classList.remove("is-wrong"), 320);
      session.answer({
        action: "select",
        correct: false,
        word: animal.word,
        target: target.word,
        count: foundCount,
        totalCount: targetCount
      });
      pipi?.wrong(
        `Chưa đúng rồi, hãy tìm ${target.vi || target.word} nhé.`,
        "Hãy cố lên!",
        { encouragementDelayMs: data.wrongEncouragementDelayMs }
      );
    }

    repeatButton.addEventListener("click", speakPrompt);

    root.__countingAnimalsCleanup = () => {
      clearTimers();
      PipiAudio.stop();
    };

    session.start({ score: 0, total: rounds });
    renderRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.countingAnimals = { mount, defaultConfig };
})();
