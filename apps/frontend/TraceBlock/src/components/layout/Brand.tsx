
import { Blocks } from "lucide-react";

interface BrandProps {
  compact?: boolean;
}

export default function Brand({ compact = false }: BrandProps) {
  return (
    <div className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white">
      <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-[#315cf5] text-white shadow-[0_4px_16px_rgba(49,92,245,0.28)]">
        <Blocks size={compact ? 18 : 21} strokeWidth={2.2} />
      </span>

      {!compact && (
        <span>
          Trace<span className="text-[#829cff]">Block</span>
        </span>
      )}
    </div>
  );
}
