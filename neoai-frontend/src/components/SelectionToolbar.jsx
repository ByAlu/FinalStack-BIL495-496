export function SelectionToolbar({ title, subtitle, ariaLabel = "Selection toolbar", children }) {
  const hasCopy = Boolean(title || subtitle);

  return (
    <div className={`selection-toolbar${hasCopy ? "" : " compact"}`} role="toolbar" aria-label={title || ariaLabel}>
      {hasCopy ? (
        <div className="selection-toolbar-copy">
          {subtitle ? <span className="selection-toolbar-kicker">{subtitle}</span> : null}
          {title ? <strong className="selection-toolbar-title">{title}</strong> : null}
        </div>
      ) : null}

      <div className="selection-toolbar-actions">
        {children}
      </div>
    </div>
  );
}
