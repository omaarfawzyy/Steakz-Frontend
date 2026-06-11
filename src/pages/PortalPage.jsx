import { useEffect, useState } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import { PortalLayout } from '../components/PortalLayout';
import { DataTable, MetricCard, Panel, ProgressBars, SectionHeading, StatusBadge } from '../components/ui';
import { useApp } from '../context/AppContext';
import { currency, formatDateTime, getRoleLabel, percent, sumBy } from '../lib/utils';

const sectionMap = {
  customer: [
    { id: 'overview', label: 'Account Home', hint: 'Your visit summary' },
    { id: 'order', label: 'Order Food', hint: 'Branch menu order' },
    { id: 'bookings', label: 'My Bookings', hint: 'Reserved tables' },
    { id: 'orders', label: 'My Orders', hint: 'Food order history' },
  ],
  chef: [
    { id: 'overview', label: 'Overview', hint: 'Kitchen pulse' },
    { id: 'orders', label: 'Orders', hint: 'Move tickets forward' },
    { id: 'bookings', label: 'Bookings', hint: 'Expected covers' },
    { id: 'shifts', label: 'Shifts', hint: 'Next week rota' },
  ],
  waiter: [
    { id: 'overview', label: 'Overview', hint: 'Service floor' },
    { id: 'orders', label: 'Orders', hint: 'Serve ready food' },
    { id: 'take-order', label: 'Take Order', hint: 'Dine-in or pickup' },
    { id: 'bookings', label: 'Bookings', hint: 'Guest arrivals' },
    { id: 'shifts', label: 'Shifts', hint: 'Next week rota' },
  ],
  'branch-manager': [
    { id: 'overview', label: 'Overview', hint: 'Branch KPIs' },
    { id: 'sales', label: 'Sales', hint: 'Revenue view' },
    { id: 'staff', label: 'Staff', hint: 'Branch team' },
    { id: 'bookings', label: 'Bookings', hint: 'Reservations' },
    { id: 'orders', label: 'Orders', hint: 'Service execution' },
    { id: 'shifts', label: 'Shifts', hint: "Today's rota" },
    { id: 'menu', label: 'Menu', hint: 'Branch-specific items' },
  ],
  'hq-manager': [
    { id: 'overview', label: 'Overview', hint: 'Group health' },
    { id: 'sales', label: 'Sales', hint: 'Branch comparison' },
    { id: 'staff', label: 'Staff', hint: 'Distribution' },
    { id: 'branches', label: 'Branches', hint: 'Add or delete locations' },
    { id: 'bookings', label: 'Bookings', hint: 'Coverage' },
    { id: 'orders', label: 'Orders', hint: 'Live branch activity' },
    { id: 'menu', label: 'Menu', hint: 'Shared menu' },
    { id: 'reports', label: 'Reports', hint: 'Executive summary' },
  ],
  admin: [
    { id: 'overview', label: 'Overview', hint: 'System status' },
    { id: 'users', label: 'Users', hint: 'Roles and accounts' },
    { id: 'branches', label: 'Branches', hint: 'Configuration' },
    { id: 'staff', label: 'Staff', hint: 'All teams' },
    { id: 'bookings', label: 'Bookings', hint: 'All reservations' },
    { id: 'orders', label: 'Orders', hint: 'All branch orders' },
    { id: 'shifts', label: 'Shifts', hint: 'Week roster' },
    { id: 'menu', label: 'Menu', hint: 'Menu setup' },
  ],
};

