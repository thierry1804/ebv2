import maintenanceVideoUrl from '../assets/video/valsue_anim.mp4?url';

interface MaintenancePageProps {
  message: string;
}

/** Fond aligné sur la palette marque (rose / vieux rose / turquoise) — même base que la vidéo ValSue */
const maintenanceBackdropClassName =
  'relative min-h-dvh min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-4 ' +
  'bg-gradient-to-b from-[#F7EEF1] via-[#F3EDF0] to-[#E8F2F4]';

/** Cercle vidéo : presque tout l’écran visible (essai — retour arrière possible) */
const fullBleedCircleSize = {
  width: 'min(calc(100vw - 2rem), calc(100dvh - 2rem))',
  height: 'min(calc(100vw - 2rem), calc(100dvh - 2rem))',
} as const;

export default function MaintenancePage({ message }: MaintenancePageProps) {
  return (
    <div className={maintenanceBackdropClassName}>
      <div
        className="shrink-0 rounded-full border border-primary/25 bg-[#FDF9FA] p-1 shadow-sm overflow-hidden"
        style={fullBleedCircleSize}
      >
        <video
          className="h-full w-full rounded-full object-cover"
          src={maintenanceVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          aria-label="Animation ValSue"
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto w-full max-w-md border border-secondary/20 bg-[#FDFBFC]/95 rounded-lg p-6 shadow-sm">
          <p className="font-heading text-lg text-text-dark mb-2">Site en maintenance</p>
          <p className="text-text-dark/90 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </div>
  );
}
