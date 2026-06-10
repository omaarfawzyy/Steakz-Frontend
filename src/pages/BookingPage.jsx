import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatDateTime } from '../lib/utils';

function nextEvening() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(19, 30, 0, 0);

  return date.toISOString().slice(0, 16);
}

export function BookingPage() {
  const { createBooking, currentUser, selectedBranchId, session, store } = useApp();
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [form, setForm] = useState({
    customerName: currentUser?.name ?? '',
    customerEmail: currentUser?.email ?? '',
    customerPhone: '',
    branchId: selectedBranchId,
    partySize: 2,
    dateTime: nextEvening(),
    occasion: '',
  });
  const customerBookings = store.bookings
    .filter((booking) => currentUser?.id && booking.customerId === currentUser.id)
    .slice(0, 3);
  const selectedBranch = store.branches.find((branch) => branch.id === form.branchId) ?? store.branches[0];

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  useEffect(() => {
    setForm((previous) => {
      const branchStillExists = store.branches.some((branch) => branch.id === previous.branchId);
      return branchStillExists ? previous : { ...previous, branchId: selectedBranchId };
    });
  }, [selectedBranchId, store.branches]);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const createdBooking = await createBooking(form);
      setSubmittedBooking(createdBooking ?? form);
    } catch {
      setSubmittedBooking(null);
    }
  }

  if (!session) {
    return (
      <div className="stack-xl">
        <section className="page-intro">
          <span className="eyebrow">Customer reservation</span>
          <h1>Login first to book a table.</h1>
          <p>
            Steakz keeps reservations inside customer accounts so guests can return later and see
            their upcoming bookings.
          </p>
        </section>

        <section className="panel panel--form">
          <span className="eyebrow">Account required</span>
          <h2>Create or sign in to your customer account.</h2>
          <p>
            You can still browse the public menu before logging in. Once signed in, this page will
            unlock the reservation form and choose the London branch you want to visit.
          </p>
          <div className="hero__actions">
            <NavLink to="/login" className="button button--primary">
              Login or create account
            </NavLink>
            <NavLink to="/menu" className="button button--ghost">
              View menu first
            </NavLink>
          </div>
        </section>
      </div>
    );
  }

  if (session.role !== 'customer') {
    return (
      <section className="panel panel--form">
        <span className="eyebrow">Customer-only booking</span>
        <h1>Table reservations are made through customer accounts.</h1>
        <p>
          Staff accounts should manage reservations from their dashboard. To create a personal table
          booking, sign out and use a customer account.
        </p>
        <NavLink to={`/portal/${session.role}`} className="button button--primary">
          Open dashboard
        </NavLink>
      </section>
    );
  }

  return (
    <div className="stack-xl">
      <section className="page-intro">
        <span className="eyebrow">Table booking</span>
        <h1>Book a table from your customer account.</h1>
        <p>Your reservation will be connected to your Steakz profile so you can review it later.</p>
      </section>

      <div className="booking-layout">
        <section className="panel panel--form booking-panel booking-panel--navy">
          <form className="form-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span className="field__label">Guest name</span>
              <input
                name="customerName"
                value={form.customerName}
                onChange={updateField}
                placeholder="Enter full name"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Email</span>
              <input
                name="customerEmail"
                type="email"
                value={form.customerEmail}
                onChange={updateField}
                placeholder="guest@example.com"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Phone</span>
              <input
                name="customerPhone"
                value={form.customerPhone}
                onChange={updateField}
                placeholder="+44 7700 900000"
              />
            </label>

            <label className="field">
              <span className="field__label">Choose London branch</span>
              <select name="branchId" value={form.branchId} onChange={updateField}>
                {store.branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">Party size</span>
              <input
                name="partySize"
                type="number"
                min="1"
                max="12"
                value={form.partySize}
                onChange={updateField}
              />
            </label>

            <label className="field">
              <span className="field__label">Date & time</span>
              <input
                name="dateTime"
                type="datetime-local"
                value={form.dateTime}
                onChange={updateField}
                required
              />
            </label>

            <label className="field field--full">
              <span className="field__label">Occasion</span>
              <input
                name="occasion"
                value={form.occasion}
                onChange={updateField}
                placeholder="Anniversary, business dinner, family lunch..."
              />
            </label>

            <button type="submit" className="button button--primary booking-panel__submit">
              Confirm booking
            </button>
          </form>
        </section>

        <aside className="booking-aside">
          <section className="panel booking-panel booking-panel--paper">
            <span className="eyebrow">Selected branch</span>
            <h2>{selectedBranch.name}</h2>
            <p>{selectedBranch.signature}</p>
            <ul className="detail-list">
              <li>{selectedBranch.address}</li>
              <li>{selectedBranch.hours}</li>
              <li>{selectedBranch.phone}</li>
            </ul>
          </section>

          {submittedBooking ? (
            <section className="panel panel--success booking-panel booking-panel--paper">
              <span className="eyebrow">Booking created</span>
              <h2>{submittedBooking.customerName}</h2>
              <p>{formatDateTime(submittedBooking.dateTime)} - Party of {submittedBooking.partySize}</p>
              <NavLink to="/portal/customer/bookings" className="button button--ghost">
                View my bookings
              </NavLink>
            </section>
          ) : null}

          <section className="panel booking-panel booking-panel--paper">
            <span className="eyebrow">My bookings</span>
            <h2>Your recent reservations</h2>
            {customerBookings.length ? (
              <ul className="detail-list">
                {customerBookings.map((booking) => (
                  <li key={booking.id}>
                    {formatDateTime(booking.dateTime)} - Party of {booking.partySize}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No bookings yet. Your confirmed requests will appear here.</p>
            )}
            <NavLink to="/portal/customer/bookings" className="button button--subtle">
              Open booking history
            </NavLink>
          </section>
        </aside>
      </div>
    </div>
  );
}
