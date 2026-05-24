import { formatPluginFeedback } from '../../src/lib/grading/feedback-formatter';
import { GradingResult, GradingGraph } from '../../src/lib/grading/types';

describe('Feedback Formatter (Layer 1 Unit)', () => {
  it('should return null if gradingResult is null or empty', () => {
    const res = formatPluginFeedback('vlsm', null as any);
    expect(res).toBeNull();
  });

  it('should return null for general task types without graph details', () => {
    const gradingResult: GradingResult = {
      taskId: 'general-task',
      totalPoints: 5,
      maxPoints: 5,
      stepResults: []
    };
    const res = formatPluginFeedback('general', gradingResult);
    expect(res).toBeNull();
  });

  it('should generate a beautiful GFM table for VLSM by taskType', () => {
    const gradingGraph: GradingGraph = {
      taskId: 'task-vlsm',
      discipline: 'computer-science-networking',
      variables: []
    };

    const gradingResult: GradingResult = {
      taskId: 'task-vlsm',
      totalPoints: 2,
      maxPoints: 3,
      stepResults: [
        {
          variableId: 'subnet_a_netid',
          status: 'correct',
          expectedValue: '192.168.1.0',
          studentValue: '192.168.1.0',
          computedValueBasedOnErrors: '192.168.1.0',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'subnet_a_mask',
          status: 'consecutive_correct',
          expectedValue: '/25',
          studentValue: '/25',
          computedValueBasedOnErrors: '/25',
          points: 1,
          maxPoints: 1,
          note: 'Folgefehler OK'
        },
        {
          variableId: 'subnet_a_broadcast',
          status: 'primary_error',
          expectedValue: '192.168.1.127',
          studentValue: '192.168.1.128',
          computedValueBasedOnErrors: '192.168.1.127',
          points: 0,
          maxPoints: 1,
          note: 'Fehlerhaft'
        }
      ]
    };

    const feedback = formatPluginFeedback('skill-calc-vlsm', gradingResult, gradingGraph);
    expect(feedback).not.toBeNull();
    expect(feedback).toContain('[⚙️ AGS Engine - Mathematischer VLSM Abgleich]');
    expect(feedback).toContain('| Subnetz | Netz-ID | Maske | Erste nutzbare IP | Letzte nutzbare IP | Broadcast | Gateway |');
    expect(feedback).toContain('| **Subnetz A** | 192.168.1.0 [r] | /25 [FF] | - | - | 192.168.1.128 [f] *(Erw: 192.168.1.127)* | - |');
  });

  it('should format missing values as "fehlt"', () => {
    const gradingGraph: GradingGraph = {
      taskId: 'task-vlsm',
      discipline: 'computer-science-networking',
      variables: []
    };

    const gradingResult: GradingResult = {
      taskId: 'task-vlsm',
      totalPoints: 0,
      maxPoints: 1,
      stepResults: [
        {
          variableId: 'subnet_b_netid',
          status: 'primary_error',
          expectedValue: '10.0.0.0',
          studentValue: undefined,
          computedValueBasedOnErrors: '10.0.0.0',
          points: 0,
          maxPoints: 1,
          note: 'Fehlend'
        }
      ]
    };

    const feedback = formatPluginFeedback('skill-calc-vlsm', gradingResult, gradingGraph);
    expect(feedback).toContain('fehlt [f]');
  });

  it('should format custom graph skills using the network plugin even with a generic discipline and custom skill ID', () => {
    const gradingGraph: GradingGraph = {
      taskId: 'custom-subnetting-task',
      discipline: 'general',
      variables: [
        {
          id: 'subnetA_mask',
          type: 'formula',
          expression: 'network.calculateMask(subnetA_hosts)',
          validationType: 'exact',
          maxPoints: 1
        }
      ]
    };

    const gradingResult: GradingResult = {
      taskId: 'custom-subnetting-task',
      totalPoints: 1,
      maxPoints: 1,
      stepResults: [
        {
          variableId: 'subnetA_mask',
          status: 'correct',
          expectedValue: '/24',
          studentValue: '/24',
          computedValueBasedOnErrors: '/24',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        }
      ]
    };

    // Passed with a custom skill ID
    const feedback = formatPluginFeedback('custom-skill-1234567', gradingResult, gradingGraph);
    expect(feedback).not.toBeNull();
    expect(feedback).toContain('[⚙️ AGS Engine - Mathematischer VLSM Abgleich]');
    expect(feedback).toContain('| **Subnetz A** | - | /24 [r] | - | - | - | - |');
  });
});
