# Pipi Mini Games

Thu muc `mini-games` la bo mini game doc lap, duoc thiet ke de chay rieng khi test va co the nhung vao lesson player cua web goc sau nay.

Muc tieu quan trong:

- Moi game co the chay bang `mount(container, config, context)`.
- Noi dung bai hoc nam trong `content/`, khong nen hard-code trong logic game.
- Asset anh/audio/video co the thay doi bang data.
- Web goc co the bat su kien `onStart`, `onAnswer`, `onScoreChange`, `onComplete` de luu tien do.

## Doc nhanh: tai sao can chuan hoa?

Huong hien tai khong xem moi game la mot trang rieng biet hoan toan, ma xem moi game la mot **module co the gan vao bat ky vi tri nao tren web**.

Vi du sau nay web goc co trang:

```text
Grade 3 -> Unit 1 -> Lesson 1 -> Activity 3
```

Thi Activity 3 chi can tao mot khung rong:

```html
<div id="activity-game"></div>
```

Sau do goi:

```js
PipiGames.listenTap.mount(activityGame, lessonGameConfig, lessonContext);
```

Nhu vay:

- Game khong can biet no dang nam trong trang nao.
- Web goc khong can biet chi tiet ben trong game.
- Noi dung bai hoc co the thay doi bang `config`.
- Ket qua hoc sinh co the tra ve web goc qua callback.

Co the hieu ngan gon:

```text
mount = gan game vao man hinh
config = noi dung va luat cua lan choi nay
context = cau noi giua game va web goc
callback = cach game bao lai cho web goc biet hoc sinh dang lam gi
```

Day la ly do cac game nen dung chung mot mau ham `mount(container, config, context)`.

## 1. Cau truc tong quan

```text
mini-games/
  index.html
  README.md
  assets/
    mp3/
    mp4/
    pipi/
    png/
    vocabulary/
      animals/
      food/
      toys/
  shared/
    audio.js
    base.css
    content-loader.js
    content.js
    game-runtime.js
    pipi.css
    pipi.js
    utils.js
  content/
    grade-3/
      unit-1/
        unit.js
        vocabulary.js
        lessons/
          lesson-1.js
    _docs/
      content-structure.md
  lesson-player/
    index.html
    player.js
    style.css
    lesson-data.js
  listen-tap/
    index.html
    game.js
    style.css
  balloon-pop/
    index.html
    game.js
    style.css
  match-pairs/
    index.html
    game.js
    style.css
  sort-baskets/
    index.html
    game.js
    style.css
  word-drop/
    index.html
    game.js
    style.css
  shadow-match/
    index.html
    game.js
    style.css
  listen-arrange/
    index.html
    game.js
    style.css
  picture-puzzle/
    index.html
    game.js
    style.css
  treasure-hunt/
    index.html
    game.js
    style.css
  sequence-order/
    index.html
    game.js
    style.css
  word-builder/
    index.html
    game.js
    style.css
  emotion-match/
    index.html
    game.js
    style.css
  sound-catcher/
    index.html
    game.js
    style.css
```

## 2. Vai tro tung khu vuc

### `index.html`

Trang chon game/test nhanh. Day khong phai lesson player that, chi la man hinh de mo tung mini game hoac Pipi Test.

### `assets/`

Chua tai nguyen dung chung.

- `assets/mp3/`: am thanh dung/sai/thang.
- `assets/mp4/`: animation Pipi nhu idle, vo tay, win, sai, fun.
- `assets/png/`: anh nen, Pipi fallback, intro/outro.
- `assets/pipi/`: asset logo/brand cua Pipi.
- `assets/vocabulary/`: anh minh hoa cho tu vung, co the tach theo chu de.

Sau nay nen tach them:

```text
assets/vocabulary/food/apple.png
assets/audio/words/en/apple.mp3
assets/audio/words/vi/apple.mp3
```

### `shared/`

Day la lop dung chung cua tat ca game. Neu sua file trong day thi co the anh huong nhieu game.

### `content/`

Chua du lieu theo grade/unit/lesson.

Vi du:

```text
content/grade-3/unit-1/vocabulary.js
content/grade-3/unit-1/lessons/lesson-1.js
```

Day la huong dung de sau nay moi grade co nhieu unit, moi unit co nhieu lesson, moi lesson co 1-2 mini game.

### `lesson-player/`

