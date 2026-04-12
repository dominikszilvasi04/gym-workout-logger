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
    <div className="grid grid-flow-col auto-cols-fr gap-2 rounded-2xl border border-navy-300/60 bg-navy-100/88 p-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={clsx(
            "touch-target h-11 rounded-xl text-sm font-semibold tracking-[0.01em] transition-[transform,background-color,color,box-shadow] duration-150 ease-out active:scale-[0.98]",
            selectedKey === item.key
              ? "bg-primary-500 text-navy-100 shadow-[0_10px_22px_rgba(184,138,59,0.24)]"
              : "text-navy-700 hover:bg-navy-200/60 hover:text-navy-900"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
