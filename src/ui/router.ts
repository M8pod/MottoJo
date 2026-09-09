export type RouteParams = Readonly<Record<string, string>>;
export type RouteCleanup = () => void;
export type RouteRenderer = (container: HTMLElement, params: RouteParams) => void | RouteCleanup;

export interface Router {
  register(path: string, render: RouteRenderer): void;
  start(): void;
}

interface RouteEntry {
  readonly segments: readonly string[];
  readonly render: RouteRenderer;
}

const EMPTY_PARAMS: RouteParams = {};

function splitPath(path: string): string[] {
  return path.split("/").filter((s) => s.length > 0);
}

function matchEntry(entry: RouteEntry, pathSegments: readonly string[]): RouteParams | null {
  if (entry.segments.length !== pathSegments.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < entry.segments.length; i += 1) {
    const routeSegment = entry.segments[i]!;
    const pathSegment = pathSegments[i]!;
    if (routeSegment.startsWith(":")) {
      params[routeSegment.slice(1)] = decodeURIComponent(pathSegment);
    } else if (routeSegment !== pathSegment) {
      return null;
    }
  }
  return params;
}

/**
 * Router minimo basato su hash, senza dipendenze: aggiorna il contenuto di
 * `container` e sposta il focus sull'intestazione della nuova schermata, così
 * chi naviga con VoiceOver/screen reader sente subito che schermata è
 * cambiata invece di restare con il focus perso sul link appena attivato.
 * Supporta un segmento dinamico per route (es. "/game/:id") per riprendere
 * una partita specifica.
 */
export function createRouter(container: HTMLElement, notFound: RouteRenderer): Router {
  const routes: RouteEntry[] = [];
  let currentCleanup: RouteCleanup | null = null;

  function currentSegments(): string[] {
    return splitPath(window.location.hash.slice(1));
  }

  function resolve(): { render: RouteRenderer; params: RouteParams } {
    const pathSegments = currentSegments();
    for (const entry of routes) {
      const params = matchEntry(entry, pathSegments);
      if (params) return { render: entry.render, params };
    }
    return { render: notFound, params: EMPTY_PARAMS };
  }

  function focusMainHeading(): void {
    const heading = container.querySelector<HTMLElement>("h1, h2");
    if (!heading) return;
    heading.setAttribute("tabindex", "-1");
    heading.focus();
  }

  function renderCurrent(): void {
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    const { render, params } = resolve();
    container.innerHTML = "";
    currentCleanup = render(container, params) ?? null;
    focusMainHeading();
  }

  return {
    register(path, render) {
      routes.push({ segments: splitPath(path), render });
    },
    start() {
      window.addEventListener("hashchange", renderCurrent);
      renderCurrent();
    },
  };
}
