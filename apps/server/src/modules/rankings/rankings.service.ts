import type {
  CommunityRanking,
  CommunityRankingItem,
  OfficialRanking,
  RankingItem
} from "@feijia/schemas";
import { powerTypeSchema } from "@feijia/schemas";
import { rankingsRepo } from "./rankings.repo";

const BAYESIAN_BASELINE_REVIEW_COUNT = 5;

const curatedRankingDefinitions = [
  {
    id: "rookie-friendly",
    title: "新手友好榜",
    description: "更看重轻量、稳定和上手门槛，适合第一次认真选飞行器的用户。",
    curator: {
      name: "飞加编辑部",
      role: "平台精选"
    },
    items: [
      { slug: "mini-4-pro", note: "轻量级机身和成熟生态，上手门槛最低。" },
      { slug: "evo-lite-plus", note: "画质和续航平衡，适合想稳妥进阶的用户。" },
      { slug: "mavic-3-pro", note: "预算充足时，一步到位的高完成度选择。" }
    ]
  },
  {
    id: "future-mobility",
    title: "低空通勤想象榜",
    description: "聚焦低空经济与城市通勤的未来感机型，适合关注行业趋势的飞友。",
    curator: {
      name: "飞友北斗",
      role: "资深观察者"
    },
    items: [
      { slug: "eh216-s", note: "载人 eVTOL 里完成度靠前，讨论热度高。" },
      { slug: "joby-s4", note: "工程化成熟度值得持续关注，等待更多真实口碑。" },
      { slug: "vision-jet-g2-plus", note: "固定翼个人航空的现实样本，便于横向比较。" }
    ]
  }
] as const;

function toTenPointScore(rawAverage: number): number {
  if (rawAverage <= 0) {
    return 0;
  }

  return Number((rawAverage * 2).toFixed(1));
}

function getReputation(score: number, totalReviews: number) {
  if (totalReviews === 0) {
    return {
      label: "待评价",
      tone: "neutral"
    } as const;
  }

  if (score >= 9) {
    return {
      label: "神机",
      tone: "featured"
    } as const;
  }

  if (score >= 8) {
    return {
      label: "真香",
      tone: "positive"
    } as const;
  }

  if (score >= 7) {
    return {
      label: "中规中矩",
      tone: "neutral"
    } as const;
  }

  if (score >= 6) {
    return {
      label: "有遗憾",
      tone: "caution"
    } as const;
  }

  return {
    label: "差评",
    tone: "negative"
  } as const;
}

function buildHighlight(
  model: {
    brand: { name: string };
    category: { name: string };
    summary: string | null;
  },
  totalReviews: number
) {
  if (model.summary) {
    return model.summary;
  }

  if (totalReviews === 0) {
    return "还没有公开点评，等待第一批真实飞友留下口碑。";
  }

  return `${model.brand.name} 在 ${model.category.name} 场景里已经积累了首批真实反馈。`;
}

function compareRankingItems(a: RankingItem, b: RankingItem) {
  if (b.bayesianScore !== a.bayesianScore) {
    return b.bayesianScore - a.bayesianScore;
  }

  if (b.totalReviews !== a.totalReviews) {
    return b.totalReviews - a.totalReviews;
  }

  if (b.averageScore !== a.averageScore) {
    return b.averageScore - a.averageScore;
  }

  return a.model.name.localeCompare(b.model.name, "zh-CN");
}

export const rankingsService = {
  async listRankings(currentUserId?: string) {
    const [models, aggregates, currentUserRatings] = await Promise.all([
      rankingsRepo.listPublishedModels(),
      rankingsRepo.listVisibleReviewAggregates(),
      currentUserId ? rankingsRepo.listUserRatings(currentUserId) : Promise.resolve([])
    ]);

    const aggregateMap = new Map(
      aggregates.map((item) => [
        item.modelId,
        {
          totalReviews: Number(item.totalReviews ?? 0),
          averageRaw: Number(item.averageRaw ?? 0)
        }
      ])
    );
    const ratingMap = new Map(currentUserRatings.map((item) => [item.modelId, item.rating]));
    const visibleAggregates = Array.from(aggregateMap.values()).filter((item) => item.totalReviews > 0);
    const globalAverageRaw =
      visibleAggregates.length > 0
        ? visibleAggregates.reduce((sum, item) => sum + item.averageRaw, 0) /
          visibleAggregates.length
        : 0;

    const officialItems: RankingItem[] = models
      .map((model) => {
        const aggregate = aggregateMap.get(model.id) ?? {
          totalReviews: 0,
          averageRaw: 0
        };
        const averageScore = toTenPointScore(aggregate.averageRaw);
        const bayesianRaw =
          aggregate.totalReviews > 0
            ? (aggregate.averageRaw * aggregate.totalReviews +
                globalAverageRaw * BAYESIAN_BASELINE_REVIEW_COUNT) /
              (aggregate.totalReviews + BAYESIAN_BASELINE_REVIEW_COUNT)
            : 0;

        return {
          rank: 0,
          model: {
            ...model,
            powerType: powerTypeSchema.parse(model.powerType)
          },
          averageScore,
          bayesianScore: toTenPointScore(bayesianRaw),
          totalReviews: aggregate.totalReviews,
          myRating: ratingMap.get(model.id) ?? null,
          reputation: getReputation(averageScore, aggregate.totalReviews),
          highlight: buildHighlight(model, aggregate.totalReviews)
        } satisfies RankingItem;
      })
      .sort(compareRankingItems)
      .map((item, index) => ({
        ...item,
        rank: index + 1
      }));

    const officialBySlug = new Map(officialItems.map((item) => [item.model.slug, item]));

    const community = curatedRankingDefinitions
      .map((definition) => {
        const items = definition.items.reduce<CommunityRankingItem[]>((result, item, index) => {
            const source = officialBySlug.get(item.slug);

            if (!source) {
              return result;
            }

            result.push({
              ...source,
              rank: index + 1,
              note: item.note
            });

            return result;
          }, []);

        return {
          id: definition.id,
          title: definition.title,
          description: definition.description,
          curator: definition.curator,
          items
        } satisfies CommunityRanking;
      })
      .filter((item) => item.items.length > 0);

    return {
      official: {
        title: "飞行器官方榜",
        description: "按综合评分与点评人数生成，优先展示已有真实口碑支撑的机型。",
        algorithmNote:
          "榜单使用综合评分和点评人数联合排序，并对低点评量机型做基础平滑，避免单条高分直接冲顶。",
        generatedAt: new Date().toISOString(),
        spotlight: officialItems[0] ?? null,
        items: officialItems
      } satisfies OfficialRanking,
      community
    };
  }
};
