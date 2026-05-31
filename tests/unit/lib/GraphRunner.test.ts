import { GraphRunner } from '../../../src/lib/grading/GraphRunner';
import { GradingGraph } from '../../../src/lib/grading/types';
import { evaluateExpression } from '../../../src/lib/grading/plugins';

describe('GradingGraph Engine - VLSM Subnetting Tests', () => {
  // Define a typical VLSM Subnetting Task:
  // Subnet A: 50 hosts (requires /26, 64 IPs)
  // Subnet B: 20 hosts (requires /27, 32 IPs)
  // Start Network: 192.168.1.0
  const vlsmGraph: GradingGraph = {
    taskId: 'vlsm-exam-task-1',
    discipline: 'computer-science-networking',
    variables: [
      // Subnet A Definitions
      { id: 'subnetA_hosts', type: 'input', defaultValue: 50, validationType: 'exact' },
      { id: 'subnetA_netId', type: 'input', defaultValue: '192.168.1.0', validationType: 'exact' },
      { id: 'subnetA_mask', type: 'formula', expression: 'network.calculateMask(subnetA_hosts)', validationType: 'exact' },
      { id: 'subnetA_broadcast', type: 'formula', expression: 'network.calculateBroadcast(subnetA_netId, subnetA_mask)', validationType: 'exact' },

      // Subnet B Definitions (depends on Subnet A's layout!)
      { id: 'subnetB_hosts', type: 'input', defaultValue: 20, validationType: 'exact' },
      { id: 'subnetB_mask', type: 'formula', expression: 'network.calculateMask(subnetB_hosts)', validationType: 'exact' },
      { id: 'subnetB_netId', type: 'formula', expression: 'network.calculateNetId(subnetA_netId, subnetA_mask)', validationType: 'exact' },
      { id: 'subnetB_broadcast', type: 'formula', expression: 'network.calculateBroadcast(subnetB_netId, subnetB_mask)', validationType: 'exact' }
    ]
  };

  test('Test Case 1: Perfect Student Answer (100% correct)', () => {
    const perfectStudentResults = {
      subnetA_hosts: 50,
      subnetA_netId: '192.168.1.0',
      subnetA_mask: '/26',
      subnetA_broadcast: '192.168.1.63',
      subnetB_hosts: 20,
      subnetB_mask: '/27',
      subnetB_netId: '192.168.1.64',
      subnetB_broadcast: '192.168.1.95'
    };

    const result = GraphRunner.grade(vlsmGraph, perfectStudentResults);

    expect(result.totalPoints).toBe(8);
    expect(result.maxPoints).toBe(8);
    
    // All steps must be marked as correct
    result.stepResults.forEach(step => {
      expect(step.status).toBe('correct');
    });
  });

  test('Test Case 2: One Initial Primary Error with Perfect Follow-Through (Consecutive Compensation)', () => {
    // The student makes a primary error in subnetA_mask: they choose /25 (128 IPs) instead of /26.
    // However, they carry this error through perfectly!
    // Correct follow-through calculation:
    // subnetA_mask = /25
    // subnetA_broadcast = 192.168.1.127 (since /25 has 128 IPs starting at 192.168.1.0)
    // subnetB_netId = 192.168.1.128 (next subnet starts after subnet A size)
    // subnetB_mask = /27 (correctly chosen for 20 hosts)
    // subnetB_broadcast = 192.168.1.159 (192.168.1.128 + 32 IPs - 1)
    const errorStudentResults = {
      subnetA_hosts: 50,
      subnetA_netId: '192.168.1.0',
      subnetA_mask: '/25', // PRIMARY ERROR (expected: /26)
      subnetA_broadcast: '192.168.1.127', // CONSECUTIVE CORRECT
      subnetB_hosts: 20,
      subnetB_mask: '/27', // CORRECT
      subnetB_netId: '192.168.1.128', // CONSECUTIVE CORRECT
      subnetB_broadcast: '192.168.1.159' // CONSECUTIVE CORRECT
    };

    const result = GraphRunner.grade(vlsmGraph, errorStudentResults);

    // Total points should be 7/8 (only the subnetA_mask step should be penalized)
    expect(result.totalPoints).toBe(7);
    expect(result.maxPoints).toBe(8);

    // Verify individual step statuses
    const maskStep = result.stepResults.find(s => s.variableId === 'subnetA_mask')!;
    expect(maskStep.status).toBe('primary_error');
    expect(maskStep.points).toBe(0);

    const aBroadcastStep = result.stepResults.find(s => s.variableId === 'subnetA_broadcast')!;
    expect(aBroadcastStep.status).toBe('consecutive_correct'); // Awarded points because it follows through from /25!
    expect(aBroadcastStep.points).toBe(1);

    const bNetIdStep = result.stepResults.find(s => s.variableId === 'subnetB_netId')!;
    expect(bNetIdStep.status).toBe('consecutive_correct'); // Follows through
    expect(bNetIdStep.points).toBe(1);

    const bBroadcastStep = result.stepResults.find(s => s.variableId === 'subnetB_broadcast')!;
    expect(bBroadcastStep.status).toBe('consecutive_correct'); // Follows through
    expect(bBroadcastStep.points).toBe(1);
  });

  test('Test Case 3: Initial Error + Secondary Error (Multiple independent errors)', () => {
    // Student makes first error in subnetA_mask (/25 instead of /26).
    // They carry it to subnetA_broadcast (192.168.1.127) -> consecutive correct.
    // They carry it to subnetB_netId (192.168.1.128) -> consecutive correct.
    // BUT then they make a second primary error: subnetB_broadcast is completely wrong (192.168.1.200).
    const multipleErrorsStudentResults = {
      subnetA_hosts: 50,
      subnetA_netId: '192.168.1.0',
      subnetA_mask: '/25', // PRIMARY ERROR 1
      subnetA_broadcast: '192.168.1.127', // CONSECUTIVE CORRECT
      subnetB_hosts: 20,
      subnetB_mask: '/27', // CORRECT
      subnetB_netId: '192.168.1.128', // CONSECUTIVE CORRECT
      subnetB_broadcast: '192.168.1.200' // PRIMARY ERROR 2 (expected: 192.168.1.159 based on their previous /25 error)
    };

    const result = GraphRunner.grade(vlsmGraph, multipleErrorsStudentResults);

    expect(result.totalPoints).toBe(6); // 2 primary errors, 6/8 points
    expect(result.maxPoints).toBe(8);

    const bBroadcastStep = result.stepResults.find(s => s.variableId === 'subnetB_broadcast')!;
    expect(bBroadcastStep.status).toBe('primary_error'); // Incorrect even under error propagation!
    expect(bBroadcastStep.points).toBe(0);
  });

});

