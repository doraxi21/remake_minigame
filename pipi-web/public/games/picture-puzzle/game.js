(function () {
  const defaultConfig = {
    guideText: "Mở mảnh ghép và chọn nghĩa đúng",
    questionText: "Nghĩa của từ này là gì?",
    chooseAgainText: "Chọn lại nhé",
    rematchText: "Chơi lại",
    difficulty: 2,
    answerCount: 3,
    backgrounds: [
      "../assets/background/pic_1.png",
      "../assets/background/pic_2.png",
      "../assets/background/pic_3.png"
    ],
    items: []
  };

  function clampDifficulty(value) {
    const size = Number(value) || 2;
    return Math.min(4, Math.max(2, size));
  }

  function resolveItems(items) {
    if (!items?.length) return [];
    return items
      .map((item) => {
        if (typeof item !== "string") return item;
        return window.PipiContent?.vocabulary?.find((entry) => entry.id === item || entry.word === item);
      })
      .filter(Boolean);
  }

  function buildTileQuestions(items, count) {
    const shuffled = PipiUtils.shuffle(items);
    return Array.from({ length: count }, (_, index) => shuffled[index % shuffled.length]);
  }

  function makeAnswers(target, items, answerCount) {
    const wrongAnswers = PipiUtils.shuffle(items.filter((item) => item.word !== target.word))
      .slice(0, Math.max(0, answerCount - 1))
      .map((item) => item.vi || item.word);
    return PipiUtils.shuffle([target.vi || target.word, ...wrongAnswers]);
  }

  function mount(root, config = {}, context = {}) {
    root.__picturePuzzleCleanup?.();
    const data = PipiRuntime.mergeConfig(defaultConfig, config);
    const session = PipiRuntime.createSession(context, { type: "picturePuzzle", id: data.id });
    const pipi = context.pipi;
    const items = resolveItems(data.items?.length ? data.items : window.PipiContent?.vocabulary || []);

    if (!items.length) {
      root.className = "picture-puzzle";
      root.innerHTML = `<div class="prompt"><span class="prompt-label">Chưa có dữ liệu cho Picture Puzzle.</span></div>`;
      return;
    }

    const gridSize = clampDifficulty(data.difficulty);
    const total = gridSize * gridSize;
    const background = PipiUtils.shuffle(data.backgrounds || defaultConfig.backgrounds)[0];
    const questions = buildTileQuestions(items, total);
    const unlocked = new Set();
    let activeIndex = null;
    let answerLocked = false;
    let completed = false;

    root.className = "picture-puzzle";
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Picture Puzzle</p>
        <strong>Mở khóa: <span data-score>0</span>/<span data-total>${total}</span></strong>
      </div>
      <div class="prompt">
        <span class="prompt-label">${data.guideText}</span>
        <button class="speaker-btn" data-guide type="button" aria-label="Nghe hướng dẫn">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="puzzle-layout">
        <section class="puzzle-frame" data-frame style="--grid-size:${gridSize}; --puzzle-bg:url('${background}')">
          <aside class="puzzle-question" data-question aria-live="polite"></aside>
        </section>
      </div>
      <div class="completion-actions">
        <button class="primary-btn" data-rematch type="button" hidden>${data.rematchText}</button>
      </div>
    `;

    const frameNode = root.querySelector("[data-frame]");
    const questionNode = root.querySelector("[data-question]");
    const rematchButton = root.querySelector("[data-rematch]");
    const guideButton = root.querySelector("[data-guide]");

    function renderTiles() {
      frameNode.querySelectorAll(".puzzle-tile").forEach((node) => node.remove());
      frameNode.insertAdjacentHTML("afterbegin", questions.map((item, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        const isUnlocked = unlocked.has(index);
        return `
          <button
            class="puzzle-tile ${isUnlocked ? "is-unlocked" : ""} ${index === activeIndex ? "is-active" : ""}"
            data-tile="${index}"
            type="button"
            style="--row:${row}; --col:${col};"
            ${isUnlocked || completed ? "disabled" : ""}
            aria-label="Mảnh ghép ${index + 1}"
          >
            <span>${index + 1}</span>
          </button>
        `;
      }).join(""));
    }

    function updateScore() {
      const score = unlocked.size;
      PipiUtils.setText(root, "[data-score]", score);
      session.score({ score, total });
      return score;
    }

    function hideQuestion() {
      activeIndex = null;
      answerLocked = false;
      questionNode.innerHTML = "";
      questionNode.classList.remove("is-visible", "is-done", "is-good", "is-bad");
      renderTiles();
    }

    function renderQuestion(index, state = "") {
      const item = questions[index];
      const answers = makeAnswers(item, items, data.answerCount);
      activeIndex = index;
      answerLocked = false;
      questionNode.innerHTML = `
        <p class="question-kicker">${data.questionText}</p>
        <button class="question-word word-sound" data-word="${item.word}" type="button">${item.word}</button>
        <div class="answer-grid">
          ${answers.map((answer) => `
            <button class="answer-btn" data-answer="${answer}" type="button">${answer}</button>
          `).join("")}
        </div>
        <p class="question-feedback ${state ? "is-visible" : ""}" data-feedback>${state}</p>
      `;
      questionNode.classList.remove("is-done", "is-good", "is-bad");
      questionNode.classList.add("is-visible");
      renderTiles();
      PipiUtils.showTranslation(root, item);
      PipiAudio.stop();
      PipiAudio.speakWord(item, { withVietnamese: false });
      pipi?.setState("hi", `Mảnh ${index + 1}: ${item.word}.`);
    }

    function completeGame() {
      completed = true;
      PipiAudio.stop();
      session.complete({ score: total, total, correct: total, wrong: 0, passed: true });
      pipi?.setState("win", "Tuyệt vời! Bé đã mở hết bức tranh rồi.", "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành rồi! Mình sang bài tiếp theo nào!");
      rematchButton.hidden = false;
      questionNode.innerHTML = `
        <p class="question-kicker">Great job!</p>
        <p class="puzzle-done">Bé đã mở khóa toàn bộ bức tranh.</p>
      `;
      questionNode.classList.add("is-visible", "is-done");
      renderTiles();
    }

    function answerQuestion(answer) {
      if (activeIndex === null || completed || answerLocked) return;
      const item = questions[activeIndex];
      const correct = answer === (item.vi || item.word);
      const tile = frameNode.querySelector(`[data-tile="${activeIndex}"]`);
      const feedback = questionNode.querySelector("[data-feedback]");

      PipiAudio.stop();
      session.answer({
        action: "select-answer",
        word: item.word,
        target: item.vi,
        answer,
        correct,
        score: unlocked.size,
        total
      });

      if (correct) {
        answerLocked = true;
        unlocked.add(activeIndex);
        tile?.classList.add("is-correct-ping");
        feedback.textContent = "Đúng rồi!";
        feedback.classList.add("is-visible", "is-good");
        questionNode.classList.remove("is-bad");
        questionNode.classList.add("is-good");
        pipi?.setState("happy", "Đúng rồi! Mảnh ghép đã mở.");
        updateScore();

        window.setTimeout(() => {
          if (unlocked.size >= total) {
            completeGame();
            window.setTimeout(() => {
              questionNode.innerHTML = "";
              questionNode.classList.remove("is-visible", "is-done", "is-good", "is-bad");
            }, 1000);
          } else {
            hideQuestion();
          }
        }, 620);
        return;
      }

      tile?.classList.add("is-wrong-ping");
      feedback.textContent = data.chooseAgainText;
      feedback.classList.add("is-visible", "is-bad");
      questionNode.classList.remove("is-good");
      questionNode.classList.add("is-bad");
      pipi?.wrong("Chưa đúng rồi.", "Mình chọn lại nhé!");
      window.setTimeout(() => tile?.classList.remove("is-wrong-ping"), 620);
    }

    renderTiles();
    session.start({ score: 0, total });
    pipi?.setState("hi", data.guideText);

    frameNode.addEventListener("click", (event) => {
      const tile = event.target.closest("[data-tile]");
      if (!tile || tile.disabled) return;
      renderQuestion(Number(tile.dataset.tile));
      session.interaction({ action: "open-tile", tile: Number(tile.dataset.tile) + 1 });
    });

    questionNode.addEventListener("click", (event) => {
      const answer = event.target.closest("[data-answer]");
      if (answer) {
        answerQuestion(answer.dataset.answer);
        return;
      }

      const wordButton = event.target.closest("[data-word]");
      if (wordButton && activeIndex !== null) {
        PipiAudio.stop();
        PipiAudio.speakWord(questions[activeIndex], { withVietnamese: false });
      }
    });

    guideButton.addEventListener("click", () => {
      PipiAudio.stop();
      PipiAudio.speak(data.guideText, { lang: "vi-VN", rate: 0.92 });
    });

    rematchButton.addEventListener("click", () => {
      PipiAudio.stop();
      mount(root, config, context);
    });

    root.__picturePuzzleCleanup = () => PipiAudio.stop();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.picturePuzzle = { mount, defaultConfig };
})();
