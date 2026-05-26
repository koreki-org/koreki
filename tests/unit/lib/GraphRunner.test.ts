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

  test('Test Case 4: extractStudentAnswers from messy student text', () => {
    const studentText = `
      Hallo Herr Müller, hier ist meine Abgabe.
      
      Bereich A (Subnetz A):
      - Benötigte Hosts: 50
      - Netz-ID: 192.168.1.0
      - Maske: /26
      - Broadcast: 192.168.1.63
      
      Bereich B (Subnetz B):
      - Hosts: 20
      - Netzadresse: 192.168.1.64
      - Subnetzmaske: /27
      - Broadcastadresse: 192.168.1.95
      
      Ich hoffe es stimmt alles!
    `;

    const extracted = GraphRunner.extractStudentAnswers(studentText, vlsmGraph);

    expect(extracted.subnetA_hosts).toBe(50);
    expect(extracted.subnetA_netId).toBe('192.168.1.0');
    expect(extracted.subnetA_mask).toBe('/26');
    expect(extracted.subnetA_broadcast).toBe('192.168.1.63');
    expect(extracted.subnetB_hosts).toBe(20);
    expect(extracted.subnetB_netId).toBe('192.168.1.64');
    expect(extracted.subnetB_mask).toBe('/27');
    expect(extracted.subnetB_broadcast).toBe('192.168.1.95');
  });

  test('Test Case 5: extractStudentAnswers from Markdown Pipe Table with custom subnets, gateways, firstHost, and lasthost', () => {
    const customGraph: GradingGraph = {
      taskId: 'vlsm-exam-task-custom',
      discipline: 'computer-science-networking',
      variables: [
        { id: 'subnet_messebesucher_hosts', type: 'input', defaultValue: 500, validationType: 'exact' },
        { id: 'subnet_messebesucher_netId', type: 'input', defaultValue: '172.16.16.0', validationType: 'exact' },
        { id: 'subnet_messebesucher_mask', type: 'formula', expression: 'network.calculateMask(subnet_messebesucher_hosts)', validationType: 'exact' },
        { id: 'subnet_messebesucher_firstHost', type: 'formula', expression: 'network.calculateFirstHost(subnet_messebesucher_netId)', validationType: 'exact' },
        { id: 'subnet_messebesucher_gateway', type: 'formula', expression: 'network.calculateGateway(subnet_messebesucher_netId, subnet_messebesucher_mask)', validationType: 'exact' },
        { id: 'subnet_messebesucher_broadcast', type: 'formula', expression: 'network.calculateBroadcast(subnet_messebesucher_netId, subnet_messebesucher_mask)', validationType: 'exact' },

        { id: 'subnet_spieler_hosts', type: 'input', defaultValue: 80, validationType: 'exact' },
        { id: 'subnet_spieler_netId', type: 'formula', expression: 'network.calculateNetId(subnet_messebesucher_netId, subnet_messebesucher_mask)', validationType: 'exact' },
        { id: 'subnet_spieler_mask', type: 'formula', expression: 'network.calculateMask(subnet_spieler_hosts)', validationType: 'exact' },
        { id: 'subnet_spieler_firstHost', type: 'formula', expression: 'network.calculateFirstHost(subnet_spieler_netId)', validationType: 'exact' },
        { id: 'subnet_spieler_gateway', type: 'formula', expression: 'network.calculateGateway(subnet_spieler_netId, subnet_spieler_mask)', validationType: 'exact' },
        { id: 'subnet_spieler_broadcast', type: 'formula', expression: 'network.calculateBroadcast(subnet_spieler_netId, subnet_spieler_mask)', validationType: 'exact' }
      ]
    };

    const studentText = `
| Subnetz | Benötigte Hosts | Netzadresse (Net-ID) | Subnetzmaske | Erste IP | Gateway (letzte nutzbare) | Broadcastadresse |
| --- | --- | --- | --- | --- | --- | --- |
| Messebesucher | 500 | 172.16.16.0 | /23 | 172.16.16.1 | 172.16.17.254 | 172.16.17.255 |
| Spieler | 80 | 172.16.18.0 | /25 | 172.16.18.1 | 172.16.18.126 | 172.16.18.127 |
    `;

    // 1. Verify parsing
    const extracted = GraphRunner.extractStudentAnswers(studentText, customGraph);

    expect(extracted.subnet_messebesucher_hosts).toBe(500);
    expect(extracted.subnet_messebesucher_netId).toBe('172.16.16.0');
    expect(extracted.subnet_messebesucher_mask).toBe('/23');
    expect(extracted.subnet_messebesucher_firstHost).toBe('172.16.16.1');
    expect(extracted.subnet_messebesucher_gateway).toBe('172.16.17.254');
    expect(extracted.subnet_messebesucher_broadcast).toBe('172.16.17.255');

    expect(extracted.subnet_spieler_hosts).toBe(80);
    expect(extracted.subnet_spieler_netId).toBe('172.16.18.0');
    expect(extracted.subnet_spieler_mask).toBe('/25');
    expect(extracted.subnet_spieler_firstHost).toBe('172.16.18.1');
    expect(extracted.subnet_spieler_gateway).toBe('172.16.18.126');
    expect(extracted.subnet_spieler_broadcast).toBe('172.16.18.127');

    // 2. Verify grading and formula evaluation (consecutive compensation)
    const grading = GraphRunner.grade(customGraph, extracted);
    expect(grading.totalPoints).toBe(12);
    expect(grading.maxPoints).toBe(12);
    
    grading.stepResults.forEach(r => {
      expect(r.status).toBe('correct');
    });
  });

  test('Test Case 6: extractStudentAnswers and grade with prefixless variables (e.g. messebesucher_hosts)', () => {
    const prefixlessGraph: GradingGraph = {
      taskId: 'vlsm-exam-task-prefixless',
      discipline: 'computer-science-networking',
      variables: [
        { id: 'messebesucher_hosts', type: 'input', defaultValue: 500, validationType: 'exact' },
        { id: 'messebesucher_netId', type: 'input', defaultValue: '172.16.16.0', validationType: 'exact' },
        { id: 'messebesucher_mask', type: 'formula', expression: 'network.calculateMask(messebesucher_hosts)', validationType: 'exact' },
        { id: 'messebesucher_firstHost', type: 'formula', expression: 'network.calculateFirstHost(messebesucher_netId)', validationType: 'exact' },
        { id: 'messebesucher_gateway', type: 'formula', expression: 'network.calculateGateway(messebesucher_netId, messebesucher_mask)', validationType: 'exact' },
        { id: 'messebesucher_broadcast', type: 'formula', expression: 'network.calculateBroadcast(messebesucher_netId, messebesucher_mask)', validationType: 'exact' },

        { id: 'spieler_hosts', type: 'input', defaultValue: 80, validationType: 'exact' },
        { id: 'spieler_netId', type: 'formula', expression: 'network.calculateNetId(messebesucher_netId, messebesucher_mask)', validationType: 'exact' },
        { id: 'spieler_mask', type: 'formula', expression: 'network.calculateMask(spieler_hosts)', validationType: 'exact' },
        { id: 'spieler_firstHost', type: 'formula', expression: 'network.calculateFirstHost(spieler_netId)', validationType: 'exact' },
        { id: 'spieler_gateway', type: 'formula', expression: 'network.calculateGateway(spieler_netId, spieler_mask)', validationType: 'exact' },
        { id: 'spieler_broadcast', type: 'formula', expression: 'network.calculateBroadcast(spieler_netId, spieler_mask)', validationType: 'exact' }
      ]
    };

    const studentText = `
| Subnetz | Benötigte Hosts | Netzadresse (Net-ID) | Subnetzmaske | Erste IP | Gateway (letzte nutzbare) | Broadcastadresse |
| --- | --- | --- | --- | --- | --- | --- |
| Messebesucher | 500 | 172.16.16.0 | /23 | 172.16.16.1 | 172.16.17.254 | 172.16.17.255 |
| Spieler | 80 | 172.16.18.0 | /25 | 172.16.18.1 | 172.16.18.126 | 172.16.18.127 |
    `;

    // 1. Verify parsing
    const extracted = GraphRunner.extractStudentAnswers(studentText, prefixlessGraph);

    expect(extracted.messebesucher_hosts).toBe(500);
    expect(extracted.messebesucher_netId).toBe('172.16.16.0');
    expect(extracted.messebesucher_mask).toBe('/23');
    expect(extracted.messebesucher_firstHost).toBe('172.16.16.1');
    expect(extracted.messebesucher_gateway).toBe('172.16.17.254');
    expect(extracted.messebesucher_broadcast).toBe('172.16.17.255');

    expect(extracted.spieler_hosts).toBe(80);
    expect(extracted.spieler_netId).toBe('172.16.18.0');
    expect(extracted.spieler_mask).toBe('/25');
    expect(extracted.spieler_firstHost).toBe('172.16.18.1');
    expect(extracted.spieler_gateway).toBe('172.16.18.126');
    expect(extracted.spieler_broadcast).toBe('172.16.18.127');

    // 2. Verify grading and formula evaluation (consecutive compensation)
    const grading = GraphRunner.grade(prefixlessGraph, extracted);
    expect(grading.totalPoints).toBe(12);
    expect(grading.maxPoints).toBe(12);
    
    grading.stepResults.forEach(r => {
      expect(r.status).toBe('correct');
    });
  });

  test('Test Case 7: Tab-Separated Table Preprocessing', () => {
    const customGraph: GradingGraph = {
      taskId: 'vlsm-exam-task-tab',
      discipline: 'computer-science-networking',
      variables: [
        { id: 'subnet_messebesucher_netId', type: 'input', defaultValue: '172.16.0.0', validationType: 'exact' },
        { id: 'subnet_messebesucher_mask', type: 'formula', expression: 'network.calculateMask(500)', validationType: 'exact' },
        { id: 'subnet_spieler_netId', type: 'input', defaultValue: '172.16.2.0', validationType: 'exact' }
      ]
    };

    const studentText = "Subnetz\tBenötigte Hosts\tNetzadresse\tNetzmaske\n" +
                        "Messebesucher\t500\t172.16.0.0\t/23\n" +
                        "Spieler\t80\t172.16.2.0\t/25";

    const extracted = GraphRunner.extractStudentAnswers(studentText, customGraph);

    expect(extracted.subnet_messebesucher_netId).toBe('172.16.0.0');
    expect(extracted.subnet_messebesucher_mask).toBe('/23');
    expect(extracted.subnet_spieler_netId).toBe('172.16.2.0');
  });

  test('Test Case 8: Custom Hyphenated & UMLAUT Subnet Name Mapping (Robust normalizations)', () => {
    const customGraph: GradingGraph = {
      taskId: 'vlsm-exam-task-normalization',
      discipline: 'computer-science-networking',
      variables: [
        { id: 'MesseBesucher_netId', type: 'input', defaultValue: '172.16.0.0', validationType: 'exact' },
        { id: 'MesseBesucher_mask', type: 'formula', expression: 'network.calculateMask(500)', validationType: 'exact' },
        { id: 'Spieler_netId', type: 'input', defaultValue: '172.16.2.0', validationType: 'exact' },
        { id: 'Verwaltung_netId', type: 'input', defaultValue: '172.16.3.64', validationType: 'exact' },
        { id: 'Geraete_netId', type: 'input', defaultValue: '172.16.3.0', validationType: 'exact' },
        { id: 'Geraete_mask', type: 'formula', expression: 'network.calculateMask(50)', validationType: 'exact' }
      ]
    };

    const studentText = `
| Subnetz | Anzahl IP-Adressen | Netzadresse | Netzmaske (Präfix) | IP-Adresse (erster Host) | IP-Adresse (Gateway) | Broadcast-adresse |
| --- | --- | --- | --- | --- | --- | --- |
| Messe-besucher | 500 | 172.16.0.0 | /23 255.255.254.0 | 172.16.0.1 | 172.16.1.254 | 172.16.1.255 |
| Spieler | 80 | 172.16.2.0 | /25 255.255.255.128 | 172.16.2.1 | 172.16.2.126 | 172.16.2.127 |
| Verwaltung/ Organisation | 26 | 172.16.3.64 | /27 255.255.255.224 | 172.16.3.65 | 172.16.3.96 | 172.16.3.127 |
| Management (Geräte) | 50 | 172.16.3.0 | /26 255.255.255.192 | 172.16.3.1 | 172.16.3.62 | 172.16.3.63 |
    `;

    const extracted = GraphRunner.extractStudentAnswers(studentText, customGraph);

    expect(extracted.MesseBesucher_netId).toBe('172.16.0.0');
    expect(extracted.MesseBesucher_mask).toBe('/23');
    expect(extracted.Spieler_netId).toBe('172.16.2.0');
    expect(extracted.Verwaltung_netId).toBe('172.16.3.64');
    expect(extracted.Geraete_netId).toBe('172.16.3.0');
    expect(extracted.Geraete_mask).toBe('/26');
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

  test('Test Case 3: extractStudentAnswers for RAID from text', () => {
    const studentText = `
      RAID-Systemabgabe:
      - RAID Level: 5
      - Plattenanzahl: 4 HDDs
      - Plattengröße: 1000 GB
      - Nettokapazität: 3000 GB
      - Ausfalltoleranz: 1 Platte
    `;

    const extracted = GraphRunner.extractStudentAnswers(studentText, raidGraph);

    expect(extracted.raid_level).toBe(5);
    expect(extracted.disk_count).toBe(4);
    expect(extracted.disk_size).toBe(1000);
    expect(extracted.net_capacity).toBe(3000);
    expect(extracted.fault_tolerance).toBe(1);
  });

  test('Test Case 4: Symmetrical Input Fallback (omitted inputs in student results)', () => {
    // If student results omit raid_level, disk_count, disk_size:
    // They should be automatically treated as correct and propagated downstream.
    const studentResults = {
      net_capacity: 3000,
      fault_tolerance: 1
    };

    const result = GraphRunner.grade(raidGraph, studentResults);

    // raid_level, disk_count, disk_size should have status 'correct'
    const levelStep = result.stepResults.find(s => s.variableId === 'raid_level')!;
    expect(levelStep.status).toBe('correct');
    expect(levelStep.studentValue).toBe(5); // default propagated

    const diskCountStep = result.stepResults.find(s => s.variableId === 'disk_count')!;
    expect(diskCountStep.status).toBe('correct');
    expect(diskCountStep.studentValue).toBe(4); // default propagated

    const diskSizeStep = result.stepResults.find(s => s.variableId === 'disk_size')!;
    expect(diskSizeStep.status).toBe('correct');
    expect(diskSizeStep.studentValue).toBe(1000); // default propagated

    // net_capacity is formula and student got 3000, which matches expected (4-1)*1000
    const capStep = result.stepResults.find(s => s.variableId === 'net_capacity')!;
    expect(capStep.status).toBe('correct');
  });

  test('Test Case 5: Equation Result Fallback for net_capacity from equation string', () => {
    const studentText = `(4 - 1) * 4 TB = 3 * 4 TB = 10 TB.`;
    const extracted = GraphRunner.extractStudentAnswers(studentText, raidGraph);

    // Omitted inputs shouldn't be extracted, but net_capacity should be parsed from the equation
    expect(extracted.raid_level).toBeUndefined();
    expect(extracted.net_capacity).toBe(10);

    // When graded, omitted inputs get symmetrical fallback (treated as correct using defaults),
    // while net_capacity gets evaluated based on those defaults.
    // Expected default disk_size = 1000 (from raidGraph config).
    // Let's create a custom raidGraph with expected disk_size = 4 to match the student text's TB unit
    const customRaidGraph: GradingGraph = {
      taskId: 'raid-custom-4tb',
      discipline: 'computer-science-storage',
      variables: [
        { id: 'raid_level', type: 'input', defaultValue: 5, validationType: 'exact' },
        { id: 'disk_count', type: 'input', defaultValue: 4, validationType: 'exact' },
        { id: 'disk_size', type: 'input', defaultValue: 4, validationType: 'exact' },
        { id: 'net_capacity', type: 'formula', expression: 'raid.calculateNetCapacity(raid_level, disk_count, disk_size)', validationType: 'exact' },
        { id: 'fault_tolerance', type: 'formula', expression: 'raid.calculateFaultTolerance(raid_level, disk_count)', validationType: 'exact' }
      ]
    };

    const result = GraphRunner.grade(customRaidGraph, extracted);

    // Omitted inputs are correct
    expect(result.stepResults.find(s => s.variableId === 'raid_level')!.status).toBe('correct');
    expect(result.stepResults.find(s => s.variableId === 'disk_count')!.status).toBe('correct');
    expect(result.stepResults.find(s => s.variableId === 'disk_size')!.status).toBe('correct');

    // Expected: (4-1) * 4 = 12 TB. Student value is 10 TB, which is incorrect.
    const capStep = result.stepResults.find(s => s.variableId === 'net_capacity')!;
    expect(capStep.status).toBe('primary_error');
    expect(capStep.studentValue).toBe(10);
    expect(capStep.expectedValue).toBe(12);
  });

  test('Test Case 6: extractStudentAnswers from RAID algebraic formula and check consecutive error', () => {
    const customRaidGraph: GradingGraph = {
      taskId: 'raid-custom-formula',
      discipline: 'computer-science-storage',
      variables: [
        { id: 'anzahl_platten', type: 'input', defaultValue: 4, validationType: 'exact' },
        { id: 'kapazitaet_pro_platte', type: 'input', defaultValue: 4, validationType: 'exact' },
        { id: 'nettkapazitaet', type: 'formula', expression: 'math.multiply(math.subtract(anzahl_platten, 1), kapazitaet_pro_platte)', validationType: 'exact' }
      ]
    };

    const studentText = `(3 - 1) * 4 TB = 8 TB.`;
    const extracted = GraphRunner.extractStudentAnswers(studentText, customRaidGraph);

    expect(extracted.anzahl_platten).toBe(3);
    expect(extracted.kapazitaet_pro_platte).toBe(4);
    expect(extracted.nettkapazitaet).toBe(8);

    const result = GraphRunner.grade(customRaidGraph, extracted);

    const anzahlStep = result.stepResults.find(s => s.variableId === 'anzahl_platten')!;
    expect(anzahlStep.status).toBe('primary_error');
    expect(anzahlStep.studentValue).toBe(3);

    const netStep = result.stepResults.find(s => s.variableId === 'nettkapazitaet')!;
    // Should be consecutive_correct because (3 - 1) * 4 = 8, which matches the student's value!
    expect(netStep.status).toBe('consecutive_correct');
    expect(netStep.studentValue).toBe(8);
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

describe('GradingGraph Engine - Expression Auto-healing Tests', () => {
  test('should auto-heal 1-argument network calculateGateway and calculateBroadcast calls', () => {
    const context = {
      messebesucher_netId: '172.16.0.0',
      messebesucher_mask: '/23'
    };
    
    // Gateway call with 1 argument
    const gatewayExpr = "network.calculateGateway(messebesucher_netId)";
    const gatewayResult = evaluateExpression(gatewayExpr, context);
    expect(gatewayResult).toBe('172.16.1.254'); // 172.16.1.254 is the last usable IP of 172.16.0.0/23
    
    // Broadcast call with 1 argument
    const broadcastExpr = "network.calculateBroadcast(messebesucher_netId)";
    const broadcastResult = evaluateExpression(broadcastExpr, context);
    expect(broadcastResult).toBe('172.16.1.255');
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
});