Khung Pipi Test hien tai. No doc lesson content roi lan luot mount cac mini game vao tung activity.

### Folder tung game

Moi game co 3 file chinh:

- `index.html`: trang test rieng cho game.
- `game.js`: logic chinh cua game.
- `style.css`: giao dien rieng cua game.

Khi tich hop vao web goc, thuong chi can `game.js` va cac file shared/content/assets. `index.html` chi giu lam playground/test.

Game hien co:

- `listen-tap`: nghe va chon hinh/tu dung.
- `balloon-pop`: tim chu cai trong bong bay.
- `match-pairs`: ghep hinh voi tu.
- `sort-baskets`: keo hinh vao nhom.
- `word-drop`: keo tu vao dung hinh.
- `shadow-match`: keo hinh vao dung bong/outline tuong ung.
- `listen-arrange`: nghe cau/cum tu roi sap xep cac manh tu theo dung thu tu.
- `treasure-hunt`: nghe yeu cau roi tim/cham dung vat trong mot buc tranh.
- `sequence-order`: sap xep hang duoi de ghep dung voi hang tren.
- `odd-one-out`: chon hinh/tu khac nhom theo topic, phonic hoac rule trong config.
- `listen-choose-path`: nghe tu muc tieu va chon dung o de Pipi di tiep tren duong.
- `picture-puzzle`: mo khoa tung manh ghep bang cau hoi nghia cua tu.
- `word-builder`: ghep chu cai thanh tu.
- `sound-catcher`: bat dung the theo am thanh.
- `emotion-match`: quan sat nhan vat va chon trang thai cam xuc phu hop.

## 3. `mount(container, config, context)` la gi?

Moi game expose mot ham `mount()`.

```js
PipiGames.wordBuilder.mount(container, config, context);
```

Y nghia:

- `container`: phan tu HTML ma game se render vao.
- `config`: noi dung/rule cua game.
- `context`: cac dich vu ben ngoai nhu Pipi, callback luu diem, callback khi hoan thanh.

Vi du:

```html
<div id="mini-game-root"></div>
```

```js
PipiGames.listenTap.mount(document.querySelector("#mini-game-root"), {
  id: "grade-3-unit-1-lesson-1-listen",
  rounds: 5,
  items: lessonItems
}, {
  pipi,
  onStart(event) {},
  onAnswer(event) {},
  onScoreChange(event) {},
  onComplete(result) {}
});
```

Nhu vay web goc khong can mo `listen-tap/index.html`. Web goc chi can tao mot container va goi `mount()`.

So sanh 2 cach:

```text
Cach test hien tai:
Mo listen-tap/index.html -> game tu tao man hinh rieng -> phu hop de test doc lap.

Cach tich hop sau nay:
Web goc tao container -> goi listenTap.mount(...) -> game hien trong lesson hien tai.
```

Cach thu hai muot hon cho lesson player vi:

- Khong reload ca trang.
- Co the giu trang thai lesson dang hoc.
- Co the luu diem/tien do ngay trong web goc.
- Co the chuyen activity tiep theo nhu slide bai giang.

## 4. `config` dung de lam gi?

`config` la cach dua noi dung/rule vao game ma khong can sua logic.

Vi du voi `listenTap`:

```js
{
  id: "listen-words",
  rounds: 5,
  mode: "vi-to-en",
  items: [
    { word: "apple", vi: "qua tao" },
    { word: "banana", vi: "qua chuoi" }
  ]
}
```

Dung `mode: "en-to-vi"` neu muon hien tu tieng Anh va cho hoc sinh chon nghia tieng Viet.

Vi du voi `balloonPop`:

```js
{
  id: "letter-random",
  targetLetter: "random",
  minTargetCount: 3,
  maxTargetCount: 4,
  balloonCount: 12
}
```

Vi du voi `memoryFlip`:

```js
{
  id: "memory-picture-word",
  guideText: "Lat the va ghep hinh voi tu",
  items: ["apple", "banana", "cat", "dog"]
}
```

Vi du voi `mazePath`:

```js
{
  id: "maze-letter-a",
  target: "A",
  targetLabel: "chu A",
  rows: 5,
  cols: 5,
  cells: [
    "start", "A", "B", "C", "D",
    "B", "A", "A", "A", "E",
    "C", "D", "B", "A", "F",
    "G", "A", "A", "A", "H",
    "I", "A", "J", "A", "goal"
  ]
}
```

