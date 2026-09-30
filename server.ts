import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const N8N_FORM_URL = 'https://hasinisaranya07.app.n8n.cloud/form/808f0b35-1062-4dbc-85be-fe25e8f99e15';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Endpoint 1: Verify and inspect the live n8n form schema
  app.get('/api/n8n-meta', async (_req: Request, res: Response) => {
    try {
      const response = await fetch(N8N_FORM_URL, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
        },
      });

      const html = await response.text();
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      const hasNameField = html.includes("id='field-0'") || html.includes('name="field-0"');
      const hasEmailField = html.includes("id='field-1'") || html.includes('name="field-1"');
      const hasFileField = html.includes("id='field-2'") || html.includes('name="field-2"');

      res.json({
        reachable: response.ok,
        status: response.status,
        formUrl: N8N_FORM_URL,
        title: titleMatch ? titleMatch[1].trim() : 'Resume Analyser',
        fields: [
          { id: 'field-0', label: 'Name', type: 'text', required: hasNameField },
          { id: 'field-1', label: 'Email', type: 'email', required: hasEmailField },
          { id: 'field-2', label: 'Upload Resume', type: 'file', required: hasFileField, multiple: true },
        ],
      });
    } catch (error) {
      res.status(502).json({
        reachable: false,
        formUrl: N8N_FORM_URL,
        error: error instanceof Error ? error.message : 'Unable to reach n8n form endpoint',
      });
    }
  });

  // Endpoint 2: Proxy multipart/form-data submissions directly to the live n8n form trigger
  app.post('/api/n8n-submit', async (req: Request, res: Response) => {
    try {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('multipart/form-data')) {
        res.status(400).json({
          ok: false,
          message: 'Expected multipart/form-data payload with field-0 (Name), field-1 (Email), and field-2 (Resume file).',
        });
        return;
      }

      // Collect raw binary chunks to preserve exact multipart boundaries and uploaded files
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const rawBody = Buffer.concat(chunks);

      const upstreamResponse = await fetch(N8N_FORM_URL, {
        method: 'POST',
        headers: {
          'content-type': contentType,
          'accept': '*/*',
        },
        body: rawBody,
      });

      const responseText = await upstreamResponse.text();
      let parsedJson: Record<string, unknown> | null = null;
      try {
        parsedJson = JSON.parse(responseText);
      } catch {
        parsedJson = null;
      }

      if (upstreamResponse.ok) {
        const customMessage =
          parsedJson && typeof parsedJson.formSubmittedText === 'string'
            ? parsedJson.formSubmittedText
            : 'Your resume and candidate profile have been delivered to the n8n Resume Analyser workflow.';

        res.status(200).json({
          ok: true,
          upstreamStatus: upstreamResponse.status,
          message: customMessage,
          formWaitingUrl: parsedJson?.formWaitingUrl ?? null,
          redirectURL: parsedJson?.redirectURL ?? null,
          rawPreview: responseText.slice(0, 300),
        });
      } else {
        res.status(upstreamResponse.status).json({
          ok: false,
          upstreamStatus: upstreamResponse.status,
          message:
            upstreamResponse.status === 413
              ? 'The uploaded resume file exceeds the maximum size limit. Please upload a smaller PDF or DOCX file.'
              : 'The n8n workflow could not process this submission right now. Make sure the workflow is active in n8n Cloud or use the Embedded Form view.',
          rawPreview: responseText.slice(0, 300),
        });
      }
    } catch (error) {
      res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Unexpected error while forwarding form to n8n Cloud.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
