
# HTTP MOCK JSON


## Description 📄

Allows to create a mock server and test the frontend without depending on the backend.


## Installation and use 🔧

1. Install library.

   ```
   npm install http-mock-json --save-dev
   ```

2. Create a folder or directory called "mocks" at the "node_modules" level.

3. Add the json files with the mocks as in this example

   ```JSON
   {
      "data/animals": { // API route
         "GET": { // GET, POST, PUT, PATCH, DELETE
            "nameResponse": "AnimalsList", // Response name to be used
            "responses": [ // A mock can have several responses identifying each one by a "name"
               {
                  "name": "AnimalsList", // Response name
                  "status": "200", // HTTP Status Codes
                  "body": { // Response in json format
                    "example": "data get"
                  }
               }
            ]
         },
         "POST": { // GET, POST, PUT, PATCH, DELETE
            "nameResponse": "AnimalsSave", // Response name to be used
            "responses": [
               {
                  "name": "AnimalsSave", // Response name
                  "status": "201", // HTTP Status Codes
                  "body": { // Response in json format
                    "example": "data post"
                  }
               }
            ]
         }
      }      
   }
   ```
   
4. Execute command

   ```
   mock-server start
   ```
   
## Recommendations 📋

* Copy and paste the example deleting the comments to test the operation.
* A single json file can contain many mocks.
* There can be many json files each with their respective mocks.
* You can change the default port (3000) with the following command.
   ```
   mock-server start -p 3500
   ```

## Advanced examples

   ```JSON
   {
      "data/animals": {
         "GET": {
            "nameResponse": "AnimalsError",
            "responses": [
               {
                  "name": "AnimalsList",
                  "status": "200",
                  "body": {
                    "example": "data"
                  }
               },
               {
                  "name": "AnimalsError",
                  "status": "404",
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
                  "status": "201",
                  "body": {
                    "example": "data"
                  }
               },
               {
                  "name": "AnimalsError",
                  "status": "404",
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
      "data/animals": {
         "GET": {
            "nameResponse": "AnimalsList",
            "responses": [
               {
                  "name": "AnimalsList",
                  "status": "200",
                  "body": {
                    "example": "data"
                  }
               },
               {
                  "name": "AnimalsError",
                  "status": "404",
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
                  "status": "201",
                  "body": {
                    "example": "data"
                  }
               },
               {
                  "name": "AnimalsError",
                  "status": "404",
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
                  "status": "200",
                  "body": {
                    "example": "data1"
                  }
               },
               {
                  "name": "BrandsList2",
                  "status": "200",
                  "body": {
                    "example": "data2"
                  }
               },
               {
                  "name": "BrandsList3",
                  "status": "200",
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

## Keywords
