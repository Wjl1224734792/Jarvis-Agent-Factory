import { useEffect, useState } from "react";

async function generateShareQrDataUrl(shareUrl: string) {
  const { default: QRCode } = await import("qrcode");

  return QRCode.toDataURL(shareUrl, {
    width: 200,
    margin: 2,
    errorCorrectionLevel: "M"
  });
}

export function useShareQrDataUrl(
  shareUrl: string,
  enabled = true
): { dataUrl: string | null; error: boolean } {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!enabled || !shareUrl) {
      setDataUrl(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setError(false);
    setDataUrl(null);

    void generateShareQrDataUrl(shareUrl)
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, shareUrl]);

  return { dataUrl, error };
}
