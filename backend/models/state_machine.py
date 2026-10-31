"""Pydantic schema for state machine / flowchart extraction."""
from pydantic import BaseModel, Field, ConfigDict, model_validator
from .shared import AuditBlock


class Transition(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    from_state: str = Field(..., alias="from")
    to_state: str   = Field(..., alias="to")
    label: str


class StateMachine(BaseModel):
    states: list[str]
    transitions: list[Transition]
    initial: str
    accepting: list[str]
    audit: AuditBlock

    @model_validator(mode="after")
    def validate_states_consistency(self) -> "StateMachine":
        state_set = set(self.states)
        if not state_set:
            raise ValueError("states list must not be empty")
        if self.initial not in state_set:
            raise ValueError(f"initial state '{self.initial}' must be in states list")
        bad_accepting = [s for s in self.accepting if s not in state_set]
        if bad_accepting:
            raise ValueError(f"accepting states not in states list: {bad_accepting}")
        # Validate transitions reference known states
        for t in self.transitions:
            if t.from_state not in state_set:
                raise ValueError(f"transition from unknown state '{t.from_state}'")
            if t.to_state not in state_set:
                raise ValueError(f"transition to unknown state '{t.to_state}'")
        return self
