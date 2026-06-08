/* Dinio — Loan Database view */
const { useState: useStateDB } = React;

function cellValue(l, key) {
  const meta = Core.COLUMN_META[key] || {};
  const v = l[key];
  if (meta.type === 'date') return v ? Core.fmtDate(v) : <span className="dash-cell">—</span>;
  if (key === 'notes') return v ? <span className="ellip muted">{v}</span> : <span className="dash-cell">—</span>;
  if (key === 'contact') return v ? v : <span className="dash-cell">TBD</span>;
  return v ? v : <span className="dash-cell">—</span>;
}

function LoanDatabase({ loans, columns, onOpen, onAdd, onManage, search, setSearch, filter, setFilter }) {
  const visCols = columns.filter(c => c.on);

  const filtered = loans.filter(l => {
    if (filter === 'active' && Core.isDead(l)) return false;
    if (filter === 'closed' && !Core.isClosed(l)) return false;
    if (filter === 'dead' && !Core.isDead(l)) return false;
    if (filter === 'follow' && !Core.needsFollowUp(l)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return [l.id, l.name, l.seller, l.model, l.phone].some(x => (x || '').toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div>
      <div className="db-toolbar">
        <button className="btn primary" onClick={onAdd}><Icon name="plus" size={16} />Add new loan</button>
        <button className="btn" onClick={() => onManage('columns')}><Icon name="cog" size={15} />Columns</button>
        <button className="btn" onClick={() => onManage('statuses')}><Icon name="layers" size={15} />Statuses</button>
        <div className="search">
          <Icon name="search" size={15} />
          <input placeholder="Search name, ID, seller…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="filter-sel" value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active (not dead)</option>
          <option value="follow">Needs follow-up</option>
          <option value="closed">Closed</option>
          <option value="dead">Dead</option>
        </select>
        <span className="count-chip">{filtered.length} loan{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {filtered.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead><tr>
                <th>Lead ID</th>
                <th>Customer</th>
                <th className="num">Loan Amount</th>
                {visCols.map(c => (
                  <th key={c.key}>
                    <span className="col-head">{c.name}
                      <span className="col-cog" onClick={e => { e.stopPropagation(); onManage('columns'); }} title="Manage columns"><Icon name="cog" size={13} /></span>
                    </span>
                  </th>
                ))}
                <th>Status</th>
                <th className="num">2% Comm.</th>
                <th className="num">0.5% Trail/mo</th>
                <th>Close Date</th>
                <th></th>
              </tr></thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="clickable" onClick={() => onOpen(l)}>
                    <td><span className="lead-id">{l.id}</span></td>
                    <td className="cust">{l.name}</td>
                    <td className="num money">{Core.money(l.amount)}</td>
                    {visCols.map(c => <td key={c.key}>{cellValue(l, c.key)}</td>)}
                    <td><StatusBadge loan={l} /></td>
                    <td className="num money">{Core.isClosed(l) ? Core.money(Core.closingComm(l)) : <span className="dash-cell">—</span>}</td>
                    <td className="num money">{Core.isClosed(l) ? Core.money(Core.monthlyTrail(l)) : <span className="dash-cell">—</span>}</td>
                    <td>{l.close ? Core.fmtDate(l.close) : <span className="dash-cell">—</span>}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" onClick={e => { e.stopPropagation(); onOpen(l); }} title="Edit"><Icon name="edit" size={15} /></button>
                        <button className="icon-btn danger" onClick={e => { e.stopPropagation(); onOpen(l, true); }} title="Delete"><Icon name="trash" size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <Icon name="inbox" size={40} className="ic" />
            <h3>{loans.length ? 'No loans match your filter' : 'No loans yet'}</h3>
            <div>{loans.length ? 'Try clearing the search or filter.' : 'Add your first referral to get started.'}</div>
            {!loans.length && <button className="btn primary" style={{ marginTop: 16 }} onClick={onAdd}><Icon name="plus" size={16} />Add new loan</button>}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { LoanDatabase });