describe('GradingGraph Engine - RAID Capacity Tests', () => {
  const raidGraph: GradingGraph = {
    taskId: 'raid-exam-task-1',
    discipline: 'computer-science-storage',
    variables: [
      { id: 'raid_level', type: 'input', defaultValue: 5, validationType: 'exact' },
      { id: 'disk_count', type: 'input', defaultValue: 4, validationType: 'exact' },
      { id: 'disk_size', type: 'input', defaultValue: 1000, validationType: 'exact' },
      { id: 'net_capacity', type: 'formula', expression: 'raid.calculateNetCapacity(raid_level, disk_count, disk_size)', validationType: 'exact' },
      { id: 'fault_tolerance', type: 'formula', expression: 'raid.calculateFaultTolerance(raid_level, disk_count)', validationType: 'exact' }
    ]
  };

  test('Test Case 1: Perfect RAID Student Answer (100% correct)', () => {
    const perfectStudentResults = {
      raid_level: 5,
      disk_count: 4,
      disk_size: 1000,
      net_capacity: 3000,
      fault_tolerance: 1
    };

    const result = GraphRunner.grade(raidGraph, perfectStudentResults);

    expect(result.totalPoints).toBe(5);
    expect(result.maxPoints).toBe(5);
    
    result.stepResults.forEach(step => {
      expect(step.status).toBe('correct');
    });
  });

  test('Test Case 2: One Initial Primary Error with Perfect RAID Follow-Through (Consecutive Compensation)', () => {
    // Student makes error: disk_count = 3 (expected: 4)
    // Based on disk_count = 3, net_capacity should follow-through to 2000 (i.e. (3-1) * 1000)
    // fault_tolerance is 1
    const errorStudentResults = {
      raid_level: 5,
      disk_count: 3, // PRIMARY ERROR
      disk_size: 1000,
      net_capacity: 2000, // CONSECUTIVE CORRECT (propagated from disk_count = 3)
      fault_tolerance: 1 // CONSECUTIVE CORRECT
    };

    const result = GraphRunner.grade(raidGraph, errorStudentResults);

    expect(result.totalPoints).toBe(4); // 4/5 points (1 penalty for disk_count)
    expect(result.maxPoints).toBe(5);

    const diskCountStep = result.stepResults.find(s => s.variableId === 'disk_count')!;
    expect(diskCountStep.status).toBe('primary_error');

    const netCapacityStep = result.stepResults.find(s => s.variableId === 'net_capacity')!;
    expect(netCapacityStep.status).toBe('consecutive_correct');
    expect(netCapacityStep.points).toBe(1);

    const faultToleranceStep = result.stepResults.find(s => s.variableId === 'fault_tolerance')!;
    expect(faultToleranceStep.status).toBe('correct');
  });

  test('Test Case 4: Symmetrical Input Fallback (omitted inputs in student results)', () => {
    // If student results omit raid_level, disk_count, disk_size:
    // They should be automatically treated as correct and propagated downstream.
    const studentResults = {
      net_capacity: 3000,
      fault_tolerance: 1
    };

    const result = GraphRunner.grade(raidGraph, studentResults);

    // Total points should be 2/5 (0 points for the 3 omitted inputs, 2 points for the correct formulas)
    expect(result.totalPoints).toBe(2);
    expect(result.maxPoints).toBe(5);

    // raid_level, disk_count, disk_size should have status 'primary_error' (omitted) and 0 points
    const levelStep = result.stepResults.find(s => s.variableId === 'raid_level')!;
    expect(levelStep.status).toBe('primary_error');
    expect(levelStep.studentValue).toBeNull(); // default propagated in math context, but null in studentValue
    expect(levelStep.points).toBe(0);

    const diskCountStep = result.stepResults.find(s => s.variableId === 'disk_count')!;
    expect(diskCountStep.status).toBe('primary_error');
    expect(diskCountStep.studentValue).toBeNull(); // default propagated in math context, but null in studentValue
    expect(diskCountStep.points).toBe(0);

    const diskSizeStep = result.stepResults.find(s => s.variableId === 'disk_size')!;
    expect(diskSizeStep.status).toBe('primary_error');
    expect(diskSizeStep.studentValue).toBeNull(); // default propagated in math context, but null in studentValue
    expect(diskSizeStep.points).toBe(0);

    // net_capacity is formula and student got 3000, which matches expected (4-1)*1000
    const capStep = result.stepResults.find(s => s.variableId === 'net_capacity')!;
    expect(capStep.status).toBe('correct');
    expect(capStep.points).toBe(1);
  });
});


