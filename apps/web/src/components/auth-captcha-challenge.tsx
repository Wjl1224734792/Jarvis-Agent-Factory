import { cn } from "@/lib/utils";

type AuthCaptchaSvgProps = {
  /** 服务端返回的 SVG 标记字符串 */
  svgMarkup: string;
  onRefresh: () => void;
  className?: string;
  /** 与默认按钮类合并；横向布局可传 `shrink-0 w-[132px]` 等覆盖 `w-full` */
  buttonClassName?: string;
  hintClassName?: string;
  /** 为 false 时不渲染下方提示（由父级整行展示） */
  showHint?: boolean;
  /** 为 true 且无有效 SVG 时表示正在请求，显示「加载中…」；否则显示可点击刷新提示 */
  isLoading?: boolean;
};

/**
 * 展示服务端 @zhennann/svg-captcha 生成的 SVG；点击区域可刷新挑战。
 */
export function AuthCaptchaSvg(props: AuthCaptchaSvgProps) {
  const hasSvg = props.svgMarkup.trim().startsWith("<svg");
  const showHint = props.showHint !== false;
  const isLoading = props.isLoading === true;

  return (
    <div className={cn(showHint && "space-y-2", props.className)}>
      <button
        className={cn(
          "flex h-12 w-full max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-stone-200/90 bg-[#f7f5f0] px-1 shadow-sm transition hover:bg-[#efeae2]",
          props.buttonClassName
        )}
        onClick={props.onRefresh}
        type="button"
      >
        {hasSvg ? (
          <span
            className="flex max-h-11 w-full max-w-[200px] items-center justify-center [&_svg]:h-auto [&_svg]:max-h-11 [&_svg]:w-full [&_svg]:max-w-full"
            // 图形由自有 API 生成，非用户输入
            dangerouslySetInnerHTML={{ __html: props.svgMarkup }}
          />
        ) : isLoading ? (
          <span className="text-sm text-stone-500">加载中…</span>
        ) : (
          <span className="px-1 text-center text-xs leading-tight text-stone-600">点击刷新</span>
        )}
        <span className="sr-only">刷新图形验证码</span>
      </button>
      {showHint ? (
        <p className={cn("text-xs text-stone-600", props.hintClassName)}>看不清？点击上方验证码可刷新</p>
      ) : null}
    </div>
  );
}
