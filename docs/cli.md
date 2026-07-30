# Commands ⚙️

1. `init`

   Create the folder that will contain the mocks.

    ```
    mock-server init
    ```

   | Flag        | Default | Description                                               |
   |-------------|---------|-----------------------------------------------------------|
   | -p --path   | `mocks` | Path to the mocks directory to create                     |
   | -m --mock   | `true`  | Create a first mock.                                      |
   | -s --script | `true`  | Add script to start the mock in the package.json file.    |

   **Example:**
   ```
   mock-server init --path api-mocks --mock false --script false
   mock-server init --path apps/folder1/mocks --mock false --script false
   ```

2. `start`

   Start mock server.

    ```
    mock-server start
    ```

   | Flag        | Default | Description                                                                 |
   |-------------|---------|-----------------------------------------------------------------------------|
   | -p --port   | -       | Listen port. Overrides `mock.config.json` `port` when set; otherwise config `port`, else `3000` |
   | -f --path   | `mocks` | Path to the mocks directory (JSON files + optional `mock.config.json`)      |
   | --proxy     | -       | Global proxy target (`http`/`https`). Used by `"proxy": true` and unmatched routes |
   | --reset-store | -     | Delete persisted store files **before the initial start** (all stores, or comma-separated ids). Not re-applied on watch reloads |

   **Example:**
   ```
   mock-server start --port 3001 --path api-mocks --proxy https://api.staging.com
   mock-server start --path apps/folder1/mocks
   mock-server start --reset-store
   mock-server start --reset-store notes,users
   ```

   **Breaking (≥ 2.0.0):** `--path` / `-f` is the mocks directory itself (default `mocks`).  
   Before 2.0.0, `-f apps/folder1` meant `apps/folder1/mocks`. Use `-f apps/folder1/mocks` now.

3. `add`

   Create a mock.

    ```
    mock-server add
    mock-server add --crud
    ```

   | Flag      | Default | Description                                               |
   |-----------|---------|-----------------------------------------------------------|
   | -p --path | `mocks` | Path to the mocks directory                               |
   | --crud    | `false` | Scaffold collection + item route with `store` actions (`list` / `create` / `get` / `update` / `patch` / `delete`). Skips the HTTP verb prompt. `store.id` is taken from the last path segment. If the endpoint ends with `/:param`, that param name is kept on the item route. |

   **Example:**
    ```
    mock-server add --path api-mocks
    mock-server add --path apps/folder1/mocks
    mock-server add --crud
    ```

   With `--crud`, an endpoint like `api/notes` writes both `api/notes` and `api/notes/:id` (same shape as [Example A — Simple](store.md#example-a--simple-notes-crud), plus `PUT`/`PATCH`). `users/:userId` keeps `users/:userId` on the item route. If the JSON file already exists, you are asked before overwrite. Edit `seed` / `template` or `POST` items to start.

---