describe('GradingGraph Engine - Nested Expression Tests', () => {
  test('should recursively evaluate nested function calls', () => {
    const context = {
      anzahl_platten: 4,
      kapazitaet_pro_platte: 4
    };
    
    const expression = "math.multiply(math.subtract(anzahl_platten, 1), kapazitaet_pro_platte)";
    const result = evaluateExpression(expression, context);
    
    expect(result).toBe(12); // (4 - 1) * 4 = 12
  });

  test('should recursively evaluate deeply nested function calls', () => {
    const context = {
      a: 2,
      b: 3,
      c: 4
    };
    
    const expression = "math.add(math.multiply(a, b), math.subtract(c, 1))";
    const result = evaluateExpression(expression, context);
    
    expect(result).toBe(9); // (2 * 3) + (4 - 1) = 9
  });
});


describe('GradingGraph Engine - Dynamic Math & Three-Phase Current Tests', () => {
  const threePhaseGraph: GradingGraph = {
    taskId: 'drehstrom-exam-task-1',
    discipline: 'electrical-engineering',
    variables: [
      { id: 'U_L', type: 'input', defaultValue: 400, validationType: 'exact' },
      { id: 'P', type: 'input', defaultValue: 15000, validationType: 'exact' },
      { id: 'cos_phi', type: 'input', defaultValue: 0.8, validationType: 'exact' },
      { id: 'S', type: 'formula', expression: 'P / cos_phi', validationType: 'tolerance', tolerance: 1 },
      { id: 'Q', type: 'formula', expression: 'sqrt(abs(S^2 - P^2))', validationType: 'tolerance', tolerance: 5 },
      { id: 'I_L', type: 'formula', expression: 'P / (sqrt(3) * U_L * cos_phi)', validationType: 'tolerance', tolerance: 0.2 },
      { id: 'U_P', type: 'formula', expression: 'U_L / sqrt(3)', validationType: 'tolerance', tolerance: 0.5 },
      { id: 'I_P', type: 'formula', expression: 'I_L', validationType: 'tolerance', tolerance: 0.2 }
    ]
  };

  test('Test Case 1: Perfect Student Answer (100% correct)', () => {
    const perfectStudentResults = {
      U_L: 400,
      P: 15000,
      cos_phi: 0.8,
      S: 18750,
      Q: 11250,
      I_L: 27.06,
      U_P: 230.94,
      I_P: 27.06
    };

    const result = GraphRunner.grade(threePhaseGraph, perfectStudentResults);

    expect(result.totalPoints).toBe(8);
    expect(result.maxPoints).toBe(8);
    result.stepResults.forEach(step => {
      expect(step.status).toBe('correct');
    });
  });

  test('Test Case 2: Primary Error in S with Perfect Consecutive Compensation in Q', () => {
    const errorStudentResults = {
      U_L: 400,
      P: 15000,
      cos_phi: 0.8,
      S: 12000, // PRIMARY ERROR (Expected: 18750)
      Q: 9000,   // CONSECUTIVE CORRECT (sqrt(|12000^2 - 15000^2|) = 9000!)
      I_L: 27.06,
      U_P: 230.94,
      I_P: 27.06
    };

    const result = GraphRunner.grade(threePhaseGraph, errorStudentResults);

    expect(result.totalPoints).toBe(7); // 7/8 points (1 penalty for S)
    expect(result.maxPoints).toBe(8);

    const sStep = result.stepResults.find(s => s.variableId === 'S')!;
    expect(sStep.status).toBe('primary_error');

    const qStep = result.stepResults.find(s => s.variableId === 'Q')!;
    expect(qStep.status).toBe('consecutive_correct'); // Successfully compensated!
    expect(qStep.points).toBe(1);
  });

  describe('Array-based Alternative Expected Values', () => {
    const alternativeGraph: any = {
      taskId: 'vlsm-alternative-123',
      discipline: 'computer-science',
      variables: [
        {
          id: 'subnetA_netid',
          type: 'input',
          defaultValue: ['192.168.1.0', '192.168.1.32'],
          validationType: 'exact',
          maxPoints: 1
        },
        {
          id: 'subnetB_netid',
          type: 'formula',
          expression: "subnetA_netid == '192.168.1.0' ? '192.168.1.32' : '192.168.1.0'",
          validationType: 'exact',
          maxPoints: 1
        }
      ]
    };

    test('should accept Choice A (standard assignment)', () => {
      const studentResults = {
        subnetA_netid: '192.168.1.0',
        subnetB_netid: '192.168.1.32'
      };
      const result = GraphRunner.grade(alternativeGraph, studentResults);
      expect(result.totalPoints).toBe(2);
      expect(result.stepResults[0].status).toBe('correct');
      expect(result.stepResults[1].status).toBe('correct');
    });

    test('should accept Choice B (swapped assignment)', () => {
      const studentResults = {
        subnetA_netid: '192.168.1.32',
        subnetB_netid: '192.168.1.0'
      };
      const result = GraphRunner.grade(alternativeGraph, studentResults);
      expect(result.totalPoints).toBe(2);
      expect(result.stepResults[0].status).toBe('correct');
      // Second step is promoted to correct because the predecessor has no errors under DIRM!
      expect(result.stepResults[1].status).toBe('correct');
    });

    test('should reject identical assignments (cheating/error)', () => {
      const studentResults = {
        subnetA_netid: '192.168.1.0',
        subnetB_netid: '192.168.1.0'
      };
      const result = GraphRunner.grade(alternativeGraph, studentResults);
      expect(result.totalPoints).toBe(1); // subnetA is correct, subnetB is primary_error
      expect(result.stepResults[0].status).toBe('correct');
      expect(result.stepResults[1].status).toBe('primary_error');
    });
  });

  describe('Dynamic Isomorphic Role Mapping (DIRM) via equivalenceGroups', () => {
    const dirmGraph: GradingGraph = {
      taskId: 'vlsm-dirm-123',
      discipline: 'computer-science',
      equivalenceGroups: [
        {
          id: 'symmetrical-subnets',
          prefixes: ['subnetA', 'subnetB']
        }
      ],
      variables: [
        // Subnet A
        { id: 'subnetA_hosts', type: 'input', defaultValue: 100, validationType: 'exact' },
        { id: 'subnetA_netid', type: 'input', defaultValue: '172.16.2.0', validationType: 'exact' },
        { id: 'subnetA_mask', type: 'formula', expression: 'network.calculateMask(subnetA_hosts)', validationType: 'exact' },
        
        // Subnet B
        { id: 'subnetB_hosts', type: 'input', defaultValue: 100, validationType: 'exact' },
        { id: 'subnetB_netid', type: 'input', defaultValue: '172.16.2.128', validationType: 'exact' },
        { id: 'subnetB_mask', type: 'formula', expression: 'network.calculateMask(subnetB_hosts)', validationType: 'exact' },
      ]
    };

    test('should grade standard assignment (Choice A) as 100% correct', () => {
      const studentResults = {
        subnetA_hosts: 100,
        subnetA_netid: '172.16.2.0',
        subnetA_mask: '/25',
        subnetB_hosts: 100,
        subnetB_netid: '172.16.2.128',
        subnetB_mask: '/25'
      };
      const result = GraphRunner.grade(dirmGraph, studentResults);
      expect(result.totalPoints).toBe(6);
      result.stepResults.forEach(step => {
        expect(step.status).toBe('correct');
      });
    });

    test('should grade swapped assignment (Choice B) as 100% correct via DIRM', () => {
      const studentResults = {
        subnetA_hosts: 100,
        subnetA_netid: '172.16.2.128',
        subnetA_mask: '/25',
        subnetB_hosts: 100,
        subnetB_netid: '172.16.2.0',
        subnetB_mask: '/25'
      };
      const result = GraphRunner.grade(dirmGraph, studentResults);
      expect(result.totalPoints).toBe(6);
      result.stepResults.forEach(step => {
        expect(step.status).toBe('correct');
        expect(step.variableId).toMatch(/^subnet[AB]_(hosts|netid|mask)$/);
      });
    });

    test('should handle a primary error inside a swapped assignment correctly', () => {
      const studentResults = {
        subnetA_hosts: 100,
        subnetA_netid: '172.16.2.128',
        subnetA_mask: '/24', // PRIMARY ERROR (expected /25)
        subnetB_hosts: 100,
        subnetB_netid: '172.16.2.0',
        subnetB_mask: '/25'
      };
      const result = GraphRunner.grade(dirmGraph, studentResults);
      expect(result.totalPoints).toBe(5);
      
      const maskStep = result.stepResults.find(s => s.variableId === 'subnetA_mask')!;
      expect(maskStep.status).toBe('primary_error');
    });
  });
});


