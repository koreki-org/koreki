import { 
  buildCorrectionPrompt, 
  parseCorrectionResult, 
  buildCleanAndAnalyzePrompt, 
  buildCleanAndMapPrompt,
  performOCRRequest,
  performAIRequest
} from '../../src/lib/ai-logic';
import { createTask } from '../../src/test/factories';
import { AIProviderError } from '../../src/lib/ai/provider-error';

// Mock fetch
global.fetch = jest.fn();

describe('AI Logic tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });


  describe('buildCorrectionPrompt', () => {
    it('should replace placeholders in prompt template', () => {
      const prompt = buildCorrectionPrompt('Muster', 'Schüler');
      expect(prompt.user).toContain('Muster');
      expect(prompt.user).toContain('Schüler');
    });

    it('should include tasksLayout if provided', () => {
      const tasks = [createTask({ name: 'Mathe 1', maxPoints: 5 })];
      const prompt = buildCorrectionPrompt('Muster', 'Schüler', tasks);
      expect(prompt.system).toContain('Mathe 1');
      expect(prompt.system).toContain('5');
    });

    it('should include expert instructions if customPrompt is provided', () => {
      const prompt = buildCorrectionPrompt('Muster', 'Schüler', null, 'Sei streng.');
      expect(prompt.system).toContain('Sei streng.');
    });
  });

  describe('parseCorrectionResult', () => {
    it('should map AI result tasks back to layout order', () => {
      const layout = [
        createTask({ name: 'Aufgabe 1', maxPoints: 10 }),
        createTask({ name: 'Aufgabe 2', maxPoints: 5 })
      ];
      const aiResult = {
        tasks: [
          { name: 'Aufgabe 2', pointsObtained: 3, feedback: 'Okay' },
          { name: 'Aufgabe 1', pointsObtained: 8, feedback: 'Gut' }
        ],
        confidence: 0.9
      };

      const final = parseCorrectionResult(aiResult, layout);
      expect(final.tasks[0].name).toBe('Aufgabe 1');
      expect(final.tasks[0].pointsObtained).toBe(8);
      expect(final.tasks[1].name).toBe('Aufgabe 2');
      expect(final.tasks[1].pointsObtained).toBe(3);
      expect(final.overallMatchPercentage).toBe((11/15)*100);
    });

    it('should calculate match percentage even without layout', () => {
        const aiResult = {
            tasks: [
                { name: 'Aufgabe 1', pointsObtained: 5, maxPoints: 10 },
                { name: 'Aufgabe 2', pointsObtained: 5, maxPoints: 10 }
            ]
        } as any;
        const final = parseCorrectionResult(aiResult);
        expect(final.overallMatchPercentage).toBe(50);
    });

    describe('Industrial Grade: AI Integrity & Error Validation', () => {
      
      it('should apply Marker Penalty: cap individual confidence at 89 if content contains (?)', () => {
        const layout = [createTask({ name: 'Aufgabe 1', maxPoints: 10 })];
        const aiResult = {
          tasks: [{ name: 'Aufgabe 1', pointsObtained: 5, content: 'Hier ist unsicherer Text (?)', confidence: 95 }],
          confidence: 0.9
        };

        const final = parseCorrectionResult(aiResult, layout);
        expect(final.tasks[0].confidence).toBe(89);
        expect(final.confidence).toBe(0); // Marker Penalty triggers overall brake
      });

      it('should trigger Confidence Brake (overall confidence 0) on Hard Mapping Error (missing task)', () => {
        const layout = [
          createTask({ name: 'Aufgabe 1' }),
          createTask({ name: 'Aufgabe 2' })
        ];
        const aiResult = {
          tasks: [{ name: 'Aufgabe 1', pointsObtained: 10, confidence: 100 }],
          confidence: 1.0
        };

        const final = parseCorrectionResult(aiResult, layout);
        expect(final.tasks[1].feedback).toContain('Vom System nicht erkannt');
        expect(final.confidence).toBe(0); // Structural error!
      });

      it('should handle Soft Mapping Error (Near Miss) with a warning but keep confidence', () => {
        const layout = [createTask({ name: 'Mathematik 1' })];
        const aiResult = {
          tasks: [{ name: 'mathematik 1', pointsObtained: 10, confidence: 98 }],
          confidence: 0.98
        };

        const final = parseCorrectionResult(aiResult, layout);
        expect(final.tasks[0].name).toBe('Mathematik 1'); // Realigned
        expect(final.tasks[0].feedback).toContain('[KI-FEHLER?] Name nicht exakt');
        expect(final.confidence).toBe(0.98); // No brake for case mismatch
      });

    });
  });

  describe('buildCleanAndAnalyzePrompt', () => {
    it('should contain model solution', () => {
        expect(buildCleanAndAnalyzePrompt('Test').user).toContain('Test');
    });
  });

  describe('buildCleanAndMapPrompt', () => {
    it('should contain tasks layout names', () => {
        const tasks = [createTask({ name: 'Bio' }), createTask({ name: 'Chemie' })];
        const prompt = buildCleanAndMapPrompt('Schülertext', tasks);
        expect(prompt.user).toContain('- Bio (10 P)');
        expect(prompt.user).toContain('- Chemie (10 P)');
        expect(prompt.user).toContain('Schülertext');
    });
  });

  describe('performOCRRequest orchestration', () => {
    it('should handle TRIAL mode (behaves like STANDARD for now)', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ text: 'Trial Result' })
        });

        const res = await performOCRRequest('base64data', 'application/pdf', false, 'TRIAL', { provider: 'mistral', mistralKey: '' });
        expect(res).toBe('Trial Result');
        expect(global.fetch).toHaveBeenCalledWith('/api/extract-image', expect.anything());
    });

    it('should throw error if PURE_KEY_MISSING in PURE mode', async () => {
        await expect(performOCRRequest('b64', 'mime', false, 'PURE', { provider: 'mistral', mistralKey: '' }))
            .rejects.toThrow('PURE_KEY_MISSING');
    });

    it('should throw error if OPENAI_KEY_MISSING in PURE mode', async () => {
        await expect(performOCRRequest('b64', 'mime', false, 'PURE', { provider: 'openai-compatible', openaiKey: '' }))
            .rejects.toThrow('OPENAI_KEY_MISSING');
    });

    it('should process OCR via OpenAI provider in PURE mode', async () => {
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'OpenAI OCR Result' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 5 }
                })
            })
            .mockResolvedValueOnce({ ok: true }); // Billing sync

        const res = await performOCRRequest('b64data', 'image/png', false, 'PURE', {
            provider: 'openai-compatible',
            openaiKey: 'custom-op-key',
            openaiUrl: 'https://api.openai.com/v1',
            openaiModel: 'gpt-4o'
        });

        expect(res).toBe('OpenAI OCR Result');
        expect(global.fetch).toHaveBeenCalledTimes(2);
        const ocrCall = (global.fetch as jest.Mock).mock.calls[0];
        expect(ocrCall[0]).toContain('https://api.openai.com/v1/chat/completions');
        const ocrBody = JSON.parse(ocrCall[1].body);
        expect(ocrBody.model).toBe('gpt-4o');
        expect(ocrBody.messages[1].content[1].image_url.url).toContain('data:image/png;base64,b64data');
    });

    it('should throw AIProviderError if Mistral OCR response is not ok', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({ error: { message: 'Api Fail' } })
        });
        const promise = performOCRRequest('b64', 'mime', false, 'PURE', { provider: 'mistral', mistralKey: 'key' } as any);
        await expect(promise).rejects.toBeInstanceOf(AIProviderError);
        await expect(promise).rejects.toMatchObject({ upstreamStatus: 401, upstreamDetail: 'Api Fail' });
    });

    it('should handle multiple PDF pages with throttling', async () => {
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ pages: [{ markdown: 'Page' }] })
        });

        const res = await performOCRRequest(['P1', 'P2'], 'pdf', false, 'PURE', { provider: 'mistral', mistralKey: 'key' });
        expect(res).toBe('Page\n\nPage');
        expect(global.fetch).toHaveBeenCalledTimes(3); // 2 OCR calls + 1 Billing call
    });

    it('should process multiple image buffers sequentially (from redacted source)', async () => {
        // Mock individual page results
        (global.fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => ({ pages: [{ markdown: 'Content 1' }] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ pages: [{ markdown: 'Content 2' }] }) })
            .mockResolvedValueOnce({ ok: true }); // Billing sync

        const res = await performOCRRequest(['BUF_A', 'BUF_B'], 'image/jpeg', true, 'PURE', { provider: 'mistral', mistralKey: 'key' });
        
        expect(res).toBe('Content 1\n\nContent 2');
        expect(global.fetch).toHaveBeenCalledTimes(3);
        // Verify correct buffer was sent in first call (Mistral OCR Structure)
        const firstCallBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
        expect(firstCallBody.document.document_url).toContain('BUF_A');
    });
  });

  describe('performAIRequest orchestration', () => {
    it('should handle clean-and-analyze action', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: JSON.stringify({ layout: [] }) } }]
            })
        });
        const res = await performAIRequest('clean-and-analyze', { modelSolution: 'A' }, 'PURE', { provider: 'mistral', mistralKey: 'key' });
        expect(res).toEqual({ layout: [] });
    });

    it('should handle clean-and-map action', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: JSON.stringify({ mapping: {} }) } }]
            })
        });
        const res = await performAIRequest('clean-and-map', { text: 'A', tasksLayout: [] }, 'PURE', { provider: 'mistral', mistralKey: 'key' });
        expect(res).toEqual({ mapping: {}, tasks: [] });
    });

    it('should throw Error on invalid JSON from Mistral', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: 'This is not JSON' } }]
            })
        });
        await expect(performAIRequest('correction', { modelSolution: 'A' }, 'PURE', { provider: 'mistral', mistralKey: 'key' }))
            .rejects.toThrow('KI-Antwort konnte nicht als JSON verarbeitet werden.');
    });

    it('should handle STANDARD mode for correction', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            // The server runs parseCorrectionResult (incl. Zod normalization) before responding,
            // so the client receives a fully normalized AIAnalysisResult with overallMatchPercentage.
            json: async () => ({ tasks: [], overallMatchPercentage: 0 })
        });
        const res = await performAIRequest('correction', { modelSolution: 'A' }, 'STANDARD', { provider: 'mistral', mistralKey: '' });
        expect(res).toEqual({ tasks: [], overallMatchPercentage: 0 });
        expect(global.fetch).toHaveBeenCalledWith('/api/ai-correct', expect.anything());
    });
  });

  describe('prompt migration logic', () => {
    it('should ignore old huge default prompts', () => {
        const oldHuge = 'Du bist ein erfahrener Lehrer... [LONG TEXT]';
        const prompt = buildCorrectionPrompt('Muster', 'Schüler', null, oldHuge);
        // Should not contain the old huge part if the migration logic works
        expect(prompt.system).not.toContain('ZUSÄTZLICHE PÄDAGOGISCHE ANWEISUNG');
    });
  });
});
