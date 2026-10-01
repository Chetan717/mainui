import { useState, useRef } from "react";
// Slider Wrapper for Festival Data only get Data OF MLM template Of Selected Company From Db 
const mlmtempdata = [];

export default function Listmlmtemp() {
  const [active, setActive] = useState(null);
  const sliderRef = useRef(null);

  const scroll = (dir) => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: dir * 220, behavior: "smooth" });
    }
  };

  return (
    <div className="h-[100px] w-full flex flex-col items-center px-2 justify-center">
      <style>{`
       1
        .card-item { transition: transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s ease; }
        .card-item:hover { transform: scale(1.04); box-shadow: 0 24px 48px rgba(0,0,0,0.5); }
        .slider-track::-webkit-scrollbar { display: none; }
        .slider-track { scrollbar-width: none; }
        .btn-arrow { transition: background 0.2s, transform 0.15s; }
        .btn-arrow:hover { transform: scale(1.15); }
        .tag-pill { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
      `}</style>

      {/* Slider Wrapper */}
      <div className="relative flex items-center w-full px-1">
        <div
          ref={sliderRef}
          className="slider-track flex gap-4 overflow-x-auto px-8 py-6"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {mlmtempdata.map((card) => (
            <div
              key={card.id}
              className="card-item flex-shrink-0 lg:h-[150px] h-[100px] lg:w-[150px] w-[100px] rounded-2xl overflow-hidden cursor-pointer relative"
              style={{
                scrollSnapAlign: "start",
                // border:
                //   active === card.id
                //     ? `2px solid ${card.accent}`
                //     : "2px solid transparent",
              }}
              onClick={() => setActive(active === card.id ? null : card.id)}
            >
              {/* Gradient Background */}
              {/* <div
                className={`absolute inset-0 bg-gradient-to-br ${card.bg} opacity-90`}
              /> */}

              {/* Noise texture overlay */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                  backgroundSize: "128px",
                }}
              />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-4">
                {/* Top: Tag */}
                <div className="flex justify-between items-start"></div>

                <div>
                  <p
                    className="text-[7px] lg:text-[10px] font-semibold "
                    style={{ color: "rgba(255, 255, 255, 0.65)" }}
                  >
                    {card.subtitle}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll(1)}
          className="btn-arrow absolute right-0 z-10 lg:w-9 lg:h-9 w-6 h-6 rounded-full flex items-center justify-center text-white"
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            backdropFilter: "blur(8px)",
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
