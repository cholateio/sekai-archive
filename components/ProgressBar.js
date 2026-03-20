import { motion } from 'framer-motion';
import { useRanking } from '@/context/RankContext';
import { getEventProgress } from '@/lib/progress';

export default function ProgressBar() {
    const { event } = useRanking();
    const { percent, duration } = getEventProgress(event.start_at, event.aggregate_at);

    return (
        <div className="hidden w-64 lg:flex flex-col justify-center gap-2 pl-6 border-l border-white/10">
            <div className="flex justify-between items-center text-md font-mono text-gray-400 leading-none">
                <span>{duration}</span>
                <span>{percent}%</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full bg-linear-to-r from-green-500 to-emerald-300"
                />
            </div>
        </div>
    );
}
