import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    let requestId: string | undefined;
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null) as { error?: string; message?: string; requestId?: string } | null;
      message = body?.error || body?.message || message;
      requestId = body?.requestId;
    } else {
      message = (await res.text()) || message;
    }

    const error = new Error(message);
    error.name = String(res.status);
    if (requestId) {
      error.message = `${message} (Request ID: ${requestId})`;
    }
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30_000, // 30 seconds — keep data fresh
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
