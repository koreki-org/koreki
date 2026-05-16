import { encodeFeedback, decodeFeedback, parseStatus, FeedbackData } from '../../src/lib/distribution';

describe('Distribution Logic (Layer 1)', () => {
    const mockFeedback: FeedbackData = {
        studentName: 'Max Mustermann',
        date: '16.05.2026',
        overallFeedback: 'Gute Arbeit!',
        points: 18,
        maxPoints: 20,
        pin: '1234',
        tasks: [
            { id: 'A1', feedback: '[r] Alles richtig.', points: 5, maxPoints: 5 },
            { id: 'A2', feedback: '[f] Kleiner Fehler.', points: 3, maxPoints: 5 }
        ]
    };

    test('should encode and decode feedback data correctly', () => {
        const encoded = encodeFeedback(mockFeedback);
        expect(typeof encoded).toBe('string');
        expect(encoded.length).toBeGreaterThan(0);

        const decoded = decodeFeedback(encoded);
        expect(decoded).toEqual(mockFeedback);
    });

    test('should return null for invalid encoded strings', () => {
        expect(decodeFeedback('')).toBeNull();
        expect(decodeFeedback('invalid-base64-random-stuff')).toBeNull();
    });

    test('should parse status tags correctly', () => {
        expect(parseStatus('[r] Richtig')).toEqual({ status: 'r', cleanText: 'Richtig' });
        expect(parseStatus('[f] Falsch')).toEqual({ status: 'f', cleanText: 'Falsch' });
        expect(parseStatus('[Ff] Folgefehler')).toEqual({ status: 'Ff', cleanText: 'Folgefehler' });
        expect(parseStatus('Kein Tag')).toEqual({ cleanText: 'Kein Tag' });
    });

    test('should maintain data integrity including PIN and points', () => {
        const encoded = encodeFeedback(mockFeedback);
        const decoded = decodeFeedback(encoded);
        
        expect(decoded?.pin).toBe('1234');
        expect(decoded?.points).toBe(18);
        expect(decoded?.maxPoints).toBe(20);
        expect(decoded?.tasks[0].points).toBe(5);
    });
});
