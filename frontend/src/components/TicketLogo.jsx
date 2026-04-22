export default function TicketLogo({ width = 48 }) {
  // Aspect ratio ~40:26
  const height = Math.round(width * 0.65);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 26"
      width={width}
      height={height}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* Ticket body */}
      <rect x="0.75" y="0.75" width="38.5" height="24.5" rx="2.5"
            fill="#fdfcf7" stroke="#1a1816" strokeWidth="1.5"/>
      {/* Punch hole — left stub */}
      <circle cx="8" cy="13" r="3.4" fill="#d6d0c4" stroke="#1a1816" strokeWidth="0.75"/>
      {/* Perforation */}
      <line x1="14" y1="1" x2="14" y2="25"
            stroke="#c4bbaa" strokeWidth="0.75" strokeDasharray="2.5,2"/>
      {/* Rupee symbol */}
      <text
        x="27.5" y="19"
        fontFamily="'IBM Plex Mono','Courier New',monospace"
        fontSize="14" fontWeight="700"
        fill="#1a1816" textAnchor="middle"
      >
        &#8377;
      </text>
    </svg>
  );
}
