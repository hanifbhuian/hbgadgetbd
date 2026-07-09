export function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const redirectPaths = new Set(["/", "/index.html", "/home"]);

  if (redirectPaths.has(requestUrl.pathname)) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/home.html" + requestUrl.search,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
      }
    });
  }

  return context.next();
}
