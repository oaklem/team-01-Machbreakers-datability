import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Small "?" icon next to a label that opens a plain-language explanation.
 * Designed for non-technical operations staff.
 */
export function InfoTip({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label ? `What does ${label} mean?` : "What does this mean?"}
          className="inline-flex items-center justify-center text-white/40 hover:text-sky-300 transition-colors"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs bg-[#0F1D33] border border-white/10 text-white/85 text-xs leading-relaxed"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}
