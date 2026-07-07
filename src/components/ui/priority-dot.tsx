import { cn } from "@/lib/utils";
import { Priority, PRIORITY_CONFIG } from "@/types/types";

export function PriorityDot({ 
  priority, 
  className 
}: { 
  priority: Priority | string;
  className?: string;
}) {
  const config = PRIORITY_CONFIG[priority as Priority] || PRIORITY_CONFIG.medium;
  
  return (
    <div 
      className={cn("w-2 h-2 rounded-full shrink-0", className)} 
      style={{ backgroundColor: config.color }} 
      title={`Priority: ${config.label}`}
    />
  );
}
