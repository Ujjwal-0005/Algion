const request = require('supertest');
const YAML = require('yamljs');
const path = require('path');
const app = require('../../src/app');

describe('OpenAPI Specification and Documentation Endpoint Tests', () => {
  const specPath = path.resolve(__dirname, '../../../docs/openapi.yaml');
  let openapiSpec;

  beforeAll(() => {
    openapiSpec = YAML.load(specPath);
  });

  test('GET /api/docs returns 200 or 301 redirect to Swagger UI html', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Swagger UI');
  });

  test('GET /api/docs/openapi.yaml returns 200 and parses as valid YAML', async () => {
    const res = await request(app)
      .get('/api/docs/openapi.yaml')
      .expect(200);

    expect(res.headers['content-type']).toContain('yaml');
    const parsed = YAML.parse(res.text);
    expect(parsed.openapi).toBe('3.0.3');
    expect(parsed.info.title).toBe('E-Commerce Modular Monolith API');
  });

  test('Every Express route has a corresponding path and method in docs/openapi.yaml', () => {
    // Collect all registered endpoints from the Express router stack
    const registeredRoutes = [];

    function extractRoutes(stack, prefix = '') {
      stack.forEach(layer => {
        if (layer.route) {
          const pathStr = prefix + layer.route.path;
          Object.keys(layer.route.methods).forEach(method => {
            registeredRoutes.push({
              method: method.toLowerCase(),
              path: pathStr
            });
          });
        } else if (layer.name === 'router' && layer.handle.stack) {
          let match = layer.regexp.source
            .replace('^\\', '')
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/')
            .replace('(?=\\/|$)', '');
          if (match.endsWith('$')) match = match.slice(0, -1);
          extractRoutes(layer.handle.stack, prefix + match);
        }
      });
    }

    extractRoutes(app._router.stack);

    // Normalize paths from Express syntax (:param) to OpenAPI syntax ({param})
    // Ignore documentation routes themselves
    const appRoutes = registeredRoutes
      .filter(r => !r.path.startsWith('/api/docs'))
      .map(r => {
        const relativePath = r.path.replace(/^\/api/, '') || '/';
        const openApiPath = relativePath.replace(/:([a-zA-Z0-9_]+)/g, '{$1}').replace(/\/$/, '') || '/';
        return {
          method: r.method,
          expressPath: r.path,
          openApiPath
        };
      });

    const specPaths = openapiSpec.paths || {};

    const missingRoutes = [];
    appRoutes.forEach(route => {
      const specPathObj = specPaths[route.openApiPath];
      if (!specPathObj) {
        missingRoutes.push(`${route.method.toUpperCase()} ${route.openApiPath} (Express: ${route.expressPath}) - Path missing from spec`);
      } else if (!specPathObj[route.method]) {
        missingRoutes.push(`${route.method.toUpperCase()} ${route.openApiPath} - Method missing from spec path`);
      }
    });

    expect(missingRoutes).toEqual([]);
  });
});

