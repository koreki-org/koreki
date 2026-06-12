import type { NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { withSecurity, AuthenticatedRequest } from '@/lib/security';

export default withSecurity(async (req: AuthenticatedRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { action, model, numCtx, temp, topP, finalMaxTokens, systemPrompt, userPrompt, response } = req.body;
        const logData = {
            timestamp: new Date().toISOString(),
            action,
            model,
            numCtx,
            temp,
            topP,
            finalMaxTokens,
            systemPrompt,
            userPrompt,
            response
        };

        const targetDir = 'C:/Users/AndreasHeid/.gemini/antigravity/brain/bb0c5d00-7771-4c54-b284-1da4fd513f84/scratch';
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const logFilePath = path.join(targetDir, 'ollama-debug.json');
        
        let logs: any[] = [];
        if (fs.existsSync(logFilePath)) {
            try {
                const fileContent = fs.readFileSync(logFilePath, 'utf8');
                logs = JSON.parse(fileContent);
                if (!Array.isArray(logs)) logs = [];
            } catch (e) {
                logs = [];
            }
        }

        logs.push(logData);
        // Keep only last 10 logs to prevent file growth
        if (logs.length > 10) logs.shift();

        fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf8');

        console.log(`[CLIENT-DEBUG-LOG] Logged Ollama action: ${action} to ollama-debug.json`);
        res.status(200).json({ success: true });
    } catch (err: any) {
        console.error("Error writing debug log:", err);
        res.status(500).json({ error: err.message });
    }
});
