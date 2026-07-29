# Pipi Content Structure

Thu muc `content` chi chua noi dung bai hoc da duoc chuan hoa. File Word/PDF goc nen de trong `raw/` de doi chieu, khong cho game doc truc tiep.

## Ten goi

- `vocabulary`: tu dien cua unit, dung lai cho nhieu mini game.
- `lesson`: kich ban bai hoc, gom cover, cac activity va outro.
- `activity.config`: noi dung rieng duoc truyen vao game engine.
- `raw`: tai lieu nguon nhu docx/pdf, chi lam tham chieu.

## Cau truc mau

```text
content/
  grade-3/
    unit-1/
      unit.js
      vocabulary.js
      lessons/
        lesson-1.js
      raw/
        source.docx
```

## Nguyen tac

- Game engine khong chua noi dung theo bai hoc.
- Lesson chi goi item can dung, khong lap lai toan bo vocabulary neu khong can.
- Word/PDF duoc trich xuat thanh vocabulary va lesson config truoc khi dua vao game.
