export function getA11yPanelUi(sheet: boolean) {
  return {
    title: sheet ? "text-lg font-exo2 text-pearl-50 pr-2" : "text-lg font-exo2 text-graphite pr-2",
    groupLabel: sheet
      ? "text-sm font-exo2 text-pearl-50 mb-2"
      : "text-sm font-exo2 text-graphite mb-2",
    label: sheet ? "min-w-0 flex-1 pr-1 text-sm font-exo2 text-pearl-50" : "min-w-0 flex-1 pr-1 text-sm font-exo2 text-graphite",
    tabActive: sheet
      ? "bg-white/20 text-pearl-50 font-semibold"
      : "bg-white/25 text-graphite font-semibold",
    tabInactive: sheet
      ? "text-pearl-50/70 hover:text-pearl-50"
      : "text-graphite/70 hover:text-graphite",
    chipActive: sheet
      ? "border-gold-500 bg-gold-500/25 text-pearl-50 font-semibold"
      : "border-gold-500 bg-gold-500/20 text-graphite font-semibold",
    chipInactive: sheet
      ? "border-white/25 bg-white/10 text-pearl-50 hover:bg-white/15"
      : "border-white/20 bg-white/5 text-graphite hover:bg-white/10",
    resetBtn: sheet ? "text-pearl-50" : "text-graphite",
    heading: sheet
      ? "text-sm font-semibold font-exo2 text-pearl-50 mb-1"
      : "text-sm font-semibold font-exo2 text-graphite mb-1",
    description: sheet
      ? "text-xs font-exo2 text-pearl-50/80 mb-4"
      : "text-xs font-exo2 text-graphite/80 mb-4",
    warning: sheet ? "text-pearl-50/90" : "text-graphite/90",
  };
}
