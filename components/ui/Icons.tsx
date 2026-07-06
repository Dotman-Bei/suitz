import type { SVGProps } from "react";

/**
 * Hand-tuned 1.6px line icons on a 24px grid. Deliberately uniform so the UI
 * reads as one system — no mixed icon packs, no emoji.
 */
function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

export const Copy = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
  </Base>
);

export const Check = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 12.5 9 17.5 20 6.5" />
  </Base>
);

export const ExternalLink = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
  </Base>
);

export const Lock = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Base>
);

export const Key = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="8" cy="8" r="4" />
    <path d="M11 11l9 9M16 16l2-2M19 19l2-2" />
  </Base>
);

export const ArrowRight = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Base>
);

export const Swap = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M7 4 4 7l3 3M4 7h13M17 20l3-3-3-3M20 17H7" />
  </Base>
);

export const Search = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </Base>
);

export const ChevronDown = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const Spinner = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p} className={`animate-spin ${p.className ?? ""}`}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </Base>
);

export const Shield = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
  </Base>
);

export const Faucet = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 3v4M9 7h6" />
    <path d="M12 11c2.5 3 4 5 4 7a4 4 0 0 1-8 0c0-2 1.5-4 4-7Z" />
  </Base>
);

export const Plus = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const Alert = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4M12 17.5v.5" />
  </Base>
);

export const Wallet = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M3 9h18M16 13h2" />
  </Base>
);

export const Globe = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" />
  </Base>
);

export const Close = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
);

export const Dot = (p: SVGProps<SVGSVGElement>) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
  </Base>
);
