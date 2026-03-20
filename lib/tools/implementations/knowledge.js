import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import { DebugLogger } from '@/lib/debug-utils';

const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function searchKnowledgeBase({ query }) {
    const logger = new DebugLogger('Tool/RAG');
    const startTime = performance.now();

    try {
        if (!query || query.trim() === '') {
            return '無效的查詢關鍵字，請重新評估使用者的問題。';
        }

        // 將使用者的 query 轉換為向量，維度預設為 1536
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;

        // 呼叫 Supabase RPC 進行向量相似度搜尋 (Vector Similarity Search)
        const { data: documents, error } = await supabaseClient.rpc('match_documents', {
            query_embedding: queryEmbedding,
            match_threshold: 0.35, // 相似度門檻，可依據實際測試結果微調 (範圍通常在 0.3 ~ 0.8)
            match_count: 5, // 最多抓取 5 個最相關的 Chunk，避免 context window 爆掉
        });
        if (error) {
            console.error('Supabase RPC Error:', error);
            return `系統資料庫查詢發生錯誤，無法檢索知識庫。詳細原因: ${error.message}`;
        }
        if (!documents || documents.length === 0) {
            // 如果沒撈到資料，必須回傳「非常明確」的指令給 LLM，防止它產生幻覺 (Hallucination)
            return '知識庫中沒有找到與此關鍵字相關的資料。請嘗試使用其他關鍵字重新搜尋，或者誠實告知使用者目前系統沒有這方面的資訊。';
        }

        // 將撈出來的內容組合成字串，並加上來源標籤方便 LLM 理解
        const formattedContext = documents
            .map((doc, index) => {
                // 假設你的資料表裡有 content 欄位，以及 metadata (用來存檔名或來源)
                const source = doc.metadata?.source || `Document-${index + 1}`;
                return `[來源: ${source}]\n${doc.content}\n`;
            })
            .join('\n---\n'); // 用分隔線隔開不同 Chunk

        logger.log(
            `RAG query took ${(performance.now() - startTime).toFixed(0)}ms, found ${documents.length} chunks.`,
            'success',
        );

        return `以下是從知識庫中檢索到的相關資訊：\n\n${formattedContext}`;
    } catch (error) {
        console.error('RAG Tool Exception:', error);
        return `搜尋工具發生未預期的系統錯誤：${error.message}。請告知使用者系統發生異常。`;
    }
}
