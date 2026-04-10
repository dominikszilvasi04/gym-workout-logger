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
    <div className="grid grid-flow-col auto-cols-fr gap-2 rounded-xl bg-navy-100 p-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={clsx(
            "h-10 rounded-lg text-sm font-semibold transition-colors",
            selectedKey === item.key
              ? "bg-white text-navy-900 shadow-sm"
              : "text-navy-600 hover:text-navy-900"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
