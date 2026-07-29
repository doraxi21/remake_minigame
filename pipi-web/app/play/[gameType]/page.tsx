"use client";
import { use } from "react";
import Link from "next/link";
import GameEmbed from "@/components/GameEmbed";

// Component trang động nhận tham số URL
export default function PlayGamePage({ params }: { params: Promise<{ gameType: string }> }) {
  // Giải nén tham số từ thanh địa chỉ (URL)
  const resolvedParams = use(params);
  const gameType = resolvedParams.gameType;

  // Cấu hình mặc định tạm thời (Sau này sẽ lấy từ Database/API)
  const defaultConfig = {
    // Config này hoạt động tốt cho đa số game hiện tại vì Vanilla JS của bạn đã tự fallback
    targetLetter: "random",
    difficulty: 2,
    rounds: 5,
  };

  return (
    <main className={`shell game-shell game-${gameType}`}>
      {/* Topbar */}
      <nav className="topbar">
        <Link className="brand" href="/">
          <img src="/games/assets/pipi/logo.gif" alt="Pipi" />
          Pipi Mini Games
        </Link>
        <Link className="home-link" href="/">Về trang chủ</Link>
      </nav>

      {/* Khu vực chơi */}
      <section className="game-board">
        <aside className="pipi-panel" data-pipi-panel>
          <button className="pipi-button pipi-frame" data-pipi-button data-pipi-frame type="button" aria-label="Chạm Pipi">
            <img className="pipi-media" data-pipi-img src="/games/assets/png/hello.gif" alt="Pipi" />
          </button>
          <p className="speech" data-pipi-speech>Cùng hoàn thành thử thách nhé!</p>
        </aside>

        <section className="play-panel">
          {/* Nhúng game dựa trên tên lấy từ URL */}
          <GameEmbed gameType={gameType} config={defaultConfig} />
        </section>
      </section>
    </main>
  );
}