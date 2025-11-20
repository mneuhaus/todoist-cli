#!/usr/bin/env node

import { Command, InvalidArgumentError } from 'commander';
import { Config } from './lib/config.js';
import { TodoistClient } from './lib/todoist-client.js';
import { Formatters } from './utils/formatters.js';

const program = new Command();
const config = new Config();

const parseCsv = (value) =>
  value
    ?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const parsePriority = (value) => {
  const parsed = Number.parseInt(value, 10);
  if (![1, 2, 3, 4].includes(parsed)) {
    throw new InvalidArgumentError('Priority must be 1 (low) to 4 (urgent).');
  }
  return parsed;
};

const parseInteger = (value, message = 'Value must be a number.') => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new InvalidArgumentError(message);
  }
  return parsed;
};

const createFormatter = () => new Formatters(program.opts().noColor ? false : config.shouldUseColor());

const handleError = (formatter, error) => {
  const message = error?.message || String(error);
  console.error(formatter.error(message));
  process.exitCode = 1;
};

const withClient = (handler) => async (...args) => {
  const formatter = createFormatter();
  const format = program.opts().format;
  const client = new TodoistClient(config);

  try {
    await handler({ args, client, formatter, format });
  } catch (error) {
    handleError(formatter, error);
  }
};

const withFormatter = (handler) => async (...args) => {
  const formatter = createFormatter();
  const format = program.opts().format;

  try {
    await handler({ args, formatter, format });
  } catch (error) {
    handleError(formatter, error);
  }
};

const buildLookupContext = async (client, includeLookups) => {
  if (!includeLookups) return {};

  const [projects, labels] = await Promise.all([client.getProjects(), client.getLabels()]);
  return {
    projectsById: new Map(projects.map((project) => [project.id, project])),
    labelsById: new Map(labels.map((label) => [label.id, label]))
  };
};

program
  .name('todoist')
  .description('Todoist CLI - Focused command line access to the Todoist REST API')
  .version('1.0.0')
  .option('--format <type>', 'output format (json|table|detail)', config.getDefaultFormat())
  .option('--no-color', 'disable colored output')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.noColor) {
      process.env.FORCE_COLOR = '0';
    }
  });

// Auth commands
program
  .command('auth')
  .description('Authentication management')
  .addCommand(
    new Command('login')
      .description('Store Todoist API token (https://todoist.com/app/settings/integrations)')
      .requiredOption('--token <token>', 'Todoist API token')
      .action(
        withFormatter(async ({ args, formatter }) => {
          const [options] = args;
          config.setToken(options.token);
          console.log(formatter.success('Todoist token saved.'));
        })
      )
  )
  .addCommand(
    new Command('status').description('Show current authentication status').action(
      withFormatter(async ({ formatter }) => {
        const token = config.getToken();
        if (!token) {
          console.log(formatter.warning('Not authenticated. Run `todoist auth login --token <API_TOKEN>`.'));
          process.exitCode = 1;
          return;
        }

        console.log(formatter.success('Authenticated against Todoist.'));
        console.log(`Base URL: ${config.getBaseUrl()}`);
      })
    )
  )
  .addCommand(
    new Command('logout').description('Clear stored credentials').action(
      withFormatter(async ({ formatter }) => {
        config.setToken(null);
        console.log(formatter.info('Todoist token removed.'));
      })
    )
  );

// Tasks
program
  .command('tasks')
  .description('List tasks')
  .option('--project <id>', 'filter by project ID')
  .option('--label <id>', 'filter by label ID')
  .option('--filter <query>', 'Todoist filter query, e.g., "today & @work"')
  .option('--ids <ids>', 'comma-separated list of task IDs')
  .option('--with-lookups', 'fetch labels and projects to show names')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [options] = args;
      const filters = {
        projectId: options.project,
        labelId: options.label,
        filter: options.filter
      };

      if (options.ids) {
        filters.ids = parseCsv(options.ids);
      }

      const tasks = await client.getTasks(filters);
      const context = await buildLookupContext(client, options.withLookups);
      console.log(formatter.formatTaskList(tasks, format, context));
    })
  );

program
  .command('task')
  .description('Show a specific task')
  .argument('<task-id>', 'task ID')
  .option('--with-lookups', 'fetch labels and project to show names')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [taskId, options] = args;
      const task = await client.getTask(taskId);
      const context = await buildLookupContext(client, options.withLookups);
      console.log(formatter.formatTask(task, format, context));
    })
  );

