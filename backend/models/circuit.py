"""Pydantic schema for circuit diagram extraction."""
from typing import Literal
from pydantic import BaseModel, field_validator, model_validator
from .shared import AuditBlock

_SOURCE_TYPES = {"battery", "led"}  # component types that act as a source


class Component(BaseModel):
    type: Literal["battery", "resistor", "capacitor", "inductor", "switch", "led", "ground"]
    value: float = 0.0
    node_a: str
    node_b: str
    label: str = ""


class Circuit(BaseModel):
    components: list[Component]
    source: str          # label of the voltage/current source
    audit: AuditBlock

    @field_validator("components")
    @classmethod
    def components_must_be_non_empty(cls, v: list[Component]) -> list[Component]:
        if not v:
            raise ValueError("at least one component is required")
        return v

    @model_validator(mode="after")
    def at_least_one_source(self) -> "Circuit":
        has_source = any(c.type in _SOURCE_TYPES for c in self.components)
        if not has_source:
            raise ValueError("circuit must contain at least one battery or source component")
        return self
