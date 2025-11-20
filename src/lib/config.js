import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CONFIG_DIR = join(homedir(), '.config', 'todoist-cli');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');
const DEFAULT_BASE_URL = 'https://api.todoist.com/rest/v2';

const DEFAULT_CONFIG = {
  auth: {
    token: null
  },
  defaults: {
    format: 'table'
  },
  output: {
    color: true
  },
  api: {
    base_url: DEFAULT_BASE_URL
  }
};

export class Config {
  constructor() {
    this.config = this.loadConfig();
  }

  loadConfig() {
    let config = { ...DEFAULT_CONFIG };

    try {
      if (existsSync(CONFIG_PATH)) {
        const data = readFileSync(CONFIG_PATH, 'utf8');
        const parsed = JSON.parse(data);
        config = { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Warning: Failed to load config, using defaults:', error.message);
    }

    const { config: migrated, updated } = this.migrateConfig(config);
    if (updated) {
      this.saveConfig(migrated);
    }

    return migrated;
  }

  saveConfig(configToSave = this.config) {
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true });
    }

    writeFileSync(CONFIG_PATH, JSON.stringify(configToSave, null, 2));
  }

  get(key, fallback = undefined) {
    const parts = key.split('.');
    let current = this.config;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return fallback;
      }
    }

    return current;
  }

  set(key, value) {
    const parts = key.split('.');
    let current = this.config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
    this.saveConfig();
  }

  getToken() {
    return this.get('auth.token');
  }

  setToken(token) {
    this.set('auth.token', token);
  }

  getBaseUrl() {
    return this.get('api.base_url', DEFAULT_CONFIG.api.base_url);
  }

  getDefaultFormat() {
    return this.get('defaults.format', DEFAULT_CONFIG.defaults.format);
  }

  shouldUseColor() {
    return this.get('output.color', DEFAULT_CONFIG.output.color) !== false;
  }

  reset() {
    this.config = { ...DEFAULT_CONFIG };
    this.saveConfig();
  }

  getAll() {
    return { ...this.config };
  }

  migrateConfig(config) {
    const next = { ...config };
    let updated = false;

    if (!next.api) {
      next.api = {};
    }

    // Auto-upgrade old REST v1 default to v2.
    if (next.api.base_url === 'https://api.todoist.com/rest/v1') {
      next.api.base_url = DEFAULT_BASE_URL;
      updated = true;
    }

    return { config: next, updated };
  }

  getConfigDir() {
    return CONFIG_DIR;
  }

  getCachePath(filename) {
    return join(CONFIG_DIR, filename);
  }
}
