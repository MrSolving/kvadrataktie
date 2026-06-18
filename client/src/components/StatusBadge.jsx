const STATUS_LABELS = {
  initierad: 'Initierad',
  under_behandling: 'Under behandling',
  genomford: 'Genomförd',
  rapporterad_euroclear: 'Rapporterad till Euroclear',
  slutford: 'Slutförd',
  avbruten: 'Avbruten',
  upcoming: 'Kommande',
  open: 'Öppen',
  matching: 'Matchning pågår',
  closed: 'Stängd',
};

const STATUS_TONE = {
  initierad: 'neutral',
  under_behandling: 'progress',
  genomford: 'success',
  rapporterad_euroclear: 'info',
  slutford: 'success',
  avbruten: 'danger',
  upcoming: 'neutral',
  open: 'success',
  matching: 'progress',
  closed: 'neutral',
};

export default function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] || 'neutral';
  return (
    <span className={`badge badge-${tone}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}
