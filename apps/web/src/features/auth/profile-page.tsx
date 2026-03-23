import {
  BellIcon,
  CompassIcon,
  HistoryIcon,
  MessageSquareTextIcon,
  Settings2Icon,
  SparklesIcon,
  StarIcon,
  WaypointsIcon
} from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_ROUTES } from "@feijia/shared";
import { useAuthStore } from "./auth-store";

const quickActions = [
  {
    title: "继续浏览首页",
    description: "回到信息流，看推荐、最新和关注内容。",
    to: APP_ROUTES.feedHome,
    icon: CompassIcon
  },
  {
    title: "进入飞行器库",
    description: "继续按分类、品牌和动力类型筛选机型。",
    to: APP_ROUTES.models,
    icon: WaypointsIcon
  },
  {
    title: "查看消息通知",
    description: "集中处理关注、互动和评论回复提醒。",
    to: APP_ROUTES.notifications,
    icon: BellIcon
  }
] as const;

const capabilityItems = [
  {
    label: "内容能力",
    value: "发帖、图片上传、评论回复",
    icon: SparklesIcon
  },
  {
    label: "口碑能力",
    value: "机型评分与单机唯一点评",
    icon: StarIcon
  },
  {
    label: "社交能力",
    value: "关注作者、通知流与互动记录",
    icon: MessageSquareTextIcon
  }
] as const;

const roadmapItems = [
  {
    title: "我的内容资产",
    description: "后续可继续聚合为我的帖子、我的点评和我的收藏。",
    icon: HistoryIcon
  },
  {
    title: "偏好与设置",
    description: "当前已具备身份恢复链路，后续可补充隐私和账户设置。",
    icon: Settings2Icon
  }
] as const;

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const error = useAuthStore((state) => state.error);

  const displayName = user?.displayName ?? "访客";
  const roleLabel = user?.role === "admin" ? "管理员账户" : "飞友成员";
  const sessionLabel = status === "authenticated" && user ? "已登录会话" : "访客浏览模式";

  return (
    <main className="flex flex-col gap-8">
      <section className="overflow-hidden rounded-[2rem] border border-border/80 bg-[linear-gradient(150deg,rgba(15,23,42,0.96)_0%,rgba(25,80,129,0.92)_48%,rgba(59,130,246,0.82)_100%)] p-6 text-primary-foreground shadow-[0_40px_90px_-58px_rgba(15,23,42,0.95)] sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-white/14 text-white hover:bg-white/14">Profile Hub</Badge>
              <Badge variant="outline" className="border-white/18 bg-white/8 text-white">
                Station Entry
              </Badge>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Avatar size="lg" className="size-16 ring-2 ring-white/20">
                <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-white">{displayName}</h1>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-sky-100/75">
                  {roleLabel}
                </p>
              </div>
            </div>

            <p className="mt-6 max-w-2xl text-base leading-8 text-sky-50/86">
              个人中心现在不再只是身份占位，而是把当前已经打通的浏览、互动、通知和口碑入口收拢成一块飞友工作台。
            </p>
          </div>

          <Card className="rounded-[1.75rem] border-white/10 bg-white/8 text-white shadow-none backdrop-blur">
            <CardHeader>
              <CardDescription className="text-sky-100/70">Session Snapshot</CardDescription>
              <CardTitle className="text-2xl text-white">{sessionLabel}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {capabilityItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    className="flex items-start gap-4 rounded-[1.25rem] border border-white/10 bg-white/8 p-4"
                    key={item.label}
                  >
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="size-4.5" />
                    </span>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-sky-100/65">
                        {item.label}
                      </div>
                      <div className="mt-2 text-sm leading-7 text-white">{item.value}</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="rounded-[1.8rem] border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="text-2xl">主站快捷入口</CardTitle>
            <CardDescription>先从最常用的三条路径继续往下走。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  asChild
                  className="h-auto justify-start rounded-[1.4rem] px-4 py-4"
                  key={item.to}
                  variant="outline"
                >
                  <Link to={item.to}>
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                      <Icon className="size-4.5" />
                    </span>
                    <span className="flex flex-col gap-1 text-left">
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    </span>
                  </Link>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-[1.8rem] border-border/80 bg-card/80">
          <CardHeader>
            <CardTitle className="text-2xl">后续扩展方向</CardTitle>
            <CardDescription>这些能力暂时不阻塞当前闭环，但值得后续补齐。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {roadmapItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <div className="flex flex-col gap-4" key={item.title}>
                  <div className="flex items-start gap-4 rounded-[1.25rem] bg-secondary/45 p-4">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
                      <Icon className="size-4.5" />
                    </span>
                    <div>
                      <div className="text-base font-medium text-foreground">{item.title}</div>
                      <div className="mt-2 text-sm leading-7 text-muted-foreground">
                        {item.description}
                      </div>
                    </div>
                  </div>
                  {index < roadmapItems.length - 1 ? <Separator /> : null}
                </div>
              );
            })}

            {error ? (
              <Card className="rounded-[1.25rem] border-destructive/20 bg-destructive/5 shadow-none">
                <CardContent className="px-4 py-4 text-sm text-destructive">{error}</CardContent>
              </Card>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
