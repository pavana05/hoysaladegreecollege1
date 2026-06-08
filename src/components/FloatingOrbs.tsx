/**
 * Ambient floating gradient orbs drifting behind content.
 * Pure CSS animation, fixed behind everything, low opacity, no interaction.
 */
export default function FloatingOrbs() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="floating-orb floating-orb--1" />
      <div className="floating-orb floating-orb--2" />
      <div className="floating-orb floating-orb--3" />
    </div>
  );
}
