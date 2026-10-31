"""Classification prompt — determines diagram type from a photo."""

VALID_TYPES = {"free_body", "circuit", "state_machine"}

CLASSIFY_PROMPT = """\
You are an expert engineer analyzing a photo of a student's handwritten notebook page or technical diagram.
Classify it into exactly one of: free_body, circuit, state_machine, unsupported.

Classification Guidelines:
- free_body: Any physics mechanics diagram with forces, vector arrows, a mass/block/box, an incline/ramp/surface, tension, gravity (mg), normal force (N), or friction (f).
- circuit: Any electrical/electronic schematic with resistors, capacitors, inductors, batteries, DC/AC voltage sources, ground (GND), wires, or nodes.
- state_machine: Any finite automata, DFA, NFA, state transition diagram, or flowchart with circled states and labeled arrows.
- unsupported: Only if it is completely unrelated to physics, circuits, or automata.

Output only one word: free_body, circuit, or state_machine.
"""
