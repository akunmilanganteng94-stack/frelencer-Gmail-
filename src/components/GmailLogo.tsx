export const AZGMAIL_LOGO_URL =
  'https://cdn.phototourl.com/free/2026-09-13-9663c7e6-c906-4989-97f1-ee3595406622.png';

export function AZGmailLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <img
      src={AZGMAIL_LOGO_URL}
      alt="AZGmail"
      className={`${className} object-contain`}
      referrerPolicy="no-referrer"
    />
  );
}

interface GmailLogoProps {
  className?: string;
  variant?: 'multicolor' | 'blue' | 'custom';
}

export function GmailBlueLogo({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gmail Blue Logo"
    >
      {/* Right Flap - Royal Blue */}
      <path
        d="M45 16.2V36C45 38.2 43.2 40 41 40H33V25.2L45 16.2Z"
        fill="#2563EB"
      />
      {/* Center Bottom - Deep Blue */}
      <path
        d="M33 40V25.2L24 18.4L15 25.2V40H33Z"
        fill="#1D4ED8"
      />
      {/* Left Flap - Dodger Blue */}
      <path
        d="M3 36V16.2L15 25.2V40H7C4.8 40 3 38.2 3 36Z"
        fill="#3B82F6"
      />
      {/* Center Envelope V - Indigo Blue */}
      <path
        d="M3 16.2C3 14.2 4.5 12.5 6.5 12.2C7.9 12 9.2 12.6 10 13.7L24 24.2L38 13.7C38.8 12.6 40.1 12 41.5 12.2C43.5 12.5 45 14.2 45 16.2V18L24 33.7L3 18V16.2Z"
        fill="#1E40AF"
      />
      {/* Top Flap - Sky Blue Highlight */}
      <path
        d="M33 8.2V25.2L45 16.2V12C45 9.8 43.2 8 41 8H33.2L33 8.2Z"
        fill="#60A5FA"
      />
    </svg>
  );
}

export function GmailLogo({ className = 'w-5 h-5', variant = 'multicolor' }: GmailLogoProps) {
  if (variant === 'custom') {
    return <AZGmailLogo className={className} />;
  }

  if (variant === 'blue') {
    return <GmailBlueLogo className={className} />;
  }

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Gmail Logo"
    >
      {/* Google Blue Right Flap */}
      <path
        d="M45 16.2V36C45 38.2 43.2 40 41 40H33V25.2L45 16.2Z"
        fill="#4285F4"
      />
      {/* Google Green Center Bottom */}
      <path
        d="M33 40V25.2L24 18.4L15 25.2V40H33Z"
        fill="#34A853"
      />
      {/* Google Yellow Left Flap */}
      <path
        d="M3 36V16.2L15 25.2V40H7C4.8 40 3 38.2 3 36Z"
        fill="#FBBC05"
      />
      {/* Google Red Center Envelope V */}
      <path
        d="M3 16.2C3 14.2 4.5 12.5 6.5 12.2C7.9 12 9.2 12.6 10 13.7L24 24.2L38 13.7C38.8 12.6 40.1 12 41.5 12.2C43.5 12.5 45 14.2 45 16.2V18L24 33.7L3 18V16.2Z"
        fill="#EA4335"
      />
      {/* Google Dark Red Top Flaps */}
      <path
        d="M33 8.2V25.2L45 16.2V12C45 9.8 43.2 8 41 8H33.2L33 8.2Z"
        fill="#C5221F"
      />
    </svg>
  );
}
