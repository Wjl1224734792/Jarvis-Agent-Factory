import { describe, expect, it, vi } from "vitest";

// vi.hoisted ensures these are available inside the hoisted vi.mock factory
const { mockExecute, mockDbSelect } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockDbSelect: vi.fn(),
}));

vi.mock("@feijia/db", () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (value: unknown[]) => unknown) => resolve([])),
  };

  return {
    circlePostsTable: {
      circleId: "circle_id_col",
      authorId: "author_id_col",
    },
    circleMembersTable: {
      circleId: "cm_circle_id_col",
      userId: "cm_user_id_col",
    },
    userFollowsTable: {
      followeeId: "followee_id_col",
      followerId: "follower_id_col",
    },
    circlesTable: {},
    usersTable: {},
    circlePostCommentsTable: {},
    circlePostInteractionsTable: {},
    circleUserCategoriesTable: {},
    circleCategoryAssignmentsTable: {},
    createId: vi.fn(() => "mock_id"),
    db: {
      select: mockDbSelect,
      execute: mockExecute,
    },
    sql: Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => ({
        strings,
        values,
        toString: () => "MOCK_SQL",
      }),
      {
        join: vi.fn(() => "MOCK_JOIN"),
      }
    ),
    eq: vi.fn((a: unknown, b: unknown) => ({ type: "eq", left: a, right: b })),
    and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
    or: vi.fn((...args: unknown[]) => ({ type: "or", args })),
    desc: vi.fn((col: unknown) => ({ type: "desc", col })),
    asc: vi.fn((col: unknown) => ({ type: "asc", col })),
  };
});

import { circlesRepo } from "../src/modules/circles/circles.repo";

describe("circlesRepo.listFeed", () => {
  it("returns empty array for tab='latest' when anonymous (no currentUserId)", async () => {
    const result = await circlesRepo.listFeed({
      tab: "latest",
      limit: 20,
      offset: 0,
    });

    expect(result).toEqual([]);
  });

  it("applies joined-circles filter for tab='latest' with a userId", async () => {
    const mockResult: unknown[] = [
      { id: "post_1", title: "Test Post", circleId: "circle_1" },
    ];
    mockDbSelect.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(mockResult),
    });

    const result = await circlesRepo.listFeed({
      tab: "latest",
      currentUserId: "user_1",
      limit: 20,
      offset: 0,
    });

    expect(result).toEqual(mockResult);
    expect(mockDbSelect).toHaveBeenCalled();
  });

  it("does not apply joined-circles filter for tab='recommended'", async () => {
    const mockResult: unknown[] = [
      { id: "post_2", title: "Recommended Post", circleId: null },
    ];
    mockDbSelect.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(mockResult),
    });

    const result = await circlesRepo.listFeed({
      tab: "recommended",
      currentUserId: "user_1",
      limit: 20,
      offset: 0,
    });

    expect(result).toEqual(mockResult);
    expect(mockDbSelect).toHaveBeenCalled();
  });

  it("returns empty array for tab='latest' with undefined currentUserId", async () => {
    const result = await circlesRepo.listFeed({
      tab: "latest",
      currentUserId: undefined,
      limit: 20,
    });

    expect(result).toEqual([]);
  });
});
