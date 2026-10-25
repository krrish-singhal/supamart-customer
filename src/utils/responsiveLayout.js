// Use measured pane widths so grids also adapt to tablets, rotation and split-screen.
export function getGridMetrics(width, { padding = 10, gap = 10, minCardWidth = 136, fontScale = 1, maxColumns = 4, minColumns = 1 } = {}) {
  const innerWidth = Math.max(1, width - padding * 2);
  const minimum = Math.max(80, minCardWidth);
  const calculated = Math.floor((innerWidth + gap) / (minimum + gap));
  const columns = Math.max(minColumns, Math.min(maxColumns, Math.max(1, calculated)));
  return { columns, cardWidth: Math.max(1, Math.floor((innerWidth - gap * (columns - 1)) / columns)) };
}