Vi du voi `pipiQuiz`:

```js
{
  id: "quick-quiz",
  rounds: 5,
  mode: "image-to-word",
  items: ["apple", "banana", "cat", "dog"]
}
```

`mode` co the la `"image-to-word"`, `"vi-to-en"`, hoac `"en-to-vi"`.

Vi du voi `picturePuzzle`:

```js
{
  id: "picture-puzzle",
  difficulty: 2,
  backgrounds: [
    "../assets/background/pic_1.png",
    "../assets/background/pic_2.png",
    "../assets/background/pic_3.png"
  ],
  items: ["apple", "banana", "cat", "dog", "cake", "kite"]
}
```

`difficulty` la kich thuoc ma tran:

- `2`: 2x2, tong 4 manh.
- `3`: 3x3, tong 9 manh.
- `4`: 4x4, tong 16 manh.

Anh nen duoc lay ngau nhien trong `backgrounds`. Moi manh ghep gan voi mot cau hoi tu vung. Dung thi manh ghep mo ra, sai thi giu khoa va cho chon lai.

Vi du voi `wordBuilder`:

```js
{
  id: "build-words",
  rounds: 5,
  extraLetters: 1,
  items: ["dog", "fish", "butterfly"]
}
```

Neu items la string, `content-loader.js` co the resolve thanh vocabulary object day du khi chay trong lesson player.

## 5. `context` dung de lam gi?

`context` la cau noi giua game va he thong ben ngoai.

Thuong gom:

```js
{
  pipi,
  onStart(event) {},
  onAnswer(event) {},
  onScoreChange(event) {},
  onInteraction(event) {},
  onComplete(result) {}
}
```

Game khong tu luu database. Game chi bao ra ngoai qua callback. Web goc se tu quyet dinh luu tien do, mo bai tiep theo, tinh diem, hien thong bao.

Noi cach khac:

```text
Game chi phu trach: hien thi, tuong tac, tinh dung/sai trong lan choi.
Web goc phu trach: luu hoc sinh nao, lesson nao, diem nao, da mo khoa bai tiep theo chua.
```

Neu sau nay doi backend, doi framework, hoac doi lesson player, game van co the giu nguyen phan logic chinh.

## 6. Callback chuan

### `onStart(event)`

Chay khi game bat dau.

Dung de web goc danh dau hoc sinh da mo game.

```js
{
  gameId: "listen-words",
  type: "listenTap",
  state: "playing",
  score: 0,
  total: 5
}
```

### `onAnswer(event)`

Chay khi hoc sinh co mot cau tra loi/hanh dong kiem tra chinh.

```js
{
  gameId: "listen-words",
  type: "listenTap",
  state: "playing",
  action: "select",
  word: "apple",
  target: "apple",
  correct: true,
  score: 1,
  total: 5
}
```

Luu y:

- `word`: dap an hoc sinh vua chon.
- `target`: dap an dung/cau hoi hien tai.
- `correct`: dung hay sai.
- `score`: diem sau hanh dong do.
- `total`: tong so cau/muc can hoan thanh.

### `onScoreChange(event)`

Chay khi diem thay doi.

```js
{
  gameId: "listen-words",
  type: "listenTap",
  state: "playing",
  score: 2,
  total: 5
}
```

### `onInteraction(event)`

Chay voi tuong tac phu, vi du keo item, bam nghe lai, bam group sound. Khong nhat thiet la mot cau tra loi.

### `onComplete(result)`

Chay khi game ket thuc.

```js
{
  gameId: "listen-words",
  type: "listenTap",
  state: "completed",
  status: "completed",
  score: 5,
  total: 5,
  correct: 5,
  wrong: 0,
  passed: true
}
```

Web goc co the dung `passed` de mo activity tiep theo.

## 7. File logic quan trong trong `shared/`

### `shared/game-runtime.js`

File tao session chuan cho moi game.

Ham quan trong:

#### `PipiRuntime.createSession(context, meta)`

Tao mot session cho game.

```js
const session = PipiRuntime.createSession(context, {
  type: "listenTap",
  id: data.id
});
```

Tac dung:

- Luu state hien tai cua game.
- Chuan hoa callback cho web goc.
- Cung cap cac ham `start`, `score`, `answer`, `complete`.

#### `session.start(payload)`

Bao game bat dau.

