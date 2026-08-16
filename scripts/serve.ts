import * as Cert from "./cert";

const dist = new URL("../dist/", import.meta.url);

export const served = async (request: Request): Promise<Response> => {
  const { pathname } = new URL(request.url);
  const file = Bun.file(new URL(`.${pathname === "/" ? "/index.html" : pathname}`, dist));

  return (await file.exists()) ? new Response(file) : new Response("Not found", { status: 404 });
};

if (import.meta.main) {
  const port = Number(Bun.env["PORT"] ?? 3000);
  const wanted = Bun.env["HTTPS"] === "1";

  const secure = wanted && (await Cert.ensure());
  const tlsPort = port + 1;

  const onward = (request: Request): Response => {
    const url = new URL(request.url);

    url.protocol = "https:";
    url.port = String(tlsPort);

    return Response.redirect(url.toString(), 307);
  };

  Bun.serve({ port, fetch: secure ? onward : served });

  if (secure) {
    Bun.serve({
      port: tlsPort,
      tls: { cert: Bun.file(Cert.cert), key: Bun.file(Cert.key) },
      fetch: served,
    });

    console.log(`serving on https://localhost:${tlsPort}/`);
    console.log(`  http://localhost:${port} redirects there`);

    for (const address of Cert.addresses()) {
      console.log(`  on this network: https://${address}:${tlsPort}`);
    }

    console.log("  (self-signed here; the deployed site has a real certificate and no warning)");
  } else {
    console.log(`serving on http://localhost:${port}/`);
    console.log("  (HTTPS=1 to serve over TLS, needed for WebRTC away from localhost)");
  }
}
