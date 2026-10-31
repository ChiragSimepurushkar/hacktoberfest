"""Unit tests for Pydantic schemas and validators for all 3 diagram types."""
import json
from pathlib import Path
import pytest
from pydantic import ValidationError

from models.free_body import FreeBodyDiagram, Force
from models.circuit import Circuit, Component
from models.state_machine import StateMachine, Transition
from models.shared import AuditBlock, DetectedIssue, InferenceEntry

FIXTURES_DIR = Path(__file__).resolve().parent.parent.parent / "fixtures"


class TestFixturesValidation:
    """Validate that all committed fixtures strictly adhere to their Pydantic schemas."""

    def test_free_body_fixture(self):
        data = json.loads((FIXTURES_DIR / "free_body.json").read_text())
        model = FreeBodyDiagram.model_validate(data)
        assert model.mass == 2.5
        assert len(model.forces) == 3
        assert model.friction_coeff == 0.3
        assert model.audit.concept_explanation != ""
        dumped = model.model_dump()
        assert "forces" in dumped
        assert len(dumped["forces"]) == 3

    def test_circuit_fixture(self):
        data = json.loads((FIXTURES_DIR / "circuit.json").read_text())
        model = Circuit.model_validate(data)
        assert model.source == "V1"
        assert len(model.components) == 4
        assert any(c.type == "battery" for c in model.components)
        assert model.audit.concept_explanation != ""

    def test_state_machine_fixture(self):
        data = json.loads((FIXTURES_DIR / "state_machine.json").read_text())
        model = StateMachine.model_validate(data)
        assert model.initial == "q0"
        assert "q2" in model.accepting
        assert len(model.states) == 3
        assert len(model.transitions) == 4

        # Validate that by_alias serialization produces 'from' and 'to'
        dumped = model.model_dump(by_alias=True)
        assert dumped["transitions"][0]["from"] == "q0"
        assert dumped["transitions"][0]["to"] == "q1"
        assert "from_state" not in dumped["transitions"][0]


class TestFreeBodyValidators:
    """Unit tests for FreeBodyDiagram custom validators."""

    def test_mass_must_be_positive(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        forces = [Force(label="gravity", magnitude=9.8, angle=270)]
        with pytest.raises(ValidationError, match="mass must be positive"):
            FreeBodyDiagram(mass=0.0, forces=forces, audit=audit)
        with pytest.raises(ValidationError, match="mass must be positive"):
            FreeBodyDiagram(mass=-2.0, forces=forces, audit=audit)

    def test_forces_must_be_non_empty(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        with pytest.raises(ValidationError, match="at least one force is required"):
            FreeBodyDiagram(mass=1.0, forces=[], audit=audit)

    def test_friction_must_be_non_negative(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        forces = [Force(label="gravity", magnitude=9.8, angle=270)]
        with pytest.raises(ValidationError, match="friction_coeff must be >= 0"):
            FreeBodyDiagram(mass=1.0, forces=forces, friction_coeff=-0.1, audit=audit)


class TestCircuitValidators:
    """Unit tests for Circuit custom validators."""

    def test_components_must_be_non_empty(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        with pytest.raises(ValidationError, match="at least one component is required"):
            Circuit(components=[], source="V1", audit=audit)

    def test_must_contain_source_component(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        components = [
            Component(type="resistor", value=100, node_a="A", node_b="B", label="R1")
        ]
        with pytest.raises(ValidationError, match="at least one battery or source component"):
            Circuit(components=components, source="V1", audit=audit)


class TestStateMachineValidators:
    """Unit tests for StateMachine custom validators."""

    def test_empty_states(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        with pytest.raises(ValidationError, match="states list must not be empty"):
            StateMachine(states=[], transitions=[], initial="q0", accepting=[], audit=audit)

    def test_initial_not_in_states(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        with pytest.raises(ValidationError, match="initial state 'q99' must be in states list"):
            StateMachine(states=["q0", "q1"], transitions=[], initial="q99", accepting=[], audit=audit)

    def test_accepting_not_in_states(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        with pytest.raises(ValidationError, match="accepting states not in states list"):
            StateMachine(states=["q0", "q1"], transitions=[], initial="q0", accepting=["q_unknown"], audit=audit)

    def test_transition_unknown_state(self):
        audit = AuditBlock(concept_explanation="Test", detected_issues=[], inference_trace=[])
        with pytest.raises(ValidationError, match="transition from unknown state 'q_ghost'"):
            StateMachine(
                states=["q0", "q1"],
                transitions=[Transition(from_state="q_ghost", to_state="q1", label="a")],
                initial="q0",
                accepting=[],
                audit=audit,
            )
        with pytest.raises(ValidationError, match="transition to unknown state 'q_ghost'"):
            StateMachine(
                states=["q0", "q1"],
                transitions=[Transition(from_state="q0", to_state="q_ghost", label="a")],
                initial="q0",
                accepting=[],
                audit=audit,
            )
