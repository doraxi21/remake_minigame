"use client";
import { useEffect, useRef } from "react";

// Hàm hỗ trợ chuyển đổi chuỗi, ví dụ: "balloon-pop" -> "balloonPop"
function toCamelCase(str: string) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

// Hàm hỗ trợ tải Script tuần tự, không tải lại nếu đã có
function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false; // Đảm bảo script load theo đúng thứ tự
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

// Hàm hỗ trợ tải CSS cho game
function loadStyleOnce(href: string) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

export default function GameEmbed({ gameType, config }: { gameType: string, config: any }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  useEffect(() => {
    // Tránh việc React StrictMode gọi 2 lần ở môi trường Dev
    if (loaded.current) return;
    loaded.current = true;

    (async () => {
      try {
        // 1. Load CSS cốt lõi và CSS của game
        loadStyleOnce("/games/shared/base.css");
        loadStyleOnce("/games/shared/pipi.css");
        loadStyleOnce(`/games/${gameType}/style.css`);

        // 2. Load các script cốt lõi của game cũ
        await loadScriptOnce("/games/shared/audio.js");
        await loadScriptOnce("/games/shared/pipi.js");
        await loadScriptOnce("/games/shared/utils.js");
        await loadScriptOnce("/games/shared/game-runtime.js");
        
        // 3. Load script logic của chính game đang được gọi
        await loadScriptOnce(`/games/${gameType}/game.js`);

        // 4. Khởi tạo Pipi và Mount Game vào khung React
        if (rootRef.current && (window as any).PipiGames && (window as any).PipiMascot) {
          const pipi = (window as any).PipiMascot.create({ 
            root: rootRef.current.parentElement, // Để Mascot hiện đúng khung
            assetBase: "/games/" 
          });
          
          const gameName = toCamelCase(gameType);
          (window as any).PipiGames[gameName].mount(rootRef.current, config, { pipi });
        }
      } catch (error) {
        console.error("Lỗi khi load game:", error);
      }
    })();

    // Hàm dọn dẹp khi người dùng thoát game
    return () => {
       const gameName = toCamelCase(gameType);
       const cleanupFunc = `__${gameName}Cleanup`;
       if (rootRef.current && (rootRef.current as any)[cleanupFunc]) {
           (rootRef.current as any)[cleanupFunc]();
       }
    };
  }, [gameType, config]);

  // Vỏ bọc HTML chuẩn giống với shell cũ của bạn
  return (
    <div className={`game-${gameType}`} style={{ position: 'relative', width: '100%' }}>
      <div ref={rootRef} data-game-root></div>
    </div>
  );
}