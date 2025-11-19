(function () {
  const DEFAULT_RETRIES = 2;
  const DEFAULT_RETRY_DELAY = 800;
  const API_BASE_URL = 'http://localhost:5000'; // Added base URL

  async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function fetchWithRetry(url, options = {}, hooks = {}) {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`; // Prepend base URL
    const {
      retries = DEFAULT_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY,
      onError,
      onFinalError,
      onLoadingChange
    } = hooks || {};

    let attempt = 0;
    try { onLoadingChange && onLoadingChange(true); } catch (_) {}

    while (attempt <= retries) {
      try {
        const res = await fetch(fullUrl, options); // Use fullUrl
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return await res.json();
        }
        return await res.text();
      } catch (err) {
        if (attempt < retries) {
          try { onError && onError(err, attempt); } catch (_) {}
          await delay(retryDelay * Math.pow(2, attempt));
          attempt += 1;
          continue;
        } else {
          try { onFinalError && onFinalError(err); } catch (_) {}
          throw err;
        }
      } finally {
        if (attempt === retries) {
          try { onLoadingChange && onLoadingChange(false); } catch (_) {}
        }
      }
    }
  }

  function toJSONBody(body) {
    return {
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body)
    };
  }

  const api = {
    state: { loading: false, lastError: null },

    setLoading(v) { this.state.loading = !!v; },
    setError(e) { this.state.lastError = e ? String(e) : null; },

    async getTasks() {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/tasks', { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.tasks)) return data.tasks;
        return [];
      } finally {
        this.setLoading(false);
      }
    },

    async createTask(task) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/tasks', { method: 'POST', ...toJSONBody(task) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data?.task || task;
      } finally { this.setLoading(false); }
    },

    async updateTask(id, task) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PUT', ...toJSONBody(task) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data?.task || task;
      } finally { this.setLoading(false); }
    },

    async deleteTask(id) {
      this.setError(null); this.setLoading(true);
      try {
        await fetchWithRetry(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return true;
      } finally { this.setLoading(false); }
    },

    async getTimetable() {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/timetable', { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data;
      } finally { this.setLoading(false); }
    },

    async saveTimetable(timetable) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/timetable', { method: 'PUT', ...toJSONBody(timetable) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data;
      } finally { this.setLoading(false); }
    },

    async getAnalytics(opts = {}) {
      this.setError(null); this.setLoading(true);
      try {
        const params = new URLSearchParams();
        const period = (opts && opts.period) ? String(opts.period).toLowerCase() : null;
        if (period && ['day','week','month'].includes(period)) params.set('period', period);
        const url = '/api/analytics' + (params.toString() ? `?${params.toString()}` : '');
        const data = await fetchWithRetry(url, { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || data;
      } finally { this.setLoading(false); }
    },

    // Subjects API
    async getSubjects() {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/subjects', { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
      } finally { this.setLoading(false); }
    },

    async createSubject(subject) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/subjects', { method: 'POST', ...toJSONBody(subject) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || subject;
      } finally { this.setLoading(false); }
    },

    async updateSubject(id, subject) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry(`/api/subjects/${encodeURIComponent(id)}`, { method: 'PUT', ...toJSONBody(subject) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || subject;
      } finally { this.setLoading(false); }
    },

    async deleteSubject(id) {
      this.setError(null); this.setLoading(true);
      try {
        await fetchWithRetry(`/api/subjects/${encodeURIComponent(id)}`, { method: 'DELETE' }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return true;
      } finally { this.setLoading(false); }
    },

    // Assessments API
    async getAssessments(filters = {}) {
      this.setError(null); this.setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.subject) params.set('subject', filters.subject);
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (filters.status) params.set('status', filters.status);
        const q = params.toString();
        const url = '/api/assessments' + (q ? `?${q}` : '');
        const data = await fetchWithRetry(url, { method: 'GET', headers: { 'Accept': 'application/json' } }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
      } finally { this.setLoading(false); }
    },

    async createAssessment(assessment) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry('/api/assessments', { method: 'POST', ...toJSONBody(assessment) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || assessment;
      } finally { this.setLoading(false); }
    },

    async updateAssessment(id, assessment) {
      this.setError(null); this.setLoading(true);
      try {
        const data = await fetchWithRetry(`/api/assessments/${encodeURIComponent(id)}`, { method: 'PUT', ...toJSONBody(assessment) }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return data?.data || assessment;
      } finally { this.setLoading(false); }
    },

    async deleteAssessment(id) {
      this.setError(null); this.setLoading(true);
      try {
        await fetchWithRetry(`/api/assessments/${encodeURIComponent(id)}`, { method: 'DELETE' }, {
          onError: (e) => this.setError(e),
          onFinalError: (e) => this.setError(e),
          onLoadingChange: (v) => this.setLoading(v)
        });
        return true;
      } finally { this.setLoading(false); }
    }
  };

  window.api = api;
  window.fetchWithRetry = fetchWithRetry;
})();
