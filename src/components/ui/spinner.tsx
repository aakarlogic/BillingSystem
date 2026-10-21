export default function Spinner({ label }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" />
      {label && <span className="muted">{label}</span>}
    </div>
  );
}
