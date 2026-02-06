import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const alt = "HKS Logo";
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 24,
          background: "transparent",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: "100%", height: "100%" }}
        >
          {/* Trunk (Brass) */}
          <path
            d="M12 7.8V23"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
          />

          {/* Bulb Shape (Bright Yellow) */}
          <path
            d="M12 3.5C13.5 3.5 14.5 4.5 14.5 6C14.5 7 13.5 7.5 13 8H11C10.5 7.5 9.5 7 9.5 6C9.5 4.5 10.5 3.5 12 3.5Z"
            stroke="#fde047"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Eye / Iris Filament (Silver Wire) */}
          <g stroke="#cbd5e1" strokeWidth="0.6" strokeLinecap="round">
            <path d="M9.5 5.5C9.5 5.5 10.5 4 12 4C13.5 4 14.5 5.5 14.5 5.5C14.5 5.5 13.5 7 12 7C10.5 7 9.5 5.5 9.5 5.5Z" />
            <rect
              x="11.2"
              y="4.7"
              width="1.6"
              height="1.6"
              rx="0.4"
              fill="#cbd5e1"
              stroke="none"
            />
            <path
              d="M11.6 5.1L11.6 5.9L12.4 5.5Z"
              fill="#ef4444"
              stroke="none"
            />
          </g>

          {/* Radiating Rays (Bright Yellow) */}
          <g stroke="#fde047" strokeLinecap="round" strokeWidth="0.8">
            <line x1="12" y1="2" x2="12" y2="2.4" />
            <line x1="14.5" y1="3" x2="15.2" y2="2.3" />
            <line x1="9.5" y1="3" x2="8.8" y2="2.3" />
            <line x1="15.5" y1="5.5" x2="16.2" y2="5.5" />
            <line x1="8.5" y1="5.5" x2="7.8" y2="5.5" />
          </g>

          {/* Tree Branches (Green) */}
          <g stroke="#10b981">
            <path d="M12 9L7 12" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 9L17 12" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 13L5 17.2" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 13L19 17.2" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 17L3 22.4" strokeWidth="2" strokeLinecap="round" />

            {/* Ornaments */}
            <g>
              {/* Left L1 - Star (rose-500) */}
              <path
                d="M7 11L7.35 12H8.4L7.6 12.6L7.8 13.6L7 13L6.2 13.6L6.4 12.6L5.6 12H6.65L7 11Z"
                fill="#f43f5e"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <circle cx="7" cy="12.4" r="0.3" fill="white" />
            </g>
            <g>
              {/* Right L1 - Circle (amber-400) */}
              <circle
                cx="17"
                cy="12"
                r="0.9"
                fill="#fbbf24"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <circle cx="17" cy="12" r="0.3" fill="white" />
            </g>
            <g>
              {/* Left L2 Tip - Circle (sky-400) */}
              <circle
                cx="5"
                cy="17.2"
                r="0.9"
                fill="#38bdf8"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <path
                d="M4.7 17.2H5.3M5 16.9V17.5"
                stroke="white"
                strokeWidth="0.2"
                strokeLinecap="round"
              />
            </g>
            <g>
              {/* Left L2 Halfway - Diamond (amber-400) */}
              <path
                d="M8.5 13.7L9.9 15.1L8.5 16.5L7.1 15.1Z"
                fill="#fbbf24"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <circle cx="8.5" cy="15.1" r="0.35" fill="white" />
            </g>
            <g>
              {/* Right L2 Tip - Square (sky-500) */}
              <rect
                x="17.85"
                y="16.05"
                width="2.3"
                height="2.3"
                rx="0.3"
                fill="#0ea5e9"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <path
                d="M18.45 17.2H19.65M19.1 16.6V17.8"
                stroke="white"
                strokeWidth="0.3"
                strokeLinecap="round"
              />
            </g>
            <g>
              {/* Right L2 Halfway - Star (fuchsia-500) */}
              <path
                d="M15.5 14.1L15.85 15.1H16.9L16.1 15.7L16.3 16.7L15.5 16.1L14.7 16.7L14.9 15.7L14.1 15.1H15.15L15.5 14.1Z"
                fill="#d946ef"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <circle cx="15.5" cy="15.5" r="0.3" fill="white" />
            </g>
            <g>
              {/* Left L3 Tip - Square (sky-400) */}
              <rect
                x="1.85"
                y="21.25"
                width="2.3"
                height="2.3"
                rx="0.3"
                fill="#38bdf8"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <path
                d="M2.45 22.4H3.65M3.05 21.8V23"
                stroke="white"
                strokeWidth="0.3"
                strokeLinecap="round"
              />
            </g>
            <g>
              {/* Left L3 Middle - Star (amber-500) */}
              <path
                d="M7 19L7.35 20H8.4L7.6 20.6L7.8 21.6L7 21L6.2 21.6L6.4 20.6L5.6 20H6.65L7 19Z"
                fill="#f59e0b"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <circle cx="7" cy="20.4" r="0.3" fill="white" />
            </g>
            <g>
              {/* Left L3 Inner - Circle (violet-500) */}
              <circle
                cx="11"
                cy="17.6"
                r="0.9"
                fill="#8b5cf6"
                stroke="black"
                strokeWidth="0.1"
                strokeOpacity="0.3"
              />
              <path
                d="M10.7 17.6H11.3M11 17.3V17.9"
                stroke="white"
                strokeWidth="0.2"
                strokeLinecap="round"
              />
            </g>
          </g>

          {/* Bottom Right: Key Tooth */}
          <g stroke="#f59e0b">
            <path
              d="M12 20H17V21H15V22H18V23"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>

          {/* Threaded Base */}
          <g stroke="#cbd5e1" strokeWidth="0.8" strokeLinecap="round">
            <line x1="11" y1="7" x2="13" y2="7" />
            <line x1="11" y1="7.8" x2="13" y2="7.8" />
            <line x1="11" y1="8.6" x2="13" y2="8.6" />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
