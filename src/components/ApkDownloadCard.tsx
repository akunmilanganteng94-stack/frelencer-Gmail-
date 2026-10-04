import { Download, ExternalLink, Smartphone } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export const APK_DEFAULT_DOWNLOAD_URL =
  'https://www.mediafire.com/file/35mid43yhsc7itc/Azgmail.apk/file';
export const APK_DOWNLOAD_URL = APK_DEFAULT_DOWNLOAD_URL;

interface ApkDownloadCardProps {
  variant?: 'banner' | 'compact' | 'simple';
  className?: string;
}

export function ApkDownloadCard({
  variant = 'banner',
  className = '',
}: ApkDownloadCardProps) {
  const { settings } = useSettings();
  const downloadUrl = settings.apkDownloadUrl || APK_DEFAULT_DOWNLOAD_URL;

  if (variant === 'compact') {
    return (
      <div
        className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-300/80 shadow-2xs ${className}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-slate-900 truncate">
                  Aplikasi Android (.APK)
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-600 text-white shrink-0">
                  Resmi
                </span>
              </div>
              <p className="text-[11px] text-slate-600 truncate mt-0.5">
                Lebih stabil, bebas zoom &amp; mudah di-refresh
              </p>
            </div>
          </div>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
            title="Download file APK azyx19"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download APK</span>
          </a>
        </div>
      </div>
    );
  }

  if (variant === 'simple') {
    return (
      <a
        href={downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
        <span>Versi APK Android</span>
        <Download className="w-3 h-3 text-emerald-600 ml-0.5" />
      </a>
    );
  }

  // Default 'banner' variant
  return (
    <div
      className={`relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0d9488] p-3.5 sm:p-4 text-white shadow-md border border-emerald-400/30 ${className}`}
    >
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-300/20 blur-xl pointer-events-none" />
      <div className="absolute -left-6 -top-6 w-28 h-28 rounded-full bg-teal-400/20 blur-lg pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-200" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black tracking-tight text-white truncate">
                Aplikasi Android azyx19 (.APK)
              </h3>
              <span className="px-2 py-0.2 rounded-full bg-emerald-300 text-emerald-950 font-black text-[9px] sm:text-[10px] tracking-wide uppercase shrink-0">
                Resmi
              </span>
            </div>
            <p className="text-[11px] text-emerald-100/90 truncate mt-0.5">
              Versi resmi azyx19 untuk Android &bull; Bebas kendala &amp; ringan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 group"
            title="Download APK di MediaFire / Link Admin"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700 group-hover:translate-y-0.5 transition-transform" />
            <span>Download APK</span>
            <ExternalLink className="w-3 h-3 text-emerald-600 opacity-60" />
          </a>
        </div>
      </div>
    </div>
  );
}
