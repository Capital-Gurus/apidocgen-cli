# capital-gurus-ai-doc-gen

**AI-powered API documentation CLI.** Sync your OpenAPI spec with [ApiDocGen](https://api-doc-gen.fly.dev) and get rich documentation with code snippets in 9 languages.

## Quick start

From your API project directory, run:

```bash
npx capital-gurus-ai-doc-gen setup
```

> **Note:** The npm package is `capital-gurus-ai-doc-gen` but the CLI command is `apidocgen`. If you install it globally with `npm install -g capital-gurus-ai-doc-gen`, you can use the shorter `apidocgen setup`.

The interactive setup will:

1. Create your ApiDocGen account (or use an existing one)
2. Create a project
3. Read your OpenAPI spec (`openapi.json` by default)
4. Generate AI-powered documentation
5. Save a `.apidocgen.yml` config file

After setup, your docs are live at `https://api-doc-gen.fly.dev/docs/YOUR-SLUG`.

## Commands

### `npx capital-gurus-ai-doc-gen setup`

Interactive first-time setup. Walks you through account creation, project setup, and initial sync.

### `npx capital-gurus-ai-doc-gen sync`

Sync your current `openapi.json` with ApiDocGen. Run this every time your API changes. Only re-processes endpoints that actually changed.

### `npx capital-gurus-ai-doc-gen register`

Create an ApiDocGen account (without creating a project). Useful if you want to just get an API key.

## Configuration

The setup creates a `.apidocgen.yml` file:

```yaml
api_url: https://api-doc-gen.fly.dev
api_key: adg_your_key
project_slug: my-api
spec_file: ./openapi.json
```

> **Important:** Add `.apidocgen.yml` to your `.gitignore`. It contains your API key.

## Generating your OpenAPI spec

ApiDocGen needs an `openapi.json` file with your API definition. Most frameworks generate this automatically:

**NestJS** (with `@nestjs/swagger`)
```bash
curl http://localhost:8000/api-docs-json > openapi.json
```

**FastAPI**
```bash
curl http://localhost:8000/openapi.json > openapi.json
```

**Express** (with `swagger-jsdoc`)
```bash
node -e "require('fs').writeFileSync('openapi.json', JSON.stringify(require('./swagger')))"
```

## Automating sync

Add sync to your CI/CD pipeline or npm scripts to keep docs automatically updated:

```json
{
  "scripts": {
    "predev": "curl -s http://localhost:8000/api-docs-json > openapi.json && npx capital-gurus-ai-doc-gen sync || true",
    "dev": "nest start --watch"
  }
}
```

Or as a GitHub Action:

```yaml
- name: Sync API docs
  run: |
    curl -s http://localhost:8000/api-docs-json > openapi.json
    npx capital-gurus-ai-doc-gen sync
  env:
    APIDOCGEN_API_KEY: ${{ secrets.APIDOCGEN_API_KEY }}
```

## Accessing your docs

Once synced, your docs are available in three formats:

```bash
# JSON (for custom frontends)
curl -H "x-api-key: YOUR_KEY" \
  "https://api-doc-gen.fly.dev/docs/my-api?format=json"

# HTML (ready to embed)
curl -H "x-api-key: YOUR_KEY" \
  "https://api-doc-gen.fly.dev/docs/my-api?format=html&fullPage=true"

# Markdown (for READMEs, wikis, Notion)
curl -H "x-api-key: YOUR_KEY" \
  "https://api-doc-gen.fly.dev/docs/my-api?format=md"
```

## Links

- **npm:** https://www.npmjs.com/package/capital-gurus-ai-doc-gen
- **ApiDocGen API:** https://api-doc-gen.fly.dev
- **Swagger UI:** https://api-doc-gen.fly.dev/api-docs
- **GitHub:** https://github.com/Capital-Gurus/apidocgen-cli
- **Issues:** https://github.com/Capital-Gurus/apidocgen-cli/issues

## License

MIT
