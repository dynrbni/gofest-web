import SwaggerParser from '@apidevtools/swagger-parser';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { openApiDocument } from '../../src/docs/openapi';

const app = createApp();

describe('openapi document', () => {
  it('is a valid OpenAPI 3 document', async () => {
    const api = await SwaggerParser.validate(openApiDocument as never);
    expect(api.info.title).toBe('Gofest Ticketing API');
    expect(api.paths?.['/auth/login']?.post).toBeDefined();
    expect(api.paths?.['/check-in/scan']?.post).toBeDefined();
    expect(api.paths?.['/webhooks/payments/{provider}']?.post).toBeDefined();
  });

  it('serves the document and Swagger UI', async () => {
    const json = await request(app).get('/api/docs/openapi.json');
    expect(json.status).toBe(200);
    expect(json.body.info.version).toBe('0.1.0');

    const ui = await request(app).get('/api/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('Gofest API');
  });
});