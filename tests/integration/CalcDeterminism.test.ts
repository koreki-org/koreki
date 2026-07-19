/**
 * @jest-environment node
 */
import { performAIRequest } from '../../src/lib/ai/ai-orchestrator';
import { extractStudentAST } from '../../src/lib/grading/calc-trace-extraction';
import { evaluateCalcTrace } from '../../src/lib/grading/CalcTrace';
import type { TargetGoal } from '../../src/lib/grading/calc-trace-types';
import type { AppSettings } from '../../src/types';
import * as fs from 'fs';
import * as path from 'path';

let testReportMarkdown = `# Determinism Test Report\n\n**Date:** ${new Date().toISOString()}\n\n`;

// Increase Jest timeout for massive overnight LLM runs (20 mins)
jest.setTimeout(1200000);

const ITERATIONS = 5;

interface TestCase {
  name: string;
  target: TargetGoal;
  studentText: string;
  sampleSolution?: string;
  expectedPoints?: number;
}

const TEST_CASES: TestCase[] = [
//   {
//     name: 'Drehstromaufgabe (Perfect Answer)',
//     target: {
//       targetValue: [18750, 11250, 27.06, 230.94], // S, Q, I_L, U_P
//       maxPoints: 12,
//       unit: 'VA, var, A, V',
//       gradingRubric: 'S (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis. Q (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis. I_L (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis. U_P (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis.'
//     },
//     sampleSolution: `
// S = P / cos_phi = 15000 W / 0.8 = 18750 VA
// Q = sqrt(S^2 - P^2) = sqrt(18750^2 - 15000^2) = 11250 var
// I_L = P / (sqrt(3) * U_L * cos_phi) = 15000 / (sqrt(3) * 400 * 0.8) = 27.06 A
// U_P = U_L / sqrt(3) = 400 / sqrt(3) = 230.94 V
//     `,
//     expectedPoints: 12,
//     studentText: `
// U_L = 400 V, P = 15000 W, cos_phi = 0.8
// S = P / cos_phi = 15000 / 0.8 = 18750 VA
// Q = sqrt(S^2 - P^2) = sqrt(18750^2 - 15000^2) = 11250 var
// I_L = P / (sqrt(3) * U_L * cos_phi) = 15000 / (sqrt(3) * 400 * 0.8) = 27.06 A
// U_P = U_L / sqrt(3) = 400 / sqrt(3) = 230.94 V
// I_P = I_L = 27.06 A
//     `
//   },
  {
    name: 'Reihenschaltung (Student with Unit Errors)',
    target: {
      targetValue: [6.5, 1.846, 7.38, 4.62], // Rges, I, U1, U2
      maxPoints: 12,
      unit: 'kOhm, mA, V, V',
      gradingRubric: 'a. Rges und I: je 1 P Formel, 1 P Werte einsetzen, 1 P Ergebnis. b. U1 und U2: je 1 P Formel, 1 P Werte einsetzen, 1 P Ergebnis.',
      criteria: [
        { id: 'rges_formel', label: 'Formel für Rges korrekt', punktwert: 1, source: 'llm', targetIndex: 0 },
        { id: 'rges_werte', label: 'Werte für Rges einsetzen', punktwert: 1, source: 'llm', targetIndex: 0 },
        { id: 'rges_ergebnis', label: 'Ergebnis für Rges korrekt', punktwert: 1, source: 'proofB', targetIndex: 0 },
        { id: 'i_formel', label: 'Formel für I korrekt', punktwert: 1, source: 'llm', targetIndex: 1 },
        { id: 'i_werte', label: 'Werte für I einsetzen', punktwert: 1, source: 'llm', targetIndex: 1 },
        { id: 'i_ergebnis', label: 'Ergebnis für I korrekt', punktwert: 1, source: 'proofB', targetIndex: 1 },
        { id: 'u1_formel', label: 'Formel für U1 korrekt', punktwert: 1, source: 'llm', targetIndex: 2 },
        { id: 'u1_werte', label: 'Werte für U1 einsetzen', punktwert: 1, source: 'llm', targetIndex: 2 },
        { id: 'u1_ergebnis', label: 'Ergebnis für U1 korrekt', punktwert: 1, source: 'proofB', targetIndex: 2 },
        { id: 'u2_formel', label: 'Formel für U2 korrekt', punktwert: 1, source: 'llm', targetIndex: 3 },
        { id: 'u2_werte', label: 'Werte für U2 einsetzen', punktwert: 1, source: 'llm', targetIndex: 3 },
        { id: 'u2_ergebnis', label: 'Ergebnis für U2 korrekt', punktwert: 1, source: 'proofB', targetIndex: 3 }
      ]
    },
    sampleSolution: `
a.
Rges = R1 + R2 = 4 kΩ + 2.5 kΩ = 6.5 kΩ = 6500 Ω
I = U / Rges = 12 V / 6500 Ω = 0.001846 A = 1.846 mA
b.
U1 = I * R1 = 0.001846 A * 4000 Ω = 7.38 V
U2 = I * R2 = 0.001846 A * 2500 Ω = 4.62 V
    `,
    expectedPoints: 11,
    studentText: `
Aufgabe 1
a. 
R1 + R2 = 4 kΩ + 2,5 kΩ = 6500 Ω
I = U/R = 12 V / 6500 Ω = 0,001846 mA
 
b. 
U1 = I*R1= 4 kΩ*1,846*10^-3 A = 7,38 V
U2 = I*R2= 2,5 kΩ*1,846 mA = 4,62 V
    `
  },
//   {
//     name: 'Wasserkocher (Schüler 1 - Typo in Formula but correct value)',
//     target: {
//       targetValue: [2300, 0.1916, 0.0575], // P, W, Kosten
//       maxPoints: 9,
//       unit: 'W, kWh, €',
//       gradingRubric: 'a. P (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis. b. W (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis. c. Kosten (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis.',
//       criteria: [
//         { id: 'p_formel', label: 'Formel für P', punktwert: 1, source: 'llm', targetIndex: 0 },
//         { id: 'p_werte', label: 'Werte für P einsetzen', punktwert: 1, source: 'llm', targetIndex: 0 },
//         { id: 'p_ergebnis', label: 'Ergebnis für P', punktwert: 1, source: 'proofB', targetIndex: 0 },
//         { id: 'w_formel', label: 'Formel für W', punktwert: 1, source: 'llm', targetIndex: 1 },
//         { id: 'w_werte', label: 'Werte für W einsetzen', punktwert: 1, source: 'llm', targetIndex: 1 },
//         { id: 'w_ergebnis', label: 'Ergebnis für W', punktwert: 1, source: 'proofB', targetIndex: 1 },
//         { id: 'kosten_formel', label: 'Formel für Kosten', punktwert: 1, source: 'llm', targetIndex: 2 },
//         { id: 'kosten_werte', label: 'Werte für Kosten einsetzen', punktwert: 1, source: 'llm', targetIndex: 2 },
//         { id: 'kosten_ergebnis', label: 'Ergebnis für Kosten', punktwert: 1, source: 'proofB', targetIndex: 2 }
//       ]
//     },
//     sampleSolution: `
// a. P = U * I = 230 V * 10 A = 2300 W
// b. W = P * t = 2300 W * (5/60) h = 0.1916 kWh
// c. Kosten = W * Preis = 0.1916 kWh * 0.30 €/kWh = 0.0575 €
//     `,
//     expectedPoints: 7,
//     studentText: `
// 1
// a. P=U x Z = 23 V x 10 A = 2300 W
// b. W = P x t = 2300 W x (5/60) h = 0,1916kWh 
// c. Kosten= W x VE = 0,1916kWh×0,30€/kWh=0,0575€
//     `
//   },
//   {
//     name: 'Wasserkocher (Schüler 2 - Calculation Error)',
//     target: {
//       targetValue: [2300, 0.1916, 0.0575], // P, W, Kosten
//       maxPoints: 9,
//       unit: 'W, kWh, €',
//       gradingRubric: 'a. P (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis. b. W (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis. c. Kosten (3 Pkt): 1 P Formel, 1 P korrekt einsetzen, 1 P korrektes Ergebnis.',
//       criteria: [
//         { id: 'p_formel', label: 'Formel für P', punktwert: 1, source: 'llm', targetIndex: 0 },
//         { id: 'p_werte', label: 'Werte für P einsetzen', punktwert: 1, source: 'llm', targetIndex: 0 },
//         { id: 'p_ergebnis', label: 'Ergebnis für P', punktwert: 1, source: 'proofB', targetIndex: 0 },
//         { id: 'w_formel', label: 'Formel für W', punktwert: 1, source: 'llm', targetIndex: 1 },
//         { id: 'w_werte', label: 'Werte für W einsetzen', punktwert: 1, source: 'llm', targetIndex: 1 },
//         { id: 'w_ergebnis', label: 'Ergebnis für W', punktwert: 1, source: 'proofB', targetIndex: 1 },
//         { id: 'kosten_formel', label: 'Formel für Kosten', punktwert: 1, source: 'llm', targetIndex: 2 },
//         { id: 'kosten_werte', label: 'Werte für Kosten einsetzen', punktwert: 1, source: 'llm', targetIndex: 2 },
//         { id: 'kosten_ergebnis', label: 'Ergebnis für Kosten', punktwert: 1, source: 'proofB', targetIndex: 2 }
//       ]
//     },
//     sampleSolution: `
// a. P = U * I = 230 V * 10 A = 2300 W
// b. W = P * t = 2300 W * (5/60) h = 0.1916 kWh
// c. Kosten = W * Preis = 0.1916 kWh * 0.30 €/kWh = 0.0575 €
//     `,
//     expectedPoints: 0,
//     studentText: `
// 1a.
// P=U x Z = 23 V x 10 A = 230 W
//     `
//   }
];

