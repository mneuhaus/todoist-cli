export class TodoistClient {
  constructor(config) {
    this.config = config;
    const rawBase = this.config.getBaseUrl();
    this.baseUrl = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
  }

  async request(method, path, { query, body } = {}) {
    const token = this.config.getToken();
    if (!token) {
      throw new Error('No Todoist API token configured. Run `todoist auth login --token <API_TOKEN>` first.');
    }

    // Avoid leading slash resetting the path on the base URL.
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(normalizedPath, `${this.baseUrl}/`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value);
        }
      });
    }

    const headers = {
      Authorization: `Bearer ${token}`
    };

    const options = { method, headers };

    if (body && method !== 'GET' && method !== 'HEAD') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(this.removeUndefined(body));
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new Error(
        errorBody ? `${response.status} ${response.statusText}: ${errorBody}` : `${response.status} ${response.statusText}`
      );
      error.status = response.status;
      error.code = this.mapStatusToCode(response.status);
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  removeUndefined(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    return Object.fromEntries(
      Object.entries(obj).filter(
        ([, value]) => value !== undefined && value !== null
      )
    );
  }

  mapStatusToCode(status) {
    if (status === 401 || status === 403) return 'UNAUTHORIZED';
    if (status === 404) return 'TASK_NOT_FOUND';
    if (status === 429) return 'RATE_LIMIT';
    if (status >= 500) return 'SERVER_ERROR';
    if (status >= 400) return 'VALIDATION_ERROR';
    return 'UNKNOWN_ERROR';
  }

  // Tasks
  async getTasks(filters = {}) {
    const query = {
      project_id: filters.projectId,
      label_id: filters.labelId,
      filter: filters.filter
    };

    if (filters.ids && Array.isArray(filters.ids)) {
      query.ids = filters.ids.join(',');
    }

    return this.request('GET', '/tasks', { query });
  }

  async getTask(taskId) {
    return this.request('GET', `/tasks/${taskId}`);
  }

  async createTask(task) {
    return this.request('POST', '/tasks', { body: task });
  }

  async updateTask(taskId, updates) {
    return this.request('POST', `/tasks/${taskId}`, { body: updates });
  }

  async closeTask(taskId) {
    await this.request('POST', `/tasks/${taskId}/close`);
  }

  async reopenTask(taskId) {
    await this.request('POST', `/tasks/${taskId}/reopen`);
  }

  async deleteTask(taskId) {
    await this.request('DELETE', `/tasks/${taskId}`);
  }

  // Projects
  async getProjects() {
    return this.request('GET', '/projects');
  }

  async getProject(projectId) {
    return this.request('GET', `/projects/${projectId}`);
  }

  async createProject(project) {
    return this.request('POST', '/projects', { body: project });
  }

  async updateProject(projectId, updates) {
    return this.request('POST', `/projects/${projectId}`, { body: updates });
  }

  async deleteProject(projectId) {
    await this.request('DELETE', `/projects/${projectId}`);
  }

  // Labels
  async getLabels() {
    return this.request('GET', '/labels');
  }

  async getLabel(labelId) {
    return this.request('GET', `/labels/${labelId}`);
  }

  async createLabel(label) {
    return this.request('POST', '/labels', { body: label });
  }

  async updateLabel(labelId, updates) {
    return this.request('POST', `/labels/${labelId}`, { body: updates });
  }

  async deleteLabel(labelId) {
    await this.request('DELETE', `/labels/${labelId}`);
  }

  // Comments
  async getComments({ taskId, projectId } = {}) {
    const query = {};
    if (taskId) query.task_id = taskId;
    if (projectId) query.project_id = projectId;
    return this.request('GET', '/comments', { query });
  }

  async getComment(commentId) {
    return this.request('GET', `/comments/${commentId}`);
  }

  async createComment(comment) {
    return this.request('POST', '/comments', { body: comment });
  }

  async updateComment(commentId, updates) {
    return this.request('POST', `/comments/${commentId}`, { body: updates });
  }

  async deleteComment(commentId) {
    await this.request('DELETE', `/comments/${commentId}`);
  }
}
