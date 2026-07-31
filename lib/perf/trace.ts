type TraceMeta = {
  route: string;
  name: string;
  target?: string;
};

type QueryResult = {
  data?: unknown;
  error?: unknown;
};

export function isPerfTraceEnabled() {
  return process.env.MBF_PERF_TRACE === "1";
}

function rowCount(data: unknown) {
  if (Array.isArray(data)) return data.length;
  if (data === null || typeof data === "undefined") return 0;
  return 1;
}

export async function traceAsync<T>(
  meta: TraceMeta,
  operation: () => Promise<T>,
): Promise<T> {
  if (!isPerfTraceEnabled()) {
    return operation();
  }

  const startedAt = performance.now();
  try {
    const result = await operation();
    const durationMs = performance.now() - startedAt;
    const queryResult = result as QueryResult;
    const rows = "data" in queryResult ? rowCount(queryResult.data) : undefined;

    console.info(
      JSON.stringify({
        type: "mbf-perf",
        route: meta.route,
        name: meta.name,
        target: meta.target,
        durationMs: Math.round(durationMs * 10) / 10,
        rows,
        ok: !("error" in queryResult) || !queryResult.error,
      }),
    );

    return result;
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    console.info(
      JSON.stringify({
        type: "mbf-perf",
        route: meta.route,
        name: meta.name,
        target: meta.target,
        durationMs: Math.round(durationMs * 10) / 10,
        ok: false,
      }),
    );
    throw error;
  }
}

function wrapThenable<T extends object>(value: T, meta: TraceMeta): T {
  return new Proxy(value, {
    get(target, prop, receiver) {
      if (prop === "then") {
        const then = Reflect.get(target, prop, receiver);
        if (typeof then !== "function") return then;

        return (onFulfilled: unknown, onRejected: unknown) =>
          traceAsync(
            meta,
            () =>
              new Promise((resolve, reject) => {
                then.call(target, resolve, reject);
              }),
          ).then(
            typeof onFulfilled === "function"
              ? (onFulfilled as (value: unknown) => unknown)
              : undefined,
            typeof onRejected === "function"
              ? (onRejected as (reason: unknown) => unknown)
              : undefined,
          );
      }

      const property = Reflect.get(target, prop, receiver);
      if (typeof property !== "function") return property;

      return (...args: unknown[]) => {
        const result = property.apply(target, args);
        if (result && typeof result === "object" && "then" in result) {
          return wrapThenable(result, meta);
        }
        return result;
      };
    },
  });
}

export function instrumentSupabaseClient<T extends object>(
  supabase: T,
  route: string,
): T {
  if (!isPerfTraceEnabled()) return supabase;

  return new Proxy(supabase, {
    get(target, prop, receiver) {
      if (prop === "auth") {
        const auth = Reflect.get(target, prop, receiver) as object;
        return new Proxy(auth, {
          get(authTarget, authProp, authReceiver) {
            const property = Reflect.get(authTarget, authProp, authReceiver);
            if (authProp !== "getUser" || typeof property !== "function") {
              return property;
            }

            return (...args: unknown[]) =>
              traceAsync(
                { route, name: "supabase.auth.getUser", target: "auth" },
                () => property.apply(authTarget, args),
              );
          },
        });
      }

      if (prop === "from") {
        const from = Reflect.get(target, prop, receiver) as (table: string) => object;
        return (table: string) =>
          wrapThenable(from.call(target, table), {
            route,
            name: "supabase.from",
            target: table,
          });
      }

      if (prop === "rpc") {
        const rpc = Reflect.get(target, prop, receiver) as (
          fn: string,
          args?: unknown,
          options?: unknown,
        ) => object;
        return (fn: string, args?: unknown, options?: unknown) =>
          wrapThenable(rpc.call(target, fn, args, options), {
            route,
            name: "supabase.rpc",
            target: fn,
          });
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}
