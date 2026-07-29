(function () {
  // Kho 5 ma trận mẫu sử dụng kí tự đặc biệt "PATH" làm đường đi động.
  // Khi chạy game, hệ thống sẽ random chọn một chữ cái thực tế để lấp vào chỗ "PATH".
  const mazePresets = [
    {
      guideText: "Tìm đường theo chữ đúng",
      rows: 5,
      cols: 5,
      cells: [
        "start", "PATH", "B",    "C",    "D",
        "E",     "PATH", "F",    "G",    "H",
        "I",     "PATH", "PATH", "PATH", "J",
        "K",     "L",    "M",    "PATH", "N",
        "O",     "P",    "Q",    "PATH", "goal"
      ]
    },
    {
      guideText: "Tìm đường theo chữ đúng",
      rows: 5,
      cols: 5,
      cells: [
        "start", "X",    "Y",    "Z",    "W",
        "PATH",  "PATH", "PATH", "N",    "O",
        "P",     "Q",    "PATH", "R",    "S",
        "T",     "U",    "PATH", "V",    "E",
        "F",     "G",    "PATH", "PATH", "goal"
      ]
    },
    {
      guideText: "Tìm đường theo chữ đúng",
      rows: 5,
      cols: 5,
      cells: [
        "start", "PATH", "F",    "G",    "H",
        "I",     "PATH", "PATH", "PATH", "J",
        "K",     "L",    "M",    "PATH", "N",
        "O",     "P",    "Q",    "PATH", "R",
        "S",     "T",    "U",    "PATH", "goal"
      ]
    },
    {
      guideText: "Tìm đường theo chữ đúng",
      rows: 5,
      cols: 5,
      cells: [
        "start", "A",    "B",    "C",    "D",
        "PATH",  "PATH", "PATH", "PATH", "E",
        "F",     "G",    "H",    "PATH", "I",
        "J",     "K",    "L",    "PATH", "M",
        "N",     "O",    "P",    "PATH", "goal"
      ]
    },
    {
      guideText: "Tìm đường theo chữ đúng",
      rows: 5,
      cols: 5,
      cells: [
        "start", "PATH", "X",    "Y",    "Z",
        "A",     "PATH", "PATH", "PATH", "B",
        "D",     "E",    "F",    "PATH", "G",
        "H",     "I",    "J",    "PATH", "K",
        "L",     "M",    "N",    "PATH", "goal"
      ]
    }
  ];

  // Danh sách các chữ cái cho bé học làm mục tiêu đường đi
  const availableTargetLetters = ["A", "B", "C", "D", "E", "H", "K", "M", "N", "S", "T", "X"];

  function normalizeValue(value) {
    return String(value || "").trim().toUpperCase();
  }

  function getCellLabel(value) {
    if (value === "start") return "Start";
    if (value === "goal") return "Goal";
    return value;
  }

  function isSpecial(value) {
    return value === "start" || value === "goal";
  }

  // Random chọn ngẫu nhiên một ma trận mẫu trong kho 5 ma trận
  function getRandomPreset() {
    const randomIndex = Math.floor(Math.random() * mazePresets.length);
    return JSON.parse(JSON.stringify(mazePresets[randomIndex])); // Deep copy để không làm hỏng dữ liệu gốc
  }

  function mount(root, config = {}, context = {}) {
    // 1. Lấy hoặc random ma trận mẫu
    let preset = getRandomPreset();
    if (config.cells && Array.isArray(config.cells) && config.cells.length > 0) {
      const rows = Number(config.rows) || 5;
      const cols = Number(config.cols) || 5;
      preset = {
        guideText: config.guideText || "Tìm đường theo chữ đúng",
        rows,
        cols,
        cells: config.cells.slice(0, rows * cols)
      };
    }

    const rows = Number(preset.rows) || 5;
    const cols = Number(preset.cols) || 5;

    // 2. Random chọn một chữ cái làm giá trị đường đi đúng (target) nếu chưa được chỉ định bên ngoài
    let target = normalizeValue(config.target);
    if (!target) {
      const randomIdx = Math.floor(Math.random() * availableTargetLetters.length);
      target = availableTargetLetters[randomIdx];
    }

    // 3. THAY THẾ TOÀN BỘ CÁC Ô "PATH" TRONG MA TRẬN BẰNG CHỮ CÁI TARGET THỰC TẾ
    // Các ô chữ cái khác (nhiễu) giữ nguyên, đảm bảo chữ mục tiêu trùng khớp 100% với đường đi
    let cells = preset.cells.map(cell => {
      if (cell === "PATH") {
        return target;
      }
      return cell;
    });

    // Nếu cấu hình bên ngoài truyền vào target khác, đảm bảo các ô không phải start/goal được đồng bộ
    const targetLabel = config.targetLabel || `chữ ${target}`;

    const data = {
      ...preset,
      rows,
      cols,
      cells,
      target,
      targetLabel
    };

    const session = PipiRuntime.createSession(context, { type: "mazePath", id: data.id });
    const startIndex = cells.findIndex((cell) => cell === "start");
    const goalIndex = cells.findIndex((cell) => cell === "goal");
    const pipi = context.pipi;
    let currentIndex = startIndex >= 0 ? startIndex : 0;
    let selected = new Set([currentIndex]);
    let completed = false;
    let wrongCount = 0;

    root.className = "maze-path";
    root.style.setProperty("--maze-cols", cols);
    root.innerHTML = `
      <div class="status-row">
        <p class="eyebrow">Maze Path</p>
        <strong>Sai: <span data-wrong>0</span></strong>
      </div>
      <div class="prompt">
        <span class="prompt-label">Tìm đường theo: ${data.targetLabel}</span>
        <button class="speaker-btn" data-guide type="button" aria-label="Nghe hướng dẫn">
          <span class="speaker-icon" aria-hidden="true">
            <span class="speaker-wave one"></span>
            <span class="speaker-wave two"></span>
          </span>
        </button>
      </div>
      <div class="translation-popover" data-translation></div>
      <div class="maze-grid" data-maze></div>
      <div data-completion></div>
    `;

    const mazeNode = root.querySelector("[data-maze]");
    const completionNode = root.querySelector("[data-completion]");
    const guideButton = root.querySelector("[data-guide]");
    pipi?.setSpecialEncouragement("");

    function isAdjacent(a, b) {
      const ar = Math.floor(a / cols);
      const ac = a % cols;
      const br = Math.floor(b / cols);
      const bc = b % cols;
      return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
    }

    function isCorrectCell(value) {
      return isSpecial(value) || normalizeValue(value) === target;
    }

    function canReachGoal() {
      if (goalIndex < 0) return true;
      if (currentIndex === goalIndex) return true;

      const queue = [currentIndex];
      const visited = new Set([currentIndex]);

      while (queue.length) {
        const idx = queue.shift();
        if (idx === goalIndex) return true;

        const r = Math.floor(idx / cols);
        const c = idx % cols;
        const neighbors = [];
        if (r > 0) neighbors.push(idx - cols);
        if (r < rows - 1) neighbors.push(idx + cols);
        if (c > 0) neighbors.push(idx - 1);
        if (c < cols - 1) neighbors.push(idx + 1);

        neighbors.forEach((next) => {
          if (visited.has(next)) return;
          if (selected.has(next)) return;
          if (!isCorrectCell(cells[next])) return;
          visited.add(next);
          queue.push(next);
        });
      }

      return false;
    }

    function cellKind(value, index) {
      if (index === currentIndex) return "is-current";
      if (selected.has(index)) return "is-path";
      if (value === "start") return "is-start";
      if (value === "goal") return "is-goal";
      return "";
    }

    function renderMaze() {
      mazeNode.innerHTML = cells.map((value, index) => `
        <button class="maze-cell ${cellKind(value, index)}" data-index="${index}" data-value="${value}" type="button">
          ${getCellLabel(value)}
        </button>
      `).join("");
    }

    function completeGame() {
      completed = true;
      PipiAudio.stop();
      session.complete({ score: cells.length - wrongCount, total: cells.length, correct: selected.size, wrong: wrongCount, passed: true });
      mazeNode.classList.add("is-complete");
      mazeNode.querySelectorAll(".maze-cell").forEach((button) => {
        button.disabled = true;
      });
      pipi?.setState("win", "Tuyệt vời! Bé đã tìm được đường đến đích.", "jumping");
      pipi?.setSpecialEncouragement("Bạn đã hoàn thành đường đi rồi! Mình sang bài tiếp theo nào!");
      completionNode.innerHTML = `
        <div class="maze-win">
          <strong>Đến đích!</strong>
          <span>Bé đã đi đúng theo ${data.targetLabel}.</span>
          <button class="primary-btn" data-rematch type="button">Chơi lại</button>
        </div>
      `;
      completionNode.querySelector("[data-rematch]").addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });
    }

    function failGame() {
      if (completed) return;
      completed = true;
      PipiAudio.stop();
      session.answer({ action: "dead-end", correct: false, score: selected.size, total: cells.length, wrong: wrongCount });
      session.complete({ score: selected.size, total: cells.length, correct: selected.size, wrong: wrongCount, passed: false });
      mazeNode.classList.add("is-failed");
      mazeNode.querySelectorAll(".maze-cell").forEach((button) => {
        button.disabled = true;
      });
      
      pipi?.wrong("Đường đi đã bị chặn mất rồi.", "Mình thử lại nhé!");
      
      pipi?.setSpecialEncouragement("");
      completionNode.innerHTML = `
        <div class="maze-lose">
          <strong>Chưa tới được đích!</strong>
          <span>Đường đi đã bị chặn, không còn cách nào tới ${data.targetLabel} tiếp nữa. Mình thử lại nhé!</span>
          <button class="primary-btn" data-rematch type="button">Chơi lại</button>
        </div>
      `;
      completionNode.querySelector("[data-rematch]").addEventListener("click", () => {
        PipiAudio.stop();
        mount(root, config, context);
      });
    }

    function markWrong(button, value) {
      wrongCount += 1;
      PipiUtils.setText(root, "[data-wrong]", wrongCount);
      button.classList.add("is-wrong");
      const token = PipiAudio.stop();
      const message = isAdjacent(currentIndex, Number(button.dataset.index))
        ? `Không đúng rồi, hãy chọn ${data.targetLabel}.`
        : "Ô này chưa nối với đường đi.";
      const wrongFlow = pipi?.wrong(message, "Hãy cố lên!");
      session.answer({ action: "step", value, correct: false, wrong: wrongCount });
      Promise.resolve(wrongFlow).then(() => {
        if (PipiAudio.isCurrent(token)) {
          PipiAudio.speak(getCellLabel(value), { lang: "en-US", rate: 0.82 });
        }
      });
      window.setTimeout(() => button.classList.remove("is-wrong"), 850);
    }

    mazeNode.addEventListener("click", (event) => {
      const button = event.target.closest("[data-index]");
      if (!button || completed) return;

      const index = Number(button.dataset.index);
      const value = cells[index];
      if (index === currentIndex || selected.has(index)) return;

      if (!isAdjacent(currentIndex, index) || !isCorrectCell(value)) {
        markWrong(button, value);
        return;
      }

      const token = PipiAudio.stop();
      currentIndex = index;
      selected.add(index);
      session.answer({ action: "step", value, correct: true, score: selected.size, total: cells.length });
      pipi?.setState("happy", value === "goal" ? "Đến đích rồi!" : "Đi đúng rồi!", "clapping");
      renderMaze();

      if (index === goalIndex) {
        window.setTimeout(completeGame, data.winDelayMs || 450);
        return;
      }

      if (PipiAudio.isCurrent(token)) {
        PipiAudio.speak(getCellLabel(value), { lang: "en-US", rate: 0.82 });
      }

      if (!canReachGoal()) {
        window.setTimeout(failGame, data.loseDelayMs || 700);
      }
    });

    guideButton.addEventListener("click", () => {
      PipiAudio.stop();
      PipiAudio.speak(`${data.guideText}. Hãy đi qua ${data.targetLabel}.`, { lang: "vi-VN", rate: 0.92 });
    });

    session.start({ score: 0, total: cells.length, target });
    pipi?.setState("hi", `Tìm đường đi qua ${data.targetLabel} nhé.`);
    renderMaze();
  }

  window.PipiGames = window.PipiGames || {};
  window.PipiGames.mazePath = { mount, defaultConfig: mazePresets[0] };
})();
