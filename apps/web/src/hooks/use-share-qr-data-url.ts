import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function useShareQrDataUrl(shareUrl: string): { dataUrl: string | null; error: boolean } {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!shareUrl) {
      setDataUrl(null);
      setError(false);
      return;
    }

    let cancelled = false;
    setError(false);
    setDataUrl(null);

    void QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: "M"
    })
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
  }, [shareUrl]);

  return { dataUrl, error };
}
