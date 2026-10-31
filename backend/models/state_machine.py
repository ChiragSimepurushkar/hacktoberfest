"""Pydantic schema for state machine / flowchart extraction."""
from pydantic import BaseModel, Field, ConfigDict
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

    # TODO: add validators (e.g. initial in states, accepting ⊆ states)