const isCI = process.env.CI === 'true' || !!process.env.GITHUB_ACTIONS;
const describeFn = isCI ? describe.skip : describe;

describeFn('CalcTrace Determinism Tests (Layer 2)', () => {
  let settings: any = {};

  beforeAll(() => {
    // Configure provider based on local .env
    const openaiKey = process.env.OPENAI_API_KEY || process.env.MITTWALD_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;

    const providerOverride = process.env.KOREKI_TEST_PROVIDER;

    if (providerOverride === 'mistral' || (!providerOverride && mistralKey)) {
      settings = { provider: 'mistral', mistralKey };
      console.log('🧪 Using Provider: MISTRAL');
    } else if (providerOverride === 'qwen' || (!providerOverride && openaiKey)) {
      settings = {
        provider: 'openai-compatible',
        openaiKey,
        openaiModel: process.env.OPENAI_API_MODEL || 'qwen2.5-72b-instruct',
        openaiUrl: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1'
      };
      console.log(`🧪 Using Provider: QWEN (OpenAI Compatible) - Model: ${settings.openaiModel}`);
    } else if (providerOverride === 'ollama') {
      settings = {
        provider: 'ollama',
        ollamaUrl: process.env.OLLAMA_API_BASE || 'http://192.168.250.12:11434',
        ollamaModel: process.env.OLLAMA_API_MODEL || 'qwen3.6:35b',
        ollamaNumCtx: Number(process.env.OLLAMA_NUM_CTX) || 32768 // Configurable context size (defaults to 32k)
      };
      console.log(`🧪 Using Provider: OLLAMA - Model: ${settings.ollamaModel} at ${settings.ollamaUrl}`);
    } else {
      console.warn('No API Key found. The test will likely fail if it attempts to make a real call.');
    }

    // Option C+ - Deep Dive Test: Force temperature to 0.0 for partial grading without touching source code
    const originalFetch = global.fetch;
    global.fetch = async (url: RequestInfo | URL, options?: RequestInit) => {
      const urlString = url.toString();
      if (urlString.includes('/api/billing/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok' })
        } as Response);
      }
      if ((urlString.includes('api.mistral.ai') || urlString.includes('openai') || urlString.includes('11434') || urlString.includes('192.168.250.12') || urlString.includes('api/chat')) && options && typeof options.body === 'string') {
        try {
          const body = JSON.parse(options.body);
          // Check if it's a grading request (legacy or structured criteria)
          const isGradingRequest = body.messages?.some((m: any) => 
            typeof m.content === 'string' && (
              m.content.includes('Endziel erreicht') || 
              m.content.includes('NICHT ERFÜLLT') || 
              m.content.includes('STRUKTURIERTE BEWERTUNGSKRITERIEN') ||
              m.content.includes('Du bist ein erfahrener Lehrer') ||
              m.content.includes('Klassenarbeit')
            )
          );
          
          if (isGradingRequest) {
            if (urlString.includes('api.mistral.ai')) {
               body.temperature = 0.0;
               body.random_seed = 42; // Mistral seed
               
               // MoE Determinism Shield (Research Agent Findings & User Request)
               body.model = 'mistral-medium-2604'; // Pin exactly to the math-optimized medium model
               body.top_p = 1.0;
               body.presence_penalty = 0.0;
               body.frequency_penalty = 0.0;
               body.safe_prompt = false; // Disable legacy guardrails
               
               console.log(`🧪 [Option C+ Deep Dive] Intercepted fetch to ${urlString}: Applied MoE Determinism Shield (Temp 0.0, Seed 42, Pinned Model: mistral-medium-2604)`);
            } else if (urlString.includes('openai')) {
               body.temperature = 0.3; // Qwen needs min temp 0.3 for inference stability (prevents JSON crash)
               body.seed = 42; // OpenAI / Qwen seed
               console.log(`🧪 [Option C+ Deep Dive] Intercepted fetch to ${urlString}: Forced temperature to 0.3 (Qwen stability limit) AND seed to 42!`);
            } else { // Ollama
               body.options = body.options || {};
               body.options.temperature = 0.3;
               body.options.seed = 42;
               console.log(`🧪 [Option C+ Deep Dive] Intercepted fetch to Ollama ${urlString}: Forced options.temperature to 0.3 AND options.seed to 42!`);
            }
            options.body = JSON.stringify(body);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
      return originalFetch(url, options);
    };
  });

  TEST_CASES.forEach(testCase => {
    let savedCalcTraceResult: any = null;
    let phase1Mismatches = 0;
    let phase2Mismatches = 0;
    let phase1MismatchDetails: string[] = [];
    let phase2MismatchDetails: string[] = [];

    it(`should deterministically evaluate: ${testCase.name}`, async () => {
      let firstResultString: string | null = null;
      phase1Mismatches = 0;

      for (let i = 1; i <= ITERATIONS; i++) {
        // 1. Extract AST (LLM part) with retry for local Ollama crashes
        let astResult;
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
          astResult = await extractStudentAST(testCase.studentText, 'PURE', settings, testCase.name);
          if (astResult && astResult.length > 0) {
            break; // Success!
          }
          attempts++;
          console.warn(`[Ollama Crash Defense] Iteration ${i} - Attempt ${attempts}: Empty response from Ollama. Retrying in 15 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
        }

        // Strict Assertion: If the AST is completely empty after all retries, the LLM API call fatally failed!
        expect(astResult).toBeDefined();
        expect(astResult?.length).toBeGreaterThan(0);

        // 2. Evaluate (Deterministic Sandbox part)
        const result = evaluateCalcTrace(astResult, testCase.target);
        if (i === 1) savedCalcTraceResult = result;
        
        const runSignature = JSON.stringify({
          isGoalReached: result.isGoalReached,
          reachedTargets: result.reachedTargets,
          missedTargets: result.missedTargets,
          unitMismatch: result.unitMismatch
        });

        if (firstResultString === null) {
          firstResultString = runSignature;
          
          // Log output during the first iteration to make it visible to the user
          console.log(`\n--- [${testCase.name}] Sandbox Output ---`);
          console.log(`Goal Reached: ${result.isGoalReached ? '✅ Yes' : '❌ No'}`);
          console.log(`Targets Reached: ${JSON.stringify(result.reachedTargets)}`);
          if (result.missedTargets.length > 0) console.log(`Missed Targets: ${JSON.stringify(result.missedTargets)}`);
          if (result.unitMismatch) console.log(`Unit Mismatch detected (Physics equivalent, but wrong student unit/prefix).`);
          if (result.sandboxErrors.length > 0) console.log(`Sandbox Errors: ${JSON.stringify(result.sandboxErrors)}`);
          console.log(`--------------------------------------`);
          
        } else {
          if (runSignature !== firstResultString) {
            phase1Mismatches++;
            console.error(`Mismatch in Run ${i}:\nBaseline: ${firstResultString}\nThis Run: ${runSignature}`);
            phase1MismatchDetails.push(`**Run ${i} Mismatch:**\n- Baseline: \`${firstResultString}\`\n- This Run: \`${runSignature}\``);
          }
        }
      }

      // Assert that there are no mismatches across the N iterations
      expect(phase1Mismatches).toBe(0);
    });

    it(`should deterministically grade with Hybrid LLM (Phase 2): ${testCase.name}`, async () => {
      let firstPoints: number | null = null;
      phase2Mismatches = 0;

      for (let i = 1; i <= ITERATIONS; i++) {
        
        const payload = {
          studentText: testCase.studentText,
          modelSolution: testCase.sampleSolution,
          tasksLayout: [
            {
              name: testCase.name,
              maxPoints: testCase.target.maxPoints,
              gradingRubric: testCase.target.gradingRubric,
              targetGoal: testCase.target,
              calcTraceResult: savedCalcTraceResult
            }
          ]
        };

        let result;
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
          result = await performAIRequest('correction', payload, 'PURE', settings);
          const taskResult = result?.tasks?.[0];
          if (taskResult && typeof taskResult.pointsObtained === 'number') {
            break; // Success!
          }
          attempts++;
          console.warn(`[Ollama Crash Defense] Phase 2 Iteration ${i} - Attempt ${attempts}: Empty or invalid response from Ollama. Retrying in 15 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 15000));
        }

        const taskResult = result?.tasks?.[0];
        
        // Strict Assertion: If the API fails or returns no points after all retries, the test MUST fail!
        expect(taskResult?.pointsObtained).toBeDefined();
        expect(typeof taskResult?.pointsObtained).toBe('number');
        
        const awardedPoints = taskResult.pointsObtained;

        if (firstPoints === null) {
          firstPoints = awardedPoints;
          console.log(`\n--- [${testCase.name}] Phase 2: Hybrid LLM Grading ---`);
          console.log(`Iteration ${i}: ${awardedPoints}/${testCase.target.maxPoints} Punkte vergeben`);
          console.log(`Correction Notes: ${taskResult?.correctionNotes || ''}`);
          console.log(`Feedback: ${taskResult?.feedback || taskResult?.structuredReview || ''}`);
        } else {
          console.log(`Iteration ${i}: ${taskResult.pointsObtained}/${testCase.target.maxPoints} Punkte vergeben`);
          console.log(`Correction Notes: ${taskResult?.correctionNotes || ''}`);
          
          // (Moved assertion outside the loop so we always run 5 iterations)
          
          if (awardedPoints !== firstPoints) {
            phase2Mismatches++;
            console.error(`Hybrid Mismatch in Run ${i}: Baseline was ${firstPoints}, this run gave ${awardedPoints}`);
            phase2MismatchDetails.push(`**Run ${i} Mismatch:** Baseline: ${firstPoints} points, This Run: ${awardedPoints} points.`);
          }
        }
      }

      console.log(`--------------------------------------------------`);
      
      // Append to Report
      testReportMarkdown += `## Task: ${testCase.name}\n\n`;
      testReportMarkdown += `### Phase 1 (AST Extraction & Sandbox)\n`;
      testReportMarkdown += `- Iterations: ${ITERATIONS}\n`;
      testReportMarkdown += `- Mismatches: **${phase1Mismatches}**\n`;
      if (phase1Mismatches > 0) {
        testReportMarkdown += `\n**Details:**\n${phase1MismatchDetails.join('\n\n')}\n`;
      }
      
      testReportMarkdown += `\n### Phase 2 (Hybrid LLM Grading)\n`;
      testReportMarkdown += `- Iterations: ${ITERATIONS}\n`;
      testReportMarkdown += `- Mismatches: **${phase2Mismatches}**\n`;
      if (phase2Mismatches > 0) {
        testReportMarkdown += `\n**Details:**\n${phase2MismatchDetails.join('\n\n')}\n`;
      }
      testReportMarkdown += `\n---\n\n`;

      expect(phase2Mismatches).toBe(0);

      if (testCase.expectedPoints !== undefined) {
         expect(firstPoints).toBe(testCase.expectedPoints);
      }
    });
  });

  afterAll(() => {
    const reportPath = path.join(process.cwd(), 'determinism-report-latest.md');
    fs.writeFileSync(reportPath, testReportMarkdown);
    console.log(`\n📄 Detailed Markdown report written to: ${reportPath}`);
  });
});
