/**
 * Piccola libreria di icone SVG inline, decorative (`aria-hidden="true"`,
 * mai l'unica fonte di informazione: ogni pulsante che le usa ha sempre
 * anche un'etichetta di testo visibile e vera, non solo un'icona). Stroke
 * `currentColor` così ereditano il colore del testo del pulsante che le
 * contiene, un solo stile visivo coerente su tutte.
 */
const SVG_OPEN = (viewBox: string) =>
  `<svg class="icon" viewBox="${viewBox}" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">`;

export const ICONS = {
  mazzo: `${SVG_OPEN("0 0 24 24")}
    <rect x="7" y="3" width="12" height="16" rx="2"></rect>
    <rect x="4" y="6" width="12" height="16" rx="2" fill="none"></rect>
  </svg>`,

  scarti: `${SVG_OPEN("0 0 24 24")}
    <rect x="6" y="4" width="12" height="16" rx="2"></rect>
    <path d="M12 10v6"></path>
    <path d="M9 13l3 3 3-3"></path>
  </svg>`,

  tieni: `${SVG_OPEN("0 0 24 24")}
    <rect x="5" y="3" width="14" height="18" rx="2"></rect>
    <path d="M9 12l2.2 2.2L16 9.5"></path>
  </svg>`,

  scarta: `${SVG_OPEN("0 0 24 24")}
    <rect x="5" y="3" width="14" height="18" rx="2"></rect>
    <path d="M9.5 9.5l5 5"></path>
    <path d="M14.5 9.5l-5 5"></path>
  </svg>`,

  riga: `${SVG_OPEN("0 0 24 24")}
    <rect x="2" y="10" width="4" height="4" rx="1"></rect>
    <rect x="10" y="10" width="4" height="4" rx="1"></rect>
    <rect x="18" y="10" width="4" height="4" rx="1"></rect>
  </svg>`,

  colonna: `${SVG_OPEN("0 0 24 24")}
    <rect x="10" y="2" width="4" height="4" rx="1"></rect>
    <rect x="10" y="10" width="4" height="4" rx="1"></rect>
    <rect x="10" y="18" width="4" height="4" rx="1"></rect>
  </svg>`,

  decoIntero: `${SVG_OPEN("0 0 24 24")}
    <rect x="2" y="3" width="4" height="4" rx="1"></rect>
    <rect x="10" y="3" width="4" height="4" rx="1"></rect>
    <rect x="18" y="3" width="4" height="4" rx="1"></rect>
    <rect x="2" y="10" width="4" height="4" rx="1"></rect>
    <rect x="10" y="10" width="4" height="4" rx="1"></rect>
    <rect x="18" y="10" width="4" height="4" rx="1"></rect>
    <rect x="2" y="17" width="4" height="4" rx="1"></rect>
    <rect x="10" y="17" width="4" height="4" rx="1"></rect>
    <rect x="18" y="17" width="4" height="4" rx="1"></rect>
  </svg>`,

  cambiaAscolto: `${SVG_OPEN("0 0 24 24")}
    <path d="M4 7a8 8 0 0 1 13-4.5L20 5"></path>
    <path d="M20 2v5h-5"></path>
    <path d="M20 17a8 8 0 0 1-13 4.5L4 19"></path>
    <path d="M4 22v-5h5"></path>
  </svg>`,

  sommaPunti: `${SVG_OPEN("0 0 24 24")}
    <path d="M6 4h12l-6 7 6 9H6l6-9z"></path>
  </svg>`,

  home: `${SVG_OPEN("0 0 24 24")}
    <path d="M4 11.5L12 4l8 7.5"></path>
    <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9"></path>
    <path d="M10 20v-6h4v6"></path>
  </svg>`,

  dona: `${SVG_OPEN("0 0 24 24")}
    <path d="M12 20s-7-4.35-9.5-9C1 7.9 2.5 4.5 6 4.5c2 0 3.5 1.2 4 2.5.5-1.3 2-2.5 4-2.5 3.5 0 5 3.4 3.5 6.5-2.5 4.65-9.5 9-9.5 9z"></path>
  </svg>`,
} as const;

export type IconName = keyof typeof ICONS;
