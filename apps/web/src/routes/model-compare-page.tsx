import { useQuery } from "@tanstack/react-query";
import type { ModelCompareItem } from "@feijia/schemas";
import { APP_ROUTES } from "@feijia/shared";
import { ArrowLeftIcon } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BrandIdentity } from "@/components/brand-identity";
import { ModelThumbCover } from "@/components/model-thumb-cover";
import { SitePage } from "@/components/site-shell";
import { formatModelPriceRange } from "./model-detail-helpers";
import { cn } from "@/lib/utils";
import { apiClient } from "../lib/api-client";
import type { PowerType } from "@feijia/schemas";

const powerTypeLabels: Record<PowerType, string> = {
  electric: "电动",
  fuel: "燃油",
  hybrid: "混动",
  other: "其他"
};

const PARAM_LABELS: Record<string, string> = {
  maxFlightTimeMinutes: "最大飞行时间",
  maxRangeKilometers: "最大航程",
  maxSpeedKph: "最大速度",
  cruiseSpeedKph: "巡航速度",
  takeoffWeightGrams: "起飞重量",
  wingspanMm: "翼展",
  lengthMm: "长度",
  heightMm: "高度",
  maxAltitudeM: "最大升限",
  climbRateMs: "爬升率",
  windResistance: "抗风等级",
  motorType: "电机类型",
  batteryType: "电池类型",
  batteryCapacityMah: "电池容量",
  batteryVoltage: "电池电压",
  batteryEnergyWh: "电池能量",
  chargeTimeMinutes: "充电时间",
  propellerSize: "桨叶规格",
  obstacleAvoidance: "避障系统",
  gnssType: "卫星定位",
  ipRating: "防护等级",
  operatingTemperature: "工作温度",
  cameraSensorSize: "相机传感器",
  cameraPixels: "相机像素",
  videoResolution: "视频分辨率",
  lensAperture: "镜头光圈",
  isoRange: "ISO范围",
  transmissionSystem: "图传系统",
  transmissionRangeM: "图传距离",
  certificationType: "认证类型",
  noiseLevelDb: "噪音等级",
  materialType: "机身材料",
};

function formatParamValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "暂无数据";
  if (typeof value === "number") {
    if (key.includes("Minutes")) return `${value} 分钟`;
    if (key.includes("Kilometers") || key.includes("RangeM")) return `${value} km`;
    if (key.includes("Kph")) return `${value} km/h`;
    if (key.includes("Grams")) return `${value} g`;
    if (key.includes("Mm")) return `${value} mm`;
    if (key.includes("AltitudeM")) return `${value} m`;
    if (key.includes("RateMs")) return `${value} m/s`;
    if (key.includes("Mah")) return `${value} mAh`;
    if (key.includes("Wh")) return `${value} Wh`;
    if (key.includes("Db")) return `${value} dB`;
    return String(value);
  }
  return String(value);
}

const PARAM_GROUPS: { label: string; keys: string[] }[] = [
  { label: "基础规格", keys: ["wingspanMm", "lengthMm", "heightMm", "takeoffWeightGrams", "materialType"] },
  { label: "动力系统", keys: ["motorType", "batteryType", "batteryCapacityMah", "batteryVoltage", "batteryEnergyWh", "chargeTimeMinutes", "propellerSize"] },
  { label: "飞行性能", keys: ["maxSpeedKph", "cruiseSpeedKph", "maxFlightTimeMinutes", "maxRangeKilometers", "maxAltitudeM", "climbRateMs", "windResistance"] },
  { label: "感知安全", keys: ["obstacleAvoidance", "gnssType", "ipRating", "operatingTemperature"] },
  { label: "相机载荷", keys: ["cameraSensorSize", "cameraPixels", "videoResolution", "lensAperture", "isoRange"] },
  { label: "图传通信", keys: ["transmissionSystem", "transmissionRangeM"] },
  { label: "认证资质", keys: ["certificationType", "noiseLevelDb"] },
];

