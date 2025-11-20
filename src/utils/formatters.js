import chalk from 'chalk';
import Table from 'cli-table3';

export class Formatters {
  constructor(useColor = true) {
    this.useColor = useColor;
  }

  success(text) {
    return this.useColor ? chalk.green(text) : text;
  }

  error(text) {
    return this.useColor ? chalk.red(text) : text;
  }

  warning(text) {
    return this.useColor ? chalk.yellow(text) : text;
  }

  info(text) {
    return this.useColor ? chalk.blue(text) : text;
  }

  dim(text) {
    return this.useColor ? chalk.dim(text) : text;
  }

  bold(text) {
    return this.useColor ? chalk.bold(text) : text;
  }

  truncate(text, length = 60) {
    if (!text) return '';
    if (text.length <= length) return text;
    return `${text.substring(0, length - 3)}...`;
  }

  formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return Number.isNaN(date.getTime()) ? dateString : date.toISOString().replace('T', ' ').split('.')[0];
  }

  formatDue(due) {
    if (!due) return this.dim('no due');
    if (typeof due === 'string') return due;
    if (due.string && due.date) return `${due.string} (${due.date})`;
    return due.date || due.string || this.dim('no due');
  }

  formatPriority(priority) {
    const mapping = {
      1: '1 (low)',
      2: '2',
      3: '3 (high)',
      4: this.useColor ? chalk.red.bold('4 (urgent)') : '4 (urgent)'
    };
    return mapping[priority] || '—';
  }

  projectName(task, context = {}) {
    const project = context.projectsById?.get?.(task.project_id);
    return project?.name || task.project_id || '—';
  }

  labelNames(task, context = {}) {
    const labelIds = task.label_ids || [];
    const labels = labelIds.map(id => context.labelsById?.get?.(id)?.name || id);
    return labels.length ? labels.join(', ') : '—';
  }

  formatTaskList(tasks = [], format = 'table', context = {}) {
    if (format === 'json') {
      return JSON.stringify(tasks, null, 2);
    }

    if (!tasks.length) {
      return this.warning('No tasks found.');
    }

    const table = new Table({
      head: [
        this.bold('ID'),
        this.bold('Content'),
        this.bold('Project'),
        this.bold('Labels'),
        this.bold('Priority'),
        this.bold('Due'),
        this.bold('Status')
      ],
      style: { head: this.useColor ? ['cyan'] : [] }
    });

    tasks.forEach(task => {
      table.push([
        task.id,
        this.truncate(task.content, 50),
        this.projectName(task, context),
        this.labelNames(task, context),
        this.formatPriority(task.priority),
        this.formatDue(task.due),
        task.completed ? this.dim('completed') : this.success('open')
      ]);
    });

    return table.toString();
  }

  formatTask(task, format = 'detail', context = {}) {
    if (format === 'json') {
      return JSON.stringify(task, null, 2);
    }

    const lines = [];
    lines.push(this.bold(task.content));
    lines.push('');
    lines.push(`ID: ${task.id}`);
    lines.push(`Project: ${this.projectName(task, context)}`);
    lines.push(`Labels: ${this.labelNames(task, context)}`);
    lines.push(`Priority: ${this.formatPriority(task.priority)}`);
    lines.push(`Due: ${this.formatDue(task.due)}`);

    if (task.description) {
      lines.push('');
      lines.push(task.description);
    }

    lines.push('');
    lines.push(`Created: ${this.formatDate(task.created_at || task.created)}`);
    lines.push(`Updated: ${this.formatDate(task.updated_at || task.updated)}`);
    lines.push(`Status: ${task.completed ? this.dim('completed') : this.success('open')}`);

    return lines.join('\n');
  }

  formatProjectList(projects = [], format = 'table') {
    if (format === 'json') {
      return JSON.stringify(projects, null, 2);
    }

    if (!projects.length) {
      return this.warning('No projects found.');
    }

    const table = new Table({
      head: [
        this.bold('ID'),
        this.bold('Name'),
        this.bold('Color'),
        this.bold('Favorite'),
        this.bold('Order')
      ],
      style: { head: this.useColor ? ['cyan'] : [] }
    });

    projects.forEach(project => {
      table.push([
        project.id,
        this.truncate(project.name, 40),
        project.color || '—',
        project.favorite ? this.success('yes') : this.dim('no'),
        project.order ?? '—'
      ]);
    });

    return table.toString();
  }

  formatProject(project, format = 'detail') {
    if (format === 'json') {
      return JSON.stringify(project, null, 2);
    }

    const lines = [];
    lines.push(this.bold(project.name));
    lines.push('');
    lines.push(`ID: ${project.id}`);
    lines.push(`Color: ${project.color || '—'}`);
    lines.push(`Comment count: ${project.comment_count ?? 0}`);
    lines.push(`Favorite: ${project.favorite ? this.success('yes') : this.dim('no')}`);
    lines.push(`Order: ${project.order ?? '—'}`);
    return lines.join('\n');
  }

  formatLabelList(labels = [], format = 'table') {
    if (format === 'json') {
      return JSON.stringify(labels, null, 2);
    }

    if (!labels.length) {
      return this.warning('No labels found.');
    }

    const table = new Table({
      head: [
        this.bold('ID'),
        this.bold('Name'),
        this.bold('Color'),
        this.bold('Favorite'),
        this.bold('Order')
      ],
      style: { head: this.useColor ? ['cyan'] : [] }
    });

    labels.forEach(label => {
      table.push([
        label.id,
        this.truncate(label.name, 30),
        label.color || '—',
        label.is_favorite || label.favorite ? this.success('yes') : this.dim('no'),
        label.order ?? '—'
      ]);
    });

    return table.toString();
  }

  formatLabel(label, format = 'detail') {
    if (format === 'json') {
      return JSON.stringify(label, null, 2);
    }

    const lines = [];
    lines.push(this.bold(label.name));
    lines.push('');
    lines.push(`ID: ${label.id}`);
    lines.push(`Color: ${label.color || '—'}`);
    lines.push(`Favorite: ${label.is_favorite || label.favorite ? this.success('yes') : this.dim('no')}`);
    lines.push(`Order: ${label.order ?? '—'}`);
    return lines.join('\n');
  }

  formatCommentList(comments = [], format = 'table') {
    if (format === 'json') {
      return JSON.stringify(comments, null, 2);
    }

    if (!comments.length) {
      return this.warning('No comments found.');
    }

    const table = new Table({
      head: [
        this.bold('ID'),
        this.bold('Target'),
        this.bold('Content'),
        this.bold('Posted')
      ],
      style: { head: this.useColor ? ['cyan'] : [] }
    });

    comments.forEach(comment => {
      const target = comment.task_id
        ? `task:${comment.task_id}`
        : comment.project_id
          ? `project:${comment.project_id}`
          : '—';

      table.push([
        comment.id,
        target,
        this.truncate(comment.content, 50),
        this.formatDate(comment.posted_at || comment.added_at || comment.created_at)
      ]);
    });

    return table.toString();
  }
}
