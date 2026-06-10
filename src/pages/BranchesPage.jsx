import { useApp } from '../context/AppContext';
import { currency, percent } from '../lib/utils';

export function BranchesPage() {
  const { selectBranch, selectedBranchId, store } = useApp();
  const selectedBranch = store.branches.find((branch) => branch.id === selectedBranchId) ?? store.branches[0];

  return (
    <div className="stack-xl">
      <section className="page-intro page-intro--image">
        <span className="eyebrow">All branches</span>
        <h1>Choose the Steakz room that matches the occasion.</h1>
        <p>
          Each branch carries the same premium service language while adapting its mood to the
          neighborhood it serves.
        </p>
      </section>

      <section className="branch-grid">
        {store.branches.map((branch) => {
          const metrics = store.branchPerformance.find((entry) => entry.branchId === branch.id);

          return (
            <article
              key={branch.id}
              className={branch.id === selectedBranchId ? 'branch-card branch-card--active branch-card--scenic' : 'branch-card branch-card--scenic'}
            >
              <div className="branch-card__topline">
                <span className="eyebrow">{branch.district}</span>
                <button
                  type="button"
                  className="button button--subtle"
                  onClick={() => selectBranch(branch.id)}
                >
                  {branch.id === selectedBranchId ? 'Selected' : 'Select branch'}
                </button>
              </div>
              <h2>{branch.name}</h2>
              <p>{branch.spotlight}</p>
              <ul className="feature-list">
                {branch.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {metrics ? (
                <div className="branch-card__stats">
                  <div>
                    <strong>{currency(metrics.salesToday)}</strong>
                    <span>Sales today</span>
                  </div>
                  <div>
                    <strong>{metrics.bookingsToday}</strong>
                    <span>Bookings today</span>
                  </div>
                  <div>
                    <strong>{percent(metrics.satisfaction)}</strong>
                    <span>Satisfaction</span>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