program
  .command('task:add')
  .description('Create a new task')
  .argument('<content>', 'task content')
  .option('--description <text>', 'task description/notes')
  .option('--project <id>', 'project ID')
  .option('--labels <ids>', 'comma-separated label IDs')
  .option('--priority <1-4>', 'priority (1 low - 4 urgent)', parsePriority, 1)
  .option('--due-string <text>', 'natural language due string, e.g., "tomorrow 18:00"')
  .option('--due-date <date>', 'due date (YYYY-MM-DD)')
  .option('--due-datetime <datetime>', 'due date and time (ISO 8601)')
  .option('--due-lang <lang>', 'language for due string (e.g., en, de)')
  .option('--assignee <id>', 'assign to user ID')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [content, options] = args;

      const payload = {
        content,
        description: options.description,
        project_id: options.project,
        label_ids: options.labels ? parseCsv(options.labels) : undefined,
        priority: options.priority,
        due_string: options.dueString,
        due_date: options.dueDate,
        due_datetime: options.dueDatetime,
        due_lang: options.dueLang,
        assignee: options.assignee
      };

      const task = await client.createTask(payload);
      const context = await buildLookupContext(client, true);

      console.log(formatter.success('Task created.'));
      console.log(formatter.formatTask(task, format, context));
    })
  );

program
  .command('task:update')
  .description('Update an existing task')
  .argument('<task-id>', 'task ID')
  .option('--content <text>', 'task content/title')
  .option('--description <text>', 'task description/notes')
  .option('--project <id>', 'project ID')
  .option('--labels <ids>', 'comma-separated label IDs')
  .option('--priority <1-4>', 'priority (1 low - 4 urgent)', parsePriority)
  .option('--due-string <text>', 'natural language due string')
  .option('--due-date <date>', 'due date (YYYY-MM-DD)')
  .option('--due-datetime <datetime>', 'due date and time (ISO 8601)')
  .option('--due-lang <lang>', 'language for due string (e.g., en, de)')
  .option('--assignee <id>', 'assign to user ID')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [taskId, options] = args;

      const updates = {
        content: options.content,
        description: options.description,
        project_id: options.project,
        label_ids: options.labels ? parseCsv(options.labels) : undefined,
        priority: options.priority,
        due_string: options.dueString,
        due_date: options.dueDate,
        due_datetime: options.dueDatetime,
        due_lang: options.dueLang,
        assignee: options.assignee
      };

      const hasUpdates = Object.values(updates).some((value) => value !== undefined);
      if (!hasUpdates) {
        throw new Error('No updates provided.');
      }

      await client.updateTask(taskId, updates);
      const task = await client.getTask(taskId);
      const context = await buildLookupContext(client, true);

      console.log(formatter.success('Task updated.'));
      console.log(formatter.formatTask(task, format, context));
    })
  );

program
  .command('task:close')
  .description('Close/complete a task')
  .argument('<task-id>', 'task ID')
  .action(
    withClient(async ({ args, client, formatter }) => {
      const [taskId] = args;
      await client.closeTask(taskId);
      console.log(formatter.success(`Task ${taskId} closed.`));
    })
  );

program
  .command('task:reopen')
  .description('Reopen a closed task')
  .argument('<task-id>', 'task ID')
  .action(
    withClient(async ({ args, client, formatter }) => {
      const [taskId] = args;
      await client.reopenTask(taskId);
      console.log(formatter.success(`Task ${taskId} reopened.`));
    })
  );

program
  .command('task:delete')
  .description('Delete a task')
  .argument('<task-id>', 'task ID')
  .action(
    withClient(async ({ args, client, formatter }) => {
      const [taskId] = args;
      await client.deleteTask(taskId);
      console.log(formatter.success(`Task ${taskId} deleted.`));
    })
  );

// Projects
program
  .command('projects')
  .description('List projects')
  .action(
    withClient(async ({ client, formatter, format }) => {
      const projects = await client.getProjects();
      console.log(formatter.formatProjectList(projects, format));
    })
  );

program
  .command('project')
  .description('Show a project')
  .argument('<project-id>', 'project ID')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [projectId] = args;
      const project = await client.getProject(projectId);
      console.log(formatter.formatProject(project, format));
    })
  );

program
  .command('project:add')
  .description('Create a new project')
  .argument('<name>', 'project name')
  .option('--color <name>', 'project color')
  .option('--parent <id>', 'parent project ID')
  .option('--favorite', 'mark as favorite')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [name, options] = args;
      const payload = {
        name,
        color: options.color,
        parent_id: options.parent,
        favorite: options.favorite || undefined
      };

      const project = await client.createProject(payload);
      console.log(formatter.success('Project created.'));
      console.log(formatter.formatProject(project, format));
    })
  );

program
  .command('project:update')
  .description('Update a project')
  .argument('<project-id>', 'project ID')
  .option('--name <name>', 'project name')
  .option('--color <name>', 'project color')
  .option('--favorite', 'mark as favorite')
  .option('--unfavorite', 'remove favorite flag')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [projectId, options] = args;
      const updates = {
        name: options.name,
        color: options.color
      };

      if (options.favorite) {
        updates.favorite = true;
      }
      if (options.unfavorite) {
        updates.favorite = false;
      }

      const hasUpdates = Object.values(updates).some((value) => value !== undefined);
      if (!hasUpdates) {
        throw new Error('No updates provided.');
      }

      await client.updateProject(projectId, updates);
      const project = await client.getProject(projectId);
      console.log(formatter.success('Project updated.'));
      console.log(formatter.formatProject(project, format));
    })
  );

