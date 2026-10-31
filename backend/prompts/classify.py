"""Classification prompt — determines diagram type from a photo."""

VALID_TYPES = {"free_body", "circuit", "state_machine"}

CLASSIFY_PROMPT = """\
You are analyzing a photo of a handwritten notebook page.
Classify it into exactly one of: free_body, circuit, state_machine, unsupported.

Rules:
- free_body: forces drawn as arrows acting on an object, a mass, a surface.
- circuit: resistors, batteries, switches, wires, nodes.
- state_machine: labeled circles/nodes connected by arrows with transition labels.
- unsupported: anything else.

Respond with only the category name, nothing else.
"""
