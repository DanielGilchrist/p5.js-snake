const dist = new URL("../dist/", import.meta.url);

const server = Bun.serve({
  port: 3000,
  async fetch(request) {
    const { pathname } = new URL(request.url);
    const file = Bun.file(new URL(`.${pathname === "/" ? "/index.html" : pathname}`, dist));

    return (await file.exists()) ? new Response(file) : new Response("Not found", { status: 404 });
  },
});

console.log(`serving on ${server.url}`);