const roleOptions = ['customer', 'waiter', 'chef', 'branch-manager', 'hq-manager', 'admin'];
const ALL_BRANCHES_ID = 'all-branches';
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function PortalPage() {
  const { role, section = 'overview' } = useParams();
  const {
    currentBranch,
    currentUser,
    logout,
    selectBranch,
    selectedBranchId,
    session,
    store,
    updateBookingStatus,
    updateOrderStatus,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    addUser,
    addBranch,
    deleteBranch,
    createBooking,
    placeOrder,
    toggleUserStatus,
  } = useApp();

  if (!session || !currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (session.role !== role) {
    return <Navigate to={`/portal/${session.role}`} replace />;
  }

  const sections = sectionMap[role];
  const activeSection = sections?.find((entry) => entry.id === section);

  if (!sections) {
    return <Navigate to={`/portal/${session.role}`} replace />;
  }

  if (!activeSection) {
    return <Navigate to={`/portal/${role}/${sections[0].id}`} replace />;
  }

  const branchLookup = Object.fromEntries(store.branches.map((branch) => [branch.id, branch]));
  const isHqAllBranches = role === 'hq-manager' && selectedBranchId === ALL_BRANCHES_ID;

  const portfolioMetric = store.branchPerformance.find((entry) => entry.branchId === currentBranch.id);
  const branchOrders = store.orders.filter((order) => order.branchId === currentBranch.id);
  const scopedBookings = getScopedBookings({ role, currentUser, currentBranch, bookings: store.bookings, scopeAllBranches: isHqAllBranches });
  const scopedOrders = getScopedOrders({ role, currentUser, currentBranch, orders: store.orders, scopeAllBranches: isHqAllBranches });
  const scopedShifts = getScopedShifts({ role, currentUser, currentBranch, shifts: store.shifts, scopeAllBranches: isHqAllBranches });
  const scopedStaff = getScopedStaff({ role, currentBranch, staffMembers: store.staffMembers, scopeAllBranches: isHqAllBranches });
  const scopedMenu = getScopedMenu({ role, currentBranch, menuItems: store.menuItems });

  const title = activeSection.label;
  const subtitle = getSubtitle(role, currentBranch.name);
  const roleLabel = getRoleLabel(role);
  const branchLabel = role === 'hq-manager' && isHqAllBranches
    ? 'All London branches'
    : role === 'hq-manager' || role === 'admin'
    ? `All branches - viewing ${currentBranch.name}`
    : role === 'customer'
    ? 'Customer account'
    : currentBranch.name;

  const toolbar = (
    <div className="toolbar">
      {(role === 'hq-manager' || role === 'admin') ? (
        <label className="field field--compact">
          <span className="field__label">Lens branch</span>
          <select value={selectedBranchId} onChange={(event) => selectBranch(event.target.value)}>
            {role === 'hq-manager' ? (
              <option value={ALL_BRANCHES_ID}>All London branches</option>
            ) : null}
            {store.branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
            </select>
          </label>
      ) : role === 'customer' ? null : (
        <StatusBadge tone="info">{currentBranch.name}</StatusBadge>
      )}
    </div>
  );

  return (
    <PortalLayout
      roleLabel={roleLabel}
      title={title}
      subtitle={subtitle}
      sections={sections}
      basePath={`/portal/${role}`}
      currentUser={currentUser}
      branchLabel={branchLabel}
      toolbar={toolbar}
      onLogout={logout}
    >
      {renderSection({
        role,
        section,
        branchLookup,
        currentBranch,
        currentUser,
        store,
        portfolioMetric,
        branchOrders,
        scopedBookings,
        scopedOrders,
        scopedShifts,
        scopedStaff,
        scopedMenu,
        selectedBranchId,
        updateBookingStatus,
        updateOrderStatus,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        addUser,
        addBranch,
        deleteBranch,
        createBooking,
        placeOrder,
        selectBranch,
        toggleUserStatus,
      })}
    </PortalLayout>
  );
}

function renderSection(props) {
  if (props.role === 'customer') {
    return renderCustomerSection(props);
  }

  if (props.role === 'chef') {
    return renderChefSection(props);
  }

  if (props.role === 'waiter') {
    return renderWaiterSection(props);
  }

  if (props.role === 'branch-manager') {
    return renderBranchManagerSection(props);
  }

  if (props.role === 'hq-manager') {
    return renderHqSection(props);
  }

  return renderAdminSection(props);
}

function MarkReadyButton({ order, onReady }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const isFinal = order.status === 'Ready' || order.status === 'Completed' || order.status === 'Cancelled';

  async function handleClick() {
    setError('');
    setIsUpdating(true);

    try {
      await onReady(order.id, 'Ready');
    } catch (err) {
      setError(err.message || 'Could not mark this order ready.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="stack-sm">
      <button
        type="button"
        className="button button--primary"
        disabled={isFinal || isUpdating}
        onClick={handleClick}
      >
        {order.status === 'Ready' ? 'Ready' : isUpdating ? 'Updating...' : 'Mark ready'}
      </button>
      {error ? <p className="form-alert">{error}</p> : null}
    </div>
  );
}

function MarkServedButton({ order, onServed }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const isServed = order.status === 'Completed';
  const canServe = order.status === 'Ready';

  async function handleClick() {
    setError('');
    setIsUpdating(true);

    try {
      await onServed(order.id, 'Completed');
    } catch (err) {
      setError(err.message || 'Could not mark this order served.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="stack-sm">
      <button
        type="button"
        className="button button--primary"
        disabled={!canServe || isUpdating}
        onClick={handleClick}
      >
        {isServed ? 'Served' : isUpdating ? 'Updating...' : 'Mark served'}
      </button>
      {error ? <p className="form-alert">{error}</p> : null}
    </div>
  );
}

function ConfirmBookingButton({ booking, onConfirm }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const canConfirm = booking.status === 'Pending';
  const label = canConfirm ? 'Confirm' : booking.status;

  async function handleClick() {
    setError('');
    setIsUpdating(true);

    try {
      await onConfirm(booking.id, 'Confirmed');
    } catch (err) {
      setError(err.message || 'Could not confirm this booking.');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="stack-sm">
      <button
        type="button"
        className="button button--primary"
        disabled={!canConfirm || isUpdating}
        onClick={handleClick}
      >
        {isUpdating ? 'Updating...' : label}
      </button>
      {error ? <p className="form-alert">{error}</p> : null}
    </div>
  );
}

function CustomerActionCard({ action, description, eyebrow, title, to }) {
  return (
    <article className="customer-action-card">
      <span className="eyebrow">{eyebrow}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <NavLink to={to} className="button button--primary">
        {action}
      </NavLink>
    </article>
  );
}

function nextCustomerBookingTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(19, 30, 0, 0);

  return date.toISOString().slice(0, 16);
}

function CustomerBookingForm({ currentBranch, currentUser, onSubmit, selectedBranchId, store }) {
  const [form, setForm] = useState({
    customerName: currentUser?.name ?? '',
    customerEmail: currentUser?.email ?? '',
    customerPhone: '',
    branchId: selectedBranchId ?? currentBranch.id,
    partySize: 2,
    dateTime: nextCustomerBookingTime(),
    occasion: '',
  });
  const [submittedBooking, setSubmittedBooking] = useState(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedBranch = store.branches.find((branch) => branch.id === form.branchId) ?? currentBranch;

  useEffect(() => {
    setForm((previous) => {
      const branchStillExists = store.branches.some((branch) => branch.id === previous.branchId);
      if (branchStillExists && previous.branchId === selectedBranchId) {
        return previous;
      }

      return { ...previous, branchId: selectedBranchId ?? currentBranch.id };
    });
  }, [currentBranch.id, selectedBranchId, store.branches]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const createdBooking = await onSubmit(form);
      setSubmittedBooking(createdBooking ?? form);
      setForm((previous) => ({
        ...previous,
        customerPhone: '',
        partySize: 2,
        dateTime: nextCustomerBookingTime(),
        occasion: '',
      }));
    } catch (err) {
      setSubmittedBooking(null);
      setFormError(err.message || 'Unable to create this booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Panel>
      <SectionHeading
        title="Book a table"
        description="Create a reservation from inside your customer portal."
      />

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

        {formError ? <p className="form-alert field--full">{formError}</p> : null}

        {submittedBooking ? (
          <p className="form-success field--full">
            Booking created for {selectedBranch.name} on {formatDateTime(submittedBooking.dateTime)}.
          </p>
        ) : null}

        <button type="submit" className="button button--primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating booking...' : 'Confirm booking'}
        </button>
      </form>
    </Panel>
  );
}

function renderCustomerSection(props) {
  const upcomingBookings = props.scopedBookings
    .filter((booking) => !['Cancelled', 'Completed'].includes(booking.status))
    .slice(0, 3);
  const nextBooking = upcomingBookings[0];
  const recentOrders = props.scopedOrders.slice(0, 5);

  if (props.section === 'overview') {
    return (
      <div className="stack-lg">
        <section className="customer-welcome panel">
          <div>
            <span className="eyebrow">Customer account</span>
            <h2>Welcome back, {props.currentUser.name}.</h2>
            <p>
              Manage your next Steakz visit from one place: reserve a table, order from the
              selected branch, and review your history.
            </p>
          </div>
          <StatusBadge tone="info">{props.currentBranch.name}</StatusBadge>
        </section>

        <div className="customer-action-grid">
          <CustomerActionCard
            eyebrow="Table"
            title="Reserve a table"
            description="Choose a branch, date, time, and party size."
            to="/portal/customer/bookings"
            action="Book now"
          />
          <CustomerActionCard
            eyebrow="Food"
            title="Order from a branch"
            description="Choose any London branch and send your order to that kitchen only."
            to="/portal/customer/order"
            action="Start order"
          />
          <CustomerActionCard
            eyebrow="Bookings"
            title="View my bookings"
            description={nextBooking ? `Next table: ${formatDateTime(nextBooking.dateTime)}` : 'Your reservations will appear here.'}
            to="/portal/customer/bookings"
            action="Open bookings"
          />
        </div>

        <div className="metrics-grid">
          <MetricCard label="Bookings" value={props.scopedBookings.length} detail="Tables linked to your account." />
          <MetricCard label="Orders" value={props.scopedOrders.length} detail="Food orders linked to your account." accent="cream" />
          <MetricCard
            label="Next table"
            value={nextBooking ? formatDateTime(nextBooking.dateTime) : 'None yet'}
            detail={nextBooking ? `${nextBooking.partySize} guests - ${nextBooking.status}` : 'Book your first table.'}
            accent="bronze"
          />
          <MetricCard label="Branch" value={props.currentBranch.name} detail={props.currentBranch.signature} accent="soft" />
        </div>

        <div className="content-grid">
          <Panel>
            <SectionHeading title="Upcoming bookings" description="Your reserved tables and their current status." />
            <DataTable
              columns={[
                { key: 'dateTime', label: 'When', render: (row) => formatDateTime(row.dateTime) },
                { key: 'partySize', label: 'Party' },
                { key: 'occasion', label: 'Occasion' },
                { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
              ]}
              rows={upcomingBookings}
              emptyText="No bookings yet. Reserve your first table from the action card above."
            />
          </Panel>

          <Panel>
            <SectionHeading title="Selected branch" description="Your reservations use the selected branch above." />
            <div className="stack-md">
              <article className="timeline-card">
                <div>
                  <strong>{props.currentBranch.name}</strong>
                  <p>{props.currentBranch.address}</p>
                </div>
                <StatusBadge tone="info">{props.currentBranch.hours}</StatusBadge>
              </article>
              <NavLink to="/portal/customer/bookings" className="button button--primary">
                Book this branch
              </NavLink>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (props.section === 'order') {
    return (
      <div className="stack-lg">
        <Panel className="panel--order-branch">
          <SectionHeading
            eyebrow="Order branch"
            title="Choose where to send your food order"
            description="The chef and waiter dashboards will only receive orders for the branch you select here."
            action={(
              <label className="field field--compact">
                <span className="field__label">London branch</span>
                <select value={props.currentBranch.id} onChange={(event) => props.selectBranch(event.target.value)}>
                  {props.store.branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          />
          <div className="order-branch-card">
            <div>
              <strong>{props.currentBranch.name}</strong>
              <p>{props.currentBranch.address}</p>
            </div>
            <div>
              <span className="eyebrow">Hours</span>
              <p>{props.currentBranch.hours}</p>
            </div>
            <StatusBadge tone="info">Selected kitchen</StatusBadge>
          </div>
        </Panel>

        <Panel>
          <SectionHeading
            title={`Order from ${props.currentBranch.name}`}
            description="Orders are sent only to the selected branch and are not visible in other branch dashboards."
          />
          <CustomerOrderBuilder
            menuItems={props.scopedMenu}
            branchId={props.currentBranch.id}
            branchName={props.currentBranch.name}
            onSubmit={props.placeOrder}
          />
        </Panel>

        <Panel>
          <SectionHeading title="Recent orders" description="Your latest food orders from your account." />
          <DataTable
            columns={[
              { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
              { key: 'placedAt', label: 'Placed', render: (row) => formatDateTime(row.placedAt) },
              { key: 'type', label: 'Type' },
              { key: 'total', label: 'Total', render: (row) => currency(row.total) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
            ]}
            rows={recentOrders}
            emptyText="No orders yet. Build your first order above."
          />
        </Panel>
      </div>
    );
  }

  if (props.section === 'bookings') {
    return (
      <div className="stack-lg">
        <CustomerBookingForm
          currentBranch={props.currentBranch}
          currentUser={props.currentUser}
          onSubmit={props.createBooking}
          selectedBranchId={props.selectedBranchId}
          store={props.store}
        />

        <Panel>
          <SectionHeading title="My bookings" description="All table reservations saved to your customer account." />
          <DataTable
            columns={[
              { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
              { key: 'dateTime', label: 'Date', render: (row) => formatDateTime(row.dateTime) },
              { key: 'partySize', label: 'Party size' },
              { key: 'occasion', label: 'Occasion' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
            ]}
            rows={props.scopedBookings}
            emptyText="No bookings yet. Use Reserve table to create your first one."
          />
        </Panel>
      </div>
    );
  }

  if (props.section === 'orders') {
    return (
      <Panel>
        <SectionHeading
          title="My orders"
          description="Food order history connected to your customer account."
        />
        <DataTable
          columns={[
            { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
            { key: 'placedAt', label: 'Placed', render: (row) => formatDateTime(row.placedAt) },
            { key: 'type', label: 'Type' },
            { key: 'total', label: 'Total', render: (row) => currency(row.total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedOrders}
          emptyText="No food orders yet. Use Order Food to send an order to the selected branch."
        />
      </Panel>
    );
  }

  return null;
}

function renderChefSection(props) {
  const pendingOrders = props.scopedOrders.filter((order) => order.status === 'Pending').length;
  const activeBookings = props.scopedBookings.filter((booking) => !['Cancelled', 'Completed'].includes(booking.status));

  if (props.section === 'overview') {
    return (
      <div className="stack-lg">
        <div className="metrics-grid">
          <MetricCard label="Pending tickets" value={pendingOrders} detail="Orders still waiting to fire." />
          <MetricCard label="Preparing now" value={props.scopedOrders.filter((order) => order.status === 'Preparing').length} detail="Orders currently in the kitchen." accent="bronze" />
          <MetricCard label="Ready orders" value={props.scopedOrders.filter((order) => order.status === 'Ready').length} detail="Tickets ready for service." accent="cream" />
          <MetricCard label="Expected covers" value={activeBookings.length} detail="Bookings still due for service." accent="soft" />
        </div>
        <div className="content-grid">
          <Panel>
            <SectionHeading title="Kitchen pass" description="Live tickets for the kitchen line." />
            <div className="stack-md">
              {props.scopedOrders.slice(0, 5).map((order) => (
                <article key={order.id} className="timeline-card">
                  <div>
                    <strong>{order.id}</strong>
                    <p>{order.customerName} - {currency(order.total)}</p>
                  </div>
                  <StatusBadge>{order.status}</StatusBadge>
                </article>
              ))}
            </div>
          </Panel>
          <Panel>
            <SectionHeading title="Upcoming arrivals" description="Bookings that help the kitchen anticipate service demand." />
            <div className="stack-md">
              {activeBookings.slice(0, 5).map((booking) => (
                <article key={booking.id} className="timeline-card">
                  <div>
                    <strong>{booking.customerName}</strong>
                    <p>{formatDateTime(booking.dateTime)} - {booking.partySize} guests</p>
                  </div>
                  <StatusBadge>{booking.status}</StatusBadge>
                </article>
              ))}
              {!activeBookings.length ? (
                <p className="muted-copy">No upcoming bookings for this branch right now.</p>
              ) : null}
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (props.section === 'orders') {
    return (
      <Panel>
        <SectionHeading title="Kitchen tickets" description="Prepare active orders and mark dishes ready for service." />
        <DataTable
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'customerName', label: 'Guest' },
            { key: 'type', label: 'Type' },
            { key: 'placedAt', label: 'Placed', render: (row) => formatDateTime(row.placedAt) },
            { key: 'total', label: 'Total', render: (row) => currency(row.total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
            {
              key: 'actions',
              label: 'Action',
              render: (row) => (
                <MarkReadyButton order={row} onReady={props.updateOrderStatus} />
              ),
            },
          ]}
          rows={props.scopedOrders}
        />
      </Panel>
    );
  }

  if (props.section === 'bookings') {
    return (
      <Panel>
        <SectionHeading title="Expected bookings" description="Dining room covers the kitchen should prepare for." />
        <DataTable
          columns={[
            { key: 'customerName', label: 'Guest' },
            { key: 'partySize', label: 'Party' },
            { key: 'dateTime', label: 'When', render: (row) => formatDateTime(row.dateTime) },
            { key: 'occasion', label: 'Occasion' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedBookings}
          emptyText="No bookings are assigned to this branch yet."
        />
      </Panel>
    );
  }

  return (
    <Panel>
      <SectionHeading title="Shifts for the next week" description="Upcoming kitchen rota for your schedule." />
      <DataTable
        columns={[
          { key: 'personName', label: 'Name' },
          { key: 'role', label: 'Role' },
          { key: 'day', label: 'Day' },
          { key: 'slot', label: 'Shift' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
        ]}
        rows={props.scopedShifts}
        emptyText="No shifts scheduled for the next week."
      />
    </Panel>
  );
}

function renderWaiterSection(props) {
  const readyOrders = props.scopedOrders.filter((order) => order.status === 'Ready');
  const activeBookings = props.scopedBookings.filter((booking) => !['Cancelled', 'Completed'].includes(booking.status));

  if (props.section === 'overview') {
    return (
      <div className="stack-lg">
        <div className="metrics-grid">
          <MetricCard label="Ready to serve" value={readyOrders.length} detail="Orders waiting for floor service." />
          <MetricCard label="Open orders" value={props.scopedOrders.filter((order) => !['Completed', 'Cancelled'].includes(order.status)).length} detail="Active branch tickets." accent="bronze" />
          <MetricCard label="Arrivals" value={activeBookings.length} detail="Bookings still expected or active." accent="cream" />
          <MetricCard label="Upcoming shifts" value={props.scopedShifts.length} detail="Your rota for the next week." accent="soft" />
        </div>

        <Panel>
          <SectionHeading title="Ready orders" description="Serve food only after the chef marks it ready." />
          <DataTable
            columns={[
              { key: 'id', label: 'Order' },
              { key: 'customerName', label: 'Guest' },
              { key: 'type', label: 'Type' },
              { key: 'placedAt', label: 'Placed', render: (row) => formatDateTime(row.placedAt) },
              { key: 'total', label: 'Total', render: (row) => currency(row.total) },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
              {
                key: 'actions',
                label: 'Action',
                render: (row) => <MarkServedButton order={row} onServed={props.updateOrderStatus} />,
              },
            ]}
            rows={readyOrders}
            emptyText="No ready orders yet. The chef must mark food ready before service."
          />
        </Panel>
      </div>
    );
  }

  if (props.section === 'orders') {
    return (
      <Panel>
        <SectionHeading title="Ready orders" description="Food ready to leave the pass and reach the guest." />
        <DataTable
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'customerName', label: 'Guest' },
            { key: 'type', label: 'Type' },
            { key: 'placedAt', label: 'Placed', render: (row) => formatDateTime(row.placedAt) },
            { key: 'total', label: 'Total', render: (row) => currency(row.total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
            {
              key: 'actions',
              label: 'Action',
              render: (row) => <MarkServedButton order={row} onServed={props.updateOrderStatus} />,
            },
          ]}
          rows={props.scopedOrders}
        />
      </Panel>
    );
  }

  if (props.section === 'take-order') {
    return (
      <Panel>
        <SectionHeading
          title={`Take order for ${props.currentBranch.name}`}
          description="Create dine-in or pickup orders for the service floor."
        />
        <CustomerOrderBuilder
          menuItems={props.scopedMenu}
          branchId={props.currentBranch.id}
          branchName={props.currentBranch.name}
          onSubmit={props.placeOrder}
        />
      </Panel>
    );
  }

  if (props.section === 'bookings') {
    return (
      <Panel>
        <SectionHeading title="Guest bookings" description="Expected arrivals for today and upcoming service." />
        <DataTable
          columns={[
            { key: 'customerName', label: 'Guest' },
            { key: 'partySize', label: 'Party' },
            { key: 'dateTime', label: 'When', render: (row) => formatDateTime(row.dateTime) },
            { key: 'occasion', label: 'Occasion' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
            {
              key: 'action',
              label: 'Action',
              render: (row) => (
                <ConfirmBookingButton booking={row} onConfirm={props.updateBookingStatus} />
              ),
            },
          ]}
          rows={props.scopedBookings}
          emptyText="No guest bookings for this branch yet."
        />
      </Panel>
    );
  }

  return (
    <Panel>
      <SectionHeading title="Shifts for the next week" description="Upcoming service rota for your schedule." />
      <DataTable
        columns={[
          { key: 'personName', label: 'Name' },
          { key: 'role', label: 'Role' },
          { key: 'day', label: 'Day' },
          { key: 'slot', label: 'Shift' },
          { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
        ]}
        rows={props.scopedShifts}
        emptyText="No shifts scheduled for the next week."
      />
    </Panel>
  );
}

function renderBranchManagerSection(props) {
  const allMetrics = props.store.branchPerformance;
  const branchMetric = allMetrics.find((entry) => entry.branchId === props.currentBranch.id);
  const portfolioAverage = sumBy(allMetrics, (entry) => entry.salesToday) / allMetrics.length;

  if (props.section === 'overview') {
    return (
      <div className="stack-lg">
        <div className="metrics-grid">
          <MetricCard label="Sales today" value={currency(branchMetric?.salesToday ?? 0)} detail="Branch-only revenue." />
          <MetricCard label="Month revenue" value={currency(branchMetric?.salesMonth ?? 0)} detail="Current month performance." accent="bronze" />
          <MetricCard label="Active staff" value={branchMetric?.activeStaff ?? 0} detail="Assigned branch headcount." accent="cream" />
          <MetricCard label="Bookings today" value={branchMetric?.bookingsToday ?? 0} detail="Dining room demand." accent="soft" />
        </div>
        <div className="content-grid">
          <Panel>
            <SectionHeading title="Revenue position" description="Branch performance against the current portfolio average." />
            <ProgressBars
              items={[
                { label: props.currentBranch.name, value: branchMetric?.salesToday ?? 0 },
                { label: 'Portfolio average', value: portfolioAverage },
              ]}
              formatter={currency}
            />
          </Panel>
          <Panel>
            <SectionHeading title="Immediate attention" description="Operational alerts that need a branch manager lens." />
            <div className="stack-md">
              <article className="timeline-card">
                <div>
                  <strong>{props.scopedBookings.length} bookings in scope</strong>
                  <p>Guest tables scheduled or recently updated.</p>
                </div>
                <StatusBadge tone="info">Dining room</StatusBadge>
              </article>
              <article className="timeline-card">
                <div>
                  <strong>{props.scopedOrders.filter((order) => !['Completed', 'Cancelled'].includes(order.status)).length} active orders</strong>
                  <p>Kitchen and service teams are moving current tickets.</p>
                </div>
                <StatusBadge tone="warning">Orders</StatusBadge>
              </article>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (props.section === 'sales') {
    return (
      <div className="stack-lg">
        <Panel>
          <SectionHeading title="Branch sales snapshot" description="Daily performance for this restaurant." />
          <div className="metrics-grid">
            <MetricCard label="Average ticket" value={currency(branchMetric?.averageTicket ?? 0)} detail="Current guest check mix." />
            <MetricCard label="Satisfaction" value={percent(branchMetric?.satisfaction ?? 0)} detail="Service quality pulse." accent="bronze" />
            <MetricCard label="Pending orders" value={branchMetric?.pendingOrders ?? 0} detail="Tickets still in flight." accent="cream" />
          </div>
        </Panel>
      </div>
    );
  }

  if (props.section === 'staff') {
    return (
      <Panel>
        <SectionHeading title="Branch staff" description="Team view for this restaurant." />
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'email', label: 'Email' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedStaff}
        />
      </Panel>
    );
  }

  if (props.section === 'bookings') {
    return (
      <Panel>
        <SectionHeading title="Branch bookings" description="All guest reservations for the assigned location." />
        <DataTable
          columns={[
            { key: 'customerName', label: 'Guest' },
            { key: 'partySize', label: 'Party' },
            { key: 'dateTime', label: 'When', render: (row) => formatDateTime(row.dateTime) },
            { key: 'occasion', label: 'Occasion' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedBookings}
        />
      </Panel>
    );
  }

  if (props.section === 'orders') {
    return (
      <Panel>
        <SectionHeading title="Branch orders" description="Operational order visibility for dining room and kitchen coordination." />
        <DataTable
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'customerName', label: 'Guest' },
            { key: 'type', label: 'Type' },
            { key: 'total', label: 'Total', render: (row) => currency(row.total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedOrders}
        />
      </Panel>
    );
  }

  if (props.section === 'shifts') {
    return (
      <Panel>
        <SectionHeading title="Staff working today" description="Today&apos;s rota for the branch team." />
        <DataTable
          columns={[
            { key: 'personName', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'day', label: 'Day' },
            { key: 'slot', label: 'Shift' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedShifts}
        emptyText="No staff shifts scheduled today."
        />
      </Panel>
    );
  }

  return (
    <MenuManagementSection
      title="Branch menu items"
      description="Manage dishes available at this restaurant."
      addDescription="Branch managers can create dishes for their own location."
      menuItems={props.scopedMenu}
      branchLookup={props.branchLookup}
      addBranchIds={[props.currentBranch.id]}
      onAdd={props.addMenuItem}
      onUpdate={props.updateMenuItem}
      onDelete={props.deleteMenuItem}
    />
  );
}

function BranchRegistrySection({ description, onAdd, onDelete, store, title }) {
  function handleDelete(branch) {
    const confirmed = window.confirm(
      `Delete ${branch.name}? This will remove its orders, bookings, menu items, and shifts.`,
    );

    if (confirmed) {
      onDelete(branch.id);
    }
  }

  return (
    <div className="stack-lg">
      <Panel>
        <SectionHeading title={title} description={description} />
        <DataTable
          columns={[
            { key: 'name', label: 'Branch' },
            { key: 'code', label: 'Code' },
            { key: 'city', label: 'City' },
            { key: 'address', label: 'Address' },
            { key: 'capacity', label: 'Capacity' },
            {
              key: 'actions',
              label: 'Action',
              render: (row) => (
                <button
                  type="button"
                  className="button button--subtle"
                  disabled={store.branches.length <= 1}
                  onClick={() => handleDelete(row)}
                >
                  Delete
                </button>
              ),
            },
          ]}
          rows={store.branches}
        />
      </Panel>
      <AddBranchForm onAdd={onAdd} />
    </div>
  );
}

function renderHqSection(props) {
  const isAllBranches = props.selectedBranchId === ALL_BRANCHES_ID;
  const visibleBranches = isAllBranches ? props.store.branches : [props.currentBranch];
  const visibleBranchIds = new Set(visibleBranches.map((branch) => branch.id));
  const visibleMetrics = props.store.branchPerformance.filter((entry) => visibleBranchIds.has(entry.branchId));
  const totalSalesToday = sumBy(visibleMetrics, (entry) => entry.salesToday);
  const totalSalesMonth = sumBy(visibleMetrics, (entry) => entry.salesMonth);
  const topBranch = [...visibleMetrics].sort((left, right) => right.salesMonth - left.salesMonth)[0];
  const activeOrders = props.scopedOrders.filter((order) => !['Completed', 'Cancelled'].includes(order.status));
  const scopeLabel = isAllBranches ? 'all London branches' : props.currentBranch.name;
  const branchCountLabel = isAllBranches ? `${visibleBranches.length} branches` : '1 branch';

  if (props.section === 'overview') {
    return (
      <div className="stack-lg">
        <Panel>
          <SectionHeading
            title={isAllBranches ? 'London branch portfolio' : `${props.currentBranch.name} branch profile`}
            description={isAllBranches
              ? 'A headquarters view of every Steakz London location before drilling into one branch.'
              : 'A focused headquarters lens for one selected branch.'}
          />
          <div className="card-grid card-grid--three">
            {visibleBranches.map((branch) => {
              const branchMetric = props.store.branchPerformance.find((entry) => entry.branchId === branch.id);
              const branchBookings = props.store.bookings.filter((booking) => booking.branchId === branch.id);
              const branchOrdersForCard = props.store.orders.filter((order) => order.branchId === branch.id);

              return (
                <article key={branch.id} className="customer-action-card">
                  <span className="eyebrow">{branch.district}</span>
                  <h3>{branch.name}</h3>
                  <p>{branch.address}</p>
                  <div className="report-card__stats">
                    <span>{currency(branchMetric?.salesMonth ?? 0)} month revenue</span>
                    <span>{branchOrdersForCard.length} orders</span>
                    <span>{branchBookings.length} bookings</span>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>

        <div className="metrics-grid">
          <MetricCard
            label={isAllBranches ? 'Total sales today' : 'Branch sales today'}
            value={currency(totalSalesToday)}
            detail={`Scope: ${scopeLabel}.`}
          />
          <MetricCard
            label="Month revenue"
            value={currency(totalSalesMonth)}
            detail={isAllBranches ? 'Portfolio month-to-date.' : 'Selected branch month-to-date.'}
            accent="bronze"
          />
          <MetricCard
            label={isAllBranches ? 'Total orders' : 'Branch orders'}
            value={props.scopedOrders.length}
            detail="Open and completed tickets."
            accent="cream"
          />
          <MetricCard
            label={isAllBranches ? 'Top branch' : 'Selected branch'}
            value={topBranch ? props.branchLookup[topBranch.branchId]?.name ?? topBranch.branchId : props.currentBranch.name}
            detail={isAllBranches ? 'Leading monthly revenue.' : `${branchCountLabel} in focus.`}
            accent="soft"
          />
        </div>
        <div className="content-grid">
          <Panel>
            <SectionHeading
              title={isAllBranches ? 'Branch sales ranking' : 'Selected branch sales'}
              description={isAllBranches
                ? 'Fast branch comparison for executive monitoring.'
                : `Revenue view for ${props.currentBranch.name}.`}
            />
            <ProgressBars
              items={visibleMetrics.map((entry) => ({
                label: props.branchLookup[entry.branchId]?.name ?? entry.branchId,
                value: entry.salesMonth,
              }))}
              formatter={currency}
            />
          </Panel>
          <Panel>
            <SectionHeading
              title="Operational snapshot"
              description={`Current status signals for ${scopeLabel}.`}
            />
            <div className="stack-md">
              <article className="timeline-card">
                <div>
                  <strong>{props.scopedBookings.length} bookings tracked</strong>
                  <p>{isAllBranches ? 'HQ can inspect reservations across all branches.' : `Reservations for ${props.currentBranch.name}.`}</p>
                </div>
                <StatusBadge tone="info">Bookings</StatusBadge>
              </article>
              <article className="timeline-card">
                <div>
                  <strong>{activeOrders.length} active orders</strong>
                  <p>{isAllBranches ? 'Live service activity across London branches.' : `Live service activity for ${props.currentBranch.name}.`}</p>
                </div>
                <StatusBadge tone="warning">Orders</StatusBadge>
              </article>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (props.section === 'sales') {
    return (
      <Panel>
        <SectionHeading title="Cross-branch sales" description="Compare branch performance by monthly revenue." />
        <ProgressBars
          items={props.store.branchPerformance.map((entry) => ({
            label: props.branchLookup[entry.branchId]?.name ?? entry.branchId,
            value: entry.salesMonth,
          }))}
          formatter={currency}
        />
      </Panel>
    );
  }

  if (props.section === 'staff') {
    return (
      <Panel>
        <SectionHeading title="Staff distribution" description="HQ managers can review team structure across all branches." />
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
            { key: 'email', label: 'Email' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedStaff}
        />
      </Panel>
    );
  }

  if (props.section === 'branches') {
    return (
      <BranchRegistrySection
        title="Branch registry"
        description="HQ managers can create new Steakz locations and delete branches across the portfolio."
        store={props.store}
        onAdd={props.addBranch}
        onDelete={props.deleteBranch}
      />
    );
  }

  if (props.section === 'bookings') {
    return (
      <Panel>
        <SectionHeading title="Bookings across branches" description="Unified booking oversight for HQ operations." />
        <DataTable
          columns={[
            { key: 'customerName', label: 'Guest' },
            { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
            { key: 'partySize', label: 'Party' },
            { key: 'dateTime', label: 'Date', render: (row) => formatDateTime(row.dateTime) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedBookings}
        />
      </Panel>
    );
  }

  if (props.section === 'orders') {
    return (
      <Panel>
        <SectionHeading title="Orders across branches" description="HQ can review live and completed orders system-wide." />
        <DataTable
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
            { key: 'customerName', label: 'Guest' },
            { key: 'type', label: 'Type' },
            { key: 'total', label: 'Total', render: (row) => currency(row.total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedOrders}
        />
      </Panel>
    );
  }

  if (props.section === 'menu') {
    return (
      <MenuManagementSection
        title="Steakz shared menu"
        description="One menu used across all London branches."
        addDescription="HQ managers can add dishes to every branch menu."
        menuItems={props.scopedMenu}
        branchLookup={props.branchLookup}
        addBranchIds={props.store.branches.map((branch) => branch.id)}
        onAdd={props.addMenuItem}
        onUpdate={props.updateMenuItem}
        onDelete={props.deleteMenuItem}
        showAvailability
      />
    );
  }

  return (
    <div className="stack-lg">
      <Panel>
        <SectionHeading title="Executive comparison report" description="Satisfaction, ticket size, and booking demand in one glance." />
        <div className="report-grid">
          {props.store.branchPerformance.map((entry) => (
            <article key={entry.branchId} className="report-card">
              <span className="eyebrow">{props.branchLookup[entry.branchId]?.district}</span>
              <h3>{props.branchLookup[entry.branchId]?.name}</h3>
              <p>{currency(entry.salesMonth)} month revenue</p>
              <div className="report-card__stats">
                <span>{currency(entry.averageTicket)} avg ticket</span>
                <span>{percent(entry.satisfaction)} satisfaction</span>
                <span>{entry.bookingsToday} bookings today</span>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function isDemoWaiterUser(user) {
  if (user.role !== 'waiter') {
    return false;
  }

  const identity = `${user.id ?? ''} ${user.name ?? ''} ${user.email ?? ''}`.toLowerCase();
  const email = `${user.email ?? ''}`.toLowerCase().trim();
  return identity.includes('demo') || identity.includes('sample') || email === 'waiter@steakz.local';
}

function renderAdminSection(props) {
  const adminUsers = props.store.users.filter((user) => !isDemoWaiterUser(user));
  const activeUsers = adminUsers.filter((user) => user.status === 'Active').length;
  const inactiveUsers = adminUsers.length - activeUsers;
  const adminCount = adminUsers.filter((user) => user.role === 'admin').length;
  const pendingBookings = props.store.bookings.filter((booking) => booking.status === 'Pending').length;
  const activeOrders = props.store.orders.filter((order) => !['Completed', 'Cancelled'].includes(order.status)).length;
  const branchlessUsers = adminUsers.filter((user) => !user.branchId && user.role !== 'admin' && user.role !== 'hq-manager').length;
  const menuItemsCount = props.store.menuItems.length;

  if (props.section === 'overview') {
    return (
      <div className="stack-lg">
        <div className="metrics-grid">
          <MetricCard label="Active users" value={activeUsers} detail="Accounts currently enabled." />
          <MetricCard label="Inactive users" value={inactiveUsers} detail="Accounts requiring review." accent="bronze" />
          <MetricCard label="Branches configured" value={props.store.branches.length} detail="Live branch entities." accent="cream" />
          <MetricCard label="Admin accounts" value={adminCount} detail="System-wide access holders." accent="soft" />
        </div>
        <div className="content-grid">
          <Panel>
            <SectionHeading title="Platform watchlist" description="Operational items that need admin visibility across the full system." />
            <div className="stack-md">
              <article className="timeline-card">
                <div>
                  <strong>{pendingBookings} pending bookings</strong>
                  <p>Reservations still waiting for confirmation across Steakz branches.</p>
                </div>
                <StatusBadge tone={pendingBookings ? 'warning' : 'success'}>
                  {pendingBookings ? 'Needs review' : 'Clear'}
                </StatusBadge>
              </article>
              <article className="timeline-card">
                <div>
                  <strong>{activeOrders} active orders</strong>
                  <p>Current live service tickets moving through kitchen and floor teams.</p>
                </div>
                <StatusBadge tone="info">Live service</StatusBadge>
              </article>
              <article className="timeline-card">
                <div>
                  <strong>{branchlessUsers} unassigned branch users</strong>
                  <p>Branch-scoped roles should be reviewed if they are not linked to a location.</p>
                </div>
                <StatusBadge tone={branchlessUsers ? 'warning' : 'success'}>
                  {branchlessUsers ? 'Action needed' : 'Assigned'}
                </StatusBadge>
              </article>
            </div>
          </Panel>
          <Panel>
            <SectionHeading title="Admin priorities" description="Use the core admin sections to keep every branch correctly configured." />
            <div className="stack-md">
              <article className="timeline-card">
                <div>
                  <strong>User access</strong>
                  <p>Review enabled accounts, roles, and deactivations from the Users section.</p>
                </div>
                <StatusBadge tone="success">{activeUsers} active</StatusBadge>
              </article>
              <article className="timeline-card">
                <div>
                  <strong>Branch configuration</strong>
                  <p>Maintain location details and system-wide coverage for all live branches.</p>
                </div>
                <StatusBadge tone="info">{props.store.branches.length} branches</StatusBadge>
              </article>
              <article className="timeline-card">
                <div>
                  <strong>Menu catalogue</strong>
                  <p>Track shared and branch-linked items that are visible across the platform.</p>
                </div>
                <StatusBadge tone="info">{menuItemsCount} items</StatusBadge>
              </article>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (props.section === 'users') {
    return (
      <div className="stack-lg">
        <Panel>
          <SectionHeading title="User management" description="Create users, review roles, and activate or deactivate accounts." />
          <DataTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'role', label: 'Role', render: (row) => getRoleLabel(row.role) },
              { key: 'email', label: 'Email' },
              { key: 'branchId', label: 'Branch', render: (row) => row.branchId ? (props.branchLookup[row.branchId]?.name ?? row.branchId) : 'All branches' },
              { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
              {
                key: 'actions',
                label: 'Action',
                render: (row) => (
                  <button type="button" className="button button--subtle" onClick={() => props.toggleUserStatus(row.id)}>
                    {row.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>
                ),
              },
            ]}
            rows={adminUsers}
          />
        </Panel>
        <AddUserForm branches={props.store.branches} onAdd={props.addUser} />
      </div>
    );
  }

  if (props.section === 'branches') {
    return (
      <BranchRegistrySection
        title="Branch registry"
        description="Create, review, and delete Steakz branch records."
        store={props.store}
        onAdd={props.addBranch}
        onDelete={props.deleteBranch}
      />
    );
  }

  if (props.section === 'staff') {
    return (
      <Panel>
        <SectionHeading title="Staff directory" description="All active and inactive Steakz accounts." />
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role', render: (row) => getRoleLabel(row.role) },
            { key: 'branchId', label: 'Branch', render: (row) => row.branchId ? (props.branchLookup[row.branchId]?.name ?? row.branchId) : 'All branches' },
            { key: 'email', label: 'Email' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedStaff}
        />
      </Panel>
    );
  }

  if (props.section === 'bookings') {
    return (
      <Panel>
        <SectionHeading title="All bookings" description="Admin reservation visibility across the Steakz platform." />
        <DataTable
          columns={[
            { key: 'customerName', label: 'Guest' },
            { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
            { key: 'partySize', label: 'Party' },
            { key: 'dateTime', label: 'Date', render: (row) => formatDateTime(row.dateTime) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedBookings}
        />
      </Panel>
    );
  }

  if (props.section === 'orders') {
    return (
      <Panel>
        <SectionHeading title="All orders" description="Admin can monitor orders across branches." />
        <DataTable
          columns={[
            { key: 'id', label: 'Order' },
            { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
            { key: 'customerName', label: 'Guest' },
            { key: 'type', label: 'Type' },
            { key: 'total', label: 'Total', render: (row) => currency(row.total) },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedOrders}
        />
      </Panel>
    );
  }

  if (props.section === 'shifts') {
    return (
      <Panel>
        <SectionHeading title="All branch staff shifts" description="Staff rota visibility across every Steakz branch." />
        <DataTable
          columns={[
            { key: 'personName', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'branchId', label: 'Branch', render: (row) => props.branchLookup[row.branchId]?.name ?? row.branchId },
            { key: 'day', label: 'Day' },
            { key: 'slot', label: 'Shift' },
            { key: 'status', label: 'Status', render: (row) => <StatusBadge>{row.status}</StatusBadge> },
          ]}
          rows={props.scopedShifts}
          emptyText="No staff shifts found across the branches."
        />
      </Panel>
    );
  }

  if (props.section === 'menu') {
    return (
      <MenuManagementSection
        title="Steakz shared menu"
        description="One menu used across all London branches."
        addDescription="Admins can add dishes to every branch menu."
        menuItems={props.scopedMenu}
        branchLookup={props.branchLookup}
        addBranchIds={props.store.branches.map((branch) => branch.id)}
        onAdd={props.addMenuItem}
        onUpdate={props.updateMenuItem}
        onDelete={props.deleteMenuItem}
        showAvailability
      />
    );
  }

  return null;
}

function MenuManagementSection({
  addBranchIds,
  addDescription,
  branchLookup,
  description,
  menuItems,
  onAdd,
  onDelete,
  onUpdate,
  showAvailability = false,
  title,
}) {
  async function handleEdit(item) {
    const nextTitle = window.prompt('Dish title', item.title);

    if (nextTitle === null) {
      return;
    }

    const nextCategory = window.prompt('Category', item.category);

    if (nextCategory === null) {
      return;
    }

    const nextDescription = window.prompt('Description', item.description ?? '');

    if (nextDescription === null) {
      return;
    }

    const nextPrice = window.prompt('Price', String(item.price));

    if (nextPrice === null) {
      return;
    }

    const price = Number(nextPrice);

    if (!Number.isFinite(price) || price <= 0) {
      window.alert('Enter a valid menu price.');
      return;
    }

    if (!nextTitle.trim() || !nextCategory.trim()) {
      window.alert('Dish title and category are required.');
      return;
    }

    try {
      await onUpdate(item, {
        title: nextTitle.trim(),
        category: nextCategory.trim(),
        description: nextDescription.trim(),
        price,
      });
    } catch {
      window.alert('The menu item could not be updated.');
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(`Delete ${item.title} from the Steakz menu?`);

    if (!confirmed) {
      return;
    }

    try {
      await onDelete(item);
    } catch {
      window.alert('The menu item could not be deleted.');
    }
  }

  const columns = [
    { key: 'title', label: 'Dish' },
    { key: 'category', label: 'Category' },
    { key: 'price', label: 'Price', render: (row) => currency(row.price) },
    { key: 'description', label: 'Description' },
  ];

  if (showAvailability) {
    columns.push({
      key: 'availability',
      label: 'Available',
      render: (row) => {
        const branchCount = row.availableAt?.length ?? 0;
        return branchCount === 1
          ? branchLookup[row.availableAt[0]]?.name ?? '1 branch'
          : `${branchCount} branches`;
      },
    });
  }

  columns.push({
    key: 'actions',
    label: 'Actions',
    render: (row) => (
      <div className="inline-actions">
        <button type="button" className="button button--subtle" onClick={() => handleEdit(row)}>
          Edit
        </button>
        <button type="button" className="button button--subtle" onClick={() => handleDelete(row)}>
          Delete
        </button>
      </div>
    ),
  });

  return (
    <div className="stack-lg">
      <Panel>
        <SectionHeading title={title} description={description} />
        <DataTable columns={columns} rows={menuItems} />
      </Panel>
      <AddMenuItemForm branchIds={addBranchIds} description={addDescription} onAdd={onAdd} />
    </div>
  );
}

function CustomerOrderBuilder({ branchName = 'Steakz', menuItems, branchId, onSubmit }) {
  const [quantities, setQuantities] = useState({});
  const [type, setType] = useState('DINE_IN');
  const [note, setNote] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [orderError, setOrderError] = useState('');
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItems = menuItems
    .filter((item) => quantities[item.id] > 0)
    .map((item) => ({
      id: item.id,
      menuItemId: item.id,
      title: item.title,
      quantity: quantities[item.id],
      price: item.price,
    }));
  const total = sumBy(selectedItems, (item) => item.quantity * item.price);

  function setQuantity(itemId, delta) {
    setQuantities((previous) => {
      const nextQuantity = Math.max(0, (previous[itemId] ?? 0) + delta);
      return { ...previous, [itemId]: nextQuantity };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedItems.length) {
      return;
    }

    setIsSubmitting(true);
    setOrderMessage('');
    setOrderError('');

    try {
      const order = await onSubmit({ branchId, type, items: selectedItems, note });
      setOrderMessage(`Order ${order?.id ?? ''} was sent to the kitchen.`);
      setReceiptOrder({
        ...order,
        branchName,
        items: selectedItems,
        note,
        type: type === 'TAKEAWAY' ? 'Pickup' : 'Dine-in',
        total,
      });
      setQuantities({});
      setType('DINE_IN');
      setNote('');
    } catch (err) {
      setOrderError(err.message || 'The order could not be placed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="order-builder" onSubmit={handleSubmit}>
      <div className="card-grid card-grid--two">
        {menuItems.map((item) => (
          <article key={item.id} className="builder-card">
            <div className="builder-card__content">
              <span className="eyebrow">{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <div className="builder-card__footer">
              <strong>{currency(item.price)}</strong>
              <div className="inline-actions">
                <button type="button" className="button button--subtle" onClick={() => setQuantity(item.id, -1)}>
                  -
                </button>
                <span>{quantities[item.id] ?? 0}</span>
                <button type="button" className="button button--subtle" onClick={() => setQuantity(item.id, 1)}>
                  +
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="content-grid">
        <label className="field">
          <span className="field__label">Service type</span>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="DINE_IN">Dine-in</option>
            <option value="TAKEAWAY">Pickup</option>
          </select>
        </label>

        <label className="field">
          <span className="field__label">Notes</span>
          <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Allergies, pacing, table notes..." />
        </label>
      </div>

      <div className="panel panel--summary">
        <div className="summary-row">
          <span>Selected items</span>
          <strong>{selectedItems.length}</strong>
        </div>
        <div className="summary-row">
          <span>Estimated total</span>
          <strong>{currency(total)}</strong>
        </div>
        {orderMessage ? <p className="form-success">{orderMessage}</p> : null}
        {orderError ? <p className="form-alert">{orderError}</p> : null}
        <button type="submit" className="button button--primary" disabled={!selectedItems.length || isSubmitting}>
          {isSubmitting ? 'Placing order...' : 'Place order'}
        </button>
      </div>

      {receiptOrder ? (
        <OrderReceipt order={receiptOrder} />
      ) : null}
    </form>
  );
}

function OrderReceipt({ order }) {
  return (
    <section className="receipt-print panel">
      <div className="receipt-print__header">
        <div>
          <span className="eyebrow">Customer receipt</span>
          <h2>Steakz order receipt</h2>
          <p>{order.branchName}</p>
        </div>
        <strong>{currency(order.total)}</strong>
      </div>

      <div className="receipt-print__meta">
        <span>Order: {order.id}</span>
        <span>Type: {order.type}</span>
        <span>Date: {formatDateTime(order.placedAt ?? new Date().toISOString())}</span>
      </div>

      <div className="receipt-print__items">
        {order.items.map((item) => (
          <div key={item.id ?? item.menuItemId} className="summary-row">
            <span>{item.quantity} x {item.title}</span>
            <strong>{currency(Number(item.quantity) * Number(item.price))}</strong>
          </div>
        ))}
      </div>

      {order.note ? <p className="muted-copy">Note: {order.note}</p> : null}

      <div className="summary-row receipt-print__total">
        <span>Total</span>
        <strong>{currency(order.total)}</strong>
      </div>
    </section>
  );
}

function AddMenuItemForm({ branchId, branchIds, description = 'Create a new Steakz menu item.', onAdd }) {
  const [form, setForm] = useState({
    title: '',
    category: 'Signature Plates',
    description: '',
    price: 0,
  });
  const targetBranchIds = branchIds?.length ? branchIds : [branchId].filter(Boolean);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onAdd({ ...form, availableAt: targetBranchIds });
    setForm({ title: '', category: 'Signature Plates', description: '', price: 0 });
  }

  return (
    <Panel>
      <SectionHeading title="Add menu item" description={description} />
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Dish title</span>
          <input name="title" value={form.title} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Category</span>
          <select name="category" value={form.category} onChange={updateField}>
            <option>Starters</option>
            <option>Steaks</option>
            <option>Signature Plates</option>
            <option>Sides</option>
            <option>Desserts</option>
            <option>Beverages</option>
          </select>
        </label>
        <label className="field field--full">
          <span className="field__label">Description</span>
          <input name="description" value={form.description} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Price</span>
          <input name="price" type="number" min="0" value={form.price} onChange={updateField} required />
        </label>
        <button type="submit" className="button button--primary">
          Add menu item
        </button>
      </form>
    </Panel>
  );
}

function AddUserForm({ branches, onAdd }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    branchId: branches[0]?.id ?? '',
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onAdd({ ...form, branchId: form.role === 'hq-manager' || form.role === 'admin' ? undefined : form.branchId });
    setForm({ name: '', email: '', password: '', role: 'customer', branchId: branches[0]?.id ?? '' });
  }

  return (
    <Panel>
      <SectionHeading title="Create user" description="Admin-only form for new system accounts." />
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Name</span>
          <input name="name" value={form.name} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Email</span>
          <input name="email" type="email" value={form.email} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Password</span>
          <input name="password" type="password" minLength="8" value={form.password} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Role</span>
          <select name="role" value={form.role} onChange={updateField}>
            {roleOptions.map((role) => (
              <option key={role} value={role}>{getRoleLabel(role)}</option>
            ))}
          </select>
        </label>
        {form.role === 'hq-manager' || form.role === 'admin' ? null : (
          <label className="field">
            <span className="field__label">Branch</span>
            <select name="branchId" value={form.branchId} onChange={updateField}>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
        )}
        <button type="submit" className="button button--primary">
          Create user
        </button>
      </form>
    </Panel>
  );
}

function AddBranchForm({ onAdd }) {
  const [form, setForm] = useState({
    name: '',
    code: '',
    city: '',
    district: '',
    phone: '',
    hours: '',
    capacity: 60,
    address: '',
    signature: '',
    spotlight: '',
    features: '',
  });

  function updateField(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onAdd(form);
    setForm({
      name: '',
      code: '',
      city: '',
      district: '',
      phone: '',
      hours: '',
      capacity: 60,
      address: '',
      signature: '',
      spotlight: '',
      features: '',
    });
  }

  return (
    <Panel>
      <SectionHeading title="Create branch" description="System-wide branch setup for expansion or new locations." />
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Branch name</span>
          <input name="name" value={form.name} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Branch code</span>
          <input name="code" value={form.code} onChange={updateField} placeholder="STK-DOH-02" required />
        </label>
        <label className="field">
          <span className="field__label">City</span>
          <input name="city" value={form.city} onChange={updateField} placeholder="London" required />
        </label>
        <label className="field">
          <span className="field__label">District</span>
          <input name="district" value={form.district} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Phone</span>
          <input name="phone" value={form.phone} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Hours</span>
          <input name="hours" value={form.hours} onChange={updateField} required />
        </label>
        <label className="field">
          <span className="field__label">Capacity</span>
          <input name="capacity" type="number" min="10" value={form.capacity} onChange={updateField} />
        </label>
        <label className="field field--full">
          <span className="field__label">Address</span>
          <input name="address" value={form.address} onChange={updateField} required />
        </label>
        <label className="field field--full">
          <span className="field__label">Signature</span>
          <input name="signature" value={form.signature} onChange={updateField} required />
        </label>
        <label className="field field--full">
          <span className="field__label">Spotlight</span>
          <input name="spotlight" value={form.spotlight} onChange={updateField} required />
        </label>
        <label className="field field--full">
          <span className="field__label">Features</span>
          <input name="features" value={form.features} onChange={updateField} placeholder="Valet, tasting menu, terrace..." />
        </label>
        <button type="submit" className="button button--primary">
          Add branch
        </button>
      </form>
    </Panel>
  );
}

function getScopedBookings({ role, currentUser, currentBranch, bookings, scopeAllBranches = false }) {
  if (role === 'customer') {
    return bookings.filter((booking) => booking.customerId === currentUser.id);
  }

  if (role === 'hq-manager' && !scopeAllBranches) {
    return bookings.filter((booking) => booking.branchId === currentBranch.id);
  }

  if (role === 'chef' || role === 'waiter' || role === 'branch-manager') {
    return bookings.filter((booking) => booking.branchId === currentBranch.id);
  }

  return bookings;
}

function getScopedOrders({ role, currentUser, currentBranch, orders, scopeAllBranches = false }) {
  if (role === 'customer') {
    return orders.filter((order) => order.customerId === currentUser.id);
  }

  if (role === 'hq-manager' && !scopeAllBranches) {
    return orders.filter((order) => order.branchId === currentBranch.id);
  }

  if (role === 'chef' || role === 'waiter' || role === 'branch-manager') {
    return orders.filter((order) => order.branchId === currentBranch.id);
  }

  return orders;
}

function startOfLocalDay(value = new Date()) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextDateForWeekday(dayLabel) {
  const dayIndex = WEEKDAY_INDEX[String(dayLabel ?? '').trim().toLowerCase()];

  if (dayIndex === undefined) {
    return null;
  }

  const today = startOfLocalDay();
  const daysUntil = (dayIndex - today.getDay() + 7) % 7;
  return new Date(today.getTime() + daysUntil * DAY_MS);
}

function getShiftStartDate(shift) {
  const startDate = shift.startTime ? new Date(shift.startTime) : null;

  if (startDate && !Number.isNaN(startDate.getTime())) {
    return startDate;
  }

  return nextDateForWeekday(shift.day);
}

function isShiftToday(shift) {
  const shiftDate = getShiftStartDate(shift);

  if (!shiftDate) {
    return false;
  }

  return startOfLocalDay(shiftDate).getTime() === startOfLocalDay().getTime();
}

function isShiftInNextWeek(shift) {
  const shiftDate = getShiftStartDate(shift);

  if (!shiftDate) {
    return false;
  }

  const today = startOfLocalDay();
  const nextWeek = new Date(today.getTime() + 7 * DAY_MS);
  const shiftDay = startOfLocalDay(shiftDate);

  return shiftDay >= today && shiftDay <= nextWeek;
}

function isOwnShift(shift, currentUser) {
  if (shift.userId && currentUser?.id) {
    return shift.userId === currentUser.id;
  }

  const staffName = String(shift.personName ?? '').trim().toLowerCase();
  const currentName = String(currentUser?.name ?? currentUser?.fullName ?? '').trim().toLowerCase();

  return Boolean(staffName && currentName && staffName === currentName);
}

function sortShiftsByStartTime(shifts) {
  return [...shifts].sort((left, right) => {
    const leftDate = getShiftStartDate(left)?.getTime() ?? 0;
    const rightDate = getShiftStartDate(right)?.getTime() ?? 0;
    return leftDate - rightDate;
  });
}

function getScopedShifts({ role, currentUser, currentBranch, shifts, scopeAllBranches = false }) {
  if (role === 'hq-manager' && !scopeAllBranches) {
    return sortShiftsByStartTime(
      shifts.filter((shift) => shift.branchId === currentBranch.id && isShiftInNextWeek(shift)),
    );
  }

  if (role === 'chef' || role === 'waiter') {
    return sortShiftsByStartTime(
      shifts.filter((shift) => (
        shift.branchId === currentBranch.id &&
        isOwnShift(shift, currentUser) &&
        isShiftInNextWeek(shift)
      )),
    );
  }

  if (role === 'branch-manager') {
    return sortShiftsByStartTime(
      shifts.filter((shift) => shift.branchId === currentBranch.id && isShiftToday(shift)),
    );
  }

  if (role === 'admin') {
    return sortShiftsByStartTime(shifts);
  }

  return sortShiftsByStartTime(shifts);
}

function getScopedStaff({ role, currentBranch, staffMembers, scopeAllBranches = false }) {
  if (role === 'hq-manager' && !scopeAllBranches) {
    return staffMembers.filter((member) => member.branchId === currentBranch.id);
  }

  if (role === 'branch-manager') {
    return staffMembers.filter((member) => member.branchId === currentBranch.id);
  }

  return staffMembers;
}

function getMenuGroupKey(item) {
  return `${item.title ?? item.name}|${item.category}`.toLowerCase();
}

function getSharedMenu(menuItems) {
  const groups = new Map();

  menuItems.forEach((item) => {
    const key = getMenuGroupKey(item);
    const existing = groups.get(key);
    const backendId = item.backendId ?? item.id;
    const branchIds = new Set([...(existing?.availableAt ?? []), ...(item.availableAt ?? []), item.branchId].filter(Boolean));
    const backendIds = [...(existing?.backendIds ?? []), backendId].filter(Boolean);

    groups.set(key, {
      ...(existing ?? item),
      ...item,
      id: existing?.id ?? `shared-menu-${groups.size + 1}`,
      availableAt: Array.from(branchIds),
      backendIds: Array.from(new Set(backendIds)),
      branchId: undefined,
    });
  });

  return Array.from(groups.values()).sort((left, right) => (
    left.category.localeCompare(right.category) || left.title.localeCompare(right.title)
  ));
}

function getScopedMenu({ role, currentBranch, menuItems }) {
  if (role === 'customer' || role === 'waiter' || role === 'branch-manager') {
    return menuItems.filter((item) => item.availableAt.includes(currentBranch.id));
  }

  if (role === 'admin' || role === 'hq-manager') {
    return getSharedMenu(menuItems);
  }

  return menuItems;
}

function getSubtitle(role, branchName) {
  if (role === 'customer') {
    return `Premium self-service experience with table reservations centered on ${branchName}.`;
  }

  if (role === 'chef') {
    return `Assigned branch kitchen operations with live tickets and shift clarity for ${branchName}.`;
  }

  if (role === 'waiter') {
    return `Service floor workspace with ready orders, bookings, and shifts for ${branchName}.`;
  }

  if (role === 'branch-manager') {
    return `Branch-level performance, staff, bookings, and menu control for ${branchName}.`;
  }

  if (role === 'hq-manager') {
    return 'Cross-branch comparison, revenue monitoring, and executive reporting across the Steakz portfolio.';
  }

  return 'System access, branch configuration, and user management for the entire Steakz platform.';
}
