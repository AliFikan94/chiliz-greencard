// Original mark: a chili pepper wearing a graduation cap. Not a
// reproduction of any official Chiliz/Socios/Fan Token logo - just a small
// motif in the same red, inspired by the brand's swoosh-shaped mark.
export function ChiliMascot({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M35 8c3 3 2 7-1 9-6 4-11 10-12 19-1 8 4 16 12 18 9 2 18-5 19-15 1-9-5-15-9-19-3-3-6-3-8-1-2 2-2 5 0 7 2 2 5 3 7 6"
        stroke="var(--chiliz-red, #d1233f)"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M35 8c3 3 2 7-1 9"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.7"
      />
      <g transform="translate(30 4) rotate(-18)">
        <polygon points="0,4 11,0 22,4 11,8" fill="#000" stroke="#000" strokeWidth="1" />
        <line x1="20" y1="4" x2="20" y2="11" stroke="#000" strokeWidth="1.5" />
        <circle cx="20" cy="12" r="1.6" fill="#000" />
      </g>
    </svg>
  );
}
