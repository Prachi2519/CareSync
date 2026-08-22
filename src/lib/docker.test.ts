import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Docker standalone frontend assets", () => {
  it("copies static and public assets beside the standalone server", () => {
    const dockerfile = readFileSync(join(process.cwd(), "Dockerfile"), "utf8");

    expect(dockerfile).toContain(
      "COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/standalone/.next/static",
    );
    expect(dockerfile).toContain(
      "COPY --from=builder --chown=nextjs:nodejs /app/public ./.next/standalone/public",
    );
  });
});
