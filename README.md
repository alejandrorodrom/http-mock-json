# HTTP MOCK JSON

![npm version](https://img.shields.io/npm/v/http-mock-json?style=flat-square)
![npm downloads](https://img.shields.io/npm/dm/http-mock-json?style=flat-square)
![license](https://img.shields.io/npm/l/http-mock-json?style=flat-square)
![GitHub stars](https://img.shields.io/github/stars/alejandrorodrom/http-mock-json?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)

> Allows to create a mock server and test the frontend without depending on the backend.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation and use](#installation-and-use-)
- [Commands](#commands-)
- [Validation System](#validation-system-)
- [Advanced examples](#advanced-examples)
- [Troubleshooting](#troubleshooting-)
- [License](#license-)

## Features

**Key Features:**

- **Zero Configuration** - Get started in seconds with interactive setup
- **Automatic Validation** - Comprehensive validation system prevents errors before they happen
- **Hot Reload** - Watch mode automatically restarts server on file changes
- **Multiple Responses** - Simulate different scenarios (success, error, etc.) for the same endpoint
- **Type Safe** - Built with TypeScript for better developer experience
- **RESTful Support** - Full support for GET, POST, PUT, PATCH, DELETE methods
- **JSON Based** - Simple JSON files, no complex configuration needed
- **Custom Headers** - Support for custom HTTP headers in responses
- **Parameter Support** - Dynamic routes with parameters (e.g., `/users/:id`)

## Quick Start

```bash
# Install
npm install http-mock-json --save-dev

# Initialize
mock-server init

# Start server
mock-server start
```

That's it! Your mock server is running on `http://localhost:3000` 🎉


---

## Installation and use 🔧

1. Install library.
   ```
   npm install http-mock-json --save-dev
   ```

2. Run the initialization command.
   ```
   mock-server init
   ```

   This command will:
    - Create a `mocks` folder in your project root (or in the specified path)
    - Add a `mock:start` script to your `package.json` (enabled by default)
    - Optionally create your first mock file (enabled by default)

3. If you chose to create a mock (default behavior), you'll be prompted interactively:

   **Step 1:** Enter the name for your JSON file
   ```
   ? What is the name of the json file ? animals
   ```

   **Step 2:** Enter your API endpoint
   ```
   ? What is the endpoint ? data/animals
   ```
   > You can use parameters in endpoints like `data/animals/:id`

   **Step 3:** Select the HTTP methods you want to mock
   ```
   ? Select the http verbs you use
   ❯ ◯ GET
     ◯ POST
     ◯ PUT
     ◯ PATCH
     ◯ DELETE
   ```
   > Use arrow keys to navigate, space to select, and 'a' to toggle all

   **Step 4:** Confirm the creation
   ```
   ? Confirm? (Y/n) Y
   ```

4. A mock file will be created with a basic structure containing:
    - Your specified endpoint
    - Selected HTTP methods (GET, POST, etc.)
    - Two default responses: `success` (200) and `error` (404)
    - Empty body objects ready to be filled

   ### Mock structure
   | Key          | Required | Type           | Example                                  | Description                                                                |
       |--------------|----------|----------------|------------------------------------------|----------------------------------------------------------------------------|
   | endpoint     | ✅       | string         | `data/animals`, `data/animal/:parameter` | API route. Allowed characters: letters, numbers, "-", "_", ".", "~", "/", and parameters like ":id" |
   | HTTP Method  | ✅       | string         | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`  | HTTP verb (must be uppercase)                                              |
   | nameResponse | ✅       | string         | `success`, `error`, `error-401`          | Response name that the mock will use (must exist in responses array)      |
   | responses    | ✅       | array          |                                          | A mock can have multiple responses (array), each identified with a `name`. |
   | name         | ✅       | string         |                                          | Response name (unique within the responses array)                          |
   | statusCode   | ✅       | string/number  | `200`, `"200"`, `404`, `"404"`          | HTTP Status Codes (validated, warnings for non-standard codes)            |
   | headers      | ❌       | object         | `{ "Content-Type": "application/json" }`  | Headers in json format (optional)                                          |
   | body         | ✅       | any            |                                          | Response in json format                                                    |

5. Edit the mock file to add your response data.

   Open the created JSON file (e.g., `mocks/animals.json`) and fill in the `body` objects with your mock data:

   ```json
   {
     "data/animals": {
       "GET": {
         "nameResponse": "success",
         "responses": [
           {
             "name": "success",
             "statusCode": "200",
             "body": {
               "animals": [
                 { "id": 1, "name": "Lion" },
                 { "id": 2, "name": "Tiger" }
               ]
             }
           },
           {
             "name": "error",
             "statusCode": "404",
             "body": {
               "message": "No animals found"
             }
           }
         ]
       }
     }
   }
   ```

   **Tip:** Change the `nameResponse` value to switch which response is returned by default. For example, set
   `"nameResponse": "error"` to return the error response.

6. Execute the start command
   ```
   mock-server start
   ```

   The server will automatically validate all mock files before starting. If there are validation errors, the server
   will not start and will display detailed error messages. If there are warnings (like non-standard status codes), they
   will be shown but won't prevent the server from starting.

   **Watch Mode**: The server automatically watches for changes in your mock files and restarts when you save changes.
   If errors are introduced during watch mode, the server will display the errors and wait for you to fix them.

---

## Commands ⚙️

1. `init`

   Create the folder that will contain the mocks.

    ```
    mock-server init
    ```

   | Flag        | Default | Description                                               |
       |-------------|---------|-----------------------------------------------------------|
   | -p --path   | `root`  | Indicates the location of the mocks in a specific folder. |
   | -m --mock   | `true`  | Create a first mock.                                      |
   | -s --script | `true`  | Add script to start the mock in the package.json file.    |

   **Example:**
   ```
   mock-server init --path apps/folder1 --mock false --script false
   ```

2. `start`

   Start mock server.

    ```
    mock-server start
    ```

   | Flag      | Default | Description                                               |
       |-----------|---------|-----------------------------------------------------------|
   | -p --port | `3000`  | Indicates the port where the mock will be executed        |
   | -f --path | `root`  | Indicates the location of the mocks in a specific folder. |

   **Example:**
   ```
   mock-server start --port 3001 --path apps/folder1
   ```

3. `add`

   Create a mock.

    ```
    mock-server add
    ```

   | Flag      | Default | Description                                               |
       |-----------|---------|-----------------------------------------------------------|
   | -p --path | `root`  | Indicates the location of the mocks in a specific folder. |

   **Example:**
    ```
    mock-server add --path apps/folder1
    ```

---

## Validation System ✅

The server includes a comprehensive validation system that checks your mock files before starting:

### Automatic Validation

When you run `mock-server start`, the system automatically validates:

- **Endpoint format**: Ensures endpoints use valid characters and proper structure
- **HTTP methods**: Validates that only valid HTTP methods are used (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
- **Response structure**: Checks that all required fields are present (`name`, `statusCode`, `body`)
- **Response matching**: Verifies that `nameResponse` references exist in the responses array
- **JSON structure**: Ensures files contain valid JSON objects

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

---

## Recommendations 📋

* Review the advanced examples.
* A single json file can contain many mocks.
* There can be many json files each with their respective mocks.
* The server validates your mocks automatically - fix any errors before the server can start.

---

## Advanced examples

### Example 1: Basic mock with multiple responses

```json
   {
  "data/animals": {
    "GET": {
      "nameResponse": "AnimalsError",
      "responses": [
        {
          "name": "AnimalsList",
          "statusCode": "200",
          "body": {
            "example": "data"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "example-error": "error"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "AnimalsError",
      "responses": [
        {
          "name": "AnimalsSave",
          "statusCode": "201",
          "body": {
            "example": "data"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "example-error": "error"
          }
        }
      ]
    }
  }
}
   ```

### Example 2: Mock with custom headers

```json
   {
  "api/users": {
    "GET": {
      "nameResponse": "UsersList",
      "responses": [
        {
          "name": "UsersList",
          "statusCode": 200,
          "headers": {
            "Content-Type": "application/json",
            "X-Custom-Header": "custom-value"
          },
          "body": {
            "users": [
              {
                "id": 1,
                "name": "John"
              },
              {
                "id": 2,
                "name": "Jane"
              }
            ]
          }
        }
      ]
    }
  }
}
   ```

### Example 3: Endpoint with parameters and multiple methods

```json
   {
  "data/animals/:id": {
    "GET": {
      "nameResponse": "AnimalsList",
      "responses": [
        {
          "name": "AnimalsList",
          "statusCode": "200",
          "body": {
            "example": "data"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "example-error": "error"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "AnimalsSave",
      "responses": [
        {
          "name": "AnimalsSave",
          "statusCode": "201",
          "body": {
            "example": "data"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "example-error": "error"
          }
        }
      ]
    }
  },
  "data/brands": {
    "GET": {
      "nameResponse": "BrandsList3",
      "responses": [
        {
          "name": "BrandsList",
          "statusCode": "200",
          "body": {
            "example": "data1"
          }
        },
        {
          "name": "BrandsList2",
          "statusCode": "200",
          "body": {
            "example": "data2"
          }
        },
        {
          "name": "BrandsList3",
          "statusCode": "200",
          "body": {
            "example": "data3"
          }
        }
      ]
    }
  }
}
   ```

---

## Troubleshooting 🔧

This section documents all possible errors and warnings you might encounter, organized by category.

### File-Level Errors

These errors occur when there are issues with the file structure or file system:

| Error Message                               | Description                             | Solution                                                            |
|---------------------------------------------|-----------------------------------------|---------------------------------------------------------------------|
| `The directory named mocks does not exist`  | The mocks folder is missing             | Run `mock-server init` to create the folder                         |
| `No files found`                            | No JSON files found in the mocks folder | Create at least one `.json` file in the `mocks` folder              |
| `JSON syntax error: ...`                    | Invalid JSON syntax in the file         | Check for missing commas, brackets, or quotes. Use a JSON validator |
| `Error processing file: ...`                | General file processing error           | Check file permissions and ensure the file is readable              |
| `The file must contain a valid JSON object` | File content is not a JSON object       | Ensure the file starts with `{` and contains valid JSON structure   |
| `The file does not contain any endpoints`   | File is empty or has no endpoints       | Add at least one endpoint to the file                               |

**Example:**

```
Error:
File: my-mock.json
  JSON syntax error: Unexpected token } in JSON at position 45
```

### Endpoint Errors

These errors occur when endpoint definitions are invalid:

| Error Message                                                                                             | Description                          | Solution                                                                    |
|-----------------------------------------------------------------------------------------------------------|--------------------------------------|-----------------------------------------------------------------------------|
| `Invalid path. Allowed characters: letters, numbers, "-", "_", ".", "~", "/", and parameters like ":id".` | Endpoint contains invalid characters | Use only allowed characters. Example: `data/users/:id` ✅, `data/users#id` ❌ |
| `Must be an object`                                                                                       | Endpoint value is not an object      | Ensure the endpoint value is wrapped in `{}`                                |
| `Does not contain any HTTP methods`                                                                       | Endpoint has no HTTP methods defined | Add at least one HTTP method (GET, POST, etc.) to the endpoint              |

**Example:**

```json
// ❌ Invalid
{
  "data/users#id": {
    ...
  }
  // Invalid character '#'
}

// ✅ Valid
{
  "data/users/:id": {
    ...
  }
  // Valid parameter syntax
}
```

### HTTP Method Errors

These errors occur when HTTP method definitions are invalid:

| Error Message                                                       | Description                                          | Solution                                                                 |
|---------------------------------------------------------------------|------------------------------------------------------|--------------------------------------------------------------------------|
| `Invalid HTTP method. Valid methods: GET, POST, PUT, PATCH, DELETE` | Method name is not valid                             | Use only: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` (must be uppercase) |
| `The method must be an object`                                      | Method value is not an object                        | Ensure the method value is wrapped in `{}`                               |
| `Missing property "nameResponse"`                                   | `nameResponse` property is missing                   | Add `"nameResponse": "your-response-name"` to the method                 |
| `Missing property "responses"`                                      | `responses` array is missing                         | Add `"responses": [...]` array to the method                             |
| `The "responses" property must be an array`                         | `responses` is not an array                          | Change `responses` to an array format `[]`                               |
| `The responses array is empty`                                      | `responses` array has no items                       | Add at least one response object to the array                            |
| `The "nameResponse" "X" does not exist in responses`                | `nameResponse` value doesn't match any response name | Ensure `nameResponse` matches a `name` in the responses array            |

**Example:**

```json
// ❌ Invalid
{
  "data/users": {
    "get": {
      ...
    }
    // Lowercase, should be "GET"
  }
}

// ✅ Valid
{
  "data/users": {
    "GET": {
      "nameResponse": "success",
      "responses": [
        ...
      ]
    }
  }
}
```

### Response Errors

These errors occur when individual response objects are invalid:

| Error Message                                | Description                             | Solution                                                      |
|----------------------------------------------|-----------------------------------------|---------------------------------------------------------------|
| `The response must be an object`             | Response is not an object               | Ensure each response in the array is wrapped in `{}`          |
| `Missing property "name"`                    | Response is missing the `name` property | Add `"name": "your-response-name"` to each response           |
| `Missing property "statusCode"`              | Response is missing `statusCode`        | Add `"statusCode": "200"` (or any valid status code)          |
| `The "statusCode" "X" is not a valid number` | `statusCode` is not a valid number      | Use a number or string number: `200`, `"200"`, `404`, `"404"` |
| `Missing property "body"`                    | Response is missing `body`              | Add `"body": {}` (can be empty object)                        |
| `The "headers" property must be an object`   | `headers` is not an object              | If provided, `headers` must be an object: `"headers": {}`     |

**Example:**

```json
// ❌ Invalid
{
  "name": "success",
  "statusCode": "not-a-number"
  // Invalid
  // Missing "body"
}

// ✅ Valid
{
  "name": "success",
  "statusCode": "200",
  "body": {
    "data": "example"
  }
}
```

### Warnings

Warnings don't prevent the server from starting but indicate potential issues:

| Warning Message                                         | Description                             | Action                                                                                                     |
|---------------------------------------------------------|-----------------------------------------|------------------------------------------------------------------------------------------------------------|
| `The "statusCode" X is not a standard HTTP status code` | Status code is not in the standard list | Status codes like `299`, `599` work but may not be standard. Consider using standard codes (100-599 range) |

**Standard HTTP Status Codes:**

- **1xx**: 100, 101
- **2xx**: 200, 201, 202, 204
- **3xx**: 300, 301, 302, 304
- **4xx**: 400, 401, 403, 404, 405, 409, 422
- **5xx**: 500, 501, 502, 503

### System Errors

These errors occur when there are issues with the server or system:

| Error Message           | Description                       | Solution                                                                        |
|-------------------------|-----------------------------------|---------------------------------------------------------------------------------|
| `Invalid port assigned` | Port value is not a valid number  | Use a valid port number: `mock-server start --port 3000`                        |
| `Port already in use`   | Another service is using the port | Use a different port: `mock-server start --port 3001` or stop the other service |

### Watch Mode Issues

**Watch mode not restarting:**

- Check that you're saving files in the correct `mocks` folder
- Ensure files have `.json` extension
- Fix any validation errors that prevent restart
- Check console for error messages
- Ensure the file is saved completely (some editors save in multiple steps)

### Complete Error Example

Here's what a complete error output looks like:

```
Error:
File: my-mock.json
  Invalid path. Allowed characters: letters, numbers, "-", "_", ".", "~", "/", and parameters like ":id".
  [GET] data/users: Missing property "body"
  [POST] data/products: The "nameResponse" "NotFound" does not exist in responses
  [GET] data/products: The "statusCode" "abc" is not a valid number

Warnings:
File: my-mock.json
  [GET] data/users: The "statusCode" 299 is not a standard HTTP status code
```

### Quick Validation Checklist

Before starting the server, verify:

- All JSON files have valid syntax
- All endpoints use valid characters
- All HTTP methods are uppercase: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- All methods have `nameResponse` and `responses` properties
- All responses have `name`, `statusCode`, and `body` properties
- `nameResponse` matches a `name` in the responses array
- `statusCode` is a valid number
- `headers` (if provided) is an object
- Port number is valid and available

---

## Contributing 🤝

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure your code follows the existing style.

---

## FAQ ❓

**Q: Can I use this in production?**  
A: This library is designed for development and testing purposes. It's not recommended for production use.

**Q: Does it support WebSocket?**  
A: Currently, only HTTP/HTTPS methods (GET, POST, PUT, PATCH, DELETE) are supported.

**Q: Can I use TypeScript types?**  
A: Yes! The library is built with TypeScript and includes type definitions.

**Q: How do I change the response dynamically?**  
A: Simply change the `nameResponse` value in your mock JSON file and the server will use watch mode to reload
automatically.

**Q: Can I have multiple mock files?**  
A: Yes! You can have as many JSON files as you want in the `mocks` folder. All will be loaded automatically.

---

## License 📖

**http-mock-json** is MIT licensed.

---

## Author ✒️

[Alejandro Rodriguez Romero](https://www.linkedin.com/in/alejandro-rodriguez-romero/)

---

## Support 💬

- 📧 **Issues**: [GitHub Issues](https://github.com/alejandrorodrom/http-mock-json/issues)
- 🐛 **Bug Reports**: Please use the GitHub issue tracker
- 💡 **Feature Requests**: We'd love to hear your ideas!
