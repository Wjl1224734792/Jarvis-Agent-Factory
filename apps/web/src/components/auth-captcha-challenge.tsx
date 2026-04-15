import { cn } from "@/lib/utils";

type AuthCaptchaSvgProps = {
  /** 服务端返回的 SVG 标记字符串 */
  svgMarkup: string;
  onRefresh: () => void;
  className?: string;
  hintClassName?: string;
};

/**
 * 展示服务端 @zhennann/svg-captcha 生成的 SVG；点击区域可刷新挑战。
 */
export function AuthCaptchaSvg(props: AuthCaptchaSvgProps) {
  const hasSvg = props.svgMarkup.trim().startsWith("<svg");

  return (
    <div className={cn("space-y-2", props.className)}>
      <button
        className="flex h-12 w-full max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-[var(--radius-control)] border border-stone-200/90 bg-[#f7f5f0] px-1 shadow-sm transition hover:bg-[#efeae2]"
        onClick={props.onRefresh}
        type="button"
      >
        {hasSvg ? (
          <span
            className="flex max-h-11 w-full max-w-[200px] items-center justify-center [&_svg]:h-auto [&_svg]:max-h-11 [&_svg]:w-full [&_svg]:max-w-full"
            // 图形由自有 API 生成，非用户输入
            dangerouslySetInnerHTML={{ __html: props.svgMarkup }}
          />
        ) : (
          <span className="text-sm text-stone-500">加载中…</span>
        )}
        <span className="sr-only">刷新图形验证码</span>
      </button>
      <p className={cn("text-xs text-stone-600", props.hintClassName)}>看不清？点击上方验证码可刷新</p>
    </div>
  );
}
