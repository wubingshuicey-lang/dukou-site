export default function FunctionChips({ chips, activeId, onSelect }) {
  return (
    <section className="function-chips" aria-label="小功能入口">
      {chips.map((chip) => (
        <button
          type="button"
          key={chip.id}
          className={activeId === chip.id ? "function-chip is-active" : "function-chip"}
          onClick={() => onSelect?.(chip.id)}
        >
          {chip.mark && <span className="function-chip-mark" aria-hidden="true" />}
          <span>{chip.label}</span>
          {chip.detail && <small>{chip.detail}</small>}
        </button>
      ))}
    </section>
  );
}
