import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/utils", () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(" ")
}));

import { IpLocationText } from "../src/components/ip-location-text";

describe("IpLocationText", () => {
  it("renders plain location text for variant plain", () => {
    const markup = renderToStaticMarkup(
      createElement(IpLocationText, {
        label: "北京市",
        variant: "plain"
      })
    );

    expect(markup).toContain("<span");
    expect(markup).toContain(">北京市</span>");
    expect(markup).not.toContain("IP");
  });

  it("prepends label prefix for variant profile", () => {
    const markup = renderToStaticMarkup(
      createElement(IpLocationText, {
        label: "上海市",
        variant: "profile"
      })
    );

    expect(markup).toContain("IP");
    expect(markup).toContain("上海市");
  });

  it("renders unknown fallback when label is empty", () => {
    expect(renderToStaticMarkup(createElement(IpLocationText, { label: "", variant: "plain" }))).toContain("未知");
    expect(renderToStaticMarkup(createElement(IpLocationText, { label: "   ", variant: "plain" }))).toContain("未知");
    expect(renderToStaticMarkup(createElement(IpLocationText, { label: null, variant: "profile" }))).toContain(
      "IP属地:未知"
    );
  });
});
