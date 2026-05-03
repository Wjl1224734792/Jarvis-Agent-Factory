import { describe, expect, it } from "vitest";
import {
  buildModelFilterSearchParams,
  readModelFilterParams,
  toggleModelFilterValue
} from "../src/routes/models-page-helpers";

describe("models page helpers", () => {
  it("reads repeated filter params and keyword", () => {
    const params = new URLSearchParams(
      "categorySlug=drone&categorySlug=evtol&brandSlug=dji&powerType=electric&powerType=hybrid&keyword=pro"
    );

    expect(readModelFilterParams(params)).toEqual({
      categorySlugs: ["drone", "evtol"],
      brandSlugs: ["dji"],
      powerTypes: ["electric", "hybrid"],
      keyword: "pro"
    });
  });

  it("builds repeated search params and clears groups", () => {
    const current = new URLSearchParams(
      "categorySlug=drone&brandSlug=dji&powerType=electric&keyword=mavic"
    );

    const next = buildModelFilterSearchParams(current, {
      categorySlugs: ["drone", "business-jet"],
      brandSlugs: [],
      powerTypes: ["fuel"],
      keyword: ""
    });

    expect(next.toString()).toBe("categorySlug=drone&categorySlug=business-jet&powerType=fuel");
  });

  it("toggles a multi-select filter value", () => {
    expect(toggleModelFilterValue(["drone"], "evtol")).toEqual(["drone", "evtol"]);
    expect(toggleModelFilterValue(["drone", "evtol"], "drone")).toEqual(["evtol"]);
  });
});
