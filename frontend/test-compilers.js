/**
 * Comprehensive automated test suite for Track B (Dev B) compilers.
 * Verifies freeBodyCompiler, circuitCompiler, and stateMachineCompiler
 * against the official contract schemas and fixtures.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { compileFreeBody, calculateDynamics } from './src/engines/freeBodyCompiler.js';
import { compileCircuit, solveCircuit } from './src/engines/circuitCompiler.js';
import { compileStateMachine, stepTransition, simulateStream } from './src/engines/stateMachineCompiler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASS: ${message}`);
}

console.log("==========================================");
console.log("🧪 RUNNING TRACK B (DEV B) COMPILER TESTS");
console.log("==========================================");

// 1. Free-Body Compiler Tests
const fbdData = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', 'free_body.json'), 'utf8'));
const fbdScene = compileFreeBody(fbdData);

assert(fbdScene.engine === "free_body", "FreeBody compiler identifies engine as 'free_body'");
assert(fbdScene.mass === 2.5, "FreeBody compiler extracts mass 2.5 kg");
assert(fbdScene.inclineAngleDeg === 30, "FreeBody compiler maps incline to 30 deg");
assert(fbdScene.forces.length === 3, "FreeBody compiler preserves 3 forces");

const dyn = calculateDynamics(2.5, 30, 0.3, fbdScene.forces);
assert(typeof dyn.acceleration === "number", "calculateDynamics computes acceleration");
assert(typeof dyn.netForce === "number", "calculateDynamics computes net force");

// 2. Circuit Solver Tests (Series-Parallel & Series)
const cktData = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', 'circuit.json'), 'utf8'));
const cktScene = compileCircuit(cktData);

assert(cktScene.engine === "circuit", "Circuit compiler identifies engine as 'circuit'");
assert(cktScene.nodes.length >= 3, "Circuit compiler identifies nodes GND, N1, N2");
assert(Math.abs(cktScene.solution.equivalentResistance - 4.4) < 0.01, "Circuit solver computes Req = 4.4 ohms (2 + 2.4)");
assert(Math.abs(cktScene.solution.currentAmps - 2.27) < 0.02, "Circuit solver computes Current ≈ 2.27 A");
assert(Math.abs(cktScene.solution.nodeVoltages["N2"] - 5.45) < 0.05, "Node N2 parallel voltage is ≈ 5.46V");

// Test pure series solver backwards compatibility
const seriesComps = [
  { type: "battery", value: 9.0, label: "V1", node_a: "A", node_b: "B" },
  { type: "resistor", value: 220, label: "R1", node_a: "B", node_b: "C" },
  { type: "resistor", value: 330, label: "R2", node_a: "C", node_b: "A" },
];
const seriesSol = solveCircuit(seriesComps, "V1");
assert(seriesSol.equivalentResistance === 550, "Pure series solver computes Req = 550 ohms (220 + 330)");
assert(Math.abs(seriesSol.currentMilliAmps - 16.36) < 0.1, "Pure series solver computes Current ≈ 16.36 mA");

// 3. State Machine Tests
const smData = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', 'state_machine.json'), 'utf8'));
const smScene = compileStateMachine(smData);

assert(smScene.engine === "state_machine", "StateMachine compiler identifies engine as 'state_machine'");
assert(smScene.initial === "q0", "StateMachine initial state is q0");
assert(smScene.accepting.includes("q2"), "StateMachine accepting states includes q2");

// Step transition test: q0 on '0' -> q1; q1 on '1' -> q2
assert(stepTransition("q0", "0", smData.transitions) === "q1", "q0 on '0' transitions to q1");
assert(stepTransition("q1", "1", smData.transitions) === "q2", "q1 on '1' transitions to q2");

// Stream execution test: '01' should be accepted
const runAccepted = simulateStream("q0", "01", smData.transitions, smData.accepting);
assert(runAccepted.isAccepted === true, "String '01' is accepted by DFA");
assert(runAccepted.finalState === "q2", "String '01' ends in accepting state q2");

// Stream execution test: '00' should be rejected
const runRejected = simulateStream("q0", "00", smData.transitions, smData.accepting);
assert(runRejected.isAccepted === false, "String '00' is rejected by DFA");

console.log("==========================================");
console.log("🎉 ALL TRACK B (DEV B) COMPILER TESTS PASSED!");
console.log("==========================================");
