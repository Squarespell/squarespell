/** Enumerate every route registered on an Express 4 app (method, full path, middleware names). */
export type RouteInfo = { method: string; path: string; handlers: string[] };

function mountPath(layer: any): string {
  const src: string = layer.regexp?.source ?? '';
  if (layer.regexp?.fast_slash) return '';
  return src
    .replace('^', '')
    .replace('\\/?(?=\\/|$)', '')
    .replace(/\\\//g, '/')
    .replace(/\(\?:\(\[\^\\\/\]\+\?\)\)/g, ':param');
}

export function listRoutes(app: any): RouteInfo[] {
  const out: RouteInfo[] = [];
  function walk(stack: any[], prefix: string, inherited: string[]) {
    // Router-level middleware registered with router.use() precedes the routes that follow it.
    const useMw: string[] = [...inherited];
    for (const layer of stack) {
      if (layer.route) {
        const handlers = [...useMw, ...layer.route.stack.map((l: any) => l.name)];
        for (const method of Object.keys(layer.route.methods)) {
          out.push({ method: method.toUpperCase(), path: prefix + layer.route.path, handlers });
        }
      } else if (layer.name === 'router' && layer.handle?.stack) {
        walk(layer.handle.stack, prefix + mountPath(layer), useMw);
      } else if (layer.name && layer.name !== 'bound dispatch' && layer.name !== 'query' && layer.name !== 'expressInit') {
        useMw.push(layer.name);
      }
    }
  }
  walk(app._router.stack, '', []);
  return out;
}