```js
session.start({ score: 0, total: 5 });
```

Se goi:

- `context.onStateChange`
- `context.onStart`

#### `session.answer(payload)`

Bao hoc sinh vua tra loi/kiem tra.

```js
session.answer({
  action: "select",
  word: "apple",
  target: "apple",
  correct: true,
  score: 1,
  total: 5
});
```

Se goi:

- `context.onInteraction`
- `context.onAnswer`

#### `session.score(payload)`

Bao diem thay doi.

```js
session.score({ score: 2, total: 5 });
```

Se goi:

- `context.onScoreChange`

#### `session.complete(payload)`

Bao game da hoan thanh.

```js
session.complete({
  score: 5,
  total: 5,
  correct: 5,
  wrong: 0,
  passed: true
});
```

Se goi:

- `context.onStateChange`
- `context.onComplete`

#### `PipiRuntime.mergeConfig(defaultConfig, config)`

Gop config mac dinh voi config duoc truyen vao.

```js
const data = PipiRuntime.mergeConfig(defaultConfig, config);
```

### `shared/audio.js`

Quan ly tat ca am thanh/giong doc.

Ham quan trong:

#### `PipiAudio.speak(text, options)`

Doc mot doan text bang `speechSynthesis`.

```js
PipiAudio.speak("Co len nao!", { lang: "vi-VN" });
```

#### `PipiAudio.speakWord(item, options)`

Doc tu vung.

```js
PipiAudio.speakWord(item, { withVietnamese: true });
```

Thu tu uu tien:

1. Neu co `item.audioEn` thi phat mp3 tieng Anh.
2. Neu khong co `audioEn` thi dung giong trinh duyet doc `item.word`.
3. Neu `withVietnamese: true` va co `item.audioVi` thi phat mp3 tieng Viet.
4. Neu khong co `audioVi` thi dung giong trinh duyet doc `item.vi`.

#### `PipiAudio.playEffect(src, options)`

Phat mot file mp3 hieu ung.

```js
PipiAudio.playEffect("../assets/mp3/true_1.mp3");
```

#### `PipiAudio.playRandom(list, options)`

Phat ngau nhien mot file trong danh sach.

```js
PipiAudio.playRandom(["true_1.mp3", "true_2.mp3"]);
```

#### `PipiAudio.stop()`

Ngat toan bo speech/mp3 hien tai. Rat quan trong khi hoc sinh bam nhanh de tranh am thanh bi chong va bi ket promise.

### `shared/content-loader.js`

Quan ly dang ky va lay du lieu lesson/vocabulary.

Ham quan trong:

#### `registerUnit(unitId, unit)`

Dang ky thong tin unit.

#### `registerVocabulary(unitId, vocabulary)`

Dang ky danh sach tu vung cua unit.

#### `registerLesson(lessonId, lesson)`

Dang ky lesson.

#### `getVocabulary(unitId)`

Lay danh sach vocabulary cua unit.

#### `resolveItems(unitId, idsOrItems)`

Bien danh sach id/string thanh object vocabulary day du.

```js
resolveItems("grade-3/unit-1", ["apple", "cat"]);
```

Ket qua:

```js
[
  { id: "apple", word: "apple", vi: "qua tao", ... },
  { id: "cat", word: "cat", vi: "con meo", ... }
]
```

#### `getLesson(lessonId)`

Lay lesson da resolve day du.

No se:

- Lay lesson raw.
- Lay unit/vocabulary lien quan.
- Resolve `config.items`.
- Resolve `config.pairs`.
- Resolve `config.groups[].items`.

### `shared/pipi.js`

Quan ly nhan vat Pipi.

Ham quan trong:

#### `PipiMascot.create(options)`

Tao controller cho Pipi.

```js
const pipi = PipiMascot.create({
  root: document,
  assetBase: "../"
});
```

Tra ve object co cac ham:

```js
pipi.setState(...)
pipi.wrong(...)
pipi.encourage()
pipi.resetPage(...)
pipi.playIdle()
pipi.setSpecialEncouragement(...)
```

#### `pipi.setState(state, text)`

Chuyen trang thai Pipi.

State dang co:

- `hi`
- `idle`
- `happy`
- `sad`
- `win`

#### `pipi.wrong(message, encouragement)`

Chay flow sai: Pipi buon, random 1 trong cac video `wrong_1.mp4` / `wrong_2.mp4`, noi message sai, sau do encouragement.

