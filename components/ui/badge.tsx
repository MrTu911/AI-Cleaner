// ai_data_cleanerv2/app/components/ui/badge.tsx

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils"; // 👉 hàm cn để merge className

// 📌 Định nghĩa style cho Badge với class-variance-authority
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground border-transparent",
        secondary: "bg-secondary text-secondary-foreground border-transparent",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// 📌 Interface Props: mở rộng thêm `className` để fix lỗi bạn gặp
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

// 📌 Component Badge
function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)} // 👉 Merge className tùy chỉnh
      {...props}
    />
  );
}

export { Badge, badgeVariants };
