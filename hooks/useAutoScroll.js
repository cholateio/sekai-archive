import { useEffect, useRef } from 'react';

export function useAutoScroll(dependency) {
    const scrollRef = useRef(null);
    const bottomRef = useRef(null);
    const shouldAutoScrollRef = useRef(true);

    const handleScroll = () => {
        const container = scrollRef.current;
        if (!container) return;
        const { scrollTop, scrollHeight, clientHeight } = container;

        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
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
        if (shouldAutoScrollRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [dependency]);

    return { scrollRef, bottomRef };
}
