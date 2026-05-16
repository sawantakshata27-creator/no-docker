import type { QueryClient, QueryKey } from "@tanstack/react-query";

const TASK_QUERY_ROOTS = new Set(["tasks", "all-tasks", "analytics-tasks", "dashboard-tasks"]);

function isTaskListKey(queryKey: QueryKey) {
  return typeof queryKey[0] === "string" && TASK_QUERY_ROOTS.has(queryKey[0]);
}

export function patchTaskInQueries<T extends { id: string }>(queryClient: QueryClient, taskId: string, patch: Partial<T>) {
  queryClient.setQueriesData({ predicate: (query) => isTaskListKey(query.queryKey) }, (data: unknown) => {
    if (!Array.isArray(data)) return data;
    return data.map((item) => {
      if (!item || typeof item !== "object" || !("id" in item) || (item as { id: string }).id !== taskId) return item;
      return { ...item, ...patch };
    });
  });
}

export function appendTaskInQueries<T extends { id: string }>(queryClient: QueryClient, task: T) {
  queryClient.setQueriesData({ predicate: (query) => isTaskListKey(query.queryKey) }, (data: unknown) => {
    if (!Array.isArray(data)) return data;
    if (data.some((item) => item && typeof item === "object" && "id" in item && (item as { id: string }).id === task.id)) {
      return data;
    }
    return [task, ...data];
  });
}

export function removeTaskFromQueries(queryClient: QueryClient, taskId: string) {
  queryClient.setQueriesData({ predicate: (query) => isTaskListKey(query.queryKey) }, (data: unknown) => {
    if (!Array.isArray(data)) return data;
    return data.filter((item) => !(item && typeof item === "object" && "id" in item && (item as { id: string }).id === taskId));
  });
}
