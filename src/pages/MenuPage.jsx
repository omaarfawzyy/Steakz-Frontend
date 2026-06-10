import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { menuCategories, menuSectionNotes } from '../data/mockData';
import { currency } from '../lib/utils';

export function MenuPage() {
  const { currentBranch, selectBranch, selectedBranchId, store } = useApp();
  const branchMenu = store.menuItems.filter((item) => item.availableAt.includes(currentBranch.id));
  const sections = Array.from(new Set([...menuCategories, ...branchMenu.map((item) => item.category)]))
    .map((category) => ({
      category,
      items: branchMenu.filter((item) => item.category === category),
    }))
    .filter((section) => section.items.length);
  const [activePage, setActivePage] = useState(0);

  useEffect(() => {
    setActivePage(0);
  }, [currentBranch.id]);

  useEffect(() => {
    if (activePage > sections.length - 1) {
      setActivePage(0);
    }
  }, [activePage, sections.length]);

  const activeSection = sections[activePage] ?? null;

  return (
    <div className="stack-xl">
      <section className="page-intro page-intro--image">
        <span className="eyebrow">Branch menu</span>
        <h1>{currentBranch.name}</h1>
        <p>
          A menu book presentation with one section shown at a time, like turning through printed pages.
        </p>
        <label className="field field--compact">
          <span className="field__label">Choose menu branch</span>
          <select value={selectedBranchId ?? currentBranch.id} onChange={(event) => selectBranch(event.target.value)}>
            {store.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </section>

      {activeSection ? (
        <section className="menu-book">
          <aside className="menu-book__spine">
            <div className="menu-book__guide-copy">
              <span className="eyebrow">Menu guide</span>
              <h2>{currentBranch.name}</h2>
              <p>
                Turn through the branch menu one page at a time with a warmer book-style color and a
                quieter, more realistic layout.
              </p>
            </div>

            <div className="menu-book__chapters" aria-label="Menu pages">
              {sections.map((section, index) => (
                <button
                  key={section.category}
                  type="button"
                  className={index === activePage ? 'menu-book__chapter menu-book__chapter--active' : 'menu-book__chapter'}
                  onClick={() => setActivePage(index)}
                >
                  <span>Page {String(index + 1).padStart(2, '0')}</span>
                  <strong>{section.category}</strong>
                  <small>{section.items.length} items</small>
                </button>
              ))}
            </div>

            <div className="menu-book__page-indicator">
              <span className="eyebrow">Current page</span>
              <strong>{activeSection.category}</strong>
              <small>Page {activePage + 1} of {sections.length}</small>
            </div>
          </aside>

          <article className="menu-page">
            <div className="menu-page__topline">
              <span>{currentBranch.name}</span>
              <span>Page {activePage + 1} of {sections.length}</span>
            </div>

            <header className="menu-page__header">
              <span className="eyebrow">Section</span>
              <h2>{activeSection.category}</h2>
              <p>{menuSectionNotes[activeSection.category] ?? 'Prepared for the selected branch with Steakz service pacing.'}</p>
            </header>

            <div className="menu-page__items">
              {activeSection.items.map((item) => (
                <article key={item.id} className="menu-entry">
                  <div className="menu-entry__copy">
                    <div className="menu-entry__titleline">
                      <h3>{item.title}</h3>
                      {item.badge ? <span className="menu-entry__badge">{item.badge}</span> : null}
                    </div>
                    <p>{item.description}</p>
                  </div>
                  <strong>{currency(item.price)}</strong>
                </article>
              ))}
            </div>

            <footer className="menu-page__footer">
              <div>
                <span className="eyebrow">Branch note</span>
                <p>{currentBranch.signature}</p>
              </div>

              <div className="menu-page__actions">
                <button
                  type="button"
                  className="menu-page__button"
                  onClick={() => setActivePage((page) => Math.max(0, page - 1))}
                  disabled={activePage === 0}
                >
                  Previous page
                </button>
                <button
                  type="button"
                  className="menu-page__button menu-page__button--primary"
                  onClick={() => setActivePage((page) => (page + 1) % sections.length)}
                >
                  {activePage === sections.length - 1 ? 'Back to first page' : 'Next page'}
                </button>
              </div>
            </footer>
          </article>
        </section>
      ) : (
        <section className="empty-state">
          No menu sections are available for {currentBranch.name} yet.
        </section>
      )}
    </div>
  );
}
