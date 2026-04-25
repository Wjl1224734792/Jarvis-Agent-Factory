import { describe, expect, it } from "vitest";
import {
  getDetailMoreActionTypes,
  shouldRenderDetailMoreActions
} from "../src/components/detail-more-actions-state";

describe("detail more actions state", () => {
  it("shows only report for non-owner detail content", () => {
    expect(
      getDetailMoreActionTypes({
        isOwner: false,
        canEdit: true,
        canDelete: true,
        canReport: true
      })
    ).toEqual(["report"]);
  });

  it("shows only available owner actions for own content", () => {
    expect(
      getDetailMoreActionTypes({
        isOwner: true,
        canEdit: true,
        canDelete: true,
        canReport: true
      })
    ).toEqual(["edit", "delete"]);

    expect(
      getDetailMoreActionTypes({
        isOwner: true,
        canEdit: true,
        canDelete: false,
        canReport: true
      })
    ).toEqual(["edit"]);
  });

  it("hides the more entry when no action is available", () => {
    expect(
      shouldRenderDetailMoreActions({
        isOwner: true,
        canEdit: false,
        canDelete: false,
        canReport: true
      })
    ).toBe(false);
  });
});