#### `pipi.resetPage(text)`

Dung khi sang activity moi. Pipi se chay hello truoc, sau do ve idle.

### `shared/utils.js`

Chua cac helper nho dung chung.

Ham thuong dung:

- `PipiUtils.shuffle(array)`: tron danh sach.
- `PipiUtils.pickMany(array, count)`: lay ngau nhien nhieu item.
- `PipiUtils.setText(root, selector, text)`: set text an toan.
- `PipiUtils.showTranslation(root, item)`: hien dich nghia.
- `PipiUtils.hideTranslation(root)`: an dich nghia.

## 8. File logic cua tung game

### `listen-tap/game.js`

Game nghe va chon dung hinh/tu.

Logic chinh:

- Chon random 4 dap an.
- Chon 1 target dung.
- Doc target.
- Hoc sinh bam dap an.
- Dung thi tang diem, sai thi feedback sai.

Callback chinh:

- `session.start`
- `session.answer` khi chon dap an.
- `session.score` khi dung.
- `session.complete` khi het rounds.

### `balloon-pop/game.js`

Game tim chu cai trong bong bay.

Logic chinh:

- Tu chon `targetLetter` neu la `"random"`, hoac dung chu da config neu muon co dinh.
- Tu sinh danh sach `letters` voi target xuat hien 3-4 lan neu content khong dua san `letters`.
- Bam dung thi pop bong va tang diem.
- Bam sai thi feedback sai.
- Tim het target thi complete.

### `match-pairs/game.js`

Game ghep hinh voi tu.

Logic chinh:

- Render cot hinh va cot tu.
- Hoc sinh chon 1 hinh + 1 tu.
- Neu dung thi khoa cap do.
- Neu sai thi bo chon va thu lai.
- Ghep het thi complete.

### `sort-baskets/game.js`

Game keo tha vao nhom.

Logic chinh:

- Tao cac basket theo `groups`.
- Tao item tray.
- Hoc sinh keo item vao basket.
- Bam check de kiem tra.
- Tat ca dung thi complete.

### `word-builder/game.js`

Game ghep chu thanh tu.

Logic chinh:

- Chon target word.
- Tao letter bank gom chu dung + extra letters.
- Hoc sinh bam chu de dien vao answer slots.
- Check dung/sai.
- Co nut Back/Next de bo qua cau kho.
- Lam dung het rounds thi complete.

### `word-drop/game.js`

Game keo tu vao dung hinh.

Logic chinh:

- Lay danh sach `items` tu config.
- Render moi item thanh mot khung hinh co slot nhan tu.
- Render cac the tu trong tray ben duoi.
- Hoc sinh keo the tu vao slot duoi hinh.
- Bam check de kiem tra dung/sai.
- Neu tat ca dung thi complete.

Callback chinh:

- `session.start` khi game bat dau.
- `session.interaction` khi bat dau keo, tha tu, bam nghe hinh.
- `session.answer` khi bam check.
- `session.score` khi diem thay doi.
- `session.complete` khi tat ca tu nam dung hinh.

### `sequence-order/game.js`

Game sap xep hang duoi sao cho khop voi hang tren. Day la game dung cho mau:

```text
Hang tren: tu co dinh
Hang duoi: hinh bi tron vi tri
```

Hoac dao nguoc bang config:

```text
Hang tren: hinh co dinh
Hang duoi: tu bi tron vi tri
```

Config chinh:

```js
{
  guideText: "Keo hinh/tu ve dung cap",
  layout: "word-to-picture",
  items: ["cake", "kite", "kangaroo"]
}
```

Trong do:

- `items`: danh sach tu/cap can choi. Co the la id string, hoac object vocabulary day du.
- `layout: "word-to-picture"`: hang tren la tu, hang duoi la hinh.
- `layout: "picture-to-word"`: hang tren la hinh, hang duoi la tu.
- `checkText`: text nut kiem tra.
- `rematchText`: text nut choi lai khi da thang.

Logic chinh:

