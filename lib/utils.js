import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// 這是一個標準的 Tailwind class 合併工具
// 允許我們這樣用: cn("bg-blue-500", isError && "bg-red-500")
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
