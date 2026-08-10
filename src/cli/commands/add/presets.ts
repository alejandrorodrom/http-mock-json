export const ADD_PRESETS = [
  'static',
  'crud',
  'crud-full',
  'scenarios',
  'auth-login',
  'proxy-hybrid',
  'paginated-list',
  'upload',
  'relations'
] as const;

export type AddPreset = (typeof ADD_PRESETS)[number];

export const ADD_PRESET_HELP = ADD_PRESETS.join('|');

const PRESET_SET = new Set<string>(ADD_PRESETS);

export const isAddPreset = (value: string): value is AddPreset => {
  return PRESET_SET.has(value);
};

export const unknownAddPresetError = (value: string): Error => {
  return new Error(
    `Unknown add preset "${ value }". Use one of: ${ ADD_PRESET_HELP }`
  );
};

export const assertAddPreset = (value: string): AddPreset => {
  if (!isAddPreset(value)) {
    throw unknownAddPresetError(value);
  }
  return value;
};

/**
 * Resolve CLI `--preset` / `--crud` into a single preset.
 * `--crud` is an alias for `--preset crud`.
 */
export const resolveAddPreset = (options: {
  preset?: string;
  crud?: boolean;
}): AddPreset => {
  const rawPreset = options.preset?.trim();

  if (rawPreset !== undefined && rawPreset.length > 0) {
    const preset = assertAddPreset(rawPreset);

    if (options.crud === true && preset !== 'crud') {
      throw new Error(
        `Cannot combine --crud with --preset ${ preset } (use --preset crud or omit --preset)`
      );
    }

    return preset;
  }

  if (options.crud === true) {
    return 'crud';
  }

  return 'static';
};

export const presetNeedsHttpVerbs = (preset: AddPreset): boolean => {
  return preset === 'static';
};

export const presetInitialEndpoint = (preset: AddPreset): string | undefined => {
  switch (preset) {
    case 'auth-login':
      return 'api/auth/login';
    case 'upload':
      return 'api/uploads';
    case 'relations':
      return 'api/users';
    case 'paginated-list':
      return 'api/items';
    case 'proxy-hybrid':
      return 'api/notes';
    default:
      return undefined;
  }
};

export const presetLabel = (preset: AddPreset): string => {
  switch (preset) {
    case 'static':
      return 'static (success/error responses)';
    case 'crud':
      return 'crud (collection + item store actions)';
    case 'crud-full':
      return 'crud-full (persist, unique, soft delete, restore)';
    case 'scenarios':
      return 'scenarios (match by query + delay)';
    case 'auth-login':
      return 'auth-login (request validation + login match)';
    case 'proxy-hybrid':
      return 'proxy-hybrid (local mock + proxied sibling route)';
    case 'paginated-list':
      return 'paginated-list (store.list page/filter/search)';
    case 'upload':
      return 'upload (multipart POST + base64 GET)';
    case 'relations':
      return 'relations (parent + child FK / expand; child defaults to posts)';
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
};

export const presetReadyHint = (preset: AddPreset): string => {
  switch (preset) {
    case 'static':
      return '! Set nameResponse to "error" to try the 404 body';
    case 'crud':
      return '! Collection + /:id store actions are ready — POST to create, GET to list';
    case 'crud-full':
      return '! Full CRUD store ready — persist/unique/softDelete on; POST …/:id to restore';
    case 'scenarios':
      return '! Try ?scenario=ok|missing|error (or omit for the fallback response)';
    case 'auth-login':
      return '! POST with user@example.com / password123 for success; other creds → 401';
    case 'proxy-hybrid':
      return '! Local GET at your endpoint; sibling …/live proxies jsonplaceholder (needs network)';
    case 'paginated-list':
      return '! Try ?page=1&pageSize=2&status=active&q=al — POST creates more seed rows';
    case 'upload':
      return '! POST multipart (title + file); GET …/:id returns a base64 demo download';
    case 'relations':
      return '! Expand parent↔child (?expand=…) — deleting a parent with children → 409';
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
};
