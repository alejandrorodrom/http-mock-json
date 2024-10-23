
# HTTP MOCK JSON

Allows to create a mock server and test the frontend without depending on the backend.


## Installation and use 🔧

1. Install library.
   ```
   npm install http-mock-json --save-dev
   ```

2. Run the command.
   ```
   mock-server init
   ```

3. Follow the instructions as in the example image.
   <img src="https://raw.githubusercontent.com/alejandrorodrom/http-mock-json/main/docs/add-mock.png" alt="add mock">

4. A mocks folder will be created that will contain a first endpoint.
   <img src="https://raw.githubusercontent.com/alejandrorodrom/http-mock-json/main/docs/mock.png" alt="mock">

    ### Mock structure
    | Key          | Example                                  | Description                                                                |
    |--------------|------------------------------------------|----------------------------------------------------------------------------|
    | endpoint     | `data/animals`, `data/animal/:parameter` | API route                                                                  |
    | httpVerb     | `GET`, `POST`                            | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`                                    |
    | nameResponse | `success`, `error`, `error-401`          | Response name that the mock will use                                       |
    | responses    |                                          | A mock can have multiple responses (array), each identified with a `name`. |
    | name         |                                          | Response name (unique)                                                     |
    | statusCode   |                                          | HTTP Status Codes                                                          |
    | body         |                                          | Response in json format                                                    |

5. Add the responses you want to simulate in the body. (You can change the mock response by changing the `nameResponse`).
   <img src="https://raw.githubusercontent.com/alejandrorodrom/http-mock-json/main/docs/mock-body-example.png" alt="mock body example">

6. Execute command
   ```
   mock-server start
   ```

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
    | -p --port | `3500`  | Indicates the port where the mock will be executed        |
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
   
## Recommendations 📋

* Review the advanced examples.
* A single json file can contain many mocks.
* There can be many json files each with their respective mocks.

## Advanced examples

   ```JSON
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

   ```JSON
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

## License 📖

**http-mock-json** is MIT licensed.


## Author ✒️

[Alejandro Rodriguez Romero](https://www.linkedin.com/in/alejandro-rodriguez-romero/)
