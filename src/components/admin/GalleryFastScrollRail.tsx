import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../utils/cn';

export type GalleryFastScrollPlacement = 'embedded' | 'fixedPage';

type GalleryFastScrollRailProps = {
  scrollRef: React.RefObject<HTMLElement | null>;
  /** Position du défilement, 0–100 (proportion du scroll max). */
  scrollPct: number;
  onSeek: (pct: number) => void;
  /** `embedded` : rail dans un parent `relative`. `fixedPage` : bord droit de l’écran (défilement du `<main>`). */
  placement?: GalleryFastScrollPlacement;
  /** Si true (défaut), masqué à partir de `md`. Si false, visible aussi sur desktop (ex. galerie admin). */
  hideOnDesktop?: boolean;
  className?: string;
};

function readScrollMetrics(el: HTMLElement) {
  const maxScroll = el.scrollHeight - el.clientHeight;
  if (maxScroll <= 0) return null;
  return {
    maxScroll,
    clientH: el.clientHeight,
    scrollH: el.scrollHeight,
  };
}

/**
 * Curseur de défilement rapide sur la droite, style galerie système :
 * rail fin, élargissement au toucher / glisser.
 */
export function GalleryFastScrollRail({
  scrollRef,
  scrollPct,
  onSeek,
  placement = 'embedded',
  hideOnDesktop = true,
  className,
}: GalleryFastScrollRailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [thumb, setThumb] = useState({ heightPx: 40, topPx: 0, trackH: 0 });

  const recomputeThumb = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const m = readScrollMetrics(el);
    const trackH = track.clientHeight;
    if (!m || trackH <= 0) {
      setThumb({ heightPx: 0, topPx: 0, trackH });
      return;
    }
    const thumbH = Math.max(
      36,
      Math.min(trackH, (m.clientH / m.scrollH) * trackH),
    );
    const travel = trackH - thumbH;
    const topPx = travel <= 0 ? 0 : (scrollPct / 100) * travel;
    setThumb({ heightPx: thumbH, topPx, trackH });
  }, [scrollPct, scrollRef]);

  useLayoutEffect(() => {
    recomputeThumb();
  }, [recomputeThumb]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const ro = new ResizeObserver(() => recomputeThumb());
    ro.observe(el);
    ro.observe(track);
    return () => ro.disconnect();
  }, [recomputeThumb, scrollRef]);

  const clientYToPct = useCallback(
    (clientY: number) => {
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const m = readScrollMetrics(el);
      const rect = track.getBoundingClientRect();
      if (!m || rect.height <= 0) return;
      const thumbH = Math.max(
        36,
        Math.min(rect.height, (m.clientH / m.scrollH) * rect.height),
      );
      const travel = rect.height - thumbH;
      if (travel <= 0) {
        onSeek(0);
        return;
      }
      const y = clientY - rect.top - thumbH / 2;
      onSeek(Math.max(0, Math.min(100, (y / travel) * 100)));
    },
    [onSeek, scrollRef],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    clientYToPct(e.clientY);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    clientYToPct(e.clientY);
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setActive(false);
  };

  const ready = thumb.trackH > 0 && thumb.heightPx > 0;

  return (
    <div
      className={cn(
        'flex touch-none select-none justify-end',
        hideOnDesktop && 'md:hidden',
        placement === 'fixedPage'
          ? 'fixed bottom-0 right-0 top-16 z-30 w-7 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-1'
          : 'absolute inset-y-2 right-0 z-20 w-6',
        ready ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onLostPointerCapture={() => setActive(false)}
      role={ready ? 'slider' : undefined}
      aria-hidden={!ready}
      aria-orientation="vertical"
      aria-valuenow={ready ? Math.round(scrollPct) : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Défilement rapide dans la liste"
    >
      <div
        ref={trackRef}
        className={cn(
          'relative h-full min-h-[48px] rounded-full bg-black/[0.08] transition-[width] duration-150 ease-out',
          active ? 'w-3' : 'w-1',
        )}
      >
        {ready && (
          <div
            className={cn(
              'absolute left-0 right-0 rounded-full bg-secondary/85 shadow-sm transition-[width,opacity] duration-150',
              active ? 'opacity-100' : 'opacity-90',
            )}
            style={{
              height: thumb.heightPx,
              top: thumb.topPx,
            }}
          />
        )}
      </div>
    </div>
  );
}