- `normalizeItems(data)`: chuan hoa `items` thanh object co `id`, `word`, `image`, `emoji`, `order`.
- `correctIndexById = new Map(...)`: tao bang tra cuu `id -> vi tri dung`.
- `shuffleDifferent(items)`: tron hang duoi ngay khi game bat dau, khong can nut xao tron.
- `renderFixedRow()`: render hang tren theo dung thu tu goc.
- `renderDraggableRow()`: render hang duoi theo thu tu da tron.
- `swapItems(fromKey, toKey)`: doi cho 2 the trong hang duoi khi keo tha.
- `checkAnswers()`: dung `currentItems.forEach`/filter ket hop `correctIndexById` de dem vi tri dung.
- Dung het thi goi `session.complete` va Pipi chay state `win`.

Diem quan trong: game khong kiem tra dung/sai bang ten file anh. Anh chi la asset hien thi. Dung/sai dua vao `id` trong data, vi vay sau nay doi anh dep hon chi can doi `image` trong vocabulary/config.

Callback chinh:

- `session.start` khi game bat dau.
- `session.interaction` khi keo, doi vi tri, hoac bam nghe the.
- `session.answer` khi bam check.
- `session.score` khi diem thay doi.
- `session.complete` khi tat ca cap dung vi tri.

### `sound-catcher/game.js`

Game bat dung the dang di chuyen.

Logic chinh:

- Chon target.
- Tao nhieu token di chuyen trong field.
- Hoc sinh bam dung target thi tang diem va sang round.
- Bam sai thi feedback sai.
- Het rounds thi complete.

### `picture-puzzle/game.js`

Game mo tranh bang cau hoi nghia cua tu.

Logic chinh:

- Lay random mot background trong `config.backgrounds`.
- Doc `difficulty` de tao ma tran 2x2, 3x3 hoac 4x4.
- Tao so manh ghep bang `difficulty * difficulty`.
- Moi manh ghep duoc gan mot item vocabulary lam cau hoi.
- Khi bam manh ghep, game hien cau hoi va 3 dap an nghia tieng Viet.
- Chon dung thi tile ping xanh va mo khoa, chon sai thi ping do va hien “chon lai”.
- Mo khoa het tile thi complete va Pipi chay winner.

Ham quan trong:

- `clampDifficulty(value)`: gioi han do kho chi nam trong 2, 3, 4.
- `resolveItems(items)`: bien danh sach id/string thanh object vocabulary day du.
- `buildTileQuestions(items, count)`: tron danh sach cau hoi va gan vao tung manh ghep.
- `makeAnswers(target, items, answerCount)`: tao 1 dap an dung va cac dap an sai.
- `renderTiles()`: ve lai cac manh ghep theo trang thai khoa/mo.
- `renderQuestion(index)`: hien cau hoi cua manh dang duoc chon.
- `answerQuestion(answer)`: xu ly dung/sai, cap nhat diem va callback.
- `completeGame()`: bao hoan thanh qua `session.complete`.

## 9. Vocabulary chuan

Moi tu nen co cau truc:

```js
{
  id: "apple",
  word: "apple",
  vi: "qua tao",
  phonics: "a",
  topic: "food",
  emoji: "[emoji]",
  image: "",
  audioEn: "",
  audioVi: ""
}
```

Giai thich:

- `id`: ma dinh danh, nen viet khong dau, khong cach.
- `word`: tu tieng Anh.
- `vi`: nghia tieng Viet.
- `phonics`: chu cai/am dau.
- `topic`: chu de, vi du `food`, `animals`, `school`.
- `emoji`: fallback tam khi chua co anh.
- `image`: duong dan anh that neu co.
- `audioEn`: file mp3 doc tieng Anh.
- `audioVi`: file mp3 doc tieng Viet.

## 10. Huong tich hop vao web goc

Khi web goc co lesson player rieng, nen lam nhu sau:

1. Web goc load shared scripts:

```html
<script src="/mini-games/shared/audio.js"></script>
<script src="/mini-games/shared/pipi.js"></script>
<script src="/mini-games/shared/utils.js"></script>
<script src="/mini-games/shared/game-runtime.js"></script>
```

2. Load game can dung:

```html
<script src="/mini-games/listen-tap/game.js"></script>
```

3. Tao container:

```html
<div id="lesson-mini-game"></div>
```

4. Goi mount:

```js
PipiGames.listenTap.mount(document.querySelector("#lesson-mini-game"), config, {
  pipi,
  onAnswer(event) {
    // Luu cau tra loi neu can
  },
  onComplete(result) {
    // Luu tien do lesson, mo activity tiep theo
  }
});
```

Day la cach nhung truc tiep, muot hon iframe va de giu trang thai lesson hon.
