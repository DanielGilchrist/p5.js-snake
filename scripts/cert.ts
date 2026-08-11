import { networkInterfaces } from "node:os";

const DIR = new URL("../certs/", import.meta.url);
const DAYS = 365;

export const key = new URL("key.pem", DIR);
export const cert = new URL("cert.pem", DIR);

export const addresses = (): readonly string[] => {
  const found = new Set<string>();

  for (const group of Object.values(networkInterfaces())) {
    for (const entry of group ?? []) {
      if (entry.family === "IPv4" && !entry.internal) found.add(entry.address);
    }
  }

  return [...found];
};

const exists = async (): Promise<boolean> =>
  (await Bun.file(key).exists()) && (await Bun.file(cert).exists());

export const ensure = async (): Promise<boolean> => {
  if (await exists()) return true;

  await Bun.$`mkdir -p ${Bun.fileURLToPath(DIR)}`.quiet();

  const names = ["DNS:localhost", "IP:127.0.0.1", ...addresses().map((ip) => `IP:${ip}`)];

  const made = Bun.spawnSync(
    [
      "openssl",
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-sha256",
      "-days",
      String(DAYS),
      "-keyout",
      Bun.fileURLToPath(key),
      "-out",
      Bun.fileURLToPath(cert),
      "-subj",
      "/CN=snake-dev",
      "-addext",
      `subjectAltName=${names.join(",")}`,
      "-addext",
      "basicConstraints=critical,CA:FALSE",
      "-addext",
      "keyUsage=critical,digitalSignature,keyEncipherment",
      "-addext",
      "extendedKeyUsage=serverAuth",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  if (!made.success) {
    console.error(`could not create a dev certificate:\n${made.stderr.toString()}`);

    return false;
  }

  return true;
};

if (import.meta.main) process.exit((await ensure()) ? 0 : 1);
