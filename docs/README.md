# Documentation

The full guide and reference lives in the root [README](../README.md).

This folder also has [AI brief](ai.md), [Examples](examples.md), [Advanced examples](advanced-examples.md), [Store recipes](store-recipes.md), [Real-world](real-world.md), [FAQ](faq.md), and [Troubleshooting](troubleshooting.md). Repo index for assistants: [`llms.txt`](../llms.txt).

## Start here

1. [README — Getting started](../README.md#getting-started) → optional [Concepts](../README.md#concepts)
2. Stuck? [FAQ](faq.md) · [Troubleshooting](troubleshooting.md)
3. AI / coding assistants: [AI brief](ai.md) first, then this README index

```bash
npm install http-mock-json --save-dev
npx mock-server init
npx mock-server start
curl -i http://localhost:3001/<your-endpoint>
```

Copy fixtures and deeper walkthroughs come later ([Examples](examples.md)), not on day one.

## When to read what

| Need | Go to |
|------|--------|
| Install and first mock | [Getting started](../README.md#getting-started) |
| AI / coding assistants (pocket brief) | [AI brief](ai.md) · [`llms.txt`](../llms.txt) |
| Mental model + glossary | [Concepts](../README.md#concepts) |
| Copy a fixture (later) | [Examples](examples.md) |
| One feature at a time | [Advanced examples](advanced-examples.md) |
| Store-backed app recipe | [Store recipes](store-recipes.md) |
| Multipart / folders / hybrid proxy | [Real-world](real-world.md) |
| Flags / fields / contracts | README Reference sections (CLI, Mock file, Body, Store, …) |
| Short Q&A | [FAQ](faq.md) |
| Symptom → cause → fix | [Troubleshooting](troubleshooting.md) |

## README section anchors

**Learn** (day one)

| Section | Link |
|---------|------|
| Getting started | [README#getting-started](../README.md#getting-started) |
| Concepts | [README#concepts](../README.md#concepts) |

**Later**

| Section | Link |
|---------|------|
| Examples | [examples.md](examples.md) |
| Advanced examples | [advanced-examples.md](advanced-examples.md) |
| Record & Replay | [README#record--replay](../README.md#record--replay) |

**Reference**

| Section | Link |
|---------|------|
| CLI reference | [README#cli-reference](../README.md#cli-reference) |
| Mock file reference | [README#mock-file-reference](../README.md#mock-file-reference) |
| Validation | [README#validation-reference](../README.md#validation-reference) |
| Body compatibility | [README#body-compatibility](../README.md#body-compatibility) |
| Mock config | [README#mock-config-reference](../README.md#mock-config-reference) |
| Store reference | [README#store-reference](../README.md#store-reference) |

**Recipes**

| Section | Link |
|---------|------|
| Store recipes | [store-recipes.md](store-recipes.md) |
| Real-world | [real-world.md](real-world.md) |

## Help & project

| Doc | Contents |
|-----|----------|
| [AI brief](ai.md) | Pocket manual for assistants (pipeline, presets, limits) |
| [`llms.txt`](../llms.txt) | Priority doc index (llmstxt.org-style) |
| [FAQ](faq.md) | Short answers |
| [Troubleshooting](troubleshooting.md) | Symptom → cause → fix |
| [Root README](../README.md) | Full guide and reference |
| [Changelog](../CHANGELOG.md) | Release notes |
| [Contributing](../CONTRIBUTING.md) | Local setup and PR checklist |
| [Security](../SECURITY.md) | Vulnerability reporting |

## Related

- [npm package](https://www.npmjs.com/package/http-mock-json)
- [GitHub repository](https://github.com/alejandrorodrom/http-mock-json)
- [Project page](https://www.rodriguezrom.com/libraries/http-mock-json)
