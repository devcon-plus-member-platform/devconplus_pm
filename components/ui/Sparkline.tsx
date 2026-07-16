interface Props {
  data: number[];
  color?: string;
  height?: number;
}

export default function Sparkline({ data, color = "#3b5ee8", height = 24 }: Props) {
  const max = Math.max(1, ...data);

  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm min-w-[3px]"
          style={{
            height: `${Math.max(8, (v / max) * 100)}%`,
            backgroundColor: color,
            opacity: v === 0 ? 0.15 : 0.8,
          }}
        />
      ))}
    </div>
  );
}
