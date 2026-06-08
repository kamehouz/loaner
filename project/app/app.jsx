/* Dinio — App shell, state, persistence */
const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#c96f43",
  "closePct": 2,
  "trailPct": 0.5,
  "followDays": 3
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // apply business config synchronously so calcs reflect tweaks this render
  Core.CONFIG.closePct = t.closePct / 100;
  Core.CONFIG.trailPct = t.trailPct / 100;
  Core.CONFIG.followDays = t.followDays;

  useEffectA(() => {
    const root = document.documentElement.style;
    root.setProperty('--accent', t.accent);
    root.setProperty('--accent-deep', shade(t.accent, -16));
    root.setProperty('--accent-soft', tint(t.accent, 0.86));
  }, [t.accent]);

  const [view, setView] = useStateA(() => Core.load('dinio_view', 'dashboard'));
  const [loans, setLoans] = useStateA(() => Core.load(Core.K.loans, null) || Core.seedLoans());
  const [columns, setColumns] = useStateA(() => Core.load(Core.K.cols, null) || Core.defaultColumns());
  const [confirm, setConfirm] = useStateA(() => Core.load(Core.K.trail, {}));
  const [statuses, setStatuses] = useStateA(() => Core.load(Core.K.statuses, null) || Core.defaultStatuses());
  const [editing, setEditing] = useStateA(null);   // {loan, isNew}
  const [deleting, setDeleting] = useStateA(null);  // loan
  const [manage, setManage] = useStateA(false);
  const [search, setSearch] = useStateA('');
  const [filter, setFilter] = useStateA('all');

  // apply statuses synchronously so calcs/badges reflect edits this render
  Core.setStatuses(statuses);

  useEffectA(() => Core.save(Core.K.loans, loans), [loans]);
  useEffectA(() => Core.save(Core.K.cols, columns), [columns]);
  useEffectA(() => Core.save(Core.K.trail, confirm), [confirm]);
  useEffectA(() => Core.save(Core.K.statuses, statuses), [statuses]);
  useEffectA(() => Core.save('dinio_view', view), [view]);

  // reconcile: if a status was removed, move its loans to the first pipeline stage
  useEffectA(() => {
    const ids = new Set(statuses.map(s => s.id));
    const fallback = Core.firstProgressId();
    let changed = false;
    const fixed = loans.map(l => { if (!ids.has(l.status)) { changed = true; return { ...l, status: fallback }; } return l; });
    if (changed) setLoans(fixed);
  }, [statuses]);

  const openLoan = (loan, del) => { if (del) setDeleting(loan); else setEditing({ loan, isNew: false }); };
  const addLoan = () => setEditing({ loan: Core.blankLoan(loans), isNew: true });

  const saveLoan = (form) => {
    setLoans(prev => {
      const exists = prev.some(l => l.id === form.id);
      return exists ? prev.map(l => l.id === form.id ? form : l) : [...prev, form];
    });
    setEditing(null);
  };
  const doDelete = (loan) => {
    setLoans(prev => prev.filter(l => l.id !== loan.id));
    setDeleting(null); setEditing(null);
  };

  const today = Core.today().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <React.Fragment>
      <div className="topbar">
        <div className="brand">
          <div className="mark">D</div>
          <div>
            <div className="name">Dinio <b>Lending</b></div>
          </div>
          <span className="partner">TuCoop Referral Pipeline</span>
        </div>
        <div className="tabs">
          <button className={'tab' + (view === 'dashboard' ? ' active' : '')} onClick={() => setView('dashboard')}>
            <Icon name="grid" size={16} /><span>Dashboard</span>
          </button>
          <button className={'tab' + (view === 'database' ? ' active' : '')} onClick={() => setView('database')}>
            <Icon name="table" size={16} /><span>Loan Database</span>
          </button>
        </div>
        <span className="spacer" />
        <div className="today">as of<b>{today}</b></div>
      </div>

      <div className="app">
        <div className="page-head">
          <div>
            <h1>{view === 'dashboard' ? 'Pipeline Dashboard' : 'Loan Database'}</h1>
            <div className="sub">{view === 'dashboard'
              ? 'Live health of the TuCoop referral pipeline and CAT’s earned commissions.'
              : 'Every referral and its full record. Click any row to edit; manage which columns you track.'}</div>
          </div>
        </div>

        {view === 'dashboard'
          ? <Dashboard loans={loans} confirm={confirm} setConfirm={setConfirm} onOpen={openLoan} />
          : <LoanDatabase loans={loans} columns={columns} onOpen={openLoan} onAdd={addLoan} onManage={(tab) => setManage(tab || 'columns')}
              search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} />}
      </div>

      {editing && (
        <LoanForm loan={editing.loan} isNew={editing.isNew} columns={columns}
          onSave={saveLoan} onDelete={(l) => setDeleting(l)} onClose={() => setEditing(null)}
          onManageStatuses={() => setManage('statuses')} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this loan?"
          body={`“${deleting.name || deleting.id}” will be permanently removed. This can’t be undone.`}
          onConfirm={() => doDelete(deleting)} onCancel={() => setDeleting(null)} />
      )}
      {manage && <ColumnsDrawer columns={columns} setColumns={setColumns} statuses={statuses} setStatuses={setStatuses} onClose={() => setManage(false)} initialTab={manage === 'statuses' ? 'statuses' : 'columns'} />}

      <TweaksPanel>
        <TweakSection label="Brand" />
        <TweakColor label="Accent" value={t.accent}
          options={['#c96f43', '#4f7ba6', '#4d8a5b', '#9a6a4f', '#7a5aa6']}
          onChange={v => setTweak('accent', v)} />
        <TweakSection label="Commission model" />
        <TweakSlider label="Closing commission" value={t.closePct} min={0.5} max={5} step={0.25} unit="%"
          onChange={v => setTweak('closePct', v)} />
        <TweakSlider label="Monthly trail" value={t.trailPct} min={0.1} max={2} step={0.1} unit="%"
          onChange={v => setTweak('trailPct', v)} />
        <TweakSection label="Workflow" />
        <TweakSlider label="Follow-up threshold" value={t.followDays} min={1} max={10} step={1} unit=" biz days"
          onChange={v => setTweak('followDays', v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

// color helpers for accent derivation
function hexToRgb(h){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return m?{r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}:{r:201,g:111,b:67}; }
function shade(h,amt){ const c=hexToRgb(h); const f=v=>Math.max(0,Math.min(255,Math.round(v+amt*2.55))); return '#'+[f(c.r),f(c.g),f(c.b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }
function tint(h,frac){ const c=hexToRgb(h); const f=v=>Math.round(v+(255-v)*frac); return '#'+[f(c.r),f(c.g),f(c.b)].map(x=>x.toString(16).padStart(2,'0')).join(''); }

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
