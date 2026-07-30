# Validation System ✅

The server includes a comprehensive validation system that checks your mock files before starting:

### Automatic Validation

When you run `mock-server start`, the system automatically validates in this order:

1. **Port availability** (validated first, before loading mocks): Checks if the specified port is available using an efficient socket connection method. If the port is in use, the server fails immediately without loading or validating mocks, saving time and resources.

2. **Endpoint format**: Ensures endpoints use valid characters and proper structure
3. **HTTP methods**: Validates that only valid HTTP methods are used (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
4. **Response structure**: Checks that all required fields are present (`name`, `statusCode`, `body`)
5. **Response matching**: Verifies that `nameResponse` references exist in the responses array
6. **Optional match/delay/proxy**: Validates `match`, non-negative `delay`, and `proxy` URL shapes
7. **Optional request validation**: Validates `request.payload` / `request.query` / `request.headers` rule shapes, formats, and `error.response` references
8. **Optional store / action**: Validates `store` schema, unique/key/seed rules, `action` values, and conflict response names
9. **Optional mock.config.json**: Validates folder organization config (`prefix`, `delay`, `proxy`, `headers`, `enabled`, `include`/`exclude`, `strictDuplicates`, `stripPrefix`, `proxyUnmatched`, `storeNamespace`, `port`, declared folders)
10. **JSON structure**: Ensures files contain valid JSON objects

### Error Handling

- **Errors**: Critical issues that prevent the server from starting (missing required fields, invalid structure, etc.)
- **Warnings**: Non-critical issues that don't prevent startup (non-standard status codes, etc.)

If errors are found, the server will display detailed messages showing:

- The file where the error occurred
- The endpoint and method (if applicable)
- A clear description of the issue

### Watch Mode Behavior

When files change during watch mode:

- The server attempts to restart automatically
- If validation errors are found, the restart is prevented
- Clear error messages are displayed
- The server waits for you to fix the issues before restarting
- Persist snapshots (`.store/` and custom `persist.file` paths) are ignored by the watcher so store writes do not trigger a restart
- `--reset-store` is **not** re-applied on watch reloads (only the initial `start`)

---

