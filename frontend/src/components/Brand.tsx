const LOGO_ALT = 'Thapar Institute of Engineering & Technology';

/** Official TIET wordmark. Use tone="white" on dark (ink) backgrounds. */
export function ThaparLogo({ tone = 'color', className = '' }: { tone?: 'color' | 'white'; className?: string }) {
  const src = tone === 'white' ? '/brand/thapar-logo-white.png' : '/brand/thapar-logo.png';
  return <img src={src} alt={LOGO_ALT} className={`brand-logo ${className}`} width={2042} height={356} />;
}

/** The red "ti" mark on its own, for tight spaces. */
export function ThaparMark({ className = '' }: { className?: string }) {
  return <img src="/brand/thapar-mark.png" alt="TIET" className={`brand-mark ${className}`} width={267} height={267} />;
}
