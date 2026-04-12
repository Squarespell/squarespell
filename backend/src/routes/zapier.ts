import { Router, Request, Response } from 'express';
import { apiKeyAuth, ApiKeyRequest } from '../middleware/apiKeyAuth';
import { testAuth } from '../services/zapierApp/authentication';

const router = Router();

/**
 * POST /api/zapier/auth/test
 * Zapier calls this endpoint to test authentication
 * Expected header: x-api-key
 */
router.post('/auth/test', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const result = await testAuth(apiKey);

    if (!result.success) {
      return res.status(401).json({ error: result.message });
    }

    // Return success with user_id for future requests
    res.json({
      success: true,
      user_id: result.user_id,
    });
  } catch (err: any) {
    console.error('Zapier auth test error:', err);
    res.status(500).json({ error: 'Authentication test failed' });
  }
});

/**
 * GET /api/zapier/app
 * Returns the Zapier app definition
 * Used by Zapier CLI and platform to register the app
 */
router.get('/app', async (_req: Request, res: Response) => {
  try {
    const zapierApp = (await import('../services/zapierApp')).default;
    res.json(zapierApp);
  } catch (err: any) {
    console.error('Failed to load Zapier app:', err);
    res.status(500).json({ error: 'Failed to load app definition' });
  }
});

/**
 * POST /api/zapier/triggers/new_lead
 * Polling trigger for new leads
 */
router.post('/triggers/new_lead', apiKeyAuth, async (req: ApiKeyRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { perform } = await import('../services/zapierApp/triggers/newLead');

    const bundle = {
      authData: {
        user_id: req.userId,
        api_key: req.headers['x-api-key'],
      },
      meta: {
        lastFetchTime: req.body.lastFetchTime,
      },
    };

    const results = await perform({}, bundle);
    res.json(results);
  } catch (err: any) {
    console.error('new_lead trigger error:', err);
    res.status(500).json({ error: err.message ?? 'Trigger failed' });
  }
});

/**
 * POST /api/zapier/triggers/quiz_completed
 * Polling trigger for quiz completions
 */
router.post('/triggers/quiz_completed', apiKeyAuth, async (req: ApiKeyRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { perform } = await import('../services/zapierApp/triggers/quizCompleted');

    const bundle = {
      authData: {
        user_id: req.userId,
        api_key: req.headers['x-api-key'],
      },
      meta: {
        lastFetchTime: req.body.lastFetchTime,
      },
    };

    const results = await perform({}, bundle);
    res.json(results);
  } catch (err: any) {
    console.error('quiz_completed trigger error:', err);
    res.status(500).json({ error: err.message ?? 'Trigger failed' });
  }
});

/**
 * POST /api/zapier/actions/create_quiz
 * Action to create a new quiz
 */
router.post('/actions/create_quiz', apiKeyAuth, async (req: ApiKeyRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { perform } = await import('../services/zapierApp/actions/createQuiz');

    const bundle = {
      authData: {
        user_id: req.userId,
        api_key: req.headers['x-api-key'],
      },
      inputData: req.body,
    };

    const result = await perform({}, bundle);
    res.status(201).json(result);
  } catch (err: any) {
    console.error('create_quiz action error:', err);
    res.status(500).json({ error: err.message ?? 'Action failed' });
  }
});

export default router;