program
  .command('project:delete')
  .description('Delete a project')
  .argument('<project-id>', 'project ID')
  .action(
    withClient(async ({ args, client, formatter }) => {
      const [projectId] = args;
      await client.deleteProject(projectId);
      console.log(formatter.success(`Project ${projectId} deleted.`));
    })
  );

// Labels
program
  .command('labels')
  .description('List labels')
  .action(
    withClient(async ({ client, formatter, format }) => {
      const labels = await client.getLabels();
      console.log(formatter.formatLabelList(labels, format));
    })
  );

program
  .command('label')
  .description('Show a label')
  .argument('<label-id>', 'label ID')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [labelId] = args;
      const label = await client.getLabel(labelId);
      console.log(formatter.formatLabel(label, format));
    })
  );

program
  .command('label:add')
  .description('Create a new label')
  .argument('<name>', 'label name')
  .option('--color <name>', 'label color')
  .option('--order <n>', 'sort order', (value) => parseInteger(value, 'Order must be a number'))
  .option('--favorite', 'mark as favorite')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [name, options] = args;
      const payload = {
        name,
        color: options.color,
        order: options.order,
        favorite: options.favorite || undefined
      };

      const label = await client.createLabel(payload);
      console.log(formatter.success('Label created.'));
      console.log(formatter.formatLabel(label, format));
    })
  );

program
  .command('label:update')
  .description('Update a label')
  .argument('<label-id>', 'label ID')
  .option('--name <name>', 'label name')
  .option('--color <name>', 'label color')
  .option('--order <n>', 'sort order', (value) => parseInteger(value, 'Order must be a number'))
  .option('--favorite', 'mark as favorite')
  .option('--unfavorite', 'remove favorite flag')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [labelId, options] = args;
      const updates = {
        name: options.name,
        color: options.color,
        order: options.order
      };

      if (options.favorite) {
        updates.favorite = true;
      }
      if (options.unfavorite) {
        updates.favorite = false;
      }

      const hasUpdates = Object.values(updates).some((value) => value !== undefined);
      if (!hasUpdates) {
        throw new Error('No updates provided.');
      }

      await client.updateLabel(labelId, updates);
      const label = await client.getLabel(labelId);
      console.log(formatter.success('Label updated.'));
      console.log(formatter.formatLabel(label, format));
    })
  );

program
  .command('label:delete')
  .description('Delete a label')
  .argument('<label-id>', 'label ID')
  .action(
    withClient(async ({ args, client, formatter }) => {
      const [labelId] = args;
      await client.deleteLabel(labelId);
      console.log(formatter.success(`Label ${labelId} deleted.`));
    })
  );

// Comments
program
  .command('comments')
  .description('List comments attached to a task or project')
  .option('--task <id>', 'task ID to fetch comments for')
  .option('--project <id>', 'project ID to fetch comments for')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [options] = args;
      if (!options.task && !options.project) {
        throw new Error('Provide --task or --project to list comments.');
      }

      const comments = await client.getComments({ taskId: options.task, projectId: options.project });
      console.log(formatter.formatCommentList(comments, format));
    })
  );

program
  .command('comment')
  .description('Show a comment')
  .argument('<comment-id>', 'comment ID')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [commentId] = args;
      const comment = await client.getComment(commentId);
      console.log(formatter.formatCommentList([comment], format));
    })
  );

program
  .command('comment:add')
  .description('Add a new comment to a task or project')
  .requiredOption('--content <text>', 'comment text')
  .option('--task <id>', 'task ID')
  .option('--project <id>', 'project ID')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [options] = args;

      if (!options.task && !options.project) {
        throw new Error('Provide --task or --project to attach the comment.');
      }

      if (options.task && options.project) {
        throw new Error('Choose either --task or --project, not both.');
      }

      const payload = {
        content: options.content,
        task_id: options.task,
        project_id: options.project
      };

      const comment = await client.createComment(payload);
      console.log(formatter.success('Comment created.'));
      console.log(formatter.formatCommentList([comment], format));
    })
  );

program
  .command('comment:update')
  .description('Update an existing comment')
  .argument('<comment-id>', 'comment ID')
  .requiredOption('--content <text>', 'new comment text')
  .action(
    withClient(async ({ args, client, formatter, format }) => {
      const [commentId, options] = args;
      await client.updateComment(commentId, { content: options.content });
      const comment = await client.getComment(commentId);
      console.log(formatter.success('Comment updated.'));
      console.log(formatter.formatCommentList([comment], format));
    })
  );

program
  .command('comment:delete')
  .description('Delete a comment')
  .argument('<comment-id>', 'comment ID')
  .action(
    withClient(async ({ args, client, formatter }) => {
      const [commentId] = args;
      await client.deleteComment(commentId);
      console.log(formatter.success(`Comment ${commentId} deleted.`));
    })
  );

program.parseAsync(process.argv);
