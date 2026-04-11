import clsx from "clsx";

export interface TabItem {
  key: string;
  label: string;
}

interface TabsProperties {
  items: TabItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

export function Tabs({ items, selectedKey, onSelect }: TabsProperties) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-2 rounded-2xl border border-navy-300/70 bg-navy-100/85 p-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={clsx(
            "h-10 rounded-xl text-sm font-semibold transition-colors",
            selectedKey === item.key
              ? "bg-primary-500 text-navy-950 shadow-[0_8px_20px_rgba(91,108,255,0.28)]"
              : "text-navy-700 hover:bg-navy-200/60 hover:text-navy-900"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
