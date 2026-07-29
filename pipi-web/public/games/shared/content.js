(function () {
  const vocabulary = [
    { id: "apple", word: "apple", vi: "qu\u1ea3 t\u00e1o", phonics: "a", topic: "food", emoji: "\ud83c\udf4e", image: "../assets/vocabulary/food/apple.png", audioEn: "", audioVi: "" },
    { id: "banana", word: "banana", vi: "qu\u1ea3 chu\u1ed1i", phonics: "b", topic: "food", emoji: "\ud83c\udf4c", image: "../assets/vocabulary/food/banana.png", audioEn: "", audioVi: "" },
    { id: "cat", word: "cat", vi: "con m\u00e8o", phonics: "c", topic: "animals", emoji: "\ud83d\udc31", image: "../assets/vocabulary/animals/cat.png", audioEn: "", audioVi: "" },
    { id: "dog", word: "dog", vi: "con ch\u00f3", phonics: "d", topic: "animals", emoji: "\ud83d\udc36", image: "../assets/vocabulary/animals/dog.png", audioEn: "", audioVi: "" },
    { id: "fish", word: "fish", vi: "con c\u00e1", phonics: "f", topic: "animals", emoji: "\ud83d\udc1f", image: "", audioEn: "", audioVi: "" },
    { id: "sun", word: "sun", vi: "m\u1eb7t tr\u1eddi", phonics: "s", topic: "nature", emoji: "\u2600\ufe0f", image: "", audioEn: "", audioVi: "" },
    { id: "butterfly", word: "butterfly", vi: "con b\u01b0\u1edbm", phonics: "b", topic: "animals", emoji: "\ud83e\udd8b", image: "", audioEn: "", audioVi: "" },
    { id: "elephant", word: "elephant", vi: "con voi", phonics: "e", topic: "animals", emoji: "\ud83d\udc18", image: "", audioEn: "", audioVi: "" },
    { id: "rainbow", word: "rainbow", vi: "c\u1ea7u v\u1ed3ng", phonics: "r", topic: "nature", emoji: "\ud83c\udf08", image: "", audioEn: "", audioVi: "" },
    { id: "cake", word: "cake", vi: "b\u00e1nh kem", phonics: "c", topic: "food", emoji: "\ud83c\udf70", image: "../assets/vocabulary/food/cake.png", audioEn: "", audioVi: "" },
    { id: "kite", word: "kite", vi: "c\u00e1i di\u1ec1u", phonics: "k", topic: "toys", emoji: "\ud83e\ude81", image: "../assets/vocabulary/toys/kite.png", audioEn: "", audioVi: "" },
    { id: "kangaroo", word: "kangaroo", vi: "con kangaroo", phonics: "k", topic: "animals", emoji: "\ud83e\udd98", image: "../assets/vocabulary/animals/kangaroo.png", audioEn: "", audioVi: "" }
  ];

  window.PipiContent = {
    vocabulary,
    listenTap: {
      rounds: 5,
      promptField: "vi",
      choiceField: "word",
      promptPrefix: "H\u00e3y ch\u1ecdn h\u00ecnh/t\u1eeb:",
      items: vocabulary
    },
    listenColor: {
      rounds: 5,
      choiceCount: 4,
      guideText: "Nghe m\u00e0u v\u00e0 t\u00f4 \u0111\u00fang \u00f4",
      promptPrefix: "H\u00e3y t\u00f4 m\u00e0u:"
    },
    balloonPop: {
      targetLetter: "random",
      minTargetCount: 3,
      maxTargetCount: 4,
      balloonCount: 12
    },
    matchPairs: {
      guideText: "Gh\u00e9p h\u00ecnh v\u1edbi t\u1eeb \u0111\u00fang",
      pairs: vocabulary.filter((item) => ["apple", "cat", "fish", "sun"].includes(item.word))
    },
    wordDrop: {
      guideText: "K\u00e9o t\u1eeb v\u00e0o \u0111\u00fang h\u00ecnh",
      items: vocabulary.filter((item) => ["cake", "kite", "kangaroo"].includes(item.word))
    },
    shadowMatch: {
      guideText: "K\u00e9o h\u00ecnh v\u00e0o \u0111\u00fang b\u00f3ng",
      items: vocabulary.filter((item) => ["apple", "banana", "cat", "dog"].includes(item.word))
    },
    listenArrange: {
      rounds: 4,
      guideText: "Listen and arrange the words",
      sentences: [
        { id: "i-see-a-cat", text: "I see a cat", vi: "Con nh\u00ecn th\u1ea5y m\u1ed9t con m\u00e8o", parts: ["I", "see", "a", "cat"] },
        { id: "i-like-apple", text: "I like apple", vi: "Con th\u00edch qu\u1ea3 t\u00e1o", parts: ["I", "like", "apple"] },
        { id: "this-is-a-dog", text: "This is a dog", vi: "\u0110\u00e2y l\u00e0 m\u1ed9t con ch\u00f3", parts: ["This", "is", "a", "dog"] },
        { id: "i-see-a-kite", text: "I see a kite", vi: "Con nh\u00ecn th\u1ea5y c\u00e1i di\u1ec1u", parts: ["I", "see", "a", "kite"] }
      ]
    },
    treasureHunt: {
      rounds: 5,
      guideText: "Find the object",
      promptPrefix: "Find:",
      background: "../assets/png/background.png",
      hotspots: [
        { item: vocabulary.find((item) => item.word === "apple"), x: 19, y: 75, size: 11 },
        { item: vocabulary.find((item) => item.word === "banana"), x: 42, y: 78, size: 12 },
        { item: vocabulary.find((item) => item.word === "cat"), x: 70, y: 70, size: 11 },
        { item: vocabulary.find((item) => item.word === "dog"), x: 84, y: 67, size: 12 },
        { item: vocabulary.find((item) => item.word === "kite"), x: 57, y: 37, size: 12 }
      ]
    },
    memoryFlip: {
      guideText: "L\u1eadt th\u1ebb v\u00e0 gh\u00e9p h\u00ecnh v\u1edbi t\u1eeb",
      items: vocabulary.filter((item) => ["apple", "banana", "cat", "dog"].includes(item.word))
    },
    mazePath: {
      guideText: "T\u00ecm \u0111\u01b0\u1eddng theo ch\u1eef \u0111\u00fang",
      target: "A",
      targetLabel: "ch\u1eef A",
      rows: 5,
      cols: 5,
      cells: [
        "start", "A", "B", "C", "D",
        "B", "A", "A", "A", "E",
        "C", "D", "B", "A", "F",
        "G", "A", "A", "A", "H",
        "I", "A", "J", "A", "goal"
      ]
    },
    pipiQuiz: {
      rounds: 5,
      mode: "image-to-word",
      guideText: "Ch\u1ecdn \u0111\u00e1p \u00e1n \u0111\u00fang",
      items: vocabulary.filter((item) => ["apple", "banana", "cat", "dog", "cake", "kite"].includes(item.word))
    },
    oddOneOut: {
      rounds: 5,
      choiceCount: 4,
      ruleField: "topic",
      guideText: "T\u00ecm h\u00ecnh kh\u00e1c nh\u00f3m",
      promptPrefix: "Ch\u1ecdn h\u00ecnh kh\u00f4ng thu\u1ed9c nh\u00f3m:",
      items: vocabulary
    },
    listenChoosePath: {
      rounds: 5,
      choiceCount: 4,
      guideText: "Nghe v\u00e0 ch\u1ecdn \u0111\u01b0\u1eddng \u0111\u00fang",
      promptPrefix: "H\u00e3y ch\u1ecdn \u0111\u01b0\u1eddng t\u1edbi:",
      promptField: "vi",
      items: vocabulary
    },
    picturePuzzle: {
      difficulty: 2,
      guideText: "M\u1edf m\u1ea3nh gh\u00e9p v\u00e0 ch\u1ecdn ngh\u0129a \u0111\u00fang",
      questionText: "Ngh\u0129a c\u1ee7a t\u1eeb n\u00e0y l\u00e0 g\u00ec?",
      chooseAgainText: "Ch\u1ecdn l\u1ea1i nh\u00e9",
      items: vocabulary
    },
    countingAnimals: {
      rounds: 5,
      minCount: 2,
      maxCount: 4,
      distractorCount: 8,
      guideText: "H\u00e3y \u0111\u1ebfm \u0111\u00fang con v\u1eadt",
      promptPrefix: "H\u00e3y t\u00ecm:",
      items: vocabulary.filter((item) => item.topic === "animals" && (item.image || item.emoji))
    },
    soundCatcher: {
      rounds: 5,
      guideText: "Nghe v\u00e0 b\u1eaft \u0111\u00fang th\u1ebb",
      promptPrefix: "H\u00e3y b\u1eaft:",
      choiceCount: 5,
      lanes: 3,
      items: vocabulary
    }
  };
})();
