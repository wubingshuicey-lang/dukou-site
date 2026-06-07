export default function FeatureGrid({ features, activeId, onSelect }) {
  return (
    <section className="feature-grid" aria-label="高频功能入口">
      {features.map((feature) => (
        <button
          type="button"
          key={feature.id}
          className={activeId === feature.id ? "feature-grid-item is-active" : "feature-grid-item"}
          onClick={() => onSelect?.(feature.id)}
        >
          <span className="feature-grid-title">{feature.title}</span>
          <span className="feature-grid-label">{feature.status}</span>
        </button>
      ))}
    </section>
  );
}
