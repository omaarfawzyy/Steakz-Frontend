import { NavLink } from 'react-router-dom';

export function PortalLayout({
  roleLabel,
  title,
  subtitle,
  sections,
  basePath,
  currentUser,
  branchLabel,
  toolbar,
  onLogout,
  children,
}) {
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <div className="portal-sidebar__brand">
          <span className="brand-mark__crest">S</span>
          <div>
            <strong>Steakz Portal</strong>
            <p>{roleLabel}</p>
          </div>
        </div>

        <div className="portal-sidebar__profile">
          <span className="eyebrow">Signed in as</span>
          <strong>{currentUser.name}</strong>
          <p>{branchLabel}</p>
        </div>

        <nav className="portal-nav" aria-label={`${roleLabel} navigation`}>
          {sections.map((section) => (
            <NavLink
              key={section.id}
              to={`${basePath}/${section.id}`}
              className={({ isActive }) => isActive ? 'portal-nav__link portal-nav__link--active' : 'portal-nav__link'}
            >
              <span>{section.label}</span>
              <small>{section.hint}</small>
            </NavLink>
          ))}
        </nav>

        <button type="button" className="button button--ghost button--full" onClick={onLogout}>
          Sign out
        </button>
      </aside>

      <div className="portal-main">
        <header className="portal-header">
          <div>
            <span className="eyebrow">{roleLabel}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="portal-header__toolbar">{toolbar}</div>
        </header>

        <div className="portal-content">{children}</div>
      </div>
    </div>
  );
}
