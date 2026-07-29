"use client";
import { useState } from "react";
import Link from "next/link";

// Danh sách các game (mô phỏng lại HTML cũ)
const gamesList = [
  { type: "listen-tap", icon: "🔊", title: "Listen & Tap", desc: "Nghe từ tiếng Anh rồi chạm vào hình đúng." },
  { type: "listen-color", icon: "🎨", title: "Listen & Color", desc: "Nghe màu rồi chọn đúng màu để tô hình." },
  { type: "balloon-pop", icon: "🎈", title: "Balloon Pop", desc: "Tìm chữ cái hoặc âm đầu trong các quả bóng." },
  { type: "match-pairs", icon: "🧩", title: "Match Pairs", desc: "Ghép hình với từ tương ứng." },
  { type: "sort-baskets", icon: "🧺", title: "Sort Baskets", desc: "Kéo hình vào đúng bảng nhóm." },
  { type: "word-drop", icon: "⬇", title: "Word Drop", desc: "Kéo thẻ từ vào đúng hình." },
  { type: "shadow-match", icon: "◒", title: "Shadow Match", desc: "Kéo hình vào đúng bóng tương ứng." },
  { type: "listen-arrange", icon: "≡", title: "Listen & Arrange", desc: "Nghe câu rồi xếp các từ theo đúng thứ tự." },
  { type: "treasure-hunt", icon: "⌕", title: "Treasure Hunt", desc: "Nghe yêu cầu rồi tìm đúng vật trong bức tranh." },
  { type: "sequence-order", icon: "⇄", title: "Sắp Xếp Cặp", desc: "Sắp xếp hình/từ về đúng cặp tương ứng." },
  { type: "memory-flip", icon: "▣", title: "Memory Flip", desc: "Lật thẻ và ghép hình với từ đúng." },
  { type: "maze-path", icon: "↝", title: "Maze Path", desc: "Tìm đường đi qua chữ cái đúng để tới đích." },
  { type: "pipi-quiz", icon: "?", title: "Pipi Quiz", desc: "Chọn một trong bốn đáp án đúng." },
  { type: "odd-one-out", icon: "◎", title: "Odd One Out", desc: "Tìm hình hoặc từ khác nhóm." },
  { type: "listen-choose-path", icon: "➜", title: "Listen & Choose Path", desc: "Nghe từ rồi chọn đúng đường cho Pipi." },
  { type: "picture-puzzle", icon: "🧩", title: "Picture Puzzle", desc: "Mở từng mảnh ghép bằng cách chọn đúng nghĩa của từ." },
  { type: "counting-animals", icon: "🔢", title: "Counting Animals", desc: "Nghe số lượng rồi tìm đủ con vật trong sân chơi." },
  { type: "emotion-match", icon: "😊", title: "Emotion Match", desc: "Quan sát nhân vật rồi chọn trạng thái cảm xúc phù hợp." },
  { type: "word-builder", icon: "🔤", title: "Word Builder", desc: "Nhìn hình rồi ghép các chữ cái thành từ đúng." },
  { type: "sound-catcher", icon: "🎯", title: "Sound Catcher", desc: "Nghe từ rồi bắt đúng thẻ đang di chuyển." }
];

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 8;

  // Logic lọc và phân trang tự động của React
  const filteredGames = gamesList.filter(game => 
    game.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    game.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.max(1, Math.ceil(filteredGames.length / pageSize));
  const visibleGames = filteredGames.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  return (
    <main className="shell home-screen">
      <section className="hero">
        {/* Mascot */}
        <aside className="pipi-panel is-happy">
          <div className="pipi-frame">
            <img className="pipi-media is-hello" src="/games/assets/png/hello.gif" alt="Pipi" />
          </div>
          <p className="speech">Hi! Chọn một game để học tiếng Anh cùng Pipi nhé.</p>
        </aside>

        {/* Khung chọn game */}
        <section className="play-panel">
          <p className="eyebrow">Pipi English Playroom</p>
          <h1>Khám phá Mini Games</h1>
          <p className="lead">Hệ thống đã được nâng cấp lên React. Các game chạy mượt mà không cần tải lại trang!</p>

          <div className="game-browser">
            {/* Thanh tìm kiếm & điều hướng */}
            <div className="game-browser-controls">
              <button 
                className="game-page-btn" 
                disabled={currentPage === 0} 
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              >‹</button>
              
              <label className="game-search">
                <span>Tìm game</span>
                <input 
                  type="search" 
                  placeholder="Nhập tên game..." 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(0); // Trả về trang 1 khi tìm kiếm
                  }}
                />
              </label>
              
              <button 
                className="game-page-btn" 
                disabled={currentPage >= totalPages - 1}
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              >›</button>
            </div>
            
            <div className="game-page-status">{currentPage + 1} / {totalPages}</div>
            
            {/* Danh sách Game */}
            <div className="game-grid">
              {visibleGames.map(game => (
                <Link key={game.type} href={`/play/${game.type}`} className="game-card">
                  <span>{game.icon}</span>
                  <strong>{game.title}</strong>
                  {game.desc}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}