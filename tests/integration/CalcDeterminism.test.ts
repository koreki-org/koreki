/**
 * @jest-environment node
 */
import { performAIRequest } from '../../src/lib/ai/ai-orchestrator';
import { extractStudentAST } from '../../src/lib/grading/calc-trace-extraction';
import { evaluateCalcTrace } from '../../src/lib/grading/CalcTrace';
import type { TargetGoal } from '../../src/lib/grading/calc-trace-types';
import type { AppSettings } from '../../src/types';

// Increase Jest timeout for LLM calls (5 mins)
jest.setTimeout(300000);

const ITERATIONS = 2;

interface TestCase {
  name: string;
  target: TargetGoal;
  studentText: string;
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Drehstromaufgabe (Perfect Answer)',
    target: {
      targetValue: [18750, 11250, 27.06, 230.94], // S, Q, I_L, U_P
      maxPoints: 8,
      unit: 'VA, var, A, V',
      gradingRubric: '2 Punkte pro korrekt errechnetem Zielwert (Formel + Ergebnis).'
    },
    studentText: `
U_L = 400 V, P = 15000 W, cos_phi = 0.8
S = P / cos_phi = 15000 / 0.8 = 18750 VA
Q = sqrt(S^2 - P^2) = sqrt(18750^2 - 15000^2) = 11250 var
I_L = P / (sqrt(3) * U_L * cos_phi) = 15000 / (sqrt(3) * 400 * 0.8) = 27.06 A
U_P = U_L / sqrt(3) = 400 / sqrt(3) = 230.94 V
I_P = I_L = 27.06 A
    `
  },
  {
    name: 'Reihenschaltung (Student with Unit Errors)',
    target: {
      targetValue: [6.5, 1.846, 7.38, 4.62], // Rges, I, U1, U2
      maxPoints: 12,
      unit: 'kOhm, mA, V, V',
      gradingRubric: 'a. Rges und I: je 1 P Formel, 1 P Werte einsetzen, 1 P Ergebnis. b. U1 und U2: je 1 P Formel, 1 P Werte einsetzen, 1 P Ergebnis.'
    },
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
  {
    name: 'Wasserkocher (Schüler 1 - Typo in Formula but correct value)',
    target: {
      targetValue: [2300, 0.1916, 0.0575], // P, W, Kosten
      maxPoints: 9,
      unit: 'W, kWh, €',
      gradingRubric: 'a. P: 3 Punkte. b. W: 3 Punkte. c. Kosten: 3 Punkte.'
    },
    studentText: `
1
a. P=U x Z = 23 V x 10 A = 2300 W
b. W = P x t = 2300 W x (5/60) h = 0,1916kWh 
c. Kosten= W x VE = 0,1916kWh×0,30€/kWh=0,0575€
    `
  },
  {
    name: 'Wasserkocher (Schüler 2 - Calculation Error)',
    target: {
      targetValue: [2300, 0.1916, 0.0575], // P, W, Kosten
      maxPoints: 9,
      unit: 'W, kWh, €',
      gradingRubric: 'a. P: 3 Punkte. b. W: 3 Punkte. c. Kosten: 3 Punkte.'
    },
    studentText: `
1a.
P=U x Z = 23 V x 10 A = 230 W
    `
  }
];

describe('CalcTrace Determinism Tests (Layer 2)', () => {
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
    } else {
      console.warn('No API Key found. The test will likely fail if it attempts to make a real call.');
    }

    // Option C+ - Deep Dive Test: Force temperature to 0.0 for partial grading without touching source code
    const originalFetch = global.fetch;
    global.fetch = async (url: RequestInfo | URL, options?: RequestInit) => {
      const urlString = url.toString();
      if ((urlString.includes('api.mistral.ai') || urlString.includes('openai')) && options && typeof options.body === 'string') {
        try {
          const body = JSON.parse(options.body);
          // Check if it's a grading request where the goal was not reached
          const isPartialGrading = body.messages?.some((m: any) => 
            typeof m.content === 'string' && m.content.includes('Endziel erreicht: NEIN')
          );
          
          if (isPartialGrading) {
            if (urlString.includes('api.mistral.ai')) {
               body.temperature = 0.0;
               body.random_seed = 42; // Mistral seed
               console.log(`🧪 [Option C+ Deep Dive] Intercepted fetch to ${urlString}: Forced temperature to 0.0 AND seed to 42!`);
            } else {
               body.temperature = 0.3; // Qwen needs min temp 0.3 for inference stability (prevents JSON crash)
               body.seed = 42; // OpenAI / Qwen seed
               console.log(`🧪 [Option C+ Deep Dive] Intercepted fetch to ${urlString}: Forced temperature to 0.3 (Qwen stability limit) AND seed to 42!`);
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

    it(`should deterministically evaluate: ${testCase.name}`, async () => {
      let firstResultString: string | null = null;
      let mismatches = 0;

      for (let i = 1; i <= ITERATIONS; i++) {
        // 1. Extract AST (Non-deterministic AI part)
        const targetGoal = testCase.target;
        const astResult = await extractStudentAST(testCase.studentText, 'PURE', settings, testCase.name);
        
        // Strict Assertion: If the AST is completely empty for a known good/bad test case, the LLM API call failed!
        expect(astResult).toBeDefined();
        expect(astResult.length).toBeGreaterThan(0);

        // 2. Evaluate (Deterministic Sandbox part)
        const result = evaluateCalcTrace(astResult, targetGoal);
        if (i === 1) savedCalcTraceResult = result;
        
        // 3. Hash/Stringify the core outputs
        const runSignature = JSON.stringify({
          isGoalReached: result.isGoalReached,
          sandboxErrors: result.sandboxErrors,
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
            mismatches++;
            console.error(`Mismatch in Run ${i}:\nBaseline: ${firstResultString}\nThis Run: ${runSignature}`);
          }
        }
      }

      // Assert that there are no mismatches across the N iterations
      expect(mismatches).toBe(0);
    });

    it(`should deterministically grade with Hybrid LLM (Phase 2): ${testCase.name}`, async () => {
      let firstPoints: number | null = null;
      let mismatches = 0;

      for (let i = 1; i <= ITERATIONS; i++) {
        const payload = {
          studentText: testCase.studentText,
          tasksLayout: [
            {
              name: testCase.name,
              maxPoints: testCase.target.maxPoints,
              calcTraceResult: savedCalcTraceResult
            }
          ]
        };

        const result = await performAIRequest('correction', payload, 'PURE', settings);
        const taskResult = result?.tasks?.[0];
        
        // Strict Assertion: If the API fails or returns no points, the test MUST fail!
        expect(taskResult?.pointsObtained).toBeDefined();
        expect(typeof taskResult?.pointsObtained).toBe('number');
        
        const awardedPoints = taskResult.pointsObtained;

        if (firstPoints === null) {
          firstPoints = awardedPoints;
          console.log(`\n--- [${testCase.name}] Phase 2: Hybrid LLM Grading ---`);
          console.log(`Iteration ${i}: ${awardedPoints}/${testCase.target.maxPoints} Punkte vergeben`);
          console.log(`Feedback: ${taskResult?.feedback || taskResult?.structuredReview || ''}`);
        } else {
          console.log(`Iteration ${i}: ${awardedPoints}/${testCase.target.maxPoints} Punkte vergeben`);
          if (awardedPoints !== firstPoints) {
            mismatches++;
            console.error(`Hybrid Mismatch in Run ${i}: Baseline was ${firstPoints}, this run gave ${awardedPoints}`);
          }
        }
      }

      console.log(`--------------------------------------------------`);
      expect(mismatches).toBe(0);
    });
  });
});
