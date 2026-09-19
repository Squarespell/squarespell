/**
 * Express 4 does not catch rejected promises from async route handlers.
 * An unhandled rejection either leaves the request hanging until the
 * platform gateway times out, or (Node >= 15) terminates the whole process,
 * which on Render means every user is dropped while the service restarts.
 *
 * This patches the router layer once so a rejected/throwing handler is
 * forwarded to next(err) and ends up in the JSON error handler in app.ts.
 * Handlers that already catch their own errors are unaffected.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Layer = require('express/lib/router/layer');

const FLAG = '__sqAsyncPatched';

if (!Layer.prototype[FLAG]) {
  Layer.prototype[FLAG] = true;
  Layer.prototype.handle_request = function handleRequest(req: any, res: any, next: any) {
    const fn = this.handle;
    if (fn.length > 3) return next(); // error-handling middleware, skip
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (err) {
      next(err);
    }
  };
}

export {};
