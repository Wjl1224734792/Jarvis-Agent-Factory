import { useEffect } from "react";
import { AuthCaptchaSvg } from "@/components/auth-captcha-challenge";
import { SitePanel, SitePanelBody } from "@/components/site-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useSmsVerificationFlow } from "./use-sms-verification-flow";

type SmsFlow = ReturnType<typeof useSmsVerificationFlow>;

type SendSmsCaptchaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 换绑等嵌套场景需高于父层，例如 `z-[80]` */
  overlayClassName?: string;
  title?: string;
  description?: string;
  flow: SmsFlow;
  onRefreshError: (message: string) => void;
  refreshErrorFallback: string;
  onConfirmSend: () => Promise<void>;
};

/**
 * 发送短信前图形验证：打开时拉取 SVG 挑战，确认后由父组件调用发短信 API。
 */
export function SendSmsCaptchaDialog(props: SendSmsCaptchaDialogProps) {
  const { flow } = props;

  useEffect(() => {
    if (!props.open) {
      return;
    }

    void flow.refreshCaptcha({
      onError: props.onRefreshError,
      errorFallback: props.refreshErrorFallback
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅打开时拉取；flow 为稳定 useMemo 对象
  }, [props.open]);

  if (!props.open) {
    return null;
  }

  const canSubmit =
    Boolean(flow.challenge) &&
    !flow.isCaptchaExpired &&
    flow.captchaCode.trim().length >= 4 &&
    !flow.isSendingSms;

  return (
    <div
      className={
        props.overlayClassName ??
        "fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm"
      }
    >
      <SitePanel className="w-full max-w-[420px]" variant="floating">
        <SitePanelBody className="space-y-4">
          <div className="space-y-1">
            <div className="text-lg font-semibold text-foreground">
              {props.title ?? "图形验证"}
            </div>
            {props.description ? (
              <p className="text-sm leading-6 text-muted-foreground">{props.description}</p>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">请输入图中字符，验证通过后发送短信验证码。</p>
            )}
          </div>

          <AuthCaptchaSvg
            hintClassName="text-left"
            onRefresh={() => {
              void flow.refreshCaptcha({
                onError: props.onRefreshError,
                errorFallback: props.refreshErrorFallback
              });
            }}
            svgMarkup={flow.challenge?.imageOrText ?? ""}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="send-sms-captcha-input">
              图形验证码
            </label>
            <Input
              autoComplete="off"
              className="h-12"
              id="send-sms-captcha-input"
              onChange={(event) => flow.setCaptchaCode(event.target.value.toUpperCase())}
              placeholder="请输入图中字符"
              value={flow.captchaCode}
            />
          </div>

          {flow.isCaptchaExpired ? (
            <div className="text-xs text-destructive">图形验证码已过期，请点击上图刷新</div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              onClick={() => {
                props.onOpenChange(false);
              }}
              type="button"
              variant="outline"
            >
              取消
            </Button>
            <Button
              disabled={!canSubmit}
              onClick={() => {
                void props.onConfirmSend();
              }}
              type="button"
              variant="hero"
            >
              {flow.isSendingSms ? "发送中…" : "确认并发送短信"}
            </Button>
          </div>
        </SitePanelBody>
      </SitePanel>
    </div>
  );
}
