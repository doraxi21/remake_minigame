(function () {
  const lessonId = new URLSearchParams(window.location.search).get("lesson") || "grade-3/unit-1/lesson-1";
  const lesson = window.PipiContentLoader?.getLesson(lessonId) || window.PipiLesson;
  const state = {
    activeIndex: 0,
    completed: new Set(),
    progress: {}
  };

  const activityRoot = document.querySelector("[data-activity-root]");
  const tocRoot = document.querySelector("[data-toc]");
  const tocPanel = document.querySelector("[data-toc-panel]");
  const tocToggleButton = document.querySelector("[data-toc-toggle]");
  const tocCloseButton = document.querySelector("[data-toc-close]");
  const titleNode = document.querySelector("[data-lesson-title]");
  const progressNode = document.querySelector("[data-progress]");
  const previousButton = document.querySelector("[data-prev]");
  const nextButton = document.querySelector("[data-next]");
  const slideFrame = document.querySelector(".slide-frame");
  const lessonMain = document.querySelector(".lesson-main");
  const pipi = PipiMascot.create({ root: document, assetBase: "../", deferIntro: true });

  titleNode.textContent = lesson.title;

  const gameMap = {
    listenTap: window.PipiGames.listenTap,
    listenColor: window.PipiGames.listenColor,
    balloonPop: window.PipiGames.balloonPop,
    matchPairs: window.PipiGames.matchPairs,
    sortBaskets: window.PipiGames.sortBaskets,
    wordDrop: window.PipiGames.wordDrop,
    shadowMatch: window.PipiGames.shadowMatch,
    listenArrange: window.PipiGames.listenArrange,
    treasureHunt: window.PipiGames.treasureHunt,
    sequenceOrder: window.PipiGames.sequenceOrder,
    memoryFlip: window.PipiGames.memoryFlip,
    mazePath: window.PipiGames.mazePath,
    pipiQuiz: window.PipiGames.pipiQuiz,
    oddOneOut: window.PipiGames.oddOneOut,
    listenChoosePath: window.PipiGames.listenChoosePath,
    picturePuzzle: window.PipiGames.picturePuzzle,
    countingAnimals: window.PipiGames.countingAnimals,
    wordBuilder: window.PipiGames.wordBuilder,
    soundCatcher: window.PipiGames.soundCatcher
  };

  function renderToc() {
    tocRoot.innerHTML = lesson.activities.map((activity, index) => `
      <button class="toc-item ${index === state.activeIndex ? "is-active" : ""} ${state.completed.has(activity.id) ? "is-done" : ""}" data-index="${index}" type="button">
        <strong>${index + 1}. ${activity.title}</strong>
        <span>${activity.type}</span>
      </button>
    `).join("");
  }

  function rememberProgress(activity, patch) {
    state.progress[activity.id] = {
      ...(state.progress[activity.id] || {}),
      ...patch
    };
  }

  function renderCover(activity) {
    slideFrame.classList.add("is-cover");
    slideFrame.classList.remove("is-outro");
    lessonMain?.classList.remove("is-outro-main");
    activityRoot.className = "cover-slide";
    activityRoot.innerHTML = `
      <div class="grade-picker">
        <button class="primary-btn" data-grade="3" type="button">Grade 3</button>
        <button class="primary-btn" data-grade="4" type="button">Grade 4</button>
        <button class="primary-btn" data-grade="5" type="button">Grade 5</button>
      </div>
    `;
    activityRoot.querySelectorAll("[data-grade]").forEach((button) => {
      button.addEventListener("click", () => {
        rememberProgress(activity, { grade: button.dataset.grade });
        goTo(1);
      });
    });
  }

  function renderOutro(activity) {
    slideFrame.classList.remove("is-cover");
    slideFrame.classList.add("is-outro");
    lessonMain?.classList.add("is-outro-main");
    activityRoot.className = "outro-slide";
    activityRoot.innerHTML = "";
    nextButton.textContent = "Về chọn game";
    nextButton.disabled = false;
  }

  function renderActivity() {
    const activity = lesson.activities[state.activeIndex];
    PipiAudio.stop();
    lessonMain?.classList.remove("is-outro-main");
    slideFrame.classList.remove("is-cover", "is-outro");
    renderToc();
    progressNode.textContent = `${state.activeIndex + 1} / ${lesson.activities.length}`;
    previousButton.disabled = state.activeIndex === 0;
    nextButton.disabled = false;
    nextButton.textContent = state.activeIndex === lesson.activities.length - 1 ? "Về chọn game" : "Tiếp";

    if (activity.type === "cover") {
      renderCover(activity);
      return;
    }

    if (activity.type === "outro") {
      renderOutro(activity);
      return;
    }

    activityRoot.className = "activity-card";
    activityRoot.innerHTML = `
      <div class="activity-title">
        <p class="eyebrow">Activity ${state.activeIndex + 1}</p>
        <h1>${activity.title}</h1>
      </div>
      <div data-game-mount></div>
    `;

    pipi.resetPage("Mình cùng chơi tiếp nhé!");

    const game = gameMap[activity.type];
    const mountPoint = activityRoot.querySelector("[data-game-mount]");
    game.mount(mountPoint, { id: activity.id, ...(activity.config || {}) }, {
      pipi,
      onStart(event) {
        rememberProgress(activity, {
          state: event.state,
          score: event.score,
          total: event.total
        });
      },
      onStateChange(event) {
        rememberProgress(activity, { state: event.state });
      },
      onScoreChange(event) {
        rememberProgress(activity, { score: event.score, total: event.total });
      },
      onAnswer(event) {
        rememberProgress(activity, {
          lastAnswer: {
            correct: event.correct,
            word: event.word,
            target: event.target,
            action: event.action
          }
        });
      },
      onInteraction(event) {
        rememberProgress(activity, { lastInteraction: event.action });
      },
      onComplete(result) {
        state.completed.add(activity.id);
        rememberProgress(activity, {
          state: result.state,
          status: result.status,
          score: result.score,
          total: result.total,
          correct: result.correct,
          wrong: result.wrong,
          passed: result.passed
        });
        renderToc();
      }
    });
  }

  function goTo(index) {
    if (index < 0) return;
    if (index >= lesson.activities.length) {
      window.location.href = "../index.html";
      return;
    }
    state.activeIndex = index;
    renderActivity();
  }

  tocRoot.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    tocPanel?.classList.remove("is-open");
    goTo(Number(button.dataset.index));
  });

  tocToggleButton?.addEventListener("click", () => {
    tocPanel?.classList.toggle("is-open");
  });

  tocCloseButton?.addEventListener("click", () => {
    tocPanel?.classList.remove("is-open");
  });

  previousButton.addEventListener("click", () => goTo(state.activeIndex - 1));
  nextButton.addEventListener("click", () => goTo(state.activeIndex + 1));

  renderActivity();
})();
