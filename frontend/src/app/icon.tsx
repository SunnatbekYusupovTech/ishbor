import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/**
 * Generated favicon — mirrors the header logo mark (`components/dashboard/
 * TopHeader.tsx`'s `bg-brand` badge: rounded square, brand red, bold "ish").
 * No static asset needed; Next.js serves this at `/icon` and wires up the
 * favicon `<link>` automatically. Color is `--brand`'s light-mode value
 * (`app/globals.css`) hardcoded as a hex, since CSS variables aren't
 * available in this edge-rendered image context.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#d6001c',
          borderRadius: 7,
          color: '#fff',
          fontSize: 18,
          fontWeight: 900,
          fontFamily: 'sans-serif',
        }}
      >
        ish
      </div>
    ),
    { ...size },
  );
}
