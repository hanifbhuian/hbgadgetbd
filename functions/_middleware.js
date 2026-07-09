export function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/home.html" + requestUrl.search }
    });
  }
  return context.next();
}
