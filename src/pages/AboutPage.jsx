import { useApp } from '../context/AppContext';

const milestones = [
  {
    year: '2014',
    title: 'A small grill room in London',
    copy: 'Steakz began with a focused promise: premium cuts, warm service, and a dining room built around the theatre of open-fire cooking.',
  },
  {
    year: '2017',
    title: 'London guests made it their own',
    copy: 'As regular guests returned for birthdays, business dinners, and weekend lunches, Steakz expanded its hospitality style beyond fine dining into everyday celebration.',
  },
  {
    year: '2020',
    title: 'Reservations became smarter',
    copy: 'The team invested in digital bookings, branch-level menu control, and clearer kitchen coordination so service could stay calm even on busy nights.',
  },
  {
    year: '2026',
    title: 'One connected restaurant system',
    copy: 'Today Steakz uses a unified MIS to connect guests, chefs, branch managers, headquarters, and administrators across the full restaurant operation.',
  },
];

export function AboutPage() {
  const { store } = useApp();
  const branchNames = store.branches.map((branch) => branch.name).join(', ');

  return (
    <div className="stack-xl">
      <section className="about-panel">
        <div className="about-panel__intro">
          <span className="eyebrow">Our story</span>
          <h1>Built in London around fire, hospitality, and quiet precision.</h1>
          <p className="about-panel__lead">
            Steakz is a premium multi-branch restaurant brand shaped by the atmosphere of a modern
            steakhouse and the discipline of a carefully managed hospitality operation.
          </p>
        </div>

        <div className="about-panel__stats">
          <article>
            <span className="eyebrow">Steakz London</span>
            <strong>{store.branches.length}</strong>
            <p>Branches serving guests across London and its standout dining districts.</p>
          </article>
          <article>
            <span className="eyebrow">Signature</span>
            <h2>One standard across every dining room.</h2>
            <p>Each branch carries its own atmosphere while staying rooted in the same Steakz service language.</p>
          </article>
        </div>

        <div className="about-panel__section">
          <div>
            <span className="eyebrow">Restaurant philosophy</span>
            <h2>Premium dining should feel effortless, not complicated.</h2>
          </div>
          <p>
            Every Steakz branch is designed to balance atmosphere with operational control. Guests see
            a calm dining room, polished reservations, and a confident menu. Behind that experience,
          branch teams coordinate orders, service flow, staffing, and dining standards through one
            connected management system.
          </p>
        </div>

        <div className="about-panel__timeline">
          {milestones.map((milestone) => (
            <article key={milestone.year}>
              <span>{milestone.year}</span>
              <h3>{milestone.title}</h3>
              <p>{milestone.copy}</p>
            </article>
          ))}
        </div>

        <div className="about-panel__values">
          <article>
            <span className="eyebrow">Food</span>
            <h3>Fire-led menus</h3>
            <p>Steaks, signatures, sides, desserts, and drinks are selected to suit each branch and its guests.</p>
          </article>
          <article>
            <span className="eyebrow">Service</span>
            <h3>Warm precision</h3>
            <p>Hospitality is personal, but the operation behind it is structured, measured, and reliable.</p>
          </article>
          <article>
            <span className="eyebrow">Growth</span>
            <h3>One standard</h3>
            <p>Each location has its own character while sharing the same Steakz quality and management model.</p>
          </article>
        </div>

        <div className="about-panel__section about-panel__section--branches">
          <div>
            <span className="eyebrow">Where we serve</span>
            <h2>Five London dining rooms, one Steakz experience.</h2>
          </div>
          <div className="about-panel__branch-copy">
            <p>
              {branchNames}
            </p>
            <div className="about-panel__branch-list">
              {store.branches.map((branch) => (
                <article key={branch.id}>
                  <strong>{branch.name}</strong>
                  <span>{branch.district}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
