/**
 * AI Logic Facade (Backward Compatibility Layer)
 * 
 * This file acts as a thin orchestrator for the modularized AI services.
 * All logic has been moved to src/lib/ai/ for better maintainability.
 */

export * from './ai/constants';
export * from './ai/prompt-builder';
export * from './ai/ocr-orchestrator';
export * from './ai/ai-orchestrator';
