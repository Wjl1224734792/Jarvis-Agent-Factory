import { useQuery } from "@tanstack/react-query";
import { APP_ROUTES } from "@feijia/shared";
import {
  CameraIcon,
  GripVerticalIcon,
  LightbulbIcon,
  SearchIcon,
  Settings2Icon
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  SiteGrid,
  SitePage,
  SitePageEyebrow,
  SitePanel,
  SitePanelBody,
  SiteRail
} from "@/components/site-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "../lib/api-client";
import { getEditorialImage, getModelImage } from "../lib/aviation-media";

const rankingCategories = ["商务航空", "航拍无人机", "通航培训", "载重运输"] as const;
const visibilityOptions = ["Public (Everyone)", "Followers Only", "Private Draft"] as const;

export function RankingEditorPage() {
  const [name, setName] = useState("Top 10 Mid-Size Business Jets 2024");
  const [description, setDescription] = useState(
    "分享这份榜单的评判标准、使用场景与个人视角，让读者知道它为什么值得收藏。"
  );
  const [category, setCategory] = useState<string>(rankingCategories[0]!);
  const [visibility, setVisibility] = useState<string>(visibilityOptions[0]!);
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");
  const [coverImage, setCoverImage] = useState(getEditorialImage("ranking-editor"));
  const [selectedModelSlugs, setSelectedModelSlugs] = useState<string[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState("14:23");

  const modelsQuery = useQuery({
    queryKey: ["ranking-editor-models"],
    queryFn: () => apiClient.listModels()
  });

  const selectedModels =
    modelsQuery.data?.items.filter((model) => selectedModelSlugs.includes(model.slug)) ?? [];

  const availableModels =
    modelsQuery.data?.items.filter((model) => !selectedModelSlugs.includes(model.slug)).slice(0, 8) ??
    [];

  const previewItems = useMemo(() => selectedModels.slice(0, 5), [selectedModels]);

  function addModel(slug: string) {
    setSelectedModelSlugs((current) => (current.includes(slug) ? current : [...current, slug]));
  }

  function removeModel(slug: string) {
    setSelectedModelSlugs((current) => current.filter((item) => item !== slug));
  }

  return (
    <SitePage>
      <SiteGrid className="xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <SitePanel>
            <SitePanelBody className="space-y-8">
              <div className="grid gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Ranking Name</label>
                  <Input className="h-12" onChange={(event) => setName(event.target.value)} value={name} />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Bio / Description</label>
                  <Textarea
                    className="min-h-36"
                    onChange={(event) => setDescription(event.target.value)}
                    value={description}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <div className="grid gap-2">
                      {rankingCategories.map((item) => (
                        <button
                          className={`rounded-[var(--radius-control)] border px-4 py-3 text-left transition ${
                            category === item
                              ? "border-primary/20 bg-primary/8 text-primary"
                              : "border-border/80 bg-background text-foreground"
                          }`}
                          key={item}
                          onClick={() => setCategory(item)}
                          type="button"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Visibility</label>
                    <div className="grid gap-2">
                      {visibilityOptions.map((item) => (
                        <button
                          className={`rounded-[var(--radius-control)] border px-4 py-3 text-left transition ${
                            visibility === item
                              ? "border-primary/20 bg-primary/8 text-primary"
                              : "border-border/80 bg-background text-foreground"
                          }`}
                          key={item}
                          onClick={() => setVisibility(item)}
                          type="button"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Cover Image</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">Upload ranking hero</div>
                </div>
                <Button
                  onClick={() => setCoverImage(getEditorialImage(`${name}-${Date.now()}`))}
                  type="button"
                  variant="panel"
                >
                  <CameraIcon data-icon="inline-start" />
                  Refresh Cover
                </Button>
              </div>

              <div className="overflow-hidden rounded-[var(--radius-control)] border border-dashed border-border/80">
                <img alt="ranking cover" className="h-72 w-full object-cover" src={coverImage} />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-background/72 px-5 py-4">
                <div>
                  <div className="text-xl font-semibold text-foreground">Sort Order</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Determine how items are displayed by default
                  </div>
                </div>
                <div className="flex gap-2 rounded-[var(--radius-control)] border border-border/80 bg-background p-1">
                  {(["DESC", "ASC"] as const).map((item) => (
                    <button
                      className={`rounded-[calc(var(--radius-control)-0.2rem)] px-4 py-2 text-sm font-medium transition ${
                        sortOrder === item ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                      key={item}
                      onClick={() => setSortOrder(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel>
            <SitePanelBody className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Add Aircraft To List</div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">Curate the ranking</div>
                </div>
                <Badge className="rounded-full px-3 py-1" variant="secondary">
                  {selectedModels.length} Items Added
                </Badge>
              </div>

              <div className="rounded-[var(--radius-control)] border border-border/80 bg-background px-4 py-3 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <SearchIcon className="size-4" />
                  Search Aircraft Library...
                </div>
              </div>

              <div className="grid gap-4">
                {selectedModels.map((model, index) => (
                  <div
                    className="flex items-center gap-4 rounded-[var(--radius-control)] border border-border/80 bg-background/82 px-4 py-4"
                    key={model.slug}
                  >
                    <div className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-lg font-semibold text-primary">
                      {(index + 1).toString().padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-foreground">{model.name}</div>
                      <div className="mt-1 text-sm uppercase tracking-[0.2em] text-muted-foreground">
                        {model.category.name}
                      </div>
                    </div>
                    <Button onClick={() => removeModel(model.slug)} size="sm" type="button" variant="outline">
                      Remove
                    </Button>
                    <GripVerticalIcon className="size-4 text-muted-foreground" />
                  </div>
                ))}

                {selectedModels.length === 0 ? (
                  <div className="rounded-[var(--radius-control)] border border-dashed border-border/80 bg-background/72 px-4 py-6 text-sm text-muted-foreground">
                    先从下方候选机型里加入 3-5 个项目，右侧预览会实时更新。
                  </div>
                ) : null}
              </div>

              <div className="text-sm uppercase tracking-[0.28em] text-muted-foreground">Available Picks</div>
              <div className="grid gap-4 md:grid-cols-2">
                {availableModels.map((model) => (
                  <button
                    className="flex items-center gap-4 rounded-[var(--radius-control)] border border-border/80 bg-background/82 p-4 text-left transition hover:border-primary/20 hover:bg-primary/4"
                    key={model.slug}
                    onClick={() => addModel(model.slug)}
                    type="button"
                  >
                    <img
                      alt={model.name}
                      className="h-20 w-24 rounded-[var(--radius-control)] object-cover"
                      src={getModelImage(model.slug, model.powerType)}
                    />
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-foreground">{model.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{model.brand.name}</div>
                    </div>
                  </button>
                ))}
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="flex items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">All changes autosaved at {lastSavedAt}</div>
              <div className="flex gap-3">
                <Button
                  onClick={() =>
                    setLastSavedAt(
                      new Date().toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    )
                  }
                  type="button"
                  variant="panel"
                >
                  Save Draft
                </Button>
                <Button asChild variant="hero">
                  <Link to={APP_ROUTES.rankings}>Publish Ranking</Link>
                </Button>
              </div>
            </SitePanelBody>
          </SitePanel>
        </div>

        <SiteRail>
          <SitePanel>
            <div className="px-[var(--panel-padding)] pt-[var(--panel-padding)]">
              <SitePageEyebrow>Real-Time Preview</SitePageEyebrow>
            </div>
            <div className="mx-[var(--panel-padding)] mt-4 overflow-hidden rounded-[var(--radius-control)]">
              <img alt="preview cover" className="h-64 w-full object-cover" src={coverImage} />
            </div>
            <SitePanelBody className="space-y-4">
              <Badge className="rounded-full px-3 py-1" variant="secondary">
                {category}
              </Badge>
              <div className="text-[2rem] font-semibold leading-tight text-foreground">{name}</div>
              <div className="text-sm leading-7 text-muted-foreground">{description}</div>
              <div className="space-y-3">
                {previewItems.map((model, index) => (
                  <div
                    className="flex items-center gap-4 rounded-[var(--radius-control)] border border-border/80 bg-background/72 px-4 py-4"
                    key={model.slug}
                  >
                    <div className="flex size-9 items-center justify-center rounded-[calc(var(--radius-control)-0.25rem)] bg-primary/10 text-sm font-semibold text-primary">
                      {index + 1}
                    </div>
                    <div className="font-medium text-foreground">{model.name}</div>
                  </div>
                ))}
                {previewItems.length === 0 ? (
                  <div className="rounded-[var(--radius-control)] border border-dashed border-border/80 bg-background/72 px-4 py-5 text-sm text-muted-foreground">
                    Search and add aircraft to populate the preview ranking.
                  </div>
                ) : null}
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="highlight">
            <SitePanelBody className="flex items-start gap-4">
              <LightbulbIcon className="mt-1 size-5" />
              <div>
                <div className="text-xl font-semibold">Pro Tip: Editor’s Choice</div>
                <div className="mt-2 text-sm leading-7 text-panel-highlight-foreground/86">
                  Adding detailed bios for each aircraft increases engagement by 45% in the Flight Circle.
                </div>
              </div>
            </SitePanelBody>
          </SitePanel>

          <SitePanel variant="muted">
            <SitePanelBody className="flex items-center gap-3 text-sm text-muted-foreground">
              <Settings2Icon className="size-5 text-primary" />
              这版先实现布局与实时预览，后续如果你需要，我可以继续把榜单提交接口一并接上。
            </SitePanelBody>
          </SitePanel>
        </SiteRail>
      </SiteGrid>
    </SitePage>
  );
}
