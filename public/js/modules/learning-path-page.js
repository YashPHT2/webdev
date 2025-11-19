(function(){
  const hasChart = () => typeof window.Chart !== 'undefined';
  const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));
  function formatDate(d){ try{ const dt=new Date(d); return dt.toLocaleDateString('en-US',{ month:'short', day:'numeric'});}catch(_){return '—';}}
  function formatLongDate(d){ try{ const dt=new Date(d); return dt.toLocaleDateString('en-US',{ weekday:'long', month:'short', day:'numeric'});}catch(_){return '—';}}
  function hashColorFromName(name){ let h=0; const s=(name||'').toLowerCase(); for(let i=0;i<s.length;i++) h=s.charCodeAt(i)+((h<<5)-h); const hue=Math.abs(h)%360; return `hsl(${hue} 70% 55%)`; }

  const LP = {
    state: { planView: 'day', period: 'day', charts: {} },
    els: {},
    tasksById: {},

    init(){
      this.cacheEls();
      this.bindUI();
      this.refreshAll();
      // small delay to sync priority count after SmartMentor fetches tasks
      setTimeout(()=>this.updatePriorityCount(), 800);
    },

    cacheEls(){
      this.els.kpiTotal = document.getElementById('lp-kpi-total');
      this.els.kpiCompletion = document.getElementById('lp-kpi-completion');
      this.els.kpiSubjects = document.getElementById('lp-kpi-subjects');
      this.els.kpiDonut = document.querySelector('.kpi-card .kpi-donut');

      this.els.priorityList = document.getElementById('priority-task-list');
      this.els.priorityEmpty = document.getElementById('lp-priority-empty');
      this.els.priorityCount = document.getElementById('lp-priority-count');

      this.els.planGrid = document.getElementById('lp-plan-grid');
      this.els.planLoading = document.getElementById('lp-plan-loading');
      this.els.planEmpty = document.getElementById('lp-plan-empty');

      this.els.trendCanvas = document.getElementById('lpTrendChart');
      this.els.trendLoading = document.getElementById('lp-trend-loading');
      this.els.trendEmpty = document.getElementById('lp-trend-empty');

      this.els.subjectCanvas = document.getElementById('lpSubjectDoughnut');
      this.els.subjectLoading = document.getElementById('lp-subject-loading');
      this.els.subjectEmpty = document.getElementById('lp-subject-empty');

      this.els.hoursCanvas = document.getElementById('lpHoursBar');
      this.els.hoursLoading = document.getElementById('lp-hours-loading');
      this.els.hoursEmpty = document.getElementById('lp-hours-empty');
    },

    bindUI(){
      document.querySelectorAll('[data-lp-plan]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const v = btn.getAttribute('data-lp-plan');
          if (!v || v===this.state.planView) return;
          document.querySelectorAll('[data-lp-plan]').forEach(b=>{
            const active = b===btn; b.classList.toggle('progress-view-toggle__button--active', active); b.setAttribute('aria-pressed', String(active));
          });
          this.state.planView = v;
          this.renderPlan();
        });
      });
      document.querySelectorAll('[data-period]').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          const p = btn.getAttribute('data-period');
          if (!p || p===this.state.period) return;
          document.querySelectorAll('[data-period]').forEach(b=>{ const active=b===btn; b.classList.toggle('progress-view-toggle__button--active', active); b.setAttribute('aria-pressed', String(active)); });
          this.state.period = p;
          this.renderTrend(this.analytics);
        });
      });
    },

    async refreshAll(){
      await Promise.all([ this.loadAnalytics(), this.loadTasks(), this.loadPlan() ]);
      this.updatePriorityCount();
    },

    async loadAnalytics(){
      try {
        const data = await (window.api && window.api.getAnalytics ? window.api.getAnalytics({ period: this.state.period }) : Promise.resolve(null));
        this.analytics = data && data.totals ? data : (data && data.data ? data.data : data);
        this.renderKPIs(this.analytics);
        await this.renderTrend(this.analytics);
        await this.renderSubjectDoughnut(this.analytics);
        await this.renderHoursBar(this.analytics);
      } catch (e) {
        this.showEmpty('trend'); this.showEmpty('subject'); this.showEmpty('hours');
      }
    },

    async loadPlan(){
      try {
        this.setPlanLoading(true);
        const url = '/api/study-plan?dailyHours=4&windowDays=7';
        const res = await (window.fetchWithRetry ? window.fetchWithRetry(url, { method:'GET', headers:{ 'Accept':'application/json' } }) : fetch(url).then(r=>r.json()));
        const plan = res && res.data ? res.data : res;
        // enrich items with subject/dueDate from tasks map if available
        if (plan && Array.isArray(plan.dailySchedule)) {
          plan.dailySchedule.forEach(day => {
            (day.items||[]).forEach(it => {
              const t = this.tasksById[it.taskId];
              if (t) { it.subject = t.subject || it.subject; it.dueDate = t.dueDate || it.dueDate; }
            });
          });
        }
        this.plan = plan;
      } catch (e) {
        this.plan = null;
      } finally {
        this.setPlanLoading(false);
        this.renderPlan();
      }
    },

    setPlanLoading(isLoading){
      if (this.els.planLoading) this.els.planLoading.style.display = isLoading ? 'block' : 'none';
      if (!isLoading) return;
      if (this.els.planGrid) this.els.planGrid.style.display = 'none';
      if (this.els.planEmpty) this.els.planEmpty.style.display = 'none';
    },

    updatePriorityCount(){
      if (!this.els.priorityCount) return;
      try {
        const tasks = (window.smartMentor && Array.isArray(window.smartMentor.tasks)) ? window.smartMentor.tasks.slice() : [];
        const order = { high:0, medium:1, low:2 };
        const pr = tasks.filter(t=>!t.completed).sort((a,b)=>{
          const pa = order[(tPriority(a)||'medium')], pb = order[(tPriority(b)||'medium')];
          if (pa!==pb) return pa-pb; const da=new Date(a.dueDate||0), db=new Date(b.dueDate||0); return da-db;
          function tPriority(x){return (x.priority||'medium').toLowerCase();}
        }).slice(0,3);
        this.els.priorityCount.textContent = `${pr.length} Shown`;
        if (this.els.priorityEmpty && this.els.priorityList) {
          const hasItems = this.els.priorityList.children.length>0;
          this.els.priorityEmpty.style.display = hasItems ? 'none' : 'block';
        }
      } catch(_) {}
    },

    renderKPIs(a){
      if (!a || !a.totals) return;
      const totals = a.totals; const total = totals.totalTasks||0; const completed = totals.completedTasks||0; const rate = totals.completionRate||0; const subjects = a.subjectsCount || 0;
      if (this.els.kpiTotal) this.els.kpiTotal.textContent = total.toLocaleString();
      if (this.els.kpiCompletion) this.els.kpiCompletion.textContent = `${Math.round(rate)}%`;
      if (this.els.kpiSubjects) this.els.kpiSubjects.textContent = subjects.toLocaleString();
      const donut = document.querySelector('.kpi-card .kpi-donut');
      if (donut) donut.style.setProperty('--kpi-progress', `${clamp(rate,0,100)}%`);
    },

    showEmpty(key){
      const map = { trend:[this.els.trendLoading,this.els.trendCanvas,this.els.trendEmpty], subject:[this.els.subjectLoading,this.els.subjectCanvas,this.els.subjectEmpty], hours:[this.els.hoursLoading,this.els.hoursCanvas,this.els.hoursEmpty] };
      const entry = map[key]; if (!entry) return; const [loading,canvas,empty] = entry; if (loading) loading.style.display='none'; if (canvas) canvas.style.display='none'; if (empty) empty.style.display='block';
    },

    async loadTasks(){
      try {
        if (window.api && window.api.getTasks) {
          const payload = await window.api.getTasks();
          const list = Array.isArray(payload) ? payload : (payload && payload.data ? payload.data : (payload && payload.tasks ? payload.tasks : []));
          const map = {};
          (list||[]).forEach(t => { if (t && t.id) map[t.id] = t; });
          this.tasksById = map;
        } else if (window.smartMentor && Array.isArray(window.smartMentor.tasks)) {
          const map = {}; window.smartMentor.tasks.forEach(t => { if (t && t.id) map[t.id] = t; }); this.tasksById = map;
        }
      } catch (_) { this.tasksById = this.tasksById || {}; }
    },

    async renderTrend(a){
      const canvas = this.els.trendCanvas; if (!canvas) return;
      try {
        const labels = (a && a.timeSeries && Array.isArray(a.timeSeries.labels)) ? a.timeSeries.labels : [];
        const values = (a && a.timeSeries && Array.isArray(a.timeSeries.values)) ? a.timeSeries.values : [];
        if (!labels.length || !values.length || values.every(v=>v===0)) { this.showEmpty('trend'); return; }
        if (this.els.trendLoading) this.els.trendLoading.style.display='none';
        canvas.style.display='block';
        if (hasChart()){
          const ctx = canvas.getContext('2d');
          if (this.state.charts.trend){ this.state.charts.trend.data.labels = labels; this.state.charts.trend.data.datasets[0].data = values; this.state.charts.trend.update(); }
          else {
            this.state.charts.trend = new Chart(ctx, { type:'line', data:{ labels, datasets:[{ label:'Tasks', data: values, borderColor:getComputedStyle(document.documentElement).getPropertyValue('--primary-color')||'#3b82f6', backgroundColor:'rgba(59,130,246,0.12)', fill:true, tension:0.35, borderWidth:2, pointRadius:2 }]}, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true, ticks:{ precision:0 } } } } });
          }
        }
      } catch(_) { this.showEmpty('trend'); }
    },

    async renderSubjectDoughnut(a){
      const canvas = this.els.subjectCanvas; if (!canvas) return;
      const per = (a && a.perSubject) || {};
      const entries = Object.entries(per).map(([name,s])=>({ name, count: s.tasks||0 }));
      entries.sort((x,y)=>y.count-x.count);
      const top = entries.slice(0,6);
      if (!top.length){ this.showEmpty('subject'); return; }
      if (this.els.subjectLoading) this.els.subjectLoading.style.display='none';
      canvas.style.display='block';
      if (hasChart()){
        const colors = top.map((_,i)=>{ const hues=[222,199,158,142,197,255]; const h=hues[i%hues.length]; return `hsl(${h} 85% 60%)`; });
        const ctx = canvas.getContext('2d');
        if (this.state.charts.subject){ this.state.charts.subject.data.labels = top.map(t=>t.name); this.state.charts.subject.data.datasets[0].data = top.map(t=>t.count); this.state.charts.subject.data.datasets[0].backgroundColor = colors; this.state.charts.subject.update(); }
        else { this.state.charts.subject = new Chart(ctx, { type:'doughnut', data:{ labels: top.map(t=>t.name), datasets:[{ data: top.map(t=>t.count), backgroundColor: colors, borderWidth:1 }] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'bottom' } } } }); }
      }
    },

    async renderHoursBar(a){
      const canvas = this.els.hoursCanvas; if (!canvas) return;
      const subjects = Array.isArray(a && a.subjects) ? a.subjects.slice() : [];
      subjects.sort((x,y)=> (y.estimatedHours||0)-(x.estimatedHours||0));
      const top = subjects.slice(0,6);
      if (!top.length || top.every(s=> (s.estimatedHours||0)===0 && (s.actualHours||0)===0)) { this.showEmpty('hours'); return; }
      if (this.els.hoursLoading) this.els.hoursLoading.style.display='none';
      canvas.style.display='block';
      if (hasChart()){
        const labels = top.map(s=>s.subject); const est=top.map(s=>s.estimatedHours||0); const act=top.map(s=>s.actualHours||0);
        const ctx = canvas.getContext('2d');
        if (this.state.charts.hours){ this.state.charts.hours.data.labels=labels; this.state.charts.hours.data.datasets[0].data=est; this.state.charts.hours.data.datasets[1].data=act; this.state.charts.hours.update(); }
        else { this.state.charts.hours = new Chart(ctx, { type:'bar', data:{ labels, datasets:[ { label:'Estimated (h)', data: est, backgroundColor:'rgba(59,130,246,0.6)' }, { label:'Actual (h)', data: act, backgroundColor:'rgba(16,185,129,0.6)' } ] }, options:{ responsive:true, maintainAspectRatio:false, scales:{ y:{ beginAtZero:true, ticks:{ callback:(v)=>`${v}h` } } } } }); }
      }
    },

    renderPlan(){
      const grid = this.els.planGrid; if (!grid) return;
      const plan = this.plan && Array.isArray(this.plan.dailySchedule) ? this.plan : null;
      if (!plan || !plan.dailySchedule.length){ grid.style.display='none'; if (this.els.planEmpty) this.els.planEmpty.style.display='block'; return; }
      const days = this.state.planView === 'day' ? plan.dailySchedule.slice(0,1) : plan.dailySchedule.slice(0,7);
      grid.innerHTML = '';
      days.forEach((day,i)=>{
        const d = new Date(day.date);
        const sec = document.createElement('section');
        sec.className = 'day-column';
        sec.setAttribute('role','region');
        const labelId = `lp-day-${i}`;
        sec.setAttribute('aria-labelledby', labelId);
        const title = `${formatLongDate(d)}`;
        sec.innerHTML = `
          <div class="day-header"><span id="${labelId}">${title}</span></div>
          <div class="day-blocks"></div>
        `;
        const blocks = sec.querySelector('.day-blocks');
        if (!day.items || !day.items.length){
          const empty = document.createElement('div'); empty.className='empty-state empty-state--small'; empty.innerHTML='<p>No sessions</p>'; blocks.appendChild(empty);
        } else {
          day.items.forEach(it=>{
            const color = hashColorFromName(it.subject||it.title||'Study');
            const el = document.createElement('div'); el.className='time-block'; el.setAttribute('role','group'); el.setAttribute('aria-label', `${it.title} for ${it.hours}h`);
            el.innerHTML = `
              <div class="time-block__color" style="background:${color}"></div>
              <div class="time-block__content">
                <div class="time-block__title">${escapeHtml(it.title)}</div>
                <div class="time-block__meta">
                  ${it.subject ? `<span>${escapeHtml(it.subject)}</span><span>•</span>` : ''}
                  <span>${it.hours.toFixed(2)}h</span>
                  ${it.dueDate ? `<span>•</span><span>Due ${formatDate(it.dueDate)}</span>` : ''}
                </div>
              </div>
              <div class="time-block__actions">
                <button class="icon-button" data-lp-edit="${it.taskId||''}" aria-label="Edit task"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"></path><path d="M20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"></path></svg></button>
                <a class="icon-button" href="assignments.html${it.subject?`?subject=${encodeURIComponent(it.subject)}`:''}" aria-label="View in assignments" title="View in assignments">↗</a>
              </div>`;
            blocks.appendChild(el);
          });
        }
        grid.appendChild(sec);
      });
      grid.style.display='grid';
      if (this.els.planEmpty) this.els.planEmpty.style.display='none';

      // bind edit actions
      grid.querySelectorAll('[data-lp-edit]').forEach(btn=>{
        btn.addEventListener('click', (e)=>{
          e.preventDefault(); const id = btn.getAttribute('data-lp-edit'); if (!id) return; try { window.smartMentor && window.smartMentor.openTaskForm && window.smartMentor.openTaskForm(id);} catch(_){}
        });
      });
    }
  };

  function escapeHtml(str){
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  // Init when main elements present
  if (document.getElementById('lp-plan-grid')) {
    try { LP.init(); } catch (e) { console.error(e); }
  }
})();