export function ModelComparePage() {
  const [searchParams] = useSearchParams();
  const slugs = useMemo(() => {
    const raw = searchParams.get("slugs");
    if (!raw) return [];
    return raw.split(",").filter(Boolean).slice(0, 5);
  }, [searchParams]);

  const compareQuery = useQuery({
    queryKey: ["model-compare", slugs],
    queryFn: () => apiClient.compareModels(slugs),
    enabled: slugs.length > 0,
  });

  const items = compareQuery.data?.items ?? [];

  if (slugs.length === 0) {
    return (
      <SitePage>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <p className="text-muted-foreground">未选择对比机型</p>
          <Link className="text-primary hover:underline" to={APP_ROUTES.models}>返回机型列表</Link>
        </div>
      </SitePage>
    );
  }

  return (
    <SitePage>
      <div className="mx-auto max-w-screen-xl px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" to={APP_ROUTES.models}>
            <ArrowLeftIcon className="size-4" /> 返回列表
          </Link>
          <h1 className="text-lg font-bold text-foreground">机型对比</h1>
          <span className="text-sm text-muted-foreground">({items.length}/{slugs.length} 个机型)</span>
        </div>

        {compareQuery.isLoading ? (
          <div className="py-12 text-center text-muted-foreground">加载中...</div>
        ) : compareQuery.isError ? (
          <div className="py-12 text-center text-red-500">{compareQuery.error.message}</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">未找到匹配的机型数据</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-background w-24 p-3 text-left text-sm font-medium text-muted-foreground" />
                  {items.map((item) => (
                    <th className="p-3 text-center min-w-[180px]" key={item.slug}>
                      <Link
                        className="block"
                        to={APP_ROUTES.modelDetail.replace(":slug", item.slug)}
                      >
                        <div className="mx-auto aspect-square w-28 overflow-hidden rounded-lg bg-slate-100">
                          <ModelThumbCover
                            alt={item.name}
                            className="h-full w-full object-cover"
                            coverImageUrl={item.coverImageUrl ?? null}
                            coverVideoUrl={null}
                            slug={item.slug}
                            powerType={item.powerType}
                            index={0}
                            showVideoPlayBadge={false}
                          />
                        </div>
                        <div className="mt-2 text-sm font-semibold text-foreground line-clamp-2">
                          {item.name}
                        </div>
                        <BrandIdentity
                          className="mt-1 text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"
                          imageClassName="size-3"
                          logoUrl={item.brand.logoUrl}
                          name={item.brand.name}
                        />
                        {formatModelPriceRange(item.priceMin ?? null, item.priceMax ?? null) ? (
                          <div className="mt-1 text-xs font-semibold text-primary">
                            {formatModelPriceRange(item.priceMin ?? null, item.priceMax ?? null)}
                          </div>
                        ) : null}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PARAM_GROUPS.map((group) => (
                  <>
                    <tr className="border-t border-border/60" key={`g-${group.label}`}>
                      <td
                        className="sticky left-0 z-10 bg-muted/50 p-3 text-sm font-semibold text-foreground"
                        colSpan={items.length + 1}
                      >
                        {group.label}
                      </td>
                    </tr>
                    {group.keys.map((key) => {
                      const values = items.map((item) => {
                        const params = (item as ModelCompareItem).parameters;
                        return (params as Record<string, unknown>)?.[key];
                      });
                      const allEmpty = values.every((v) => v === null || v === undefined);
                      if (allEmpty) return null;
                      return (
                        <tr className="border-b border-border/30" key={key}>
                          <td className="sticky left-0 z-10 bg-background p-3 text-xs text-muted-foreground whitespace-nowrap">
                            {PARAM_LABELS[key] ?? key}
                          </td>
                          {values.map((v, i) => (
                            <td
                              className={cn(
                                "p-3 text-center text-sm",
                                v === null || v === undefined
                                  ? "text-muted-foreground/50 italic"
                                  : "text-foreground"
                              )}
                              key={i}
                            >
                              {formatParamValue(key, v)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SitePage>
  );
}
