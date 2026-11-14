import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';

export const docsRouter = Router();

docsRouter.get('/openapi.json', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json(openApiDocument);
});

docsRouter.use(
  '/',
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: 'Gofest API',
    swaggerOptions: {
      persistAuthorization: false,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
    },
  }),
);