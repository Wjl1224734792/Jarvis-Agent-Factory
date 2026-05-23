declare module "opentype.js" {
  interface Font {
    ascender: number;
    descender: number;
  }
  export function parse(buffer: Buffer): Font;
}

declare module "@zhennann/svg-captcha" {
  interface ConfigObject {
    font?: unknown;
    ascender?: number;
    descender?: number;
  }

  const svgCaptcha: {
    options: ConfigObject;
    create(options?: Record<string, unknown>): { data: string; text: string };
    default: typeof svgCaptcha;
  };

  export default svgCaptcha;
}
