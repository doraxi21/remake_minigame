(function () {
  window.PipiContentLoader.registerLesson("grade-3/unit-1/lesson-1", {
    id: "grade-3-unit-1-lesson-1",
    unitId: "grade-3/unit-1",
    title: "Unit 1 - Pipi English Test",
    activities: [
      {
        id: "cover",
        type: "cover",
        title: "Pipi Test 1",
        subtitle: "Complete the challenges with Pipi"
      },
      {
        id: "listen-vi-to-en",
        type: "listenTap",
        title: "Vietnamese to English",
        config: {
          mode: "vi-to-en",
          rounds: 5,
          promptDelayMs: 350,
          nextDelayMs: 650,
          items: ["apple", "banana", "cat", "dog", "sun"]
        }
      },
      {
        id: "listen-en-to-vi",
        type: "listenTap",
        title: "English to Vietnamese",
        config: {
          mode: "en-to-vi",
          rounds: 5,
          promptDelayMs: 350,
          nextDelayMs: 650,
          items: ["apple", "banana", "cat", "dog", "sun"]
        }
      },
      {
        id: "listen-color",
        type: "listenColor",
        title: "Listen and color",
        config: {
          rounds: 5,
          choiceCount: 4,
          guideText: "Nghe màu và tô đúng ô",
          promptPrefix: "Hãy tô màu:"
        }
      },
      {
        id: "letter-random",
        type: "balloonPop",
        title: "Find the letters",
        config: {
          targetLetter: "random",
          minTargetCount: 3,
          maxTargetCount: 4,
          balloonCount: 12
        }
      },
      {
        id: "match-words",
        type: "matchPairs",
        title: "Match pictures",
        config: {
          pairs: ["apple", "cat", "fish", "sun"]
        }
      },
      {
        id: "sort-food-animals",
        type: "sortBaskets",
        title: "Sort pictures",
        config: {
          guideText: "Kéo hình vào đúng bảng",
          checkText: "Let's check",
          groups: [
            {
              id: "food",
              theme: "food",
              label: "Food",
              vi: "đồ ăn",
              icon: "🍽️",
              items: ["apple", "banana"]
            },
            {
              id: "animals",
              theme: "animals",
              label: "Animals",
              vi: "con vật",
              icon: "🐾",
              items: ["cat", "dog", "fish"]
            }
          ]
        }
      },
      {
        id: "drop-words",
        type: "wordDrop",
        title: "Drop the words",
        config: {
          guideText: "Kéo từ vào đúng hình",
          checkText: "Check",
          items: ["cake", "kite", "kangaroo"]
        }
      },
      {
        id: "shadow-match",
        type: "shadowMatch",
        title: "Shadow Match",
        config: {
          guideText: "Kéo hình vào đúng bóng",
          maxItems: 4,
          items: ["apple", "banana", "cat", "dog"]
        }
      },
      {
        id: "listen-arrange",
        type: "listenArrange",
        title: "Listen and arrange",
        config: {
          rounds: 4,
          guideText: "Listen and arrange the words",
          promptDelayMs: 300,
          sentences: [
            { id: "i-see-a-cat", text: "I see a cat", vi: "Con nhìn thấy một con mèo", parts: ["I", "see", "a", "cat"] },
            { id: "i-like-apple", text: "I like apple", vi: "Con thích quả táo", parts: ["I", "like", "apple"] },
            { id: "this-is-a-dog", text: "This is a dog", vi: "Đây là một con chó", parts: ["This", "is", "a", "dog"] },
            { id: "i-see-a-kite", text: "I see a kite", vi: "Con nhìn thấy cái diều", parts: ["I", "see", "a", "kite"] }
          ]
        }
      },
      {
        id: "treasure-hunt",
        type: "treasureHunt",
        title: "Treasure Hunt",
        config: {
          rounds: 5,
          guideText: "Find the object",
          promptPrefix: "Find:",
          promptDelayMs: 350,
          nextDelayMs: 500,
          background: "../assets/png/background.png",
          hotspots: [
            { item: "apple", x: 19, y: 75, size: 11 },
            { item: "banana", x: 42, y: 78, size: 12 },
            { item: "cat", x: 70, y: 70, size: 11 },
            { item: "dog", x: 84, y: 67, size: 12 },
            { item: "kite", x: 57, y: 37, size: 12 }
          ]
        }
      },
      {
        id: "order-match",
        type: "sequenceOrder",
        title: "Match in order",
        config: {
          guideText: "Kéo hình/từ về đúng cặp",
          checkText: "Check",
          layout: "word-to-picture",
          items: ["cake", "kite", "kangaroo", "apple", "banana"]
        }
      },
      {
        id: "memory-picture-word",
        type: "memoryFlip",
        title: "Memory cards",
        config: {
          guideText: "Lật thẻ và ghép hình với từ",
          items: ["apple", "banana", "cat", "dog"]
        }
      },
      {
        id: "maze-letter-a",
        type: "mazePath",
        title: "Find the path",
        config: {
          guideText: "Tìm đường theo chữ đúng"
        }
      },
      {
        id: "quick-quiz",
        type: "pipiQuiz",
        title: "Pipi Quiz",
        config: {
          rounds: 5,
          mode: "image-to-word",
          guideText: "Chọn đáp án đúng",
          promptDelayMs: 350,
          nextDelayMs: 650,
          items: ["apple", "banana", "cat", "dog", "cake", "kite"]
        }
      },
      {
        id: "odd-one-out",
        type: "oddOneOut",
        title: "Odd One Out",
        config: {
          rounds: 5,
          choiceCount: 4,
          ruleField: "topic",
          guideText: "Tìm hình khác nhóm",
          promptPrefix: "Chọn hình không thuộc nhóm:",
          items: ["apple", "banana", "cat", "dog", "cake", "kite", "kangaroo", "sun", "rainbow"]
        }
      },
      {
        id: "listen-choose-path",
        type: "listenChoosePath",
        title: "Listen and choose path",
        config: {
          rounds: 5,
          choiceCount: 4,
          guideText: "Nghe và chọn đường đúng",
          promptPrefix: "Hãy chọn đường tới:",
          promptField: "vi",
          items: ["apple", "banana", "cat", "dog", "cake", "kite", "kangaroo", "sun", "rainbow"]
        }
      },
      {
        id: "picture-puzzle",
        type: "picturePuzzle",
        title: "Picture Puzzle",
        config: {
          // Đổi tay tại đây: 2 = 2x2, 3 = 3x3, 4 = 4x4.
          difficulty: 2,
          guideText: "Mở mảnh ghép và chọn nghĩa đúng",
          questionText: "Nghĩa của từ này là gì?",
          chooseAgainText: "Chọn lại nhé",
          items: ["apple", "banana", "cat", "dog", "cake", "kite"]
        }
      },
      {
        id: "counting-animals",
        type: "countingAnimals",
        title: "Counting Animals",
        config: {
          rounds: 5,
          minCount: 2,
          maxCount: 4,
          distractorCount: 8,
          guideText: "H\u00e3y \u0111\u1ebfm \u0111\u00fang con v\u1eadt",
          promptPrefix: "H\u00e3y t\u00ecm:",
          items: ["cat", "dog", "kangaroo", "fish", "butterfly", "elephant"]
        }
      },
      {
        id: "build-words",
        type: "wordBuilder",
        title: "Build the word",
        config: {
          rounds: 5,
          guideText: "Look and build the word",
          checkText: "Check",
          nextText: "Next",
          promptDelayMs: 300,
          extraLetters: 1,
          showWordHint: false,
          items: ["dog", "fish", "butterfly", "elephant", "rainbow"]
        }
      },
      {
        id: "catch-sounds",
        type: "soundCatcher",
        title: "Catch the sound",
        config: {
          rounds: 5,
          guideText: "Nghe và bắt đúng thẻ",
          promptPrefix: "Hãy bắt:",
          choiceCount: 5,
          lanes: 3,
          promptDelayMs: 350,
          nextDelayMs: 500,
          items: ["apple", "banana", "cat", "dog", "fish", "sun"]
        }
      },
      {
        id: "outro",
        type: "outro",
        title: "Great job",
        subtitle: "Bạn đã hoàn thành bài học cùng Pipi!"
      }
    ]
  });
})();
