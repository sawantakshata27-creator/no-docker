import type { Context } from "https://edge.netlify.com";
// @ts-ignore — built at deploy time
import entry from "../../dist/server/index.js";

export default async (request: Request, context: Context) => {
  return entry.fetch(request, { ...context });
};

export const config = { path: "/*" };
