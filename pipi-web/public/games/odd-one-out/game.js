(function () {
  const defaultConfig = {
    rounds: 5,
    choiceCount: 4,
    ruleField: "topic",
    guideText: "Tìm hình khác nhóm",
    promptPrefix: "Chọn hình không thuộc nhóm:",
    nextText: "Tiếp",
    rematchText: "Chơi lại",
    promptDelayMs: 350,
    nextDelayMs: 700,
    labels: {
      animals: "con vật",
      food: "đồ ăn",
      nature: "thiên nhiên",
      toys: "đồ chơi"
    },
    items: []
  };

  function renderItemVisual(item) {
    if (item.image) {
      return `<img class="item-image" src="${item.image}" alt="${item.word}">`;
    }

    return `<span class="emoji">${item.emoji || "?"}</span>`;
  }

  function getRuleValue(item, field) {
    return item[field] || "";
  }

  function getLabel(value, labels = {}) {
    return labels[value] || value || "nhóm này";
  }

  function groupItems(items, ruleField) {
    return items.reduce((groups, item) => {
      const value = getRuleValue(item, ruleField);
      if (!value) return groups;
      if (!groups.has(value)) groups.set(value, []);
      groups.get(value).push(item);
      return groups;
    }, new Map());
  }

  function buildRounds(data) {
    const sameCount = Math.max(2, Number(data.choiceCount || 4) - 1);
    const groups = groupItems(data.items || [], data.ruleField);
    const baseKeys = [...groups.keys()].filter((key) => groups.get(key).length >= sameCount);
    const usedOdd = new Set();
    const rounds = [];
    let guard = 0;

    while (rounds.length < data.rounds && guard < data.rounds * 20) {
      guard += 1;
      const baseKey = PipiUtils.shuffle(baseKeys)[0];
      if (!baseKey) break;

      const sameItems = PipiUtils.shuffle(groups.get(baseKey)).slice(0, sameCount);
      const oddPool = PipiUtils.shuffle((data.items || []).filter((item) => {
        const id = item.id || item.word;
        return getRuleValue(item, data.ruleField) !== baseKey && !usedOdd.has(id);
      }));

      const oddItem = oddPool[0];
      if (!oddItem) break;

      usedOdd.add(oddItem.id || oddItem.word);
      rounds.push({
        baseKey,
        target: oddItem,
        choices: PipiUtils.shuffle([...sameItems, oddItem])
      });
    }

    return rounds;
  }

  function mount(root, config = {}, context = {}) {
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const rounds = buildRounds(data);
    const session = PipiRuntime.createSession(context, { type: "oddOneOut", id: data.id });
    const pipi = context.pipi;
    let roundIndex = 0;
    let score = 0;
    let currentRound = null;
    let locked = false;
    let completed = false;
    let promptTimer = null;
    let nextTimer = null;

    root.className = "odd-one-out";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Odd One Out</p>
        <strong>Điểm: <span data-score>0</span>/<span data-total>${rounds.length}</span></strong>
      </div>
      <div class="prompt odd-prompt">
        <span class="prompt-label" data-prompt-label>${data.guideText}</span>
        <button class="speaker-btn" data-repeat type="button" aria-label="Nghe đề bài">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="odd-options" data-options></div>
      <div class="odd-actions" data-actions></div>
    `;

    const promptLabel = root.querySelector("[data-prompt-label]");
    const optionsNode = root.querySelector("[data-options]");
    const actionsNode = root.querySelector("[data-actions]");
    const repeatButton = root.querySelector("[data-repeat]");
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

    function speakPrompt() {
      if (!currentRound) return;
      const label = getLabel(currentRound.baseKey, data.labels);
      PipiAudio.speak(`${data.promptPrefix} ${label}`, { lang: "vi-VN", rate: 0.92 });
    }

    function renderOptions() {
      optionsNode.innerHTML = currentRound.choices.map((item, index) => `
        <button class="odd-card" data-word="${item.word}" style="--odd-color:${["#2ac87a", "#42b6f5", "#ff9f3f", "#8b73f6"][index % 4]}" type="button">
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
      session.complete({ score, total: rounds.length, correct: score, wrong: rounds.length - score, passed: score >= rounds.length });
      optionsNode.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });
      pipi?.setState("win", `Tuyệt vời! Bé đã tìm đúng ${score}/${rounds.length} câu.`, "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      actionsNode.innerHTML = `
        <button class="primary-btn rematch-btn" data-rematch type="button">${data.rematchText}</button>
      `;
      actionsNode.querySelector("[data-rematch]").addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });
    }

    function startRound() {
      clearTimers();
      PipiAudio.stop();
      locked = false;
      actionsNode.innerHTML = "";
      PipiUtils.hideTranslation(root);

      if (roundIndex >= rounds.length) {
        finish();
        return;
      }

      currentRound = rounds[roundIndex];
      const label = getLabel(currentRound.baseKey, data.labels);
      promptLabel.textContent = `${data.promptPrefix} ${label}`;
      renderOptions();
      session.setState(session.states.PLAYING, { round: roundIndex + 1, score, total: rounds.length, target: currentRound.target.word });
      pipi?.setState("hi", `${data.promptPrefix} ${label}`);
      promptTimer = window.setTimeout(() => {
        promptTimer = null;
        if (!completed && !locked) speakPrompt();
      }, data.promptDelayMs);
    }

    function nextRound() {
      roundIndex += 1;
      startRound();
    }

    function answer(item, card) {
      if (locked || completed) return;
      const correct = item.word === currentRound.target.word;
      const audioToken = PipiAudio.stop();
      locked = true;
      clearTimers();
      PipiUtils.showTranslation(root, item);
      card.classList.add(correct ? "is-correct" : "is-wrong");

      const targetCard = optionsNode.querySelector(`[data-word="${currentRound.target.word}"]`);
      targetCard?.classList.add("is-answer");
      optionsNode.querySelectorAll("button").forEach((button) => {
        button.disabled = true;
      });

      if (correct) {
        score += 1;
        PipiUtils.setText(root, "[data-score]", score);
        session.score({ score, total: rounds.length });
      }

      session.answer({
        action: "choose-odd",
        word: item.word,
        target: currentRound.target.word,
        group: currentRound.baseKey,
        correct,
        score,
        total: rounds.length
      });

      showNextButton();

      const feedback = correct
        ? pipi?.setState("happy", "Đúng rồi! Đây là hình khác nhóm.", "clapping")
        : pipi?.wrong(`Chưa đúng rồi, đáp án là ${currentRound.target.word}.`, "Mình thử câu tiếp nhé!");

      Promise.resolve(feedback).then(() => {
        if (!PipiAudio.isCurrent(audioToken)) return null;
        return PipiAudio.speakWord(correct ? item : currentRound.target, { withVietnamese: true });
      }).finally(() => {
        if (!completed && locked) nextTimer = window.setTimeout(nextRound, data.nextDelayMs);
      });
    }

    optionsNode.addEventListener("click", (event) => {
      const card = event.target.closest("[data-word]");
      if (!card || locked || completed) return;
      const item = currentRound.choices.find((entry) => entry.word === card.dataset.word);
      answer(item, card);
    });

    repeatButton.addEventListener("click", speakPrompt);

    session.start({ score: 0, total: rounds.length, rounds: rounds.length });
    startRound();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.oddOneOut = { mount, defaultConfig };
})();
