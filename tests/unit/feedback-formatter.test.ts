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
    expect(feedback).toContain('| Subnetz | Bedarf (Hosts) | Netz-ID | Maske | Erste nutzbare IP | Letzte nutzbare IP | Broadcast | Gateway |');
    expect(feedback).toContain('| **Subnetz A** | - | 192.168.1.0 [r] | /25 [FF] | - | - | 192.168.1.128 [f] *(Erw: 192.168.1.127)* | - |');
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
    expect(feedback).toContain('| **Subnetz A** | - | - | /24 [r] | - | - | - | - |');
  });

  it('should correctly parse and match compound German/English variable IDs', () => {
    const gradingGraph: GradingGraph = {
      taskId: 'task-vlsm-de',
      discipline: 'computer-science-networking',
      variables: []
    };

    const gradingResult: GradingResult = {
      taskId: 'task-vlsm-de',
      totalPoints: 6,
      maxPoints: 7,
      stepResults: [
        {
          variableId: 'subnet_messebesucher_netzadresse',
          status: 'correct',
          expectedValue: '172.16.2.0',
          studentValue: '172.16.2.0',
          computedValueBasedOnErrors: '172.16.2.0',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'subnet_spieler_net_id',
          status: 'correct',
          expectedValue: '172.16.2.128',
          studentValue: '172.16.2.128',
          computedValueBasedOnErrors: '172.16.2.128',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'messebesucher_netzmaske',
          status: 'correct',
          expectedValue: '/25',
          studentValue: '/25',
          computedValueBasedOnErrors: '/25',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'spieler_erste_nutzbare_ip',
          status: 'correct',
          expectedValue: '172.16.2.129',
          studentValue: '172.16.2.129',
          computedValueBasedOnErrors: '172.16.2.129',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'spieler_letzte_nutzbare_ip',
          status: 'correct',
          expectedValue: '172.16.2.254',
          studentValue: '172.16.2.254',
          computedValueBasedOnErrors: '172.16.2.254',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'spieler_broadcastadresse',
          status: 'correct',
          expectedValue: '172.16.2.255',
          studentValue: '172.16.2.255',
          computedValueBasedOnErrors: '172.16.2.255',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'spieler_standard_gateway',
          status: 'correct',
          expectedValue: '172.16.2.254',
          studentValue: '172.16.2.254',
          computedValueBasedOnErrors: '172.16.2.254',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        }
      ]
    };

    const feedback = formatPluginFeedback('skill-calc-vlsm', gradingResult, gradingGraph);
    expect(feedback).not.toBeNull();
    expect(feedback).toContain('| **Subnetz MESSEBESUCHER** | - | 172.16.2.0 [r] | /25 [r] | - | - | - | - |');
    expect(feedback).toContain('| **Subnetz SPIELER** | - | 172.16.2.128 [r] | - | 172.16.2.129 [r] | 172.16.2.254 [r] | 172.16.2.255 [r] | 172.16.2.254 [r] |');
  });

  it('should utilize formula expressions in the GradingGraph to map variable categories deterministically', () => {
    const gradingGraph: GradingGraph = {
      taskId: 'task-vlsm-formulas',
      discipline: 'computer-science-networking',
      variables: [
        {
          id: 'aussteller_erster_ip',
          type: 'formula',
          expression: 'network.calculateFirstHost(aussteller_netzadresse)',
          validationType: 'exact',
          maxPoints: 1
        },
        {
          id: 'aussteller_letzter_ip',
          type: 'formula',
          expression: 'network.calculateLastHost(aussteller_netzadresse, aussteller_maske)',
          validationType: 'exact',
          maxPoints: 1
        }
      ]
    };

    const gradingResult: GradingResult = {
      taskId: 'task-vlsm-formulas',
      totalPoints: 2,
      maxPoints: 2,
      stepResults: [
        {
          variableId: 'aussteller_erster_ip',
          status: 'correct',
          expectedValue: '172.16.2.1',
          studentValue: '172.16.2.1',
          computedValueBasedOnErrors: '172.16.2.1',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'aussteller_letzter_ip',
          status: 'correct',
          expectedValue: '172.16.2.126',
          studentValue: '172.16.2.126',
          computedValueBasedOnErrors: '172.16.2.126',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        }
      ]
    };

    const feedback = formatPluginFeedback('skill-calc-vlsm', gradingResult, gradingGraph);
    expect(feedback).not.toBeNull();
    expect(feedback).toContain('| **Subnetz AUSSTELLER** | - | - | - | 172.16.2.1 [r] | 172.16.2.126 [r] | - | - |');
  });

  it('should correctly parse hosts variables and prevent subnet rows from splitting', () => {
    const gradingGraph: GradingGraph = {
      taskId: 'task-vlsm-hosts',
      discipline: 'computer-science-networking',
      variables: []
    };

    const gradingResult: GradingResult = {
      taskId: 'task-vlsm-hosts',
      totalPoints: 3,
      maxPoints: 3,
      stepResults: [
        {
          variableId: 'subnet_aussteller_anzahl_ip_hosts',
          status: 'correct',
          expectedValue: 100,
          studentValue: 100,
          computedValueBasedOnErrors: 100,
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'subnet_aussteller_netid',
          status: 'correct',
          expectedValue: '172.16.2.128',
          studentValue: '172.16.2.128',
          computedValueBasedOnErrors: '172.16.2.128',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'subnet_aussteller_anzahl_ip',
          status: 'correct',
          expectedValue: 100,
          studentValue: 100,
          computedValueBasedOnErrors: 100,
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        }
      ]
    };

    const feedback = formatPluginFeedback('skill-calc-vlsm', gradingResult, gradingGraph);
    expect(feedback).not.toBeNull();
    expect(feedback).toContain('| Subnetz | Bedarf (Hosts) | Netz-ID | Maske | Erste nutzbare IP | Letzte nutzbare IP | Broadcast | Gateway |');
    expect(feedback).toContain('| **Subnetz AUSSTELLER** | 100 [r] | 172.16.2.128 [r] | - | - | - | - | - |');
    expect(feedback).not.toContain('AUSSTELLER_ANZAHL_IP');
    expect(feedback).not.toContain('AUSSTELLER_ANZAHL');
  });

  it('should filter out non-subnet rows like gesamt_netz and omit empty custom columns', () => {
    const gradingGraph: GradingGraph = {
      taskId: 'task-vlsm-parent-filter',
      discipline: 'computer-science-networking',
      variables: [
        {
          id: 'gesamt_netz',
          type: 'input',
          validationType: 'exact',
          maxPoints: 0,
          defaultValue: '172.16.0.0/20'
        }
      ]
    };

    const gradingResult: GradingResult = {
      taskId: 'task-vlsm-parent-filter',
      totalPoints: 2,
      maxPoints: 2,
      stepResults: [
        {
          variableId: 'gesamt_netz',
          status: 'correct',
          expectedValue: '172.16.0.0/20',
          studentValue: '172.16.0.0/20',
          computedValueBasedOnErrors: '172.16.0.0/20',
          points: 0,
          maxPoints: 0,
          note: 'Parent network block'
        },
        {
          variableId: 'subnet_aussteller_netid',
          status: 'correct',
          expectedValue: '172.16.2.0',
          studentValue: '172.16.2.0',
          computedValueBasedOnErrors: '172.16.2.0',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        },
        {
          variableId: 'subnet_aussteller_mask',
          status: 'correct',
          expectedValue: '/25',
          studentValue: '/25',
          computedValueBasedOnErrors: '/25',
          points: 1,
          maxPoints: 1,
          note: 'Korrekt'
        }
      ]
    };

    const feedback = formatPluginFeedback('skill-calc-vlsm', gradingResult, gradingGraph);
    expect(feedback).not.toBeNull();
    expect(feedback).toContain('| Subnetz | Bedarf (Hosts) | Netz-ID | Maske | Erste nutzbare IP | Letzte nutzbare IP | Broadcast | Gateway |');
    expect(feedback).toContain('| **Subnetz AUSSTELLER** | - | 172.16.2.0 [r] | /25 [r] | - | - | - | - |');
    expect(feedback).not.toContain('GESAMT');
    expect(feedback).not.toContain('gesamt_netz');
    expect(feedback).not.toContain('| Netz |'); // Column 'Netz' should be completely omitted
  });
});

