import { describe, expect, it } from "vitest";
import { whatsappContactIdVariants } from "./phone.js";

describe("whatsappContactIdVariants", () => {
  it("includes stored id without extra 9", () => {
    const variants = whatsappContactIdVariants("+5511999887766");
    expect(variants).toContain("5511999887766");
    expect(variants).toContain("551199887766");
  });
});
