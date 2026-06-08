/* Dinio Lending — wireframe data + rendering + interactions */
(function () {
  'use strict';

  var TODAY = new Date('2026-06-08');

  // ---- sample loans (5) ----
  var LOANS = [
    { id:'DIN-001', received:'2026-02-02', name:'Maria Santos',     phone:'787-555-0142', seller:'RIMCO — Bayamón', model:'Cat DE65 GC', amount:48000, intake:'2026-02-04', docs:'Yes', submitted:'2026-02-18', contact:'TBD', stage:7, decision:'Approved', close:'2026-03-15', follow:'2026-03-20', notes:'Funded. Trail active.' },
    { id:'DIN-002', received:'2026-04-10', name:'James Whitfield',  phone:'787-555-0199', seller:'RIMCO — Ponce',   model:'Cat DE150 GC', amount:112500, intake:'2026-04-12', docs:'Yes', submitted:'2026-05-02', contact:'TBD', stage:5, decision:'Pending', close:'', follow:'2026-06-04', notes:'In underwriting — awaiting conditions.' },
    { id:'DIN-003', received:'2026-05-22', name:'Lena Park',        phone:'787-555-0177', seller:'RIMCO — Carolina',model:'Cat DE40 GC',  amount:36800, intake:'2026-05-24', docs:'Pending', submitted:'', contact:'TBD', stage:2, decision:'Pending', close:'', follow:'2026-06-05', notes:'Collecting income docs.' },
    { id:'DIN-004', received:'2026-04-28', name:'Roberto Cruz',     phone:'787-555-0123', seller:'RIMCO — Bayamón', model:'Cat DE110 GC', amount:89200, intake:'2026-05-01', docs:'Yes', submitted:'2026-05-20', contact:'TBD', stage:4, decision:'Pending', close:'', follow:'2026-05-26', notes:'Submitted — needs nudge.' },
    { id:'DIN-005', received:'2025-12-08', name:'Aisha Bello',      phone:'787-555-0188', seller:'RIMCO — Ponce',   model:'Cat DE80 GC',  amount:65000, intake:'2025-12-10', docs:'Yes', submitted:'2025-12-22', contact:'TBD', stage:7, decision:'Approved', close:'2026-01-10', follow:'2026-01-15', notes:'Funded. Trail active.' }
  ];

  var STAGES = [
    { n:1, label:'Lead logged' }, { n:2, label:'Collecting docs' }, { n:3, label:'Ready to submit' },
    { n:4, label:'Submitted' }, { n:5, label:'In underwriting' }, { n:6, label:'Decision' },
    { n:7, label:'Closed' }, { n:0, label:'Dead' }
  ];

  function fmt(n){ return '$' + n.toLocaleString('en-US'); }
  function fmtK(n){ return n>=1000 ? '$'+(n/1000).toFixed(1).replace(/\.0$/,'')+'k' : '$'+n; }
  function monthsBetween(d){ var c=new Date(d); return (TODAY.getFullYear()-c.getFullYear())*12 + (TODAY.getMonth()-c.getMonth()); }
  function bizDaysSince(d){ // approx business days between date and TODAY
    var s=new Date(d), e=new Date(TODAY), n=0;
    while(s<e){ s.setDate(s.getDate()+1); var w=s.getDay(); if(w!==0&&w!==6) n++; }
    return n;
  }
  function badgeFor(l){
    if(l.stage===0) return ['red','X · Dead'];
    if(l.stage===7) return ['green','7 · Closed'];
    if(needsFollow(l)) return ['amber', l.stage+' · '+STAGES.find(function(s){return s.n===l.stage;}).label];
    return ['blue', l.stage+' · '+STAGES.find(function(s){return s.n===l.stage;}).label];
  }
  function needsFollow(l){
    if(l.stage===7||l.stage===0) return false;
    return l.follow && bizDaysSince(l.follow) > 3;
  }

  var closed = LOANS.filter(function(l){return l.stage===7;});
  var totalVol = LOANS.reduce(function(a,l){return a+l.amount;},0);
  var totalClose = closed.reduce(function(a,l){return a+l.amount*0.02;},0);
  var totalTrail = closed.reduce(function(a,l){return a+l.amount*0.005;},0);

  // ---------- render: pipeline bars ----------
  function renderBars(){
    document.querySelectorAll('[data-bars]').forEach(function(host){
      var counts = STAGES.map(function(s){ return { s:s, c:LOANS.filter(function(l){return l.stage===s.n;}).length }; });
      var max = Math.max(1, Math.max.apply(null, counts.map(function(x){return x.c;})));
      host.innerHTML = counts.map(function(x){
        var cls = x.s.n===7?'green':(x.s.n===0?'red':'');
        var w = x.c===0 ? 0 : Math.max(6, (x.c/max)*100);
        return '<div class="bar-row"><span class="name">'+x.s.n+' · '+x.s.label+'</span>'+
          '<div class="bar-track"><div class="bar-fill '+cls+'" style="width:'+w+'%"></div></div>'+
          '<span class="cnt">'+x.c+'</span></div>';
      }).join('');
    });
  }

  // ---------- render: funnel ----------
  function renderFunnel(){
    var host=document.querySelector('[data-funnel]'); if(!host) return;
    var order=[1,2,3,4,5,6,7];
    var max=LOANS.length;
    host.innerHTML=order.map(function(n,i){
      var s=STAGES.find(function(x){return x.n===n;});
      var c=LOANS.filter(function(l){return l.stage>=n && l.stage!==0;}).length; // cumulative reach
      var w=20+ (1-i/order.length)*80;
      var col= n===7?'var(--green-bg)':'var(--blue-bg)';
      return '<div class="funnel-row"><div class="funnel-bar" style="width:'+w+'%;background:'+col+'">'+s.label+'</div><span class="fc">'+c+'</span></div>';
    }).join('');
  }

  // ---------- render: chips (compact) ----------
  function renderChips(){
    var host=document.querySelector('[data-chips]'); if(!host) return;
    host.innerHTML=STAGES.map(function(s){
      var c=LOANS.filter(function(l){return l.stage===s.n;}).length;
      return '<div class="chip"><span>'+s.label+'</span><b>'+c+'</b></div>';
    }).join('');
  }

  // ---------- render: commission table ----------
  function renderCommTable(){
    document.querySelectorAll('[data-commtable]').forEach(function(t){
      var body = closed.map(function(l){
        var m=monthsBetween(l.close);
        return '<tr><td>'+l.name+'</td><td class="num money">'+fmt(l.amount)+'</td><td>'+l.close+'</td>'+
          '<td class="num money">'+fmt(l.amount*0.02)+'</td><td class="num money">'+fmt(l.amount*0.005)+'</td>'+
          '<td class="num">'+m+' mo</td></tr>';
      }).join('');
      t.innerHTML =
        '<thead><tr><th>Customer</th><th class="num">Loan amt</th><th>Close date</th><th class="num">2% comm.</th><th class="num">Trail /mo</th><th class="num">Active</th></tr></thead>'+
        '<tbody>'+body+'</tbody>'+
        '<tfoot><tr><td>Totals</td><td></td><td></td><td class="num">'+fmt(totalClose)+'</td><td class="num">'+fmt(totalTrail)+' /mo</td><td></td></tr></tfoot>';
    });
  }

  // ---------- render: alerts ----------
  function renderAlerts(){
    document.querySelectorAll('[data-alerts]').forEach(function(host){
      var compact = host.hasAttribute('data-compact');
      var hasHeading = host.previousElementSibling || host.parentElement.querySelector('h3');
      var flagged = LOANS.filter(needsFollow);
      var inner='';
      if(!compact && !host.closest('#dashB') && !host.closest('#dashC')){
        inner += '<h3>⚑ Follow-up alerts</h3>';
      }
      inner += flagged.map(function(l){
        var st=STAGES.find(function(s){return s.n===l.stage;}).label;
        if(compact){
          return '<div class="alert-row"><span class="who"><b>'+l.id+'</b> · '+l.name+'</span><span class="ago">'+bizDaysSince(l.follow)+'d</span></div>';
        }
        return '<div class="alert-row"><span class="lead"><b>'+l.id+'</b></span>'+
          '<span class="who">'+l.name+' <span class="badge amber">'+l.stage+' · '+st+'</span></span>'+
          '<span class="ago">'+bizDaysSince(l.follow)+' biz-days since</span></div>';
      }).join('');
      if(!flagged.length) inner+='<p class="ph">All caught up ✓</p>';
      host.innerHTML=inner;
    });
  }

  // ---------- render: monthly trail tracker ----------
  var TRAIL_RX = { 'DIN-005': true, 'DIN-001': false }; // demo: one confirmed, one pending
  function renderTrail(){
    var host=document.querySelector('[data-trail]'); if(!host) return;
    var monthLabel='June 2026';
    var rows=closed.map(function(l){
      var got = !!TRAIL_RX[l.id];
      return '<div class="trail-row" data-id="'+l.id+'">'+
        '<span class="who"><b>'+l.id+'</b> · '+l.name+'</span>'+
        '<span class="on">on '+fmt(l.amount)+' · since '+l.close+'</span>'+
        '<span class="amt">'+fmt(l.amount*0.005)+' /mo</span>'+
        '<button class="confirm-btn '+(got?'received':'pending')+'" data-confirm>'+(got?'deposited ✓':'mark received')+'</button>'+
        '</div>';
    }).join('');
    host.innerHTML=
      '<div class="trail-head"><h3>🔔 Monthly trail deposits · '+monthLabel+'</h3>'+
        '<span class="trail-summary" data-trailsum></span></div>'+
      '<p class="ph" style="font-size:14px;margin:4px 0 0">Recurring 0.5% revenue lands every month for the life of each closed loan. Confirm each deposit so it doesn’t leak.</p>'+
      '<div class="trail-meter"><div data-trailbar></div></div>'+
      '<div class="trail-rows">'+rows+'</div>';
    host.querySelectorAll('[data-confirm]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id=btn.closest('[data-id]').getAttribute('data-id');
        TRAIL_RX[id]=!TRAIL_RX[id];
        var got=TRAIL_RX[id];
        btn.classList.toggle('received',got); btn.classList.toggle('pending',!got);
        btn.textContent=got?'deposited ✓':'mark received';
        updateTrailSummary();
      });
    });
    updateTrailSummary();
  }
  function updateTrailSummary(){
    var sum=document.querySelector('[data-trailsum]'); if(!sum) return;
    var total=closed.reduce(function(a,l){return a+l.amount*0.005;},0);
    var rx=closed.filter(function(l){return TRAIL_RX[l.id];});
    var rxAmt=rx.reduce(function(a,l){return a+l.amount*0.005;},0);
    sum.innerHTML='<b>'+rx.length+' of '+closed.length+'</b> confirmed · '+fmt(rxAmt)+' in, '+fmt(total-rxAmt)+' pending';
    var bar=document.querySelector('[data-trailbar]');
    if(bar) bar.style.width=(total?Math.round(rxAmt/total*100):0)+'%';
  }

  // ---------- column model ----------
  var OPTIONAL = [
    { key:'received', name:'Date lead received', on:true },
    { key:'phone', name:'Phone', on:true },
    { key:'seller', name:'RIMCO seller', on:true },
    { key:'model', name:'Generator model', on:true },
    { key:'intake', name:'Intake started', on:false },
    { key:'docs', name:'Docs complete?', on:true },
    { key:'submitted', name:'Date submitted', on:true },
    { key:'contact', name:'TuCoop contact', on:false },
    { key:'decision', name:'Decision', on:true },
    { key:'follow', name:'Last follow-up', on:true },
    { key:'notes', name:'Notes', on:false }
  ];

  // ---------- render: loan table (database view) ----------
  function loanCell(l, key){
    if(key==='received'||key==='intake'||key==='submitted'||key==='follow') return l[key]||'—';
    if(key==='notes') return '<span class="muted" style="display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(l.notes||'—')+'</span>';
    if(key==='contact') return '<span class="muted">'+(l.contact||'—')+'</span>';
    return l[key]||'—';
  }
  function renderLoanTable(){
    var t=document.querySelector('[data-loantable]'); if(!t) return;
    var cols=OPTIONAL.filter(function(c){return c.on;});
    var head='<th>Lead ID</th><th>Customer</th><th class="num">Loan amt</th>'+
      cols.map(function(c){return '<th>'+c.name+' <span class="muted" style="font-size:11px">⚙</span></th>';}).join('')+
      '<th>Status</th><th class="num">2% comm.</th><th class="num">0.5% trail /mo</th><th>Close</th><th></th>';
    var rows=LOANS.map(function(l){
      var b=badgeFor(l);
      var c2 = l.stage===7 ? fmt(l.amount*0.02) : '—';
      var ct = l.stage===7 ? fmt(l.amount*0.005) : '—';
      return '<tr>'+
        '<td><b>'+l.id+'</b></td><td>'+l.name+'</td><td class="num money">'+fmt(l.amount)+'</td>'+
        cols.map(function(c){return '<td>'+loanCell(l,c.key)+'</td>';}).join('')+
        '<td><span class="badge '+b[0]+'">'+b[1]+'</span></td>'+
        '<td class="num money">'+c2+'</td>'+
        '<td class="num money">'+ct+'</td>'+
        '<td>'+(l.close||'—')+'</td>'+
        '<td style="white-space:nowrap"><span title="edit" style="cursor:pointer">✎</span> <span title="delete" style="cursor:pointer;color:var(--red)">🗑</span></td>'+
        '</tr>';
    }).join('');
    t.innerHTML='<thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody>';
    // row click -> open form
    t.querySelectorAll('tbody tr').forEach(function(tr){
      tr.style.cursor='pointer';
      tr.addEventListener('click', function(e){
        if(e.target.title==='delete'){ e.stopPropagation(); alert('Delete this loan? (confirm dialog — wireframe)'); return; }
        gotoFrame('form');
      });
    });
  }

  // ---------- render: column manager + preview ----------
  function renderOptCols(){
    var host=document.querySelector('[data-optcols]'); if(!host) return;
    host.innerHTML=OPTIONAL.map(function(c,i){
      return '<div class="col-item" data-i="'+i+'">'+
        '<span class="grip">⋮⋮</span>'+
        '<input class="rename" value="'+c.name+'" data-rename>'+
        '<div class="toggle '+(c.on?'on':'')+'" data-toggle title="show / hide"><span class="knob"></span></div>'+
        '<button class="remove-x" data-remove title="remove column entirely">✕</button>'+
        '</div>';
    }).join('');
    host.querySelectorAll('[data-i]').forEach(function(row){
      var i=+row.getAttribute('data-i');
      row.querySelector('[data-toggle]').addEventListener('click',function(){
        OPTIONAL[i].on=!OPTIONAL[i].on; this.classList.toggle('on'); renderPreview();
      });
      row.querySelector('[data-rename]').addEventListener('input',function(){
        OPTIONAL[i].name=this.value; renderPreview();
      });
      row.querySelector('[data-remove]').addEventListener('click',function(){
        if(confirm('Remove “'+OPTIONAL[i].name+'” entirely? Existing data in this column will be dropped.')){
          OPTIONAL.splice(i,1); renderOptCols(); renderPreview();
        }
      });
    });
  }
  function renderPreview(){
    var t=document.querySelector('[data-previewtable]'); if(!t) return;
    var cols=OPTIONAL.filter(function(c){return c.on;});
    var head='<th>Customer</th><th class="num">Loan</th>'+
      cols.map(function(c){return '<th>'+c.name+'</th>';}).join('')+
      '<th>Status</th><th class="num">2%</th><th class="num">Trail/mo</th><th>Close</th>';
    var rows=LOANS.slice(0,3).map(function(l){
      var b=badgeFor(l);
      var c2=l.stage===7?fmt(l.amount*0.02):'—';
      var ct=l.stage===7?fmt(l.amount*0.005):'—';
      return '<tr><td>'+l.name+'</td><td class="num money">'+fmt(l.amount)+'</td>'+
        cols.map(function(c){return '<td>'+loanCell(l,c.key)+'</td>';}).join('')+
        '<td><span class="badge '+b[0]+'">'+b[1].split(' · ')[0]+'</span></td>'+
        '<td class="num money">'+c2+'</td><td class="num money">'+ct+'</td><td>'+(l.close||'—')+'</td></tr>';
    }).join('');
    t.innerHTML='<thead><tr>'+head+'</tr></thead><tbody>'+rows+'</tbody>';
  }

  // ---------- navigation ----------
  function gotoFrame(id){
    document.querySelectorAll('.frame').forEach(function(f){ f.classList.toggle('show', f.id===id); });
    document.querySelectorAll('.navitem').forEach(function(n){ n.classList.toggle('active', n.getAttribute('data-frame')===id); });
    document.querySelector('.canvas').scrollTop=0;
  }

  function init(){
    renderBars(); renderFunnel(); renderChips(); renderCommTable(); renderAlerts(); renderTrail();
    renderLoanTable(); renderOptCols(); renderPreview();

    document.querySelectorAll('.navitem').forEach(function(n){
      n.addEventListener('click', function(){ gotoFrame(n.getAttribute('data-frame')); });
    });
    document.querySelectorAll('[data-frame-jump]').forEach(function(b){
      b.addEventListener('click', function(){ gotoFrame(b.getAttribute('data-frame-jump')); });
    });
    document.querySelectorAll('[data-open-form]').forEach(function(b){
      b.addEventListener('click', function(){ gotoFrame('form'); });
    });

    var nt=document.getElementById('noteToggle');
    nt.addEventListener('click', function(){
      var off=document.body.classList.toggle('no-notes');
      nt.classList.toggle('on', !off);
      nt.textContent = off ? '✎ annotations: off' : '✎ annotations: on';
    });
  }

  if(document.readyState!=='loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
