import { useEffect, useRef } from 'react';

export function useAutoScroll(dependency, isStreaming = false) {
    const scrollRef = useRef(null);
    const bottomRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);

    const handleScroll = () => {
        const container = scrollRef.current;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;

        const isNearBottom = scrollHeight - scrollTop - clientHeight < 250;
        shouldAutoScrollRef.current = isNearBottom;
    };

    useEffect(() => {
        const container = scrollRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, []);

    useEffect(() => {
        // 生成中採用 'auto' (瞬間跳到最底) 避免動畫堆疊導致斷層
        // 非生成狀態 (如第一次載入、切換對話) 維持 'smooth'
        bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }, [dependency, isStreaming]);

    return { scrollRef, bottomRef };
}
