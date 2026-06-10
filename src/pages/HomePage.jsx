import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function HomePage() {
  const { currentBranch, session } = useApp();
  const isCustomer = session?.role === 'customer';
  const isStaff = session && session.role !== 'customer';

  return (
    <div className="stack-xl">
      <section className="hero hero--doha">
        <div className="hero__copy">
          <span className="eyebrow">
            {isCustomer ? 'Customer dining area' : 'Open area'}
          </span>
          <h1>Steakhouse evenings shaped for London.</h1>
          <p>
            Dry-aged cuts, warm service, and destination dining across London&apos;s standout neighbourhoods.
            {isCustomer
              ? ' You can now reserve a table and review your bookings from your Steakz account.'
              : ' Before login, guests can view the menu or sign in to unlock table reservations.'}
          </p>

          <div className="hero__actions">
            <NavLink to="/menu" className="button button--primary">
              View menu
            </NavLink>
            {isCustomer ? (
              <>
                <NavLink to="/book" className="button button--ghost">
                  Reserve a table
                </NavLink>
                <NavLink to="/portal/customer/bookings" className="button button--subtle">
                  My bookings
                </NavLink>
              </>
            ) : (
              <NavLink to="/login" className="button button--ghost">
                Login or create account
              </NavLink>
            )}
          </div>

          <div className="home-quickline">
            <div>
              <span className="eyebrow">Current branch</span>
              <strong>{currentBranch.name}</strong>
            </div>
            <div>
              <span className="eyebrow">Hours</span>
              <strong>{currentBranch.hours}</strong>
            </div>
            <div>
              <span className="eyebrow">Contact</span>
              <strong>{currentBranch.phone}</strong>
            </div>
          </div>
        </div>

        <div className="hero__spotlight">
          <span className="eyebrow">{isCustomer ? 'Reservation access' : 'Login required'}</span>
          <h2>{isCustomer ? currentBranch.name : 'Book tables after login'}</h2>
          <p>
            {isCustomer
              ? currentBranch.signature
              : 'Guests can browse the Steakz menu openly. Table reservations are connected to customer accounts so every booking can be reviewed later.'}
          </p>
          <ul className="feature-list">
            {isCustomer ? currentBranch.features.map((feature) => (
              <li key={feature}>{feature}</li>
            )) : (
              <>
                <li>Public access: menu browsing</li>
                <li>Customer access: table reservations</li>
                <li>Customer account: booking history</li>
              </>
            )}
          </ul>
          {isCustomer ? (
            <NavLink to="/portal/customer" className="button button--subtle">
              Open customer account
            </NavLink>
          ) : isStaff ? (
            <NavLink to={`/portal/${session.role}`} className="button button--subtle">
              Open staff dashboard
            </NavLink>
          ) : (
            <NavLink to="/login" className="button button--subtle">
              Login or create account
            </NavLink>
          )}
        </div>
      </section>

      <section className="home-branch-band">
        <div className="home-branch-band__content">
          <span className="eyebrow">Selected branch</span>
          <h2>{currentBranch.name}</h2>
          <p>{currentBranch.spotlight}</p>
          <div className="hero__actions">
            {isCustomer ? (
              <>
                <NavLink to="/book" className="button button--primary">
                  Reserve now
                </NavLink>
                <NavLink to="/portal/customer/bookings" className="button button--ghost">
                  View my bookings
                </NavLink>
              </>
            ) : (
              <>
                <NavLink to="/menu" className="button button--primary">
                  Explore menu
                </NavLink>
                <NavLink to="/login" className="button button--ghost">
                  Login to reserve
                </NavLink>
              </>
            )}
          </div>
        </div>
        <div className="home-branch-band__meta">
          <span>{currentBranch.district}</span>
          <span>{currentBranch.hours}</span>
          <span>{currentBranch.phone}</span>
        </div>
      </section>
    </div>
  );
}
